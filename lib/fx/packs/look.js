const T = (en, tr) => ({ en, tr });
const LOOKS = {
  stadium: 'eq=contrast=1.1:saturation=1.28:gamma=0.98,unsharp=5:5:0.8:5:5:0.0',
  cinematic: 'eq=contrast=1.1:saturation=0.9:gamma=0.97,colorbalance=rs=-0.05:bs=0.07:rh=0.07:bh=-0.05,vignette=PI/5',
  vivid: 'eq=saturation=1.4:contrast=1.06,unsharp=5:5:0.6:5:5:0.0',
  warm: 'eq=saturation=1.08,colorbalance=rs=0.06:gs=0.01:bs=-0.07:rh=0.05:bh=-0.05',
  cool: 'eq=saturation=1.05,colorbalance=rs=-0.05:bs=0.07:rh=-0.04:bh=0.06',
  bw: 'hue=s=0,eq=contrast=1.18:gamma=0.95,vignette=PI/6',
};
export default [
  {
    id: 'grade', pack: 'Look', category: 'look', icon: 'sun',
    name: T('Color look', 'Renk görünümü'), desc: T('Give the whole clip a consistent color style.', 'Tüm klibe tutarlı bir renk stili verir.'),
    params: [
      { key: 'look', type: 'select', label: T('Look', 'Görünüm'), default: 'stadium', options: [
        { v: 'stadium', ...T('Stadium (punchy, sharp)', 'Stadyum (canlı, keskin)') }, { v: 'cinematic', ...T('Cinematic', 'Sinematik') }, { v: 'vivid', ...T('Vivid', 'Canlı') },
        { v: 'warm', ...T('Warm', 'Sıcak') }, { v: 'cool', ...T('Cool', 'Soğuk') }, { v: 'bw', ...T('Black and white', 'Siyah beyaz') }] },
    ],
    build: (p) => ({ vf: [LOOKS[p.look] || LOOKS.stadium] }),
  },
];
