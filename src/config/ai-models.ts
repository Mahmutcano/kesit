export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  creditCost: number;
  maxTokens: number;
  description: string;
  tier: 'fast' | 'flagship';
}

export const MAX_PROMPT_LENGTH = 16000;

export const ALLOWED_MODELS: Record<string, ModelConfig> = {
  'google/gemini-2.0-flash-001': {
    id: 'google/gemini-2.0-flash-001',
    name: 'Gemini 2.0 Flash',
    provider: 'Google',
    creditCost: 1,
    maxTokens: 4096,
    description: 'Son derece hızlı ve yetenekli genel amaçlı model.',
    tier: 'fast',
  },
  'openai/gpt-4o-mini': {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o mini',
    provider: 'OpenAI',
    creditCost: 1,
    maxTokens: 4096,
    description: 'Hızlı, ekonomik ve optimize edilmiş yapay zeka.',
    tier: 'fast',
  },
  'anthropic/claude-3.5-haiku': {
    id: 'anthropic/claude-3.5-haiku',
    name: 'Claude 3.5 Haiku',
    provider: 'Anthropic',
    creditCost: 1,
    maxTokens: 4096,
    description: 'Hızlı refleksler ve net kod/metin analizi.',
    tier: 'fast',
  },
  'deepseek/deepseek-chat': {
    id: 'deepseek/deepseek-chat',
    name: 'DeepSeek V3',
    provider: 'DeepSeek',
    creditCost: 1,
    maxTokens: 4096,
    description: 'Yüksek zeka, mükemmel mantık ve uygun maliyet.',
    tier: 'fast',
  },
  'anthropic/claude-3.5-sonnet': {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    creditCost: 3,
    maxTokens: 8192,
    description: 'Karmaşık akıl yürütme ve amiral gemisi performansı.',
    tier: 'flagship',
  },
  'openai/gpt-4o': {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    creditCost: 3,
    maxTokens: 4096,
    description: 'OpenAI amiral gemisi çok modlu zeka modeli.',
    tier: 'flagship',
  },
};

export const DEFAULT_MODEL = 'google/gemini-2.0-flash-001';
