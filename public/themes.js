// Tema ön ayarları — renkler, yazı tipi, doku
export const FONTS = {
  hand: '"Patrick Hand", "Comic Sans MS", system-ui, sans-serif',
  marker: '"Permanent Marker", "Patrick Hand", system-ui, sans-serif',
  bold: '"Bangers", "Impact", system-ui, sans-serif',
  clean: '"Inter", "Segoe UI", system-ui, sans-serif',
  round: '"Nunito", "Segoe UI", system-ui, sans-serif',
  serif: '"Playfair Display", Georgia, serif',
  impact: '"Anton", "Impact", "Arial Black", system-ui, sans-serif',
  mono: '"Press Start 2P", "Courier New", monospace',
};

export const THEMES = {
  moody: { name: 'Karanlık Sinema', bg: '#0E1015', bg2: '#171A22', stroke: '#F1E9DA', accent: '#FFD54A', accent2: '#FF4D4D', text: '#FFFFFF', font: 'impact', texture: 'grain', dark: true },
  classic: { name: 'Klasik Siyah-Beyaz', bg: '#FFFFFF', bg2: '#F2F2F2', stroke: '#111111', accent: '#E63946', accent2: '#1D3557', text: '#111111', font: 'hand', texture: 'none' },
  pop: { name: 'Modern Pop', bg: '#FFF4E0', bg2: '#FFE3B3', stroke: '#1D1D1F', accent: '#FF5A5F', accent2: '#00B3A6', text: '#1D1D1F', font: 'bold', texture: 'none' },
  cave: { name: 'Tarih Öncesi Mağara', bg: '#E8D3A8', bg2: '#D4B483', stroke: '#4A2C17', accent: '#C1440E', accent2: '#7A5230', text: '#3B220F', font: 'marker', texture: 'paper' },
  cozy: { name: 'Sıcak Hikaye', bg: '#FBEFE3', bg2: '#F4DCC5', stroke: '#3B2F2F', accent: '#E07A5F', accent2: '#81B29A', text: '#3B2F2F', font: 'round', texture: 'paper' },
  history: { name: 'Tarihi Karikatür', bg: '#F3E9D2', bg2: '#E6D5AE', stroke: '#2E2418', accent: '#9C2C2C', accent2: '#3E5C76', text: '#2E2418', font: 'serif', texture: 'paper' },
  noir: { name: 'Amber Noir', bg: '#121212', bg2: '#1F1A12', stroke: '#F5E6C8', accent: '#FFB000', accent2: '#FF6B35', text: '#F5E6C8', font: 'clean', texture: 'grain' },
  neon: { name: 'Neon Gece', bg: '#0B0B1E', bg2: '#1A0B2E', stroke: '#FFFFFF', accent: '#00F0FF', accent2: '#FF2BD6', text: '#FFFFFF', font: 'bold', texture: 'none' },
  pastel: { name: 'Pastel', bg: '#F7F3FF', bg2: '#ECE4FF', stroke: '#2E2A47', accent: '#A78BFA', accent2: '#F472B6', text: '#2E2A47', font: 'round', texture: 'none' },
  blueprint: { name: 'Blueprint', bg: '#0E3A6B', bg2: '#0A2D55', stroke: '#E6F1FF', accent: '#FFD166', accent2: '#7FDBFF', text: '#E6F1FF', font: 'clean', texture: 'grid' },
  chalk: { name: 'Kara Tahta', bg: '#23352B', bg2: '#1B2A22', stroke: '#F2F2F2', accent: '#F6C85F', accent2: '#8ECAE6', text: '#F2F2F2', font: 'hand', texture: 'chalk' },
  retro: { name: 'Retro TV', bg: '#F0E6D2', bg2: '#E2D3B5', stroke: '#2D2A26', accent: '#E4572E', accent2: '#17BEBB', text: '#2D2A26', font: 'marker', texture: 'crt' },
  dark: { name: 'Minimal Koyu', bg: '#111827', bg2: '#0B1220', stroke: '#F9FAFB', accent: '#22C55E', accent2: '#3B82F6', text: '#F9FAFB', font: 'clean', texture: 'none' },
  whiteboard: { name: 'Beyaz Tahta', bg: '#FFFFFF', bg2: '#F7F7F7', stroke: '#1F2937', accent: '#2563EB', accent2: '#DC2626', text: '#1F2937', font: 'marker', texture: 'whiteboard' },
  sunset: { name: 'Gün Batımı', bg: '#FFE8D6', bg2: '#FFB4A2', stroke: '#2B2D42', accent: '#EF476F', accent2: '#FFD166', text: '#2B2D42', font: 'bold', texture: 'none' },
  matrix: { name: 'Hacker Yeşili', bg: '#030B05', bg2: '#06170B', stroke: '#B8FFC9', accent: '#00FF66', accent2: '#00B347', text: '#B8FFC9', font: 'mono', texture: 'crt' },
  pixel: { name: '8-bit Oyun', bg: '#1E1B3A', bg2: '#2B2560', stroke: '#FFFFFF', accent: '#FFCD38', accent2: '#FF4F79', text: '#FFFFFF', font: 'mono', texture: 'crt' },
};

export function resolveTheme(id, custom) {
  const base = THEMES[id] || THEMES.classic;
  // custom: kullanıcının değiştirdiği renkler/yazı tipi/doku (ön ayarın üzerine yazılır)
  const t = { ...base, ...(custom || {}) };
  t.fontFamily = FONTS[t.font] || FONTS.hand;
  t.dark = luminance(t.bg) < 0.4;
  return t;
}

export function luminance(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function withAlpha(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
