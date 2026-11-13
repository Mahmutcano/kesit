// Arayüz dili: varsayılan İngilizce, Türkçe seçenek. Kaynak metinler Türkçedir;
// İngilizce modda DOM'daki metinler, yer tutucular ve başlıklar bu sözlükle çevrilir (dinamik içerik dahil).
const TR_EN = {
  'Akıllı takip': 'Smart tracking',
  'Kapalı (sabit kadraj)': 'Off (fixed framing)',
  'Yüzü takip et': 'Follow the face',
  'Topu takip et': 'Follow the ball',
  'Hareketi takip et': 'Follow the action',
  'İşaretlediğim top': 'The ball I mark',
  'İşaretlediğim kişi / nesne': 'The person / object I mark',
  'Yakınlık': 'Zoom',
  'Takibi hesapla': 'Calculate tracking',
  'Yayıncı: kamera üstte, oyun altta': 'Streamer: camera on top, gameplay below',
  'Yayıncı: kamera üstte': 'Streamer: camera on top',
  'Kamera nerede?': 'Where is the camera?',
  'Sol alt': 'Bottom left',
  'Sağ alt': 'Bottom right',
  'Sol üst': 'Top left',
  'Sağ üst': 'Top right',
  'Kamera boyutu': 'Camera size',
  'Oran': 'Ratio',
  'Takip': 'Tracking',
  'Kamera': 'Camera',
  'Yüz': 'Face',
  'Top': 'Ball',
  'Hareket': 'Action',
  'Kapalı': 'Off',
  'Kendi sesini kaydet ya da yükle. Klibi geliştirirken "Kendi sesin" efektiyle videoya koyabilir, orijinal sesi kapatabilirsin.': 'Record or upload your own voice. When enhancing a clip, use the "Your voice-over" effect to put it on the video and mute the original sound.',
  'Anahtarı yapıştır': 'Paste the key',
  'Üretim bittiğinde kısa bir ses duyarsın.': 'You hear a short sound when generation finishes.',
  'Başka sekmedeyken bile haber verir.': 'Lets you know even when you are on another tab.',
  'Bu tercihler yalnızca bu bilgisayarda saklanır.': 'These preferences are stored only on this computer.',
  'Anahtar yalnızca bu bilgisayarda saklanır, hiçbir yere gönderilmez.': 'The key is stored only on this computer and is never sent anywhere.',
  'Mikrofon izni verilmedi. Tarayıcı ayarlarından izin ver.': 'Microphone permission was not granted. Allow it in your browser settings.',
  'Henüz kayıt yok. Mikrofonla kaydet ya da hazır bir ses dosyası yükle.': 'No recordings yet. Record with your microphone or upload an audio file.',
  'Profil ve tercihler': 'Profile and preferences',
  'Adın': 'Your name',
  'Avatarın': 'Your avatar',
  'Tercihler': 'Preferences',
  'Kısayollar': 'Shortcuts',
  'Tamam': 'Done',
  'Klipler bitince ses çal': 'Play a sound when clips finish',
  'Masaüstü bildirimi göster': 'Show desktop notification',
  'Sesim': 'My voice',
  'Sesim (ses kayıtların)': 'My voice (your recordings)',
  'Tüm ayarlar': 'All settings',
  'Kayda başla': 'Start recording',
  'Ses dosyası yükle': 'Upload audio file',
  'Anahtarı nereden alırım?': 'Where do I get a key?',
  'Kaydet ve kullan': 'Save and use',
  'Anahtar kaydedildi': 'Key saved',
  'Kendi seslendirmem': 'My own voice-over',
  'Alt': 'Bottom', 'Orta': 'Middle', 'Üst': 'Top',
  'Altyazı': 'Subtitles', 'Altyazı satırları': 'Subtitle lines', 'Altyazı şablonu': 'Subtitle style',
  'Ayarlar': 'Settings', 'Ayarlar ve kurulum': 'Settings and setup', 'Açık / koyu tema': 'Light / dark theme',
  'Başla': 'Start', 'Başlangıç': 'Start', 'Başlık': 'Title', 'Bitiş': 'End', 'Boyut': 'Size',
  'Boş bırakırsan gösterilmez': 'Hidden if left empty',
  'Bu bilgiler yalnızca bilgisayarındaki': 'This information is only written to',
  'dosyasına yazılır.': 'on your computer.',
  'Bu bilgisayarda çalışır': 'Runs on this computer',
  'Dil': 'Language', 'Video dili': 'Video language', 'Hazırlanıyor…': 'Getting ready…', 'Hepsi aynı': 'All the same', 'Her klip farklı': 'Every clip different',
  'Hook başlığı': 'Hook title', 'Hook başlığı (ilk saniyelerde üstte görünür)': 'Hook title (shown on top in the first seconds)',
  'Yerleşim': 'Layout', 'Doldur': 'Fill', 'Bulanık çerçeve': 'Blur fit', '✨ Geliştir': '✨ Enhance',
  'Kadraj': 'Framing', 'Kadrajı kaydır (sol ↔ sağ)': 'Shift framing (left ↔ right)',
  'Kanal adı': 'Channel name', 'Kanalı oluştur': 'Create channel', 'Yeni kanal': 'New channel',
  'Kanalın konsepti, üretilen her videonun tonunu ve konusunu belirler.': "The channel concept sets the tone and topic of every video.",
  'Kapak': 'Cover', 'Kapat': 'Close', 'Kaydet': 'Save', 'Kaydet ve yeniden üret': 'Save and re-render',
  'Kesikli çerçeve klibin kadrajıdır. Oynatıcı kaynağın tamamını gösterir.': 'The dashed frame is the clip framing. The player shows the whole source.',
  'Kesit — klip stüdyosu': 'Kesit — clip studio',
  'Klibi düzenle': 'Edit clip', 'Klip': 'Clips', 'Klip oluştur': 'Create clips', 'Klipleri üret': 'Generate clips',
  'Konsept': 'Concept', 'Konum': 'Position', 'Kurulum durumu': 'Setup status', 'Kütüphane': 'Library',
  'Marka rehberi': 'Brand guide', 'Model (boş = varsayılan)': 'Model (empty = default)',
  'Görsel oluşturucu API anahtarı': 'Image generator API key',
  'OpenAI uyumlu base URL': 'OpenAI-compatible base URL', 'OpenAI uyumlu key': 'OpenAI-compatible key', 'OpenAI uyumlu model': 'OpenAI-compatible model',
  'Orijinal': 'Original', 'Render': 'Render', 'Sahneleri düzenle ve yeniden render al': 'Edit scenes and re-render',
  'Senaryo': 'Script', 'Ses': 'Voice', 'Son üretimler': 'Recent', 'Süre': 'Length',
  'Stil, tema ve ilk konu fikirlerini yapay zeka önersin': 'Let AI suggest style, theme and first topic ideas',
  'Transkriptten yeniden oluştur': 'Rebuild from transcript',
  'Uzun bir video bırak. Her biri farklı görünen, altyazılı, paylaşıma hazır klipler al.': 'Drop in a long video. Get subtitled, share-ready clips that each look different.',
  'Varsayılan': 'Default', 'Vazgeç': 'Cancel', 'Vurgu': 'Accent',
  'Video bu bilgisayara indirilir; en iyi anları bu bilgisayardaki yapay zekan seçer. Yalnızca kendi videolarını ya da kullanım iznin olan içerikleri kullan.': 'The video is downloaded to this computer and the AI on this computer picks the best moments. Only use your own videos or content you have permission to use.',
  'Yapay zeka (bu bilgisayardaki hesabın)': 'AI (your account on this computer)',
  'Yerel stüdyo': 'Local studio', 'Yok': 'None',
  'YouTube bağlantısı yapıştır ya da bir video dosyası yükle': 'Paste a YouTube link or upload a video file',
  'Çeşitlilik': 'Variety', 'Özel CLI (başka bir agent\'ın token\'ı)': 'Custom CLI (another agent\'s token)',
  'İsteğe bağlı API anahtarları': 'Optional API keys',
  'ör: Psikoloji ve alışkanlıklar hakkında 1 dakikalık, esprili ve şaşırtıcı bilgiler. Hedef kitle 18-30 yaş.': 'e.g. One-minute witty facts about psychology and habits. Audience 18-30.',
  'ör: Zihin Atölyesi': 'e.g. Mind Workshop',
  'şu an ⇥': 'now ⇥', '⇤ şu an': '⇤ now', '← Geri': '← Back', '↻ Sıfırla': '↻ Reset', '↻ Yeniden render': '↻ Re-render',
  '▶ Kesiti oynat': '▶ Play segment', '▶ Önizle': '▶ Preview', '⬆ Yükle': '⬆ Upload', '＋ Satır': '＋ Line',
  'Anthropic aboneliği': 'Anthropic subscription', 'Google hesabı (abonelik)': 'Google account (subscription)', 'OpenAI aboneliği': 'OpenAI subscription', 'Özel entegrasyon': 'Custom integration', 'Yapay zekâ': 'AI', 'Seslendirme': 'Voice-over', 'Video alma': 'Video import', 'Konuşma tanıma': 'Speech recognition', 'Video işleme': 'Video processing', 'Hızlı önizleme': 'Fast preview', 'Gelişmiş seslendirme': 'Premium voice-over', 'Alternatif seslendirme': 'Alternative voice-over', 'Altyazı gömme': 'Subtitle burn-in', 'Eklenti kurulumu': 'Add-on setup', 'hazır': 'ready', 'kurulum gerekli': 'setup required', 'kullanılamıyor': 'unavailable',
  'Gemini CLI (eski, kapatıldı)': 'Gemini CLI (legacy, retired)', 'Codex CLI (ChatGPT aboneliğim)': 'Codex CLI (my ChatGPT subscription)',
  'Özel CLI komutu': 'Custom CLI command', 'Anthropic API anahtarı': 'Anthropic API key', 'Gemini API anahtarı': 'Gemini API key',
  'OpenAI uyumlu API (OpenRouter, Ollama...)': 'OpenAI-compatible API (OpenRouter, Ollama…)', 'Yapay zekasız (kural tabanlı)': 'No AI (rule-based)',
  'ElevenLabs': 'ElevenLabs', 'OpenAI TTS': 'OpenAI TTS', 
  'git (skill kurulumu)': 'git (skill install)', 'edge-tts (ses)': 'edge-tts (voice)',
  'şablon yok': 'no template', 'anahtar yok': 'no key', 'tanımsız': 'not set', 'her zaman': 'always', 'var': 'ready',
  'ör: mycli ask --file {prompt_file}': 'e.g. mycli ask --file {prompt_file}',
  'Anthropic API anahtarı': 'Anthropic API key', 'Anthropic modeli': 'Anthropic model', 'Gemini modeli': 'Gemini model',
  'Uzun videoyu yapıştır. En iyi kesitleri al.': 'Paste the long video. Get the best cuts.', 'Kesitler': 'Cuts',
  'aboneliğim': 'my subscription', 'Google hesabım': 'my Google account', 'eski, kapatıldı': 'legacy, retired', 'ChatGPT aboneliğim': 'my ChatGPT subscription',
  'OpenAI uyumlu API': 'OpenAI-compatible API', 'OpenRouter, Ollama…': 'OpenRouter, Ollama…', 'Yapay zekasız': 'No AI', 'kural tabanlı': 'rule-based',
  'OpenAI uyumlu API (OpenRouter, Ollama...)': 'OpenAI-compatible API (OpenRouter, Ollama…)',
  'Genel': 'General', 'Yapay zeka': 'AI', 'Görsel': 'Images', 'Sistem durumu': 'System status',
  'Arayüz dili': 'Interface language', 'Menüler ve düğmeler bu dilde görünür.': 'Menus and buttons appear in this language.',
  'Görünüm': 'Appearance', 'Açık ya da koyu tema.': 'Light or dark theme.', 'Temayı değiştir': 'Switch theme',
  'Abonelik hesaplarının ayarı gerekmez. Aşağıdakiler yalnızca API anahtarıyla çalışmak istersen.': 'Subscription accounts need no setup. The options below are only for working with an API key.',
  'API anahtarı': 'API key', 'Model': 'Model', 'Base URL': 'Base URL', 'OpenRouter, Ollama ve benzerleri.': 'OpenRouter, Ollama and similar.',
  'OpenAI uyumlu': 'OpenAI-compatible', 'Özel komut': 'Custom command', 'Komut şablonu': 'Command template',
  'Başka bir agent\'ın komutunu çalıştırır.': 'Runs another agent\'s command.',
  'Film stüdyosu görselleri için kredili bulut görsel servisi.': 'Paid cloud image service for Film studio images.',
  'Görsel oluşturucu API': 'Image generator API',
  'OpenAI uyumlu API (OpenRouter, Ollama…)': 'OpenAI-compatible API (OpenRouter, Ollama…)',
  'Hızlı başlangıç': 'Quick start', 'Podcast': 'Podcast', 'Kısa klipler': 'Short clips', 'Ders ve sunum': 'Lectures and talks', 'Öne çıkanlar': 'Highlights',
  // dinamik
  'İyi geceler': 'Good night', 'Günaydın': 'Good morning', 'İyi günler': 'Good afternoon', 'İyi akşamlar': 'Good evening',
  'Bir üretim zaten sürüyor': 'A job is already running',
  'Video indiriliyor': 'Downloading video', 'Video yükleniyor': 'Uploading video', 'Transkript': 'Transcript',
  'En iyi anlar seçiliyor': 'Picking the best moments', 'Klipler hazırlanıyor': 'Rendering clips',
  'Uzun videolarda indirme birkaç dakika sürebilir. Bu sayfadan ayrılma.': 'Long videos can take a few minutes to download. Stay on this page.',
  'konuşma yazıya dökülüyor, uzun sürebilir': 'transcribing speech, this can take a while',
  'altyazı yok: klipler eşit bölünecek, altyazısız olacak': 'no subtitles: clips will be split evenly, without subtitles',
  'yapay zeka seçti': 'AI picked', 'otomatik bölündü': 'split automatically', 'Kesit bulunamadı': 'No segments found',
  'Bir video bağlantısı yapıştır ya da dosya yükle': 'Paste a video link or upload a file', 'Bağlantı https:// ile başlamalı': 'The link must start with https://',
  'Henüz klip üretmedin. Yukarıya bir bağlantı yapıştır ya da video yükle.': 'No clips yet. Paste a link above or upload a video.',
  'Bu klip ve dosyaları diskten kalıcı olarak silinsin mi? Geri alınamaz.': 'Permanently delete this clip and its files from disk? This cannot be undone.',
  'Bu video ve dosyaları diskten kalıcı olarak silinsin mi? Geri alınamaz.': 'Permanently delete this video and its files from disk? This cannot be undone.',
  'Altyazı satırı yok. Bu videonun transkripti bulunamadı; "＋ Satır" ile elle yazabilirsin.': 'No subtitle lines. No transcript was found for this video; add lines with "＋ Line".',
  'Yeniden üretiliyor…': 'Re-rendering…', 'Klip güncellendi': 'Clip updated', 
  
  'Sunucuya ulaşılamadı: ': 'Cannot reach the server: ', '⬇ İndir': '⬇ Download', 'Düzenle': 'Edit', 'Sil': 'Delete',
  '⬇ Video': '⬇ Video', 'Açıklama': 'Description', 'Sesler': 'Voices', 'Ses hatası: ': 'Voice error: ',
  'Satırı sil': 'Delete line', 'Yükleniyor…': 'Loading…',
  ' · Altyazı videoya gömülemedi, .srt dosyası kaydedildi': ' · Subtitles could not be burned in, .srt saved',
  'Süren üretim bitince yenisini başlatabilirsin': 'You can start a new job when the current one finishes',
};
// Sayı içeren kalıplar: [regex, değiştirme]
const RULES = [
  [/^(.+) ile çalışmak için API anahtarını gir\. Bir kez girmen yeterli\.$/, 'To work with $1, enter your API key. You only need to do this once.'],
  [/^(.+) API anahtarı$/, '$1 API key'],
  [/^1 klip(.*)$/, '1 clip$1'],
  [/^(\d+) klip hazır$/, '$1 clips ready'],
  [/^(\d+) klip$/, '$1 clips'],
  [/^(\d+) klip · en iyi skor (\d+)(.*)$/, '$1 clips · best score $2$3'],
  [/^(\d+) klip "(.+)" kanalına eklendi$/, '$1 clips added'],
  [/^(\d+) kelime(.*)$/, '$1 words$2'],
  [/^~(\d+) sn$/, '~$1 s'],
  [/^Hata: (.*)$/, 'Error: $1'],
  [/^yapay zeka seçemedi, otomatik bölündü: (.*)$/, 'AI could not pick, split automatically: $1'],
  [/^(\d+)\/(\d+)$/, '$1/$2'],
  [/^(\d+) Kas$/, '$1 Nov'],
];
export const LANG_NAMES = { tr: 'Türkçe', en: 'English', de: 'Deutsch', es: 'Español', fr: 'Français', ar: 'العربية', ja: '日本語', pt: 'Português', it: 'Italiano', ru: 'Русский', zh: '中文', ko: '한국어', nl: 'Nederlands', pl: 'Polski', hi: 'हिन्दी', id: 'Bahasa Indonesia', vi: 'Tiếng Việt', th: 'ไทย', uk: 'Українська' };
const LANGS = Object.keys(LANG_NAMES);
const RTL = ['ar'];
const DICTS = {};
async function loadDict(l) {
  if (l === 'tr' || l === 'en' || DICTS[l] !== undefined) return;
  try { const r = await fetch(`/l10n/app/${l}.json`); DICTS[l] = r.ok ? await r.json() : null; } catch { DICTS[l] = null; }
}
let lang = (() => { try { const v = localStorage.getItem('ms-ui-lang'); return LANGS.includes(v) ? v : 'en'; } catch { return 'en'; } })();
const orig = new WeakMap();
const origAttr = new WeakMap();
const norm = (s) => s.replace(/\s+/g, ' ').trim();
export const getLang = () => lang;
export function t(s) {
  if (lang === 'tr' || typeof s !== 'string') return s;
  let k = norm(s);
  if (!k) return s;
  let pre = '';
  const em = k.match(/^([✅❌⚠️✓]+\s+)(.+)$/u);
  if (em) { pre = em[1]; k = em[2]; }
  let r = TR_EN[k];
  if (r === undefined) for (const [re, to] of RULES) if (re.test(k)) { r = k.replace(re, to); break; }
  if (r === undefined) return s;
  if (lang !== 'en' && DICTS[lang] && DICTS[lang][r]) r = DICTS[lang][r];
  r = pre + r;
  const lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0];
  return lead + r + trail;
}
function doText(n) {
  const cur = n.nodeValue;
  const src = orig.has(n) ? orig.get(n) : cur;
  if (lang !== 'tr') {
    const r = t(src);
    if (r !== src) { if (!orig.has(n)) orig.set(n, src); if (cur !== r) n.nodeValue = r; }
    else if (orig.has(n)) { n.nodeValue = src; orig.delete(n); }
  } else if (orig.has(n)) { n.nodeValue = orig.get(n); orig.delete(n); }
}
const ATTRS = ['placeholder', 'title', 'aria-label'];
function doEl(el) {
  for (const a of ATTRS) {
    if (!el.hasAttribute?.(a)) continue;
    let o = origAttr.get(el);
    const cur = el.getAttribute(a);
    const src = o && a in o ? o[a] : cur;
    if (lang !== 'tr') {
      const r = t(src);
      if (r !== src) { if (!o) origAttr.set(el, (o = {})); if (!(a in o)) o[a] = src; if (cur !== r) el.setAttribute(a, r); }
      else if (o && a in o) { el.setAttribute(a, o[a]); delete o[a]; }
    } else if (o && a in o) { el.setAttribute(a, o[a]); delete o[a]; }
  }
}
function walk(root) {
  if (root.nodeType === 3) return doText(root);
  if (root.nodeType !== 1) return;
  const skip = root.closest?.('[data-no-i18n],script,style,textarea.planjson');
  if (skip) return;
  doEl(root);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    if (n.nodeType === 3) { if (!n.parentElement?.closest('[data-no-i18n],script,style')) doText(n); }
    else doEl(n);
  }
}
let busy = false;
const mo = new MutationObserver((muts) => {
  if (busy) return;
  busy = true;
  for (const m of muts) {
    if (m.type === 'childList') m.addedNodes.forEach((n) => walk(n));
    else if (m.type === 'characterData') doText(m.target);
    else if (m.type === 'attributes') doEl(m.target);
  }
  busy = false;
});
export async function setLang(l) {
  const next = LANGS.includes(l) ? l : 'en';
  await loadDict(next);
  lang = next;
  try { localStorage.setItem('ms-ui-lang', lang); } catch {}
  document.documentElement.lang = lang;
  document.documentElement.dir = RTL.includes(lang) ? 'rtl' : 'ltr';
  document.querySelectorAll('select[data-lang-select]').forEach((x) => { if (!x.options.length) x.innerHTML = Object.entries(LANG_NAMES).map(([c, n]) => `<option value="${c}">${n}</option>`).join(''); x.value = lang; });
  busy = true; walk(document.body); busy = false;
  document.title = t('Kesit — klip stüdyosu');
  document.querySelectorAll('[data-lang-btn]').forEach((b) => b.classList.toggle('on', b.dataset.langBtn === lang));
}
// confirm() metinleri de çevrilsin
const _confirm = window.confirm.bind(window);
window.confirm = (m) => _confirm(t(m));
window.__t = t;
export function initI18n() {
  mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  setLang(lang);
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-lang-btn]'); if (b) setLang(b.dataset.langBtn); });
  document.addEventListener('change', (e) => { const x = e.target.closest?.('select[data-lang-select]'); if (x) setLang(x.value); });
}
