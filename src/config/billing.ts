export interface CreditPackage {
  id: 'starter' | 'pro' | 'scale';
  name: string;
  variantId: string;
  credits: number;
  priceUsd: number;
  description: string;
  popular?: boolean;
}

export const CREDIT_PACKAGES: Record<string, CreditPackage> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    variantId: process.env.LEMON_VARIANT_STARTER || 'variant_starter_50',
    credits: 50,
    priceUsd: 5,
    description: 'Hafif kullanım ve deneme için 50 kredi paketi.',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    variantId: process.env.LEMON_VARIANT_PRO || 'variant_pro_200',
    credits: 200,
    priceUsd: 15,
    description: 'Düzenli video ve klip üretimi için 200 kredi paketi.',
    popular: true,
  },
  scale: {
    id: 'scale',
    name: 'Scale',
    variantId: process.env.LEMON_VARIANT_SCALE || 'variant_scale_600',
    credits: 600,
    priceUsd: 39,
    description: 'Yüksek hacimli kanallar ve ajanslar için 600 kredi paketi.',
  },
};

/**
 * Lookup credit amount from Lemon Squeezy variant_id
 */
export function getCreditsByVariantId(variantId: string): number {
  const pkg = Object.values(CREDIT_PACKAGES).find(
    (p) => String(p.variantId) === String(variantId)
  );
  return pkg ? pkg.credits : 0;
}
