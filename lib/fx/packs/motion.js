const T = (en, tr) => ({ en, tr });
export default [
  {
    id: 'zoom', pack: 'Motion', category: 'motion', icon: 'frame',
    name: T('Punch-in zoom', 'Yakınlaştırma (punch-in)'), desc: T('Smoothly zooms into the action and back out.', 'Aksiyona yumuşakça yaklaşır ve geri açılır.'),
    params: [
      { key: 'at', type: 'time', label: T('Starts at (s)', 'Başlangıç (sn)'), default: 2, min: 0, step: 0.1 },
      { key: 'dur', type: 'range', label: T('Length (s)', 'Süre (sn)'), default: 3, min: 0.6, max: 10, step: 0.2 },
      { key: 'amount', type: 'range', label: T('Zoom amount', 'Yakınlık'), default: 1.35, min: 1.1, max: 2, step: 0.05 },
      { key: 'x', type: 'range', label: T('Focus left ↔ right', 'Odak sol ↔ sağ'), default: 0.5, min: 0, max: 1, step: 0.02 },
      { key: 'y', type: 'range', label: T('Focus top ↔ bottom', 'Odak üst ↔ alt'), default: 0.5, min: 0, max: 1, step: 0.02 },
    ],
    build: (p, ctx) => ({ vf: [zoomFilter(ctx, p.at, p.dur, p.amount, p.x, p.y)] }),
  },
];
export function zoomFilter(ctx, at, dur, amount, fx = 0.5, fy = 0.5) {
  const a = Number(at), b = a + Number(dur), Z = Number(amount);
  const ramp = Math.max(0.25, Math.min(0.8, (b - a) / 3));
  const t = `(on/${ctx.fps})`;
  const k = `min(1,min((${t}-${a})/${ramp},(${b}-${t})/${ramp}))`;
  const z = `if(between(${t},${a},${b}),1+(${Z}-1)*${k},1)`;
  return `zoompan=z='${z}':x='(iw-iw/zoom)*${fx}':y='(ih-ih/zoom)*${fy}':d=1:s=${ctx.W}x${ctx.H}:fps=${ctx.fps}`;
}
