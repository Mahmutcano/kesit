const T = (en, tr) => ({ en, tr });
export default [
  {
    id: 'slowmo', pack: 'Sports', category: 'timing', icon: 'timer',
    name: T('Slow motion', 'Ağır çekim'), desc: T('Slow down one moment, like a goal or a save.', 'Bir anı yavaşlat: gol, kurtarış, vuruş.'),
    params: [
      { key: 'start', type: 'time', label: T('Starts at (s)', 'Başlangıç (sn)'), default: 3, min: 0, step: 0.1 },
      { key: 'end', type: 'time', label: T('Ends at (s)', 'Bitiş (sn)'), default: 6, min: 0, step: 0.1 },
      { key: 'speed', type: 'range', label: T('Speed', 'Hız'), default: 0.4, min: 0.15, max: 0.9, step: 0.05 },
      { key: 'audio', type: 'select', label: T('Sound', 'Ses'), default: 'slow', options: [{ v: 'slow', ...T('Slowed down', 'Yavaşlatılmış') }, { v: 'mute', ...T('Muted', 'Sessiz') }] },
      { key: 'smooth', type: 'bool', label: T('Smooth frames (slower to render)', 'Akıcı kareler (üretim uzar)'), default: false },
    ],
    build: (p) => ({ time: [{ type: 'slowmo', start: p.start, end: p.end, speed: p.speed, audio: p.audio, smooth: p.smooth }] }),
  },
  {
    id: 'replay', pack: 'Sports', category: 'timing', icon: 'film',
    name: T('Instant replay', 'Tekrar (replay)'), desc: T('Plays a moment again in slow motion, with a REPLAY label.', 'Bir anı ağır çekimde tekrar oynatır, "REPLAY" etiketiyle.'),
    params: [
      { key: 'start', type: 'time', label: T('Moment starts (s)', 'Anın başı (sn)'), default: 3, min: 0, step: 0.1 },
      { key: 'end', type: 'time', label: T('Moment ends (s)', 'Anın sonu (sn)'), default: 6, min: 0, step: 0.1 },
      { key: 'speed', type: 'range', label: T('Replay speed', 'Tekrar hızı'), default: 0.5, min: 0.2, max: 0.9, step: 0.05 },
      { key: 'label', type: 'text', label: T('Label', 'Etiket'), default: 'REPLAY' },
    ],
    build(p, ctx) {
      const s = Math.min(p.start, ctx.duration - 0.3), e = Math.min(Math.max(p.end, s + 0.3), ctx.duration);
      const t0 = e, t1 = e + (e - s) / p.speed;
      const ass = [];
      if (p.label) ass.push(assLabel(ctx, p.label, t0, t1));
      return { time: [{ type: 'replay', start: s, end: e, speed: p.speed, audio: 'slow' }], ass };
    },
  },
];
import { assText, assRect } from '../ass.js';
function assLabel(ctx, label, t0, t1) {
  return assText({ t0, t1, text: label, x: ctx.W * 0.5, y: ctx.H * 0.09, size: ctx.W * 0.07, color: '#FFFFFF', pop: true });
}
