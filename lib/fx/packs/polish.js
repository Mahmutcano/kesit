const T = (en, tr) => ({ en, tr });
const B = (key, en, tr, d = false) => ({ key, type: 'bool', label: T(en, tr), default: d });
export default [
  {
    id: 'speedup', pack: 'Polish', category: 'timing', icon: 'timer', needsAudio: false,
    name: T('Change speed', 'Hız değiştir'), desc: T('Speed up or slow down the whole clip, sound included.', 'Tüm klibi sesiyle birlikte hızlandırır ya da yavaşlatır.'),
    params: [{ key: 'speed', type: 'range', label: T('Speed', 'Hız'), default: 1.25, min: 0.5, max: 3, step: 0.05 }],
    build(p) {
      const chain = []; let sp = p.speed;
      while (sp > 2) { chain.push('atempo=2'); sp /= 2; }
      while (sp < 0.5) { chain.push('atempo=0.5'); sp /= 0.5; }
      chain.push(`atempo=${sp.toFixed(3)}`);
      return { vf: [`setpts=PTS/${p.speed}`], af: chain };
    },
  },
  {
    id: 'mirror', pack: 'Polish', category: 'look', icon: 'film',
    name: T('Mirror', 'Aynala'), desc: T('Flips the picture left to right.', 'Görüntüyü sağdan sola çevirir.'),
    params: [],
    build: () => ({ vf: ['hflip'] }),
  },
  {
    id: 'sharpen', pack: 'Polish', category: 'look', icon: 'sun',
    name: T('Sharpen', 'Netleştir'), desc: T('Adds crispness to soft footage.', 'Yumuşak görüntüye netlik katar.'),
    params: [{ key: 'amount', type: 'range', label: T('Amount', 'Miktar'), default: 0.9, min: 0.2, max: 2, step: 0.1 }],
    build: (p) => ({ vf: [`unsharp=5:5:${p.amount}:5:5:0.0`] }),
  },
  {
    id: 'denoise', pack: 'Polish', category: 'look', icon: 'sun',
    name: T('Reduce picture noise', 'Görüntü gürültüsünü azalt'), desc: T('Smooths grain in dark or low-quality footage.', 'Karanlık ya da düşük kaliteli görüntüdeki taneyi yumuşatır.'),
    params: [{ key: 'level', type: 'range', label: T('Strength', 'Güç'), default: 3, min: 1, max: 8, step: 0.5 }],
    build: (p) => ({ vf: [`hqdn3d=${p.level}:${p.level}:${p.level * 1.5}:${p.level * 1.5}`] }),
  },
  {
    id: 'grain', pack: 'Polish', category: 'look', icon: 'film',
    name: T('Film grain', 'Film greni'), desc: T('A light analog texture over the picture.', 'Görüntünün üstüne hafif analog doku ekler.'),
    params: [{ key: 'amount', type: 'range', label: T('Amount', 'Miktar'), default: 14, min: 4, max: 40, step: 1 }],
    build: (p) => ({ vf: [`noise=alls=${p.amount}:allf=t`] }),
  },
  {
    id: 'vignette', pack: 'Polish', category: 'look', icon: 'sun',
    name: T('Vignette', 'Köşe karartma'), desc: T('Darkens the corners to draw the eye to the center.', 'Köşeleri karartıp gözü merkeze çeker.'),
    params: [{ key: 'angle', type: 'range', label: T('Strength', 'Güç'), default: 0.55, min: 0.2, max: 1.2, step: 0.05 }],
    build: (p) => ({ vf: [`vignette=angle=PI*${p.angle}/2`] }),
  },
  {
    id: 'letterbox', pack: 'Polish', category: 'look', icon: 'film',
    name: T('Cinema bars', 'Sinema bantları'), desc: T('Black bars on top and bottom for a widescreen feel.', 'Üst ve alta siyah bantlar ekler, geniş perde hissi verir.'),
    params: [{ key: 'size', type: 'range', label: T('Bar height (% of height)', 'Bant yüksekliği (% boy)'), default: 10, min: 4, max: 22, step: 1 }],
    build: (p) => ({ vf: [`drawbox=x=0:y=0:w=iw:h=ih*${p.size / 100}:color=black:t=fill`, `drawbox=x=0:y=ih*${1 - p.size / 100}:w=iw:h=ih*${p.size / 100}:color=black:t=fill`] }),
  },
  {
    id: 'brightness', pack: 'Polish', category: 'look', icon: 'sun',
    name: T('Brightness and contrast', 'Parlaklık ve kontrast'), desc: T('Fine-tune light, contrast and color strength.', 'Işık, kontrast ve renk gücünü ayarlar.'),
    params: [
      { key: 'brightness', type: 'range', label: T('Brightness', 'Parlaklık'), default: 0.04, min: -0.3, max: 0.3, step: 0.01 },
      { key: 'contrast', type: 'range', label: T('Contrast', 'Kontrast'), default: 1.08, min: 0.6, max: 1.6, step: 0.02 },
      { key: 'saturation', type: 'range', label: T('Color', 'Renk'), default: 1.1, min: 0, max: 2, step: 0.05 },
    ],
    build: (p) => ({ vf: [`eq=brightness=${p.brightness}:contrast=${p.contrast}:saturation=${p.saturation}`] }),
  },
];
