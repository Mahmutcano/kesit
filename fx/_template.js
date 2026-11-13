// Kendi efekt skill'ini yaz: bu dosyayı kopyala, adını `_` olmadan değiştir (ör. fx/hizli-zoom.js), sunucuyu yeniden başlat.
// Bir dosya tek bir efekt ya da bir efekt dizisi export edebilir.
const T = (en, tr) => ({ en, tr });
export default {
  id: 'my-effect',                 // benzersiz, küçük harf
  pack: 'Custom', category: 'look', // sports | timing | motion | look | audio | brand
  icon: 'spark',                    // ui-icons.js içindeki bir ikon adı
  name: T('My effect', 'Efektim'),
  desc: T('What it does, in one line.', 'Ne yaptığını tek satırda anlat.'),
  params: [
    { key: 'amount', type: 'range', label: T('Amount', 'Miktar'), default: 0.3, min: 0, max: 1, step: 0.05 },
    // türler: range, bool, select({options:[{v,en,tr}]}), color, number, time, text, asset({kind:'music'|'logo'})
  ],
  // ctx: { W, H, fps, duration, hasAudio, workDir }
  // Dönüş (hepsi isteğe bağlı): { vf:[ffmpeg video filtreleri], af:[ses filtreleri], ass:[altyazı olayları], time:[...], mix, overlay, outro }
  build(p, ctx) {
    return { vf: [`eq=saturation=${(1 + p.amount).toFixed(2)}`] };
  },
};
