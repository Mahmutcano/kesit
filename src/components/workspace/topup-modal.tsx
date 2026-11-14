'use client';

import React, { useState } from 'react';
import { Coins, Check, Zap, Sparkles, ExternalLink, X } from 'lucide-react';
import { CREDIT_PACKAGES } from '@/config/billing';

interface TopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance?: number;
}

export function TopupModal({ isOpen, onClose, currentBalance = 0 }: TopupModalProps) {
  const [selectedPkg, setSelectedPkg] = useState<string>('pro');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCheckout = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: selectedPkg }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Ödeme oturumu başlatılamadı.');
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err: any) {
      setErrorMsg(err.message);
      setLoading(false);
    }
  };

  const packages = Object.values(CREDIT_PACKAGES);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#201b21]/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-cream border border-[#201b21]/15 rounded-3xl p-6 shadow-2xl space-y-5 animate-scaleUp">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 text-charcoal/40 hover:text-charcoal rounded-full hover:bg-[#201b21]/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center gap-1.5 pt-2">
          <div className="w-12 h-12 rounded-2xl bg-[#201b21] flex items-center justify-center text-cream mb-1 shadow-md">
            <Coins className="w-6 h-6 text-accent" />
          </div>
          <h2 className="text-2xl font-serif font-medium text-charcoal">
            Kredi Paketi Seçin
          </h2>
          <p className="text-xs text-charcoal/65 max-w-md leading-relaxed">
            Mevcut bakiyeniz: <strong className="text-charcoal">{currentBalance} kredi</strong>. Satın aldığınız krediler hesabınıza anında ve kalıcı olarak yüklenir.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {packages.map((pkg) => {
            const isSelected = selectedPkg === pkg.id;
            return (
              <div
                key={pkg.id}
                onClick={() => setSelectedPkg(pkg.id)}
                className={`relative cursor-pointer transition-all rounded-2xl p-4 border flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#201b21] bg-[#FFFFFF] shadow-md scale-[1.02]'
                    : 'border-[#201b21]/10 bg-[#FFFFFF]/60 hover:border-[#201b21]/30 hover:bg-[#FFFFFF]'
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <span className="bg-accent text-[#141413] text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-xs">
                      En Popüler
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-charcoal">
                      {pkg.name}
                    </span>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-[#201b21] text-cream flex items-center justify-center">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-serif font-semibold text-charcoal">
                      ${pkg.priceUsd}
                    </span>
                    <span className="text-xs text-charcoal/50">/ tek sefer</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-medium text-accent">
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>{pkg.credits} Kredi</span>
                  </div>

                  <p className="text-[11px] text-charcoal/60 leading-relaxed">
                    {pkg.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#201b21]/5 text-[10px] text-charcoal/50 mt-3">
                  Kredi başına ${(pkg.priceUsd / pkg.credits).toFixed(3)}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-3 bg-cream/70 border border-[#201b21]/10 rounded-xl flex items-center justify-between text-xs text-charcoal/70">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <span>Ödemeler Lemon Squeezy güvencesiyle 256-bit SSL ile işlenir.</span>
          </div>
          <span className="text-[11px] font-mono">Bakiye asla eksiye düşmez</span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#201b21]/10">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-charcoal/70 hover:text-charcoal px-3 py-2 rounded-xl"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={handleCheckout}
            disabled={loading}
            className="bg-[#201b21] text-cream font-medium rounded-xl px-6 h-10 hover:bg-[#201b21]/85 shadow-md flex items-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60 text-xs"
          >
            <span>{loading ? 'Bağlanıyor...' : 'Ödemeye İlerle'}</span>
            <ExternalLink className="w-3.5 h-3.5 text-accent" />
          </button>
        </div>
      </div>
    </div>
  );
}
