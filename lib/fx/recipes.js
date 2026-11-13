// Tek tık tarifler: her tarif, klibin kendi bilgisine (dil, süre, kanal adı, başlık, çerçeve) göre efektleri doldurur.
// make(ctx) → [{id, params}]. ctx: { lang, duration, aspect, kind, title, hook, channel, handle, logo, voice, music }
const T = (en, tr) => ({ en, tr });
const WORDS = {
  tr: { follow: 'Daha fazlası için takip et', sub: 'Yeni videolar her hafta', presenter: 'Konuşmacı', cta: 'Hemen dene' },
  en: { follow: 'Follow for more', sub: 'New videos every week', presenter: 'Speaker', cta: 'Try it now' },
  de: { follow: 'Folge uns für mehr', sub: 'Jede Woche neue Videos', presenter: 'Sprecher', cta: 'Jetzt testen' },
  es: { follow: 'Síguenos para más', sub: 'Videos nuevos cada semana', presenter: 'Ponente', cta: 'Pruébalo ya' },
  fr: { follow: 'Abonne-toi pour plus', sub: 'De nouvelles vidéos chaque semaine', presenter: 'Intervenant', cta: 'Essaie maintenant' },
  pt: { follow: 'Siga para ver mais', sub: 'Vídeos novos toda semana', presenter: 'Palestrante', cta: 'Experimente agora' },
  it: { follow: 'Seguici per altro', sub: 'Nuovi video ogni settimana', presenter: 'Relatore', cta: 'Provalo ora' },
  ru: { follow: 'Подписывайся, чтобы не пропустить', sub: 'Новые видео каждую неделю', presenter: 'Спикер', cta: 'Попробуй сейчас' },
  ar: { follow: 'تابعنا للمزيد', sub: 'فيديوهات جديدة كل أسبوع', presenter: 'المتحدث', cta: 'جرّب الآن' },
};
const W = (c) => WORDS[c.lang] || WORDS.en;
const first = (v) => (Array.isArray(v) && v.length ? v[0].id : '');
const tail = (c) => Math.min(3, Math.max(1.8, c.duration * 0.2));
const handle = (c) => c.handle || (c.channel ? '@' + String(c.channel).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '') : '');
const common = (c) => [
  ...(c.duration > 10 ? [{ id: 'silencecut', params: { minSilence: 0.5 } }] : []),
  { id: 'loudness', params: {} },
];

export const RECIPES = [
  {
    id: 'viral', icon: 'sun', name: T('Short-form boost', 'Kısa video (TikTok · Reels · Shorts)'),
    desc: T('Cuts dead air, evens out the sound, adds punch-in zooms, a progress bar and a follow card with your channel name.', 'Boşlukları keser, sesi dengeler, vurgu yakınlaştırmaları, ilerleme çubuğu ve kanal adınla takip kartı ekler.'),
    make: (c) => [...common(c),
      { id: 'zoom', params: { at: +(c.duration * 0.25).toFixed(1), dur: 1.2, amount: 1.18 } },
      { id: 'zoom', params: { at: +(c.duration * 0.6).toFixed(1), dur: 1.2, amount: 1.22 } },
      { id: 'progress', params: { color: '#FFD21F' } },
      { id: 'outro', params: { title: W(c).follow, sub: handle(c) || W(c).sub, dur: 2 } }],
  },
  {
    id: 'podcast', icon: 'mic', name: T('Podcast / interview', 'Podcast / röportaj'),
    desc: T('Clean speech, no long pauses, a name tag with your channel and a progress bar.', 'Temiz konuşma, uzun duraksama yok, kanal adınla isim bandı ve ilerleme çubuğu.'),
    make: (c) => [{ id: 'cleanaudio', params: {} }, ...common(c),
      { id: 'lowerthird', params: { name: c.channel || W(c).presenter, title: (c.title || '').slice(0, 48), at: 1, dur: Math.min(4, c.duration / 3) } },
      { id: 'progress', params: {} }],
  },
  {
    id: 'lesson', icon: 'film', name: T('Lesson / tutorial', 'Eğitim / ders'),
    desc: T('Clear audio, a steady pace, a progress bar so viewers know how much is left, and a closing card.', 'Net ses, akıcı tempo, izleyici ne kadar kaldığını görsün diye ilerleme çubuğu ve kapanış kartı.'),
    make: (c) => [{ id: 'cleanaudio', params: {} }, ...common(c), { id: 'progress', params: { color: '#D97757' } },
      { id: 'outro', params: { title: W(c).follow, sub: handle(c) || W(c).sub, dur: 2.5, bg: '#1F1E1D' } }],
  },
  {
    id: 'promo', icon: 'image', name: T('Promo / ad', 'Tanıtım / reklam'),
    desc: T('A punchier look with your logo (or channel name) and a strong call-to-action card at the end.', 'Daha vurucu görünüm, logon (yoksa kanal adın) ve sonda güçlü bir çağrı kartı.'),
    make: (c) => [...common(c), { id: 'grade', params: { look: 'vivid' } }, { id: 'vignette', params: {} },
      c.logo ? { id: 'logo', params: { file: c.logo } } : { id: 'watermark', params: { text: handle(c) || c.channel || '', position: 'br' } },
      { id: 'outro', params: { title: W(c).cta, sub: handle(c) || c.channel || '', dur: 2.5, color: '#FFD21F' } }],
  },
  {
    id: 'cinematic', icon: 'sun', name: T('Cinematic', 'Sinematik'),
    desc: T('Film colors, soft vignette, letterbox bars and a gentle fade in and out.', 'Film renkleri, yumuşak karartma, sinema şeridi ve yumuşak açılış-kapanış geçişi.'),
    make: () => [{ id: 'grade', params: { look: 'cinematic' } }, { id: 'vignette', params: {} }, { id: 'letterbox', params: {} }, { id: 'fade', params: {} }],
  },
  {
    id: 'clean', icon: 'timer', name: T('Sound clean-up (picture unchanged)', 'Ses temizliği (görüntü değişmez)'),
    desc: T('Audio only: removes silences and brings the sound to a proper level. The picture stays exactly the same.', 'Sadece ses: sessizlikleri kırpar, sesi doğru seviyeye getirir. Görüntü birebir aynı kalır.'),
    make: (c) => [{ id: 'cleanaudio', params: {} }, { id: 'silencecut', params: { minSilence: 0.4 } }, { id: 'loudness', params: {} }],
  },
  {
    id: 'myvoice', icon: 'mic', name: T('My own voice-over', 'Kendi seslendirmem'),
    desc: T('Mutes the original sound and lays your latest recording from Settings → My voice over the clip.', 'Orijinal sesi kapatır, Ayarlar → Sesim\'deki son kaydını klibin üstüne koyar.'),
    needs: 'voice',
    make: (c) => [{ id: 'muteoriginal', params: {} }, { id: 'voiceover', params: { file: c.voice, mode: 'replace' } }, { id: 'fade', params: {} }],
  },
  {
    id: 'brand', icon: 'image', name: T('Branded', 'Markalı'),
    desc: T('Puts your logo (or channel name) on every frame, a progress bar and a follow card.', 'Her karede logon (yoksa kanal adın), ilerleme çubuğu ve takip kartı.'),
    make: (c) => [c.logo ? { id: 'logo', params: { file: c.logo } } : { id: 'watermark', params: { text: handle(c) || c.channel || '', position: 'br' } },
      { id: 'progress', params: {} }, { id: 'outro', params: { title: W(c).follow, sub: handle(c) || W(c).sub, dur: 2 } }],
  },
];
export const buildRecipe = (id, ctx) => {
  const r = RECIPES.find((x) => x.id === id);
  if (!r) throw new Error('Tarif bulunamadı');
  if (r.needs === 'voice' && !ctx.voice) throw new Error('Önce Ayarlar → Sesim bölümünde sesini kaydet');
  return r.make(ctx).filter((e) => !(e.id === 'watermark' && !e.params.text));
};
