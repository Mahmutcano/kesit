import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { transaction } from '@/lib/db';
import { getCreditsByVariantId } from '@/config/billing';

export async function POST(req: NextRequest) {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[Lemon Squeezy Webhook] LEMON_SQUEEZY_WEBHOOK_SECRET is not configured.');
    return NextResponse.json({ error: 'Webhook secret unconfigured' }, { status: 500 });
  }

  // 1. Raw Body Extraction
  const rawBody = await req.text();
  const signature = req.headers.get('x-signature');

  if (!signature) {
    console.warn('[Lemon Squeezy Webhook] Missing X-Signature header.');
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
  }

  // 2. Cryptographic Signature Verification
  try {
    const hmac = crypto.createHmac('sha256', secret);
    const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');
    const signatureBuffer = Buffer.from(signature, 'utf8');

    if (
      signatureBuffer.length !== digest.length ||
      !crypto.timingSafeEqual(signatureBuffer, digest)
    ) {
      console.warn('[Lemon Squeezy Webhook] HMAC verification mismatch.');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  } catch (err) {
    console.error('[Lemon Squeezy Webhook] Error during signature calculation:', err);
    return NextResponse.json({ error: 'Verification error' }, { status: 401 });
  }

  // 3. Event Parsing & Filtering
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const eventName = payload.meta?.event_name;
  const status = payload.data?.attributes?.status;

  // We fulfill orders when order_created with status 'paid'
  if (eventName !== 'order_created' || status !== 'paid') {
    return NextResponse.json({ message: 'Event ignored', eventName, status }, { status: 200 });
  }

  // 4. Idempotent Fulfillment Transaction
  const orderId = String(payload.data?.id);
  const userId = payload.meta?.custom_data?.user_id;
  const firstItem = payload.data?.attributes?.first_order_item;
  const variantId = String(firstItem?.variant_id || payload.data?.attributes?.variant_id || '');

  if (!userId || !orderId) {
    console.error('[Lemon Squeezy Webhook] Missing userId or orderId in custom_data:', payload.meta);
    return NextResponse.json({ error: 'Missing custom_data.user_id' }, { status: 400 });
  }

  const creditsToAdd = getCreditsByVariantId(variantId);
  if (creditsToAdd <= 0) {
    console.warn(`[Lemon Squeezy Webhook] No credit tier found for variant_id: ${variantId}`);
    return NextResponse.json({ message: 'No credits mapped for variant' }, { status: 200 });
  }

  const referenceId = `order_${orderId}`;

  try {
    const fulfilled = await transaction(async (client) => {
      // Step A: Insert into ledger with ON CONFLICT DO NOTHING
      const insertRes = await client.query(
        `INSERT INTO credit_transactions (user_id, amount, type, reference_id, metadata)
         VALUES ($1, $2, 'PURCHASE', $3, $4)
         ON CONFLICT (reference_id) DO NOTHING
         RETURNING id`,
        [
          userId,
          creditsToAdd,
          referenceId,
          JSON.stringify({
            orderId,
            variantId,
            orderNumber: payload.data?.attributes?.order_number,
            totalUsd: payload.data?.attributes?.total_usd,
          }),
        ]
      );

      // ONLY if a new row was inserted (idempotency check)
      if (insertRes.rows.length > 0) {
        await client.query(
          `UPDATE "user" 
           SET credit_balance = credit_balance + $1 
           WHERE id = $2`,
          [creditsToAdd, userId]
        );
        return true;
      }
      return false; // Already processed
    });

    if (fulfilled) {
      console.log(`[Lemon Squeezy] Successfully credited ${creditsToAdd} credits to user ${userId} for order ${orderId}`);
    } else {
      console.log(`[Lemon Squeezy] Order ${orderId} was already fulfilled (idempotent no-op).`);
    }

    return NextResponse.json({ success: true, fulfilled });
  } catch (dbErr) {
    console.error('[Lemon Squeezy Webhook DB Error]:', dbErr);
    return NextResponse.json({ error: 'Database transaction failed' }, { status: 500 });
  }
}
