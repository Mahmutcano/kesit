'use client';

import React, { useState } from 'react';
import { signIn } from '@/lib/auth-client';
import { Sparkles, Shield, Gift, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signIn.social({
        provider: 'google',
        callbackURL: typeof window !== 'undefined' ? window.location.href : '/',
      });
    } catch (err) {
      console.error('[Google SignIn Error]:', err);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#201b21]/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-cream border border-[#201b21]/15 rounded-3xl p-6 shadow-2xl space-y-5 animate-scaleUp">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 text-charcoal/40 hover:text-charcoal rounded-full hover:bg-[#201b21]/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center gap-1.5 pt-2">
          <div className="w-12 h-12 rounded-2xl bg-[#201b21] flex items-center justify-center text-cream mb-1 shadow-md">
            <Sparkles className="w-6 h-6 text-accent" />
          </div>
          <h2 className="text-xl font-serif font-medium text-charcoal">
            Yönetilen Altyapı ile Üret
          </h2>
          <p className="text-xs text-charcoal/65 max-w-xs leading-relaxed">
            Yapay zeka modellerine sunucu üzerinden kesintisiz erişmek için Google ile tek tıkla giriş yapın.
          </p>
        </div>

        <div className="bg-[#FFFFFF]/90 border border-[#201b21]/10 rounded-2xl p-4 space-y-3">
          <div className="flex items-start gap-2.5">
            <Gift className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
            <div className="text-xs">
              <span className="font-semibold text-charcoal">5 Ücretsiz Başlangıç Kredisi:</span>
              <span className="text-charcoal/70 ml-1">Kayıt olduğunuz an hesabınıza otomatik tanımlanır.</span>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs">
              <span className="font-semibold text-charcoal">Sıfır Parola Stresi:</span>
              <span className="text-charcoal/70 ml-1">Yalnızca resmi Google OAuth yetkilendirmesi kullanılır.</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full bg-[#201b21] text-cream font-medium rounded-xl h-12 hover:bg-[#201b21]/85 shadow-md flex items-center justify-center gap-3 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{loading ? 'Yönlendiriliyor...' : 'Google ile Devam Et'}</span>
        </button>

        <p className="text-[11px] text-charcoal/50 text-center leading-normal">
          Giriş yaparak Kullanım Koşulları ve Gizlilik Politikası'nı kabul etmiş olursunuz.
        </p>
      </div>
    </div>
  );
}
