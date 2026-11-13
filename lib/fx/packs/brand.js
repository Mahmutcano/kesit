import { assText, assRect, assProgress, assRichText } from '../ass.js';
import { assetPath } from '../index.js';
const T = (en, tr) => ({ en, tr });
export default [
  {
    id: 'text', pack: 'Branding', category: 'brand', icon: 'type',
    name: T('Title or caption', 'Ekran yazısı / başlık'), desc: T('Text on the video: choose font, color, animation, position and timing. Add it more than once for several texts.', 'Videonun üstüne yazı: yazı tipi, renk, animasyon, konum ve zamanı seç. Birden çok yazı için birkaç kez ekle.'),
    params: [
      { key: 'text', type: 'text', label: T('Text', 'Yazı'), default: 'Watch till the end' },
      { key: 'at', type: 'time', label: T('Appears at (s)', 'Görünme zamanı (sn)'), default: 0.5, min: 0, step: 0.1 },
      { key: 'dur', type: 'range', label: T('Length (s)', 'Süre (sn)'), default: 3, min: 0.5, max: 30, step: 0.5 },
      { key: 'pos', type: 'select', label: T('Position', 'Konum'), default: 'top', options: [{ v: 'top', ...T('Top', 'Üst') }, { v: 'upper', ...T('Upper third', 'Üst üçte bir') }, { v: 'middle', ...T('Middle', 'Orta') }, { v: 'lower', ...T('Lower third', 'Alt üçte bir') }, { v: 'bottom', ...T('Bottom', 'Alt') }] },
      { key: 'shift', type: 'range', label: T('Move up or down (%)', 'Yukarı / aşağı kaydır (%)'), default: 0, min: -20, max: 20, step: 1 },
      { key: 'align', type: 'select', label: T('Alignment', 'Hizalama'), default: 'center', options: [{ v: 'left', ...T('Left', 'Sol') }, { v: 'center', ...T('Center', 'Orta') }, { v: 'right', ...T('Right', 'Sağ') }] },
      { key: 'anim', type: 'select', label: T('Animation', 'Animasyon'), default: 'pop', options: [{ v: 'pop', ...T('Pop', 'Belirme') }, { v: 'fade', ...T('Fade', 'Solma') }, { v: 'slide', ...T('Slide up', 'Aşağıdan kayarak') }, { v: 'typewriter', ...T('Typewriter', 'Daktilo') }, { v: 'none', ...T('None', 'Yok') }] },
      { key: 'font', type: 'select', label: T('Font', 'Yazı tipi'), default: 'Arial', options: [{ v: 'Arial', ...T('Clean', 'Sade') }, { v: 'Georgia', ...T('Serif', 'Serifli') }, { v: 'Impact', ...T('Bold headline', 'Kalın başlık') }, { v: 'Courier New', ...T('Typewriter', 'Daktilo') }, { v: 'Trebuchet MS', ...T('Friendly', 'Samimi') }] },
      { key: 'size', type: 'range', label: T('Size', 'Boyut'), default: 1, min: 0.5, max: 3, step: 0.1 },
      { key: 'bold', type: 'bool', label: T('Bold', 'Kalın'), default: true },
      { key: 'italic', type: 'bool', label: T('Italic', 'İtalik'), default: false },
      { key: 'color', type: 'color', label: T('Text color', 'Yazı rengi'), default: '#FFFFFF' },
      { key: 'outline', type: 'color', label: T('Outline color', 'Kenar rengi'), default: '#000000' },
      { key: 'outlineW', type: 'range', label: T('Outline width', 'Kenar kalınlığı'), default: 3, min: 0, max: 10, step: 1 },
      { key: 'box', type: 'bool', label: T('Colored box behind', 'Arkasında renkli kutu'), default: true },
      { key: 'boxColor', type: 'color', label: T('Box color', 'Kutu rengi'), default: '#111114' },
      { key: 'boxOpacity', type: 'range', label: T('Box opacity', 'Kutu opaklığı'), default: 0.75, min: 0.1, max: 1, step: 0.05 },
    ],
    build(p, ctx) {
      const u = ctx.W / 1080;
      const base = { top: 0.14, upper: 0.28, middle: 0.5, lower: 0.68, bottom: 0.82 }[p.pos] ?? 0.14;
      const y = ctx.H * Math.min(0.95, Math.max(0.05, base + p.shift / 100));
      const sz = 58 * u * p.size, txt = String(p.text ?? '');
      const w = Math.min(ctx.W * 0.94, txt.length * sz * (p.bold ? 0.6 : 0.54) + 80 * u);
      const align = { left: 4, center: 5, right: 6 }[p.align] || 5;
      const m = ctx.W * 0.05;
      const x = p.align === 'left' ? m : p.align === 'right' ? ctx.W - m : ctx.W / 2;
      const ev = [];
      if (p.box) {
        const bx = p.align === 'left' ? m - 30 * u : p.align === 'right' ? ctx.W - m - w + 30 * u : (ctx.W - w) / 2;
        ev.push(assRect({ t0: p.at, t1: p.at + p.dur, x: Math.max(0, bx), y: y - sz * 0.85, w, h: sz * 1.7, color: p.boxColor, alpha: Math.round((1 - p.boxOpacity) * 255), layer: 1 }));
      }
      ev.push(...assRichText({ t0: p.at, t1: p.at + p.dur, text: txt, x, y, size: sz, color: p.color, outline: p.outline, outlineW: p.outlineW * u, font: p.font, bold: p.bold, italic: p.italic, align, anim: p.anim }));
      return { ass: ev };
    },
  },
  {
    id: 'lowerthird', pack: 'Branding', category: 'brand', icon: 'type',
    name: T('Name tag (lower third)', 'İsim bandı'), desc: T('A name and a title that slide in at the bottom, like on TV.', 'Altta kayarak gelen ad ve unvan bandı, televizyondaki gibi.'),
    params: [
      { key: 'name', type: 'text', label: T('Name', 'Ad'), default: 'Your name' },
      { key: 'title', type: 'text', label: T('Title', 'Unvan'), default: 'Your title' },
      { key: 'at', type: 'time', label: T('Appears at (s)', 'Görünme zamanı (sn)'), default: 1, min: 0, step: 0.1 },
      { key: 'dur', type: 'range', label: T('Length (s)', 'Süre (sn)'), default: 4, min: 1.5, max: 15, step: 0.5 },
      { key: 'color', type: 'color', label: T('Accent', 'Vurgu'), default: '#D97757' },
    ],
    build(p, ctx) {
      const u = ctx.W / 1080, x = ctx.W * 0.07, y = ctx.H * 0.78;
      const w = Math.min(ctx.W * 0.86, Math.max(String(p.name).length * 40 * u, String(p.title).length * 28 * u) + 90 * u);
      return { ass: [
        assRect({ t0: p.at, t1: p.at + p.dur, x, y, w, h: 128 * u, color: '#111114', alpha: 40, layer: 1 }),
        assRect({ t0: p.at, t1: p.at + p.dur, x, y, w: 10 * u, h: 128 * u, color: p.color, layer: 2 }),
        ...assRichText({ t0: p.at + 0.1, t1: p.at + p.dur, text: p.name, x: x + 34 * u, y: y + 42 * u, size: 54 * u, align: 4, anim: 'slide', slideFrom: 'left', outlineW: 0, layer: 5 }),
        ...assRichText({ t0: p.at + 0.2, t1: p.at + p.dur, text: p.title, x: x + 34 * u, y: y + 94 * u, size: 34 * u, color: '#DCDAD2', align: 4, anim: 'slide', slideFrom: 'left', bold: false, outlineW: 0, layer: 5 }),
      ] };
    },
  },
  {
    id: 'watermark', pack: 'Branding', category: 'brand', icon: 'type',
    name: T('Text watermark', 'Yazı damgası'), desc: T('Keeps your handle or site name in a corner for the whole clip.', 'Kullanıcı adını ya da site adını klip boyunca bir köşede tutar.'),
    params: [
      { key: 'text', type: 'text', label: T('Text', 'Yazı'), default: '@yourchannel' },
      { key: 'position', type: 'select', label: T('Corner', 'Köşe'), default: 'br', options: [{ v: 'tl', ...T('Top left', 'Sol üst') }, { v: 'tr', ...T('Top right', 'Sağ üst') }, { v: 'bl', ...T('Bottom left', 'Sol alt') }, { v: 'br', ...T('Bottom right', 'Sağ alt') }] },
      { key: 'size', type: 'range', label: T('Size', 'Boyut'), default: 1, min: 0.5, max: 2.5, step: 0.1 },
      { key: 'color', type: 'color', label: T('Color', 'Renk'), default: '#FFFFFF' },
    ],
    build(p, ctx) {
      const u = ctx.W / 1080, m = ctx.W * 0.05, sz = 36 * u * p.size;
      const right = p.position.endsWith('r'), top = p.position.startsWith('t');
      return { ass: assRichText({ t0: 0, t1: ctx.duration, text: p.text, x: right ? ctx.W - m : m, y: top ? ctx.H * 0.06 : ctx.H * 0.93, size: sz, color: p.color, align: right ? 6 : 4, anim: 'fade', fade: 0.4, outlineW: 2 * u, layer: 4 }) };
    },
  },
  {
    id: 'progress', pack: 'Branding', category: 'brand', icon: 'pulse',
    name: T('Progress bar', 'İlerleme çubuğu'), desc: T('A thin bar that fills as the clip plays. Helps people watch to the end.', 'Klip oynarken dolan ince çubuk. İzleyicinin sonuna kadar kalmasına yardım eder.'),
    params: [
      { key: 'color', type: 'color', label: T('Color', 'Renk'), default: '#FFD21F' },
      { key: 'thick', type: 'range', label: T('Thickness', 'Kalınlık'), default: 10, min: 4, max: 24, step: 1 },
      { key: 'top', type: 'bool', label: T('Place on top', 'Üste koy'), default: false },
    ],
    build: (p, ctx) => ({ ass: [assProgress({ t0: 0, t1: ctx.duration, W: ctx.W, H: ctx.H, thickness: p.thick * (ctx.W / 1080), color: p.color, top: p.top })] }),
  },
  {
    id: 'logo', pack: 'Branding', category: 'brand', icon: 'image',
    name: T('Logo watermark', 'Logo damgası'), desc: T('Places your logo in a corner of every frame.', 'Logonu her karenin köşesine yerleştirir.'),
    params: [
      { key: 'file', type: 'asset', kind: 'logo', label: T('Logo image (PNG)', 'Logo görseli (PNG)'), default: '' },
      { key: 'position', type: 'select', label: T('Corner', 'Köşe'), default: 'tr', options: [{ v: 'tl', ...T('Top left', 'Sol üst') }, { v: 'tr', ...T('Top right', 'Sağ üst') }, { v: 'bl', ...T('Bottom left', 'Sol alt') }, { v: 'br', ...T('Bottom right', 'Sağ alt') }] },
      { key: 'size', type: 'range', label: T('Size (% of width)', 'Boyut (% genişlik)'), default: 16, min: 5, max: 40, step: 1 },
      { key: 'opacity', type: 'range', label: T('Opacity', 'Opaklık'), default: 0.85, min: 0.2, max: 1, step: 0.05 },
    ],
    build(p) {
      if (!p.file) throw new Error('Logo için bir görsel seç');
      return { overlay: { file: assetPath('logo', p.file), position: p.position, size: p.size, opacity: p.opacity } };
    },
  },
  {
    id: 'outro', pack: 'Branding', category: 'brand', icon: 'spark', needsAudio: true,
    name: T('Call-to-action end card', 'Kapanış kartı (takip et)'), desc: T('Adds a short end card asking people to follow or subscribe.', 'Sona kısa bir kart ekler: takip et ya da abone ol.'),
    params: [
      { key: 'title', type: 'text', label: T('Headline', 'Başlık'), default: 'Follow for more' },
      { key: 'sub', type: 'text', label: T('Second line', 'İkinci satır'), default: '@yourchannel' },
      { key: 'dur', type: 'range', label: T('Length (s)', 'Süre (sn)'), default: 3, min: 2, max: 6, step: 0.5 },
      { key: 'bg', type: 'color', label: T('Background', 'Zemin'), default: '#1F1E1D' },
      { key: 'color', type: 'color', label: T('Accent', 'Vurgu'), default: '#D97757' },
    ],
    build(p, ctx) {
      const u = ctx.W / 1080;
      const ass = [
        assText({ t0: 0.1, t1: p.dur, text: p.title, x: ctx.W / 2, y: ctx.H * 0.46, size: 84 * u, color: '#FFFFFF', pop: true, fade: 0.2 }),
        assText({ t0: 0.4, t1: p.dur, text: p.sub, x: ctx.W / 2, y: ctx.H * 0.46 + 110 * u, size: 54 * u, color: p.color, bold: true, fade: 0.2 }),
        assRect({ t0: 0, t1: p.dur, x: ctx.W * 0.42, y: ctx.H * 0.46 + 190 * u, w: ctx.W * 0.16, h: 8 * u, color: p.color }),
      ];
      return { outro: { duration: p.dur, bg: p.bg, ass } };
    },
  },
];
