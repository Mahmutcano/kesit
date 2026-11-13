import { assText, assRect } from '../ass.js';
import { zoomFilter } from './motion.js';
const T = (en, tr) => ({ en, tr });
export default [
  {
    id: 'goal', pack: 'Sports', category: 'sports', icon: 'spark',
    name: T('Goal moment', 'Gol anı'), desc: T('One click: slow motion, zoom, white flash and a big GOAL! banner at the moment you choose.', 'Tek tıkla: seçtiğin anda ağır çekim, yakınlaştırma, beyaz flaş ve büyük GOL! yazısı.'),
    params: [
      { key: 'at', type: 'time', label: T('Moment of the goal (s)', 'Golün anı (sn)'), default: 4, min: 0, step: 0.1 },
      { key: 'lead', type: 'range', label: T('Slow-motion starts before (s)', 'Ağır çekim şundan önce başlar (sn)'), default: 1.2, min: 0, max: 4, step: 0.1 },
      { key: 'len', type: 'range', label: T('Slow-motion length (s)', 'Ağır çekim süresi (sn)'), default: 2.5, min: 1, max: 6, step: 0.1 },
      { key: 'speed', type: 'range', label: T('Speed', 'Hız'), default: 0.4, min: 0.2, max: 0.8, step: 0.05 },
      { key: 'zoom', type: 'range', label: T('Zoom', 'Yakınlık'), default: 1.3, min: 1, max: 1.8, step: 0.05 },
      { key: 'x', type: 'range', label: T('Focus left ↔ right', 'Odak sol ↔ sağ'), default: 0.5, min: 0, max: 1, step: 0.02 },
      { key: 'text', type: 'text', label: T('Banner text', 'Yazı'), default: 'GOAL!' },
      { key: 'color', type: 'color', label: T('Banner color', 'Yazı rengi'), default: '#FFD21F' },
    ],
    build(p, ctx) {
      const s = Math.max(0, Math.min(ctx.duration - 0.5, p.at - p.lead));
      const e = Math.min(ctx.duration, s + p.len);
      const fin = (e - s) / p.speed; // yavaş bölümün yeni süresi
      const t0 = s, t1 = s + fin;     // nihai zaman çizelgesinde yavaş bölüm
      const ass = [
        assRect({ t0: t0 + (p.at - s) / p.speed, t1: t0 + (p.at - s) / p.speed + 0.35, x: 0, y: 0, w: ctx.W, h: ctx.H, color: '#FFFFFF', alpha: 40, fadeOutMs: 340, layer: 2 }),
      ];
      if (p.text) ass.push(assText({ t0: t0 + (p.at - s) / p.speed, t1: Math.min(t1 + 1.2, t1 + 1.2), text: p.text, x: ctx.W / 2, y: ctx.H * 0.32, size: ctx.W * 0.2, color: p.color, pop: true }));
      return {
        time: [{ type: 'slowmo', start: s, end: e, speed: p.speed, audio: 'slow' }],
        vf: [zoomFilter(ctx, t0, fin + 0.4, p.zoom, p.x, 0.5)],
        ass,
      };
    },
  },
  {
    id: 'scorebug', pack: 'Sports', category: 'sports', icon: 'subs',
    name: T('Score bug', 'Skor bandı'), desc: T('Team names and score, pinned to the corner for the whole clip.', 'Takım adları ve skor, klip boyunca köşede durur.'),
    params: [
      { key: 'home', type: 'text', label: T('Home team', 'Ev sahibi'), default: 'HOME' },
      { key: 'away', type: 'text', label: T('Away team', 'Deplasman'), default: 'AWAY' },
      { key: 'sh', type: 'number', label: T('Home score', 'Ev skoru'), default: 0, min: 0, max: 99 },
      { key: 'sa', type: 'number', label: T('Away score', 'Deplasman skoru'), default: 0, min: 0, max: 99 },
      { key: 'minute', type: 'text', label: T('Match minute (optional)', 'Dakika (isteğe bağlı)'), default: '' },
      { key: 'color', type: 'color', label: T('Accent', 'Vurgu'), default: '#FFD21F' },
    ],
    build(p, ctx) {
      const W = ctx.W, H = ctx.H, u = W / 1080;
      const x = 36 * u, y = (H > W ? 120 : 36) * u, h = 78 * u, w = 560 * u;
      const ev = [
        assRect({ t0: 0, t1: ctx.duration, x, y, w, h, color: '#111114', alpha: 40, layer: 1 }),
        assRect({ t0: 0, t1: ctx.duration, x, y, w: 10 * u, h, color: p.color, layer: 2 }),
        assText({ t0: 0, t1: ctx.duration, text: `${p.home}`, x: x + 34 * u, y: y + h / 2, size: 34 * u, align: 4, fade: 0, layer: 3 }),
        assText({ t0: 0, t1: ctx.duration, text: `${p.sh} - ${p.sa}`, x: x + w * 0.56, y: y + h / 2, size: 40 * u, color: p.color, fade: 0, layer: 3 }),
        assText({ t0: 0, t1: ctx.duration, text: `${p.away}`, x: x + w - 26 * u, y: y + h / 2, size: 34 * u, align: 6, fade: 0, layer: 3 }),
      ];
      if (p.minute) ev.push(assText({ t0: 0, t1: ctx.duration, text: p.minute, x: x + 34 * u, y: y + h + 22 * u, size: 26 * u, align: 4, fade: 0, layer: 3 }));
      return { ass: ev };
    },
  },
];
