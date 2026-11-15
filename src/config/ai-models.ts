export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  creditCost: number;
  maxTokens: number;
  description: string;
  tier: 'fast' | 'reasoning' | 'flagship';
}

export const MAX_PROMPT_LENGTH = 16000;

export const ALLOWED_MODELS: Record<string, ModelConfig> = {
  // --- HIZLI & EKONOMİK MODELLER (1 Kredi) ---
  'google/gemini-2.0-flash-001': {
    id: 'google/gemini-2.0-flash-001',
    name: 'Gemini 2.0 Flash',
    provider: 'Google',
    creditCost: 1,
    maxTokens: 8192,
    description: 'Ultra hızlı yanıt süresi ve güçlü genel anlama yeteneği.',
    tier: 'fast',
  },
  'openai/gpt-4o-mini': {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o mini',
    provider: 'OpenAI',
    creditCost: 1,
    maxTokens: 4096,
    description: 'Hızlı, ekonomik ve optimize edilmiş OpenAI modeli.',
    tier: 'fast',
  },
  'anthropic/claude-3.5-haiku': {
    id: 'anthropic/claude-3.5-haiku',
    name: 'Claude 3.5 Haiku',
    provider: 'Anthropic',
    creditCost: 1,
    maxTokens: 4096,
    description: 'Hızlı refleksler, net video transkript analizi.',
    tier: 'fast',
  },
  'deepseek/deepseek-chat': {
    id: 'deepseek/deepseek-chat',
    name: 'DeepSeek V3',
    provider: 'DeepSeek',
    creditCost: 1,
    maxTokens: 8192,
    description: 'Yüksek zeka, mükemmel Türkçe kavrama ve uygun maliyet.',
    tier: 'fast',
  },
  'meta-llama/llama-3.3-70b-instruct': {
    id: 'meta-llama/llama-3.3-70b-instruct',
    name: 'Llama 3.3 70B',
    provider: 'Meta',
    creditCost: 1,
    maxTokens: 4096,
    description: 'Meta açık kaynak amiral gemisi, güçlü kurgu çıkarımı.',
    tier: 'fast',
  },
  'qwen/qwen-2.5-72b-instruct': {
    id: 'qwen/qwen-2.5-72b-instruct',
    name: 'Qwen 2.5 72B',
    provider: 'Alibaba',
    creditCost: 1,
    maxTokens: 4096,
    description: 'Geniş bağlam ve ayrıntılı an analizi.',
    tier: 'fast',
  },

  // --- AKIL YÜRÜTME & MUHAKEME MODELLERİ (2 Kredi) ---
  'deepseek/deepseek-r1': {
    id: 'deepseek/deepseek-r1',
    name: 'DeepSeek R1 (Akıl Yürütme)',
    provider: 'DeepSeek',
    creditCost: 2,
    maxTokens: 8192,
    description: 'Derin düşünme zinciri ile en kritik viral anları yakalama.',
    tier: 'reasoning',
  },
  'openai/o3-mini': {
    id: 'openai/o3-mini',
    name: 'OpenAI o3-mini',
    provider: 'OpenAI',
    creditCost: 2,
    maxTokens: 8192,
    description: 'STEM ve mantık odaklı derin muhakeme yeteneği.',
    tier: 'reasoning',
  },

  // --- AMİRAL GEMİSİ MODELLER (3 Kredi) ---
  'anthropic/claude-3.5-sonnet': {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    creditCost: 3,
    maxTokens: 8192,
    description: 'Sektör lideri metin kavrama, espri ve vurgu yakalama.',
    tier: 'flagship',
  },
  'anthropic/claude-3.7-sonnet': {
    id: 'anthropic/claude-3.7-sonnet',
    name: 'Claude 3.7 Sonnet',
    provider: 'Anthropic',
    creditCost: 3,
    maxTokens: 8192,
    description: 'Hibrit düşünme yeteneğine sahip en yeni amiral gemisi.',
    tier: 'flagship',
  },
  'openai/gpt-4o': {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    creditCost: 3,
    maxTokens: 4096,
    description: 'OpenAI en yetenekli çok modlu zeka modeli.',
    tier: 'flagship',
  },
};

export const DEFAULT_MODEL = 'google/gemini-2.0-flash-001';
