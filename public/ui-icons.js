// Tek ikon seti: 24×24, 1.75 çizgi, yuvarlak uç. Parçalı ikonlarda (makas, çark…) parçalar CSS ile hareket eder.
const S = (inner, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inner}</svg>`;

export const ICONS = {
  // yan menü (hareketli)
  cut: S('<g class="b1"><circle cx="6" cy="6.5" r="2.6"/><path d="M7.9 8.4 20 19"/></g><g class="b2"><circle cx="6" cy="17.5" r="2.6"/><path d="M7.9 15.6 20 5"/></g>', 'i-cut'),
  library: S('<rect class="c1" x="3.5" y="3.5" width="7.2" height="7.2" rx="1.8"/><rect class="c2" x="13.3" y="3.5" width="7.2" height="7.2" rx="1.8"/><rect class="c3" x="3.5" y="13.3" width="7.2" height="7.2" rx="1.8"/><rect class="c4" x="13.3" y="13.3" width="7.2" height="7.2" rx="1.8"/>', 'i-lib'),
  settings: S('<g class="gear"><circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/></g>', 'i-set'),
  brand: S('<path class="drop" d="M12 3.2c3.5 4 6 6.7 6 10a6 6 0 0 1-12 0c0-3.3 2.5-6 6-10Z"/><path class="shine" d="M9.2 14.4a3 3 0 0 0 2.4 2.4"/>', 'i-brand'),
  // kompozer
  clip: S('<path d="M21 12.5 12.6 20.9a5.5 5.5 0 0 1-7.8-7.8l8.9-8.9a3.7 3.7 0 0 1 5.2 5.2l-8.8 8.8a1.8 1.8 0 0 1-2.6-2.6l8-8"/>'),
  up: S('<path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/>'),
  chev: S('<path d="m6 9.5 6 6 6-6"/>', 'chev'),
  check: S('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  subs: S('<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M7 11h4M13 11h4M7 15h6"/>'),
  type: S('<path d="M5 7V5h14v2M12 5v14M9 19h6"/>'),
  globe: S('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3Z"/>'),
  frame: S('<path d="M6 3v13a2 2 0 0 0 2 2h13M3 6h13a2 2 0 0 1 2 2v13"/>'),
  film: S('<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>'),
  timer: S('<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 1.5M9.5 2.8h5"/>'),
  swatch: S('<path d="M12 3.2c3.5 4 6 6.7 6 10a6 6 0 0 1-12 0c0-3.3 2.5-6 6-10Z"/>'),
  shuffle: S('<path d="M3 7h3.5c5 0 6 10 11 10H21M3 17h3.5c1.6 0 2.8-1 3.8-2.4M13.7 9.4C14.7 8 15.9 7 17.5 7H21M18 4l3 3-3 3M18 14l3 3-3 3"/>'),
  hook: S('<path d="M7 3v8a5 5 0 0 0 10 0V8M14 11l3 3 3-3"/><circle cx="7" cy="3.5" r="0.6"/>'),
  sun: S('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>'),
  moon: S('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/>'),
  sliders: S('<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>'),
  spark: S('<path d="M12 3c.8 4.8 4.2 8.2 9 9-4.8.8-8.2 4.2-9 9-.8-4.8-4.2-8.2-9-9 4.8-.8 8.2-4.2 9-9Z"/>'),
  mic: S('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"/>'),
  image: S('<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="m21 16-5-5-8.5 9"/>'),
  pulse: S('<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>'),
  x: S('<path d="M6 6l12 12M18 6 6 18"/>'),
  user: S('<circle cx="12" cy="8.5" r="3.6"/><path d="M4.5 20c.8-3.6 3.8-5.5 7.5-5.5s6.7 1.9 7.5 5.5"/>'),
  key: S('<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.8-9.8M17 6l2.5 2.5M14 9l2 2"/>'),
};

const L = (inner, w = 20) => `<svg class="logo-ai" viewBox="0 0 24 24" width="${w}" height="${w}" aria-hidden="true" focusable="false">${inner}</svg>`;
const GRAD = (id, a, b, c) => `<defs><linearGradient id="${id}" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse"><stop stop-color="${a}"/><stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient></defs>`;

const IMG = (f, w = 20) => `<img class="logo-ai" src="/brand/ai/${f}.svg" width="${w}" height="${w}" alt="">`;
// Yapay zeka kaynakları: kendi işaretlerine yakın basitleştirilmiş logolar
export const PROVIDER_LOGO = {
  'kesit-ai': '<img class="logo-ai" src="/brand/kesit-mark.svg" width="20" height="20" alt="">',
  'anthropic-sub': IMG('claude'),
  'anthropic-api': IMG('anthropic'),
  'google-sub': IMG('google'),
  'google-legacy': IMG('gemini'),
  'gemini-api': IMG('gemini'),
  'openai-sub': IMG('openai'),
  'openai-compatible': IMG('openrouter'),
  'custom-cli': L('<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="15" rx="3"/><path d="m7.5 10 3 2.5-3 2.5M13 15h3.5"/></g>'),
  offline: L('<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2.5"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 2.8V6M15 2.8V6M9 18v3.2M15 18v3.2M2.8 9H6M2.8 15H6M18 9h3.2M18 15h3.2"/></g>'),
};
export const providerLogo = (id) => PROVIDER_LOGO[id] || PROVIDER_LOGO.offline;
export const ico = (n) => ICONS[n] || '';
