'use client';

import React from 'react';
import { Coins, Plus } from 'lucide-react';

interface CreditBalancePillProps {
  balance: number | null | undefined;
  onOpenTopup: () => void;
  isLoading?: boolean;
}

export function CreditBalancePill({
  balance,
  onOpenTopup,
  isLoading = false,
}: CreditBalancePillProps) {
  const currentBalance = balance ?? 0;
  const isZero = currentBalance <= 0;

  return (
    <div className="inline-flex items-center gap-1.5 p-1 pl-2.5 bg-[#FFFFFF]/90 backdrop-blur-md border border-[#201b21]/15 rounded-full shadow-xs">
      <Coins className={`w-3.5 h-3.5 ${isZero ? 'text-rose-500' : 'text-accent'}`} />
      <span className="text-xs font-semibold text-charcoal tabular-nums">
        {isLoading ? '...' : currentBalance}
      </span>
      <span className="text-[11px] text-charcoal/60 font-medium mr-1">kredi</span>

      <button
        type="button"
        onClick={onOpenTopup}
        className="h-6 px-2.5 rounded-full text-[11px] font-medium bg-[#201b21] text-cream hover:bg-[#201b21]/80 transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
      >
        <Plus className="w-3 h-3 text-accent" />
        <span>Yükle</span>
      </button>
    </div>
  );
}
