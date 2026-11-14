import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { CREDIT_PACKAGES } from '@/config/billing';

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || !session.user) {
    return NextResponse.json(
      { error: 'Kredi satın almak için lütfen giriş yapın.' },
      { status: 401 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi.' }, { status: 400 });
  }

  const { packageId } = body;
  const pkg = CREDIT_PACKAGES[packageId];
  if (!pkg) {
    return NextResponse.json({ error: 'Geçersiz kredi paketi seçimi.' }, { status: 400 });
  }

  const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
  const storeId = process.env.LEMON_SQUEEZY_STORE_ID;

  if (!apiKey || !storeId) {
    return NextResponse.json(
      { error: 'Ödeme ağ geçidi yapılandırması eksik.' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              email: session.user.email,
              custom: {
                user_id: session.user.id,
                package_id: pkg.id,
              },
            },
          },
          relationships: {
            store: {
              data: {
                type: 'stores',
                id: String(storeId),
              },
            },
            variant: {
              data: {
                type: 'variants',
                id: String(pkg.variantId),
              },
            },
          },
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Lemon Squeezy Checkout Error]:', data);
      return NextResponse.json(
        { error: 'Ödeme oturumu oluşturulamadı: ' + (data.errors?.[0]?.detail || response.statusText) },
        { status: 502 }
      );
    }

    const checkoutUrl = data.data?.attributes?.url;
    return NextResponse.json({ checkoutUrl });
  } catch (err: any) {
    console.error('[Lemon Squeezy Network Error]:', err);
    return NextResponse.json(
      { error: 'Ödeme sunucusuna bağlanırken hata oluştu.' },
      { status: 500 }
    );
  }
}
