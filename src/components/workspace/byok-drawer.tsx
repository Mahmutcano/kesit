'use client';

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, ShieldCheck, Key, Trash2 } from 'lucide-react';

interface ByokDrawerProps {
  onKeyChange: (key: string) => void;
  currentKey: string;
}

export function ByokDrawer({ onKeyChange, currentKey }: ByokDrawerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [rememberLocal, setRememberLocal] = useState(false);
  const [inputVal, setInputVal] = useState(currentKey);

  useEffect(() => {
    // Check if key was saved in sessionStorage or localStorage
    const sessionKey = sessionStorage.getItem('byok_openrouter_key');
    const localKey = localStorage.getItem('byok_openrouter_key');
    if (sessionKey) {
      setInputVal(sessionKey);
      onKeyChange(sessionKey);
    } else if (localKey) {
      setInputVal(localKey);
      setRememberLocal(true);
      onKeyChange(localKey);
    }
  }, []);

  const handleSave = (val: string) => {
    setInputVal(val);
    onKeyChange(val);
    if (val.trim()) {
      if (rememberLocal) {
        localStorage.setItem('byok_openrouter_key', val.trim());
        sessionStorage.removeItem('byok_openrouter_key');
      } else {
        sessionStorage.setItem('byok_openrouter_key', val.trim());
        localStorage.removeItem('byok_openrouter_key');
      }
    } else {
      sessionStorage.removeItem('byok_openrouter_key');
      localStorage.removeItem('byok_openrouter_key');
    }
  };

  const handleClear = () => {
    setInputVal('');
    onKeyChange('');
    sessionStorage.removeItem('byok_openrouter_key');
    localStorage.removeItem('byok_openrouter_key');
  };

  const isValidFormat = inputVal.trim().startsWith('sk-or-');

  return (
    <div className="w-full bg-[#FFFFFF]/90 backdrop-blur-md border border-[#201b21]/10 rounded-2xl p-4 shadow-xs space-y-3 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-accent" />
          <span className="text-xs font-semibold tracking-wide text-charcoal">
            OpenRouter API Anahtarınız (BYOK)
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-charcoal/60 bg-cream/70 px-2 py-0.5 rounded-full border border-charcoal/5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Sıfır Günlükleme / İstemci Belleğinde Saklanır</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type={isVisible ? 'text' : 'password'}
            placeholder="sk-or-v1-..."
            value={inputVal}
            onChange={(e) => handleSave(e.target.value)}
            className="w-full h-9 pl-3 pr-9 bg-cream/30 border border-[#201b21]/15 rounded-xl font-mono text-xs text-charcoal focus:outline-none focus:border-accent transition-colors"
          />
          <button
            type="button"
            onClick={() => setIsVisible(!isVisible)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-charcoal/40 hover:text-charcoal p-1 transition-colors"
          >
            {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>

        {inputVal && (
          <button
            type="button"
            onClick={handleClear}
            className="h-9 px-3 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors flex items-center justify-center text-xs"
            title="Anahtarı Temizle"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-[#201b21]/5 text-[11px] text-charcoal/65">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={rememberLocal}
            onChange={(e) => {
              const val = e.target.checked;
              setRememberLocal(val);
              if (inputVal.trim()) {
                if (val) {
                  localStorage.setItem('byok_openrouter_key', inputVal.trim());
                  sessionStorage.removeItem('byok_openrouter_key');
                } else {
                  sessionStorage.setItem('byok_openrouter_key', inputVal.trim());
                  localStorage.removeItem('byok_openrouter_key');
                }
              }
            }}
            className="rounded border-[#201b21]/20 accent-accent"
          />
          <span>Bu cihazda hatırla (localStorage)</span>
        </label>
        {inputVal && !isValidFormat && (
          <span className="text-amber-600 font-medium">Anahtar `sk-or-` ile başlamalıdır</span>
        )}
      </div>
    </div>
  );
}
