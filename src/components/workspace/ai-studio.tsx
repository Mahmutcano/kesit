'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Coins,
  Bot,
  User,
  LogOut,
  LogIn,
  Copy,
  Check,
  Zap,
} from 'lucide-react';
import { useSession, signOut } from '@/lib/auth-client';
import { ModeSwitcher, ExecutionMode } from './mode-switcher';
import { ByokDrawer } from './byok-drawer';
import { CreditBalancePill } from './credit-balance-pill';
import { AuthModal } from './auth-modal';
import { TopupModal } from './topup-modal';
import { ALLOWED_MODELS, MAX_PROMPT_LENGTH, DEFAULT_MODEL } from '@/config/ai-models';

export function AiStudio() {
  const { data: sessionData, isPending: sessionLoading } = useSession();
  const session = sessionData?.user;

  const [mode, setMode] = useState<ExecutionMode>('managed');
  const [byokKey, setByokKey] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);
  const [prompt, setPrompt] = useState<string>('');
  const [responseOutput, setResponseOutput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [lastCreditCost, setLastCreditCost] = useState<number | null>(null);

  // Local credit balance state for immediate optimistic / header sync updates
  const [creditBalance, setCreditBalance] = useState<number | null>(null);

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [topupModalOpen, setTopupModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (sessionData?.user) {
      const balance = (sessionData.user as any).credit_balance ?? 5;
      setCreditBalance(balance);
    } else {
      setCreditBalance(null);
    }
  }, [sessionData]);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    // 1. Zero-Trust Check for Mode 1 (Managed)
    if (mode === 'managed') {
      if (!session) {
        setAuthModalOpen(true);
        return;
      }
      if ((creditBalance ?? 0) <= 0) {
        setTopupModalOpen(true);
        return;
      }
    }

    // 2. Check for Mode 2 (BYOK)
    if (mode === 'byok' && !byokKey.trim().startsWith('sk-or-')) {
      alert('Lütfen geçerli bir OpenRouter API anahtarı (sk-or-...) girin.');
      return;
    }

    setIsGenerating(true);
    setResponseOutput('');
    setLastCreditCost(null);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Execution-Mode': mode,
    };

    if (mode === 'byok') {
      headers['X-Custom-OpenRouter-Key'] = byokKey.trim();
    }

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: selectedModel,
          messages: [{ role: 'user', content: prompt }],
          stream: true,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        if (res.status === 401 && mode === 'managed') {
          setAuthModalOpen(true);
          throw new Error('Oturum süresi doldu.');
        }
        if (res.status === 402 && mode === 'managed') {
          setTopupModalOpen(true);
          throw new Error('Yetersiz kredi.');
        }
        throw new Error(errJson.error || `Hata (${res.status})`);
      }

      // Check credit headers
      const newBalanceHeader = res.headers.get('X-New-Balance');
      const creditCostHeader = res.headers.get('X-Credit-Cost');
      if (newBalanceHeader !== null) {
        setCreditBalance(parseInt(newBalanceHeader, 10));
      }
      if (creditCostHeader !== null) {
        setLastCreditCost(parseInt(creditCostHeader, 10));
      }

      // Stream response handling
      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                const content = parsed.choices?.[0]?.delta?.content || '';
                accumulated += content;
                setResponseOutput(accumulated);
              } catch {
                // Ignore incomplete JSON stream chunks
              }
            }
          }
        }
      }
    } catch (err: any) {
      setResponseOutput(`[Hata]: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!responseOutput) return;
    navigator.clipboard.writeText(responseOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const modelOptions = Object.values(ALLOWED_MODELS);
  const currentModelConfig = ALLOWED_MODELS[selectedModel] || modelOptions[0];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 py-6 px-4">
      {/* Top Header Card */}
      <header className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#FFFFFF]/85 backdrop-blur-md border border-[#201b21]/10 rounded-3xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#201b21] flex items-center justify-center text-cream shadow-xs">
            <Sparkles className="w-5 h-5 text-accent" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-serif font-semibold text-charcoal">
                Kesit AI Gateway
              </h1>
              <span className="text-[10px] font-mono uppercase bg-[#201b21]/5 text-charcoal/70 px-2 py-0.5 rounded-full border border-charcoal/10">
                Zero-Trust Dual-Mode
              </span>
            </div>
            <p className="text-xs text-charcoal/60">
              Yönetilen sunucu kotaları veya kendi OpenRouter anahtarınızla tam gizlilik.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {mode === 'managed' ? (
            session ? (
              <CreditBalancePill
                balance={creditBalance}
                onOpenTopup={() => setTopupModalOpen(true)}
                isLoading={sessionLoading}
              />
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="bg-[#201b21] text-cream rounded-full px-4 h-8 text-xs font-medium flex items-center gap-1.5 shadow-xs hover:bg-[#201b21]/85 transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-accent" />
                <span>Giriş Yap (5 Kredi Hediye)</span>
              </button>
            )
          ) : (
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium px-3 py-1 rounded-full">
              Anonim BYOK Aktif
            </span>
          )}

          {session && (
            <div className="flex items-center gap-2 pl-2 border-l border-[#201b21]/10">
              <div className="w-7 h-7 rounded-full bg-[#201b21] text-cream flex items-center justify-center text-xs font-medium overflow-hidden">
                {session.image ? (
                  <img src={session.image} alt={session.name || 'User'} className="w-full h-full object-cover" />
                ) : (
                  (session.name || session.email || 'U').charAt(0).toUpperCase()
                )}
              </div>
              <button
                type="button"
                onClick={() => signOut()}
                className="text-charcoal/50 hover:text-charcoal p-1 transition-colors cursor-pointer"
                title="Çıkış Yap"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Mode Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-1">
        <ModeSwitcher mode={mode} onModeChange={setMode} />

        <div className="flex items-center gap-2">
          <span className="text-xs text-charcoal/60 font-medium">Model:</span>
          <select
            aria-label="Yapay Zeka Modeli Seçin"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-56 h-9 px-3 bg-[#FFFFFF] border border-[#201b21]/15 rounded-xl text-xs font-medium text-charcoal focus:outline-none focus:border-accent cursor-pointer"
          >
            {modelOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({mode === 'managed' ? `${m.creditCost} Kredi` : 'BYOK'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* BYOK Drawer (Revealed in BYOK Mode) */}
      {mode === 'byok' && (
        <ByokDrawer currentKey={byokKey} onKeyChange={setByokKey} />
      )}

      {/* Prompt Area */}
      <div className="bg-[#FFFFFF] border border-[#201b21]/10 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between text-xs text-charcoal/60">
          <div className="flex items-center gap-1.5 font-medium">
            <Bot className="w-3.5 h-3.5 text-accent" />
            <span>İstem & Talimatınız</span>
          </div>
          <span
            className={`font-mono text-[11px] ${
              prompt.length > MAX_PROMPT_LENGTH ? 'text-rose-600 font-bold' : 'text-charcoal/50'
            }`}
          >
            {prompt.length.toLocaleString()} / {MAX_PROMPT_LENGTH.toLocaleString()} karakter
          </span>
        </div>

        <textarea
          placeholder="Videonuz için başlıklar, kurgu akışı, hook fikirleri veya altyazı içeriği isteyin..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          className="w-full p-3.5 bg-cream/40 border border-[#201b21]/10 rounded-2xl text-sm font-sans text-charcoal leading-relaxed focus:outline-none focus:border-[#201b21]/40 transition-colors resize-y"
        />

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-xs text-charcoal/60">
            {mode === 'managed' && (
              <div className="flex items-center gap-1 text-[11px] bg-cream px-2 py-1 rounded-lg border border-charcoal/5">
                <Zap className="w-3 h-3 text-accent fill-current" />
                <span>Bu işlem: <strong className="text-charcoal">{currentModelConfig.creditCost} kredi</strong></span>
              </div>
            )}
            {lastCreditCost !== null && (
              <span className="text-[11px] text-emerald-600 font-medium">
                Son işlemde {lastCreditCost} kredi kullanıldı
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim() || prompt.length > MAX_PROMPT_LENGTH}
            className="bg-[#201b21] text-cream font-medium rounded-xl px-6 h-10 hover:bg-[#201b21]/85 shadow-sm flex items-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 text-xs"
          >
            {isGenerating ? (
              <span>Üretiliyor...</span>
            ) : (
              <>
                <span>Çalıştır</span>
                <Send className="w-3.5 h-3.5 text-accent" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Response Display Card */}
      {(responseOutput || isGenerating) && (
        <div className="bg-[#FFFFFF] border border-[#201b21]/10 rounded-3xl p-5 shadow-sm space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-[#201b21]/5 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-cream flex items-center justify-center text-charcoal">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
              </div>
              <span className="text-xs font-semibold text-charcoal">
                {currentModelConfig.name} Yanıtı
              </span>
              {isGenerating && (
                <div className="flex items-center gap-1 text-[11px] text-charcoal/50">
                  <span className="inline-block w-2 h-2 rounded-full bg-accent animate-ping" />
                  <span>Akış alınıyor...</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="text-xs text-charcoal/70 hover:text-charcoal flex items-center gap-1 h-7 px-2.5 rounded-lg border border-[#201b21]/10 hover:bg-cream transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-600">Kopyalandı</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Kopyala</span>
                </>
              )}
            </button>
          </div>

          <div className="text-sm font-sans text-charcoal leading-relaxed whitespace-pre-wrap selection:bg-accent/20">
            {responseOutput || (
              <span className="text-charcoal/40 italic">Yapay zeka yanıtı bekleniyor...</span>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <TopupModal
        isOpen={topupModalOpen}
        onClose={() => setTopupModalOpen(false)}
        currentBalance={creditBalance ?? 0}
      />
    </div>
  );
}
