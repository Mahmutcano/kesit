import { assetPath } from '../index.js';
const T = (en, tr) => ({ en, tr });
export default [
  {
    id: 'cleanaudio', pack: 'Audio', category: 'audio', icon: 'mic', needsAudio: false,
    name: T('Clean and loud audio', 'Temiz ve güçlü ses'), desc: T('Removes background hiss and levels the volume for phones.', 'Fon sesini azaltır, sesi telefonlar için dengeler.'),
    params: [
      { key: 'denoise', type: 'bool', label: T('Reduce noise', 'Gürültüyü azalt'), default: true },
      { key: 'loud', type: 'bool', label: T('Level the volume', 'Sesi dengele'), default: true },
    ],
    build(p) {
      const af = ['highpass=f=70'];
      if (p.denoise) af.push('afftdn=nf=-25');
      if (p.loud) af.push('loudnorm=I=-14:TP=-1.5:LRA=11');
      return { af };
    },
  },
  {
    id: 'music', pack: 'Audio', category: 'audio', icon: 'mic', needsAudio: true,
    name: T('Background music', 'Fon müziği'), desc: T('Adds your own track under the clip and lowers it while someone speaks.', 'Klibe kendi parçanı ekler, biri konuşurken kısar.'),
    params: [
      { key: 'file', type: 'asset', kind: 'music', label: T('Music file', 'Müzik dosyası'), default: '' },
      { key: 'volume', type: 'range', label: T('Volume', 'Ses seviyesi'), default: 0.25, min: 0.05, max: 1, step: 0.05 },
      { key: 'duck', type: 'bool', label: T('Lower music while speaking', 'Konuşurken müziği kıs'), default: true },
      { key: 'fadeIn', type: 'range', label: T('Fade in (s)', 'Açılış (sn)'), default: 0.5, min: 0, max: 5, step: 0.1 },
      { key: 'fadeOut', type: 'range', label: T('Fade out (s)', 'Kapanış (sn)'), default: 1.5, min: 0, max: 6, step: 0.1 },
      { key: 'startAt', type: 'time', label: T('Start the track at (s)', 'Parçaya şuradan başla (sn)'), default: 0, min: 0, step: 1 },
    ],
    note: T('Use music you own or have a license for. Platforms can block or demonetize videos with unlicensed tracks.', 'Yalnızca sahibi olduğun ya da lisansı olan müziği kullan. Lisanssız müzik videonun engellenmesine ya da gelirsiz kalmasına yol açabilir.'),
    build(p) {
      if (!p.file) throw new Error('Müzik için bir dosya seç');
      return { mix: { file: assetPath('music', p.file), volume: p.volume, duck: p.duck, fadeIn: p.fadeIn, fadeOut: p.fadeOut, startAt: p.startAt } };
    },
  },
  {
    id: 'voiceover', pack: 'Audio', category: 'audio', icon: 'mic', needsAudio: true,
    name: T('Your voice-over', 'Kendi sesin (seslendirme)'), desc: T('Upload or record your own voice. Replace the clip audio or mix it on top.', 'Kendi sesini yükle ya da kaydet. Klibin sesinin yerine koy ya da üstüne karıştır.'),
    params: [
      { key: 'file', type: 'asset', kind: 'voice', label: T('Voice recording', 'Ses kaydı'), default: '' },
      { key: 'mode', type: 'select', label: T('How to use it', 'Nasıl kullanılsın'), default: 'replace', options: [{ v: 'replace', ...T('Replace the original audio', 'Orijinal sesin yerine koy') }, { v: 'mix', ...T('Mix with the original audio', 'Orijinal sesle karıştır') }] },
      { key: 'volume', type: 'range', label: T('Voice volume', 'Ses seviyen'), default: 1, min: 0.3, max: 2.5, step: 0.05 },
      { key: 'origVolume', type: 'range', label: T('Original audio level (mix)', 'Orijinal ses seviyesi (karışımda)'), default: 0.25, min: 0, max: 1, step: 0.05 },
      { key: 'duck', type: 'bool', label: T('Lower original while you speak', 'Sen konuşurken orijinali kıs'), default: true },
      { key: 'startAt', type: 'time', label: T('Voice starts at (s)', 'Ses şuradan başlasın (sn)'), default: 0, min: 0, step: 0.1 },
    ],
    note: T('Tip: pair it with "Mute original audio" for a clean voice-over, and add music on top.', 'İpucu: temiz bir seslendirme için "Orijinal sesi kapat" ile birlikte kullan, üstüne müzik ekleyebilirsin.'),
    build(p) {
      if (!p.file) throw new Error('Seslendirme için bir ses dosyası seç ya da kaydet');
      return { voice: { file: assetPath('voice', p.file), mode: p.mode, volume: p.volume, origVolume: p.origVolume, duck: p.duck, startAt: p.startAt } };
    },
  },
  {
    id: 'muteoriginal', pack: 'Audio', category: 'audio', icon: 'mic', needsAudio: false,
    name: T('Mute original audio', 'Orijinal sesi kapat'), desc: T('Removes the sound of the clip. Add your own voice or music instead.', 'Klibin sesini tamamen kapatır. Yerine kendi sesini ya da müzik ekleyebilirsin.'),
    params: [],
    build: () => ({ af: ['volume=0'] }),
  },
  {
    id: 'volume', pack: 'Audio', category: 'audio', icon: 'mic', needsAudio: false,
    name: T('Volume level', 'Ses seviyesi'), desc: T('Make the clip quieter or louder.', 'Klibi daha kısık ya da daha yüksek yapar.'),
    params: [{ key: 'gain', type: 'range', label: T('Level', 'Seviye'), default: 1.3, min: 0.1, max: 3, step: 0.05 }],
    build: (p) => ({ af: [`volume=${p.gain}`] }),
  },
  {
    id: 'fade', pack: 'Audio', category: 'audio', icon: 'sun', needsAudio: false,
    name: T('Fade in and out', 'Açılış ve kapanış geçişi'), desc: T('Fades picture and sound from and to black.', 'Görüntü ve sesi karartarak açar ve kapatır.'),
    params: [
      { key: 'fadeIn', type: 'range', label: T('Fade in (s)', 'Açılış (sn)'), default: 0.6, min: 0, max: 4, step: 0.1 },
      { key: 'fadeOut', type: 'range', label: T('Fade out (s)', 'Kapanış (sn)'), default: 0.8, min: 0, max: 4, step: 0.1 },
    ],
    build(p, ctx) {
      const vf = [], af = [], D = ctx.duration;
      if (p.fadeIn) { vf.push(`fade=t=in:st=0:d=${p.fadeIn}`); af.push(`afade=t=in:st=0:d=${p.fadeIn}`); }
      if (p.fadeOut) { const st = Math.max(0, D - p.fadeOut).toFixed(2); vf.push(`fade=t=out:st=${st}:d=${p.fadeOut}`); af.push(`afade=t=out:st=${st}:d=${p.fadeOut}`); }
      return { vf, af };
    },
  },
];
