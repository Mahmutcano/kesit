import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { auth } from '@/lib/auth';
import { transaction } from '@/lib/db';
import { ALLOWED_MODELS, MAX_PROMPT_LENGTH, DEFAULT_MODEL } from '@/config/ai-models';

// Simple in-memory rate limiter for BYOK IP protection (20 req/min)
const byokRateLimits = new Map<string, { count: number; resetAt: number }>();

function checkByokRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = byokRateLimits.get(ip);
  if (!record || record.resetAt < now) {
    byokRateLimits.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (record.count >= 20) {
    return false;
  }
  record.count += 1;
  return true;
}

// Clean up stale rate limit entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of byokRateLimits.entries()) {
      if (record.resetAt < now) byokRateLimits.delete(ip);
    }
  }, 120000);
}

export async function POST(req: NextRequest) {
  const mode = req.headers.get('x-execution-mode') || 'managed';

  // 1. Input Sanitization
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON yükü.' }, { status: 400 });
  }

  const { messages, model = DEFAULT_MODEL, stream = false, ...rest } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'Mesaj listesi zorunludur.' }, { status: 400 });
  }

  // Calculate total prompt characters
  const totalLength = messages.reduce((acc: number, m: any) => acc + (typeof m.content === 'string' ? m.content.length : 0), 0);
  if (totalLength > MAX_PROMPT_LENGTH) {
    return NextResponse.json(
      { error: `İstem uzunluğu izin verilen azami ${MAX_PROMPT_LENGTH} karakteri aşıyor.` },
      { status: 400 }
    );
  }

  // ---------------------------------------------------------------------------------
  // BRANCH A: BYOK Execution (Anonymous, Zero DB, Zero Auth)
  // ---------------------------------------------------------------------------------
  if (mode === 'byok') {
    let customKey: string | null = req.headers.get('x-custom-openrouter-key');
    if (!customKey || !customKey.startsWith('sk-or-')) {
      return NextResponse.json(
        { error: 'Geçersiz veya eksik OpenRouter API anahtarı (sk-or-...).' },
        { status: 401 }
      );
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    if (!checkByokRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Hız sınırı aşıldı. Lütfen bir dakika sonra tekrar deneyin.' },
        { status: 429 }
      );
    }

    try {
      const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customKey}`,
          'HTTP-Referer': process.env.BETTER_AUTH_URL || 'https://exto.help',
          'X-Title': 'Kesit AI Gateway',
        },
        body: JSON.stringify({
          model,
          messages,
          stream,
          ...rest,
        }),
      });

      // CRITICAL SECURITY RULE: Nullify key immediately after request dispatch
      customKey = null;

      if (!openRouterRes.ok) {
        const errText = await openRouterRes.text();
        return new NextResponse(errText, {
          status: openRouterRes.status,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (stream && openRouterRes.body) {
        return new NextResponse(openRouterRes.body, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        });
      }

      const data = await openRouterRes.json();
      return NextResponse.json(data);
    } catch (err: any) {
      customKey = null;
      return NextResponse.json(
        { error: 'OpenRouter bağlantı hatası: ' + err.message },
        { status: 502 }
      );
    }
  }

  // ---------------------------------------------------------------------------------
  // BRANCH B: Managed Execution (Pessimistic Lock, Zero-Trust, Auto-Refund)
  // ---------------------------------------------------------------------------------
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || !session.user) {
    return NextResponse.json(
      { error: 'Yetkilendirme gerekli. Lütfen giriş yapın.' },
      { status: 401 }
    );
  }

  const userId = session.user.id;

  // Model whitelisting and credit calculation
  const modelConfig = ALLOWED_MODELS[model];
  if (!modelConfig) {
    return NextResponse.json(
      {
        error: `Yönetilen modda bu model desteklenmiyor. İzin verilen modeller: ${Object.keys(
          ALLOWED_MODELS
        ).join(', ')}`,
      },
      { status: 400 }
    );
  }

  const creditCost = modelConfig.creditCost;
  const requestId = crypto.randomUUID();

  // STEP 2: Atomic Pessimistic Credit Lock
  let newBalance: number;
  try {
    const lockResult = await transaction(async (client) => {
      const updateRes = await client.query<{ credit_balance: number }>(
        `UPDATE "user" 
         SET credit_balance = credit_balance - $1 
         WHERE id = $2 AND credit_balance >= $1 
         RETURNING credit_balance`,
        [creditCost, userId]
      );

      if (updateRes.rows.length === 0) {
        throw new Error('INSUFFICIENT_CREDITS');
      }

      const balance = updateRes.rows[0].credit_balance;

      await client.query(
        `INSERT INTO credit_transactions (user_id, amount, type, reference_id, metadata)
         VALUES ($1, $2, 'USAGE', $3, $4)`,
        [
          userId,
          -creditCost,
          requestId,
          JSON.stringify({
            model: modelConfig.id,
            tokens: totalLength,
            requestId,
          }),
        ]
      );

      return balance;
    });

    newBalance = lockResult;
  } catch (err: any) {
    if (err.message === 'INSUFFICIENT_CREDITS') {
      return NextResponse.json(
        {
          error: 'Yetersiz bakiye. Lütfen kredi satın alın.',
          code: 'INSUFFICIENT_CREDITS',
          requiredCredits: creditCost,
        },
        { status: 402 }
      );
    }
    console.error('[Credit Lock Error]:', err);
    return NextResponse.json({ error: 'Kredi işlemi gerçekleştirilemedi.' }, { status: 500 });
  }

  // STEP 3 & 4: Call OpenRouter API with Auto-Refund Fault Tolerance
  const refundCredit = async (reason: string) => {
    try {
      await transaction(async (client) => {
        await client.query(
          `UPDATE "user" SET credit_balance = credit_balance + $1 WHERE id = $2`,
          [creditCost, userId]
        );
        await client.query(
          `INSERT INTO credit_transactions (user_id, amount, type, reference_id, metadata)
           VALUES ($1, $2, 'REFUND', $3, $4)`,
          [
            userId,
            creditCost,
            `refund_${requestId}`,
            JSON.stringify({
              originalRequestId: requestId,
              reason,
              model: modelConfig.id,
            }),
          ]
        );
      });
      console.log(`[Auto-Refund] User ${userId} refunded ${creditCost} credits for request ${requestId}`);
    } catch (refundErr) {
      console.error('[Auto-Refund CRITICAL FAILURE]:', refundErr);
    }
  };

  const serverKey = process.env.OPENROUTER_API_KEY;
  if (!serverKey) {
    await refundCredit('server_api_key_unconfigured');
    return NextResponse.json(
      { error: 'Sunucu yapay zeka yapılandırması eksik. Krediniz iade edildi.' },
      { status: 500 }
    );
  }

  try {
    const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serverKey}`,
        'HTTP-Referer': process.env.BETTER_AUTH_URL || 'https://exto.help',
        'X-Title': 'Kesit AI Gateway',
      },
      body: JSON.stringify({
        model: modelConfig.id,
        messages,
        stream,
        max_tokens: modelConfig.maxTokens,
        ...rest,
      }),
    });

    if (!openRouterRes.ok) {
      const errText = await openRouterRes.text();
      console.warn(`[OpenRouter Error ${openRouterRes.status}]:`, errText);
      await refundCredit(`upstream_error_${openRouterRes.status}`);
      return NextResponse.json(
        {
          error: 'Yapay zeka sağlayıcısından yanıt alınamadı. Harcanan kredi otomatik olarak iade edildi.',
          status: openRouterRes.status,
        },
        { status: 502 }
      );
    }

    if (stream && openRouterRes.body) {
      return new NextResponse(openRouterRes.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-Credit-Cost': String(creditCost),
          'X-New-Balance': String(newBalance),
        },
      });
    }

    const data = await openRouterRes.json();
    return NextResponse.json({
      ...data,
      creditCost,
      newBalance,
    });
  } catch (netErr: any) {
    console.error('[Network Error Calling OpenRouter]:', netErr);
    await refundCredit('network_timeout_or_abort');
    return NextResponse.json(
      { error: 'Bağlantı zaman aşımına uğradı. Krediniz otomatik olarak iade edildi.' },
      { status: 502 }
    );
  }
}

