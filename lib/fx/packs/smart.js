// Videoya göre çalışan işleme efektleri: sessizlikleri kırp, sesi platform seviyesine getir, vurgu yakınlaştırmaları.
const T = (en, tr) => ({ en, tr });
export default [
  {
    id: 'silencecut', pack: 'Smart', category: 'timing', icon: 'timer', needsAudio: false,
    name: T('Cut silences', 'Sessizlikleri kırp'), desc: T('Removes pauses and dead air so the clip moves faster and keeps people watching.', 'Duraksamaları ve boşlukları keser; klip hızlanır, izleyici kopmaz.'),
    params: [
      { key: 'minSilence', type: 'range', label: T('Shortest pause to cut (s)', 'Kesilecek en kısa duraksama (sn)'), default: 0.45, min: 0.2, max: 1.5, step: 0.05 },
      { key: 'threshold', type: 'range', label: T('Quiet level (dB)', 'Sessizlik seviyesi (dB)'), default: -34, min: -50, max: -20, step: 1 },
    ],
    note: T('Sound and picture stay in sync. Clips with music under the speech may need a lower quiet level.', 'Ses ve görüntü eş kalır. Konuşmanın altında müzik varsa sessizlik seviyesini düşür.'),
    build: (p) => ({ time: [{ type: 'silencecut', minSilence: p.minSilence, threshold: p.threshold }] }),
  },
  {
    id: 'loudness', pack: 'Smart', category: 'audio', icon: 'mic', needsAudio: false,
    name: T('Platform loudness', 'Platform ses seviyesi'), desc: T('Brings the sound to the level TikTok, Reels and YouTube expect, so it is never too quiet.', 'Sesi TikTok, Reels ve YouTube\'un beklediği seviyeye getirir; klip kısık kalmaz.'),
    params: [{ key: 'target', type: 'range', label: T('Target loudness (LUFS)', 'Hedef ses seviyesi (LUFS)'), default: -14, min: -20, max: -10, step: 1 }],
    build: (p) => ({ af: [`loudnorm=I=${p.target}:TP=-1.5:LRA=11`] }),
  },
];
