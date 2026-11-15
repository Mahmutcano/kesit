'use client';

import React from 'react';
import { Sparkles, KeyRound } from 'lucide-react';

export type ExecutionMode = 'managed' | 'byok';

interface ModeSwitcherProps {
  mode: ExecutionMode;
  onModeChange: (mode: ExecutionMode) => void;
}

export function ModeSwitcher({ mode, onModeChange }: ModeSwitcherProps) {
  return (
    <div className="inline-flex p-1 bg-[#201b21]/5 rounded-full border border-[#201b21]/10">
      <button
        type="button"
        onClick={() => onModeChange('managed')}
        className={`flex items-center gap-1.5 h-8 px-4 text-xs font-medium tracking-wide rounded-full transition-all ${mode === 'managed'
            ? 'bg-[#201b21] text-[#fcf9e8] shadow-sm'
            : 'text-[#201b21]/70 hover:text-[#201b21]'
          }`}
      >
        <Sparkles className="w-3.5 h-3.5 text-accent" />
        <span>Yönetilen Altyapı</span>
      </button>

      <button
        type="button"
        onClick={() => onModeChange('byok')}
        className={`flex items-center gap-1.5 h-8 px-4 text-xs font-medium tracking-wide rounded-full transition-all ${mode === 'byok'
            ? 'bg-[#201b21] text-[#fcf9e8] shadow-sm'
            : 'text-[#201b21]/70 hover:text-[#201b21]'
          }`}
      >
        <KeyRound className="w-3.5 h-3.5" />
        <span>Kendi Anahtarım (BYOK)</span>
      </button>
    </div>
  );
}