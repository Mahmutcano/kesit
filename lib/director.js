import { ACTIONS, PROPS, EMOTIONS, CAMERAS, BACKGROUNDS } from '../public/vocab.js';
import { COSTUME_NAMES, FLAGS } from '../public/costumes.js';

// ---------- Plan doğrulama / temizleme ----------
const actionKeys = Object.keys(ACTIONS);
const pick = (v, list, def) => (list.includes(v) ? v : def);

export function normalizePlan(plan, { language, defaultCast } = {}) {
  if (Array.isArray(plan)) plan = { scenes: plan };
  const scenes = (plan.scenes || [])
    .filter((s) => s && String(s.narration || '').trim())
    .map((s, i, arr) => {
      let action = pick(String(s.action || '').toLowerCase(), actionKeys, 'talk');
      const characters = Number(s.characters) === 2 ? 2 : 1;
      if (['hug', 'argue', 'handshake'].includes(action) && characters === 1) action = 'talk';
      let chart = null;
      if (s.chart && Array.isArray(s.chart.values) && s.chart.values.length) {
        chart = {
          type: pick(s.chart.type, ['bar', 'line', 'pie'], 'bar'),
          values: s.chart.values.slice(0, 8).map((v) => Number(v) || 0),
          labels: (s.chart.labels || []).slice(0, 8).map((l) => String(l).slice(0, 12)),
        };
      }
      return {
        narration: String(s.narration).trim(),
        action,
        emotion: pick(String(s.emotion || '').toLowerCase(), EMOTIONS, 'neutral'),
        props: (Array.isArray(s.props) ? s.props : [])
          .map((p) => String(p).toLowerCase())
          .filter((p) => PROPS.includes(p))
          .slice(0, 3),
        keyword: String(s.keyword || '').slice(0, 40),
        camera: pick(String(s.camera || '').toLowerCase(), CAMERAS, i % 3 === 0 ? 'zoom-in' : 'static'),
        bg: pick(String(s.bg || '').toLowerCase(), BACKGROUNDS, 'plain'),
        characters,
        chart,
        cast: (Array.isArray(s.cast) ? s.cast : []).map((x) => String(x).toLowerCase()).filter((x) => COSTUME_NAMES.includes(x)).slice(0, 2),
        flags: (Array.isArray(s.flags) ? s.flags : []).map((x) => String(x).toLowerCase()).filter((x) => FLAGS.includes(x)).slice(0, 2),
      };
    });
  if (!scenes.length) throw new Error('Plan boş — sahne üretilemedi');
  // kostüm sürekliliği: boş bırakılan sahneler bir öncekinin kadrosunu devralır
  let last = (Array.isArray(plan.cast) ? plan.cast : []).filter((x) => COSTUME_NAMES.includes(x)).slice(0, 2);
  if (!last.length) last = scenes.find((s) => s.cast.length)?.cast || defaultCast || ['casual', 'suit'];
  for (const s of scenes) {
    if (!s.cast.length) s.cast = last;
    else if (s.cast.length === 1 && s.characters === 2) s.cast = [s.cast[0], last.find((x) => x !== s.cast[0]) || 'casual'];
    last = s.cast.length >= 2 ? s.cast : [s.cast[0], last[1] || last[0]];
  }
  const t = plan.thumbnail || {};
  return {
    title: String(plan.title || scenes[0].narration.slice(0, 60)),
    description: String(plan.description || ''),
    tags: Array.isArray(plan.tags) ? plan.tags.slice(0, 15).map(String) : [],
    language,
    thumbnail: {
      text: String(t.text || plan.title || '').slice(0, 60),
      highlight: String(t.highlight || ''),
      action: pick(t.action, actionKeys, 'surprised'),
      emotion: pick(t.emotion, EMOTIONS, 'surprised'),
      props: (t.props || []).filter((p) => PROPS.includes(p)).slice(0, 3),
    },
    scenes,
  };
}

// ---------- Yapay zekasız yönetmen ----------
// Anahtar kelime → prop / aksiyon / duygu (TR + EN + birkaç dil)
const RULES = [
  [/para|money|dolar|dollar|euro|lira|zengin|rich|maaş|salary|ekonomi|econom|yatırım|invest|geld|dinero/i, { props: ['money'], action: 'present' }],
  [/fikir|idea|aklına|realiz|keşf|discover|çözüm|solution|idee/i, { props: ['lightbulb'], action: 'idea', emotion: 'excited' }],
  [/\?|neden|niçin|niye|why|how|nasıl|ne zaman|what if|warum|pourquoi|por qué/i, { props: ['question'], action: 'think', emotion: 'thinking' }],
  [/zaman|time|saat|clock|dakika|minute|hour|günler|days|yıl|year|zeit|temps/i, { props: ['clock'] }],
  [/beyin|brain|zihin|mind|düşün|think|psikoloj|psycholog|hafıza|memory/i, { props: ['brain'], action: 'think', emotion: 'thinking' }],
  [/aşk|love|sevgi|kalp|heart|sevgili|ilişki|relationship|liebe|amour/i, { props: ['heart'], emotion: 'love' }],
  [/başar|success|kazan|win|zafer|victory|şampiyon|champion|hedef|goal/i, { props: ['trophy'], action: 'celebrate', emotion: 'excited' }],
  [/başarısız|fail|kaybet|lose|hata|mistake|düş|fall/i, { props: ['cross'], action: 'fall', emotion: 'sad' }],
  [/üzgün|sad|mutsuz|unhappy|depres|yalnız|lonely|ağla|cry/i, { action: 'sad', emotion: 'sad' }],
  [/mutlu|happy|sevinç|joy|harika|great|amazing|muhteşem/i, { action: 'celebrate', emotion: 'happy', props: ['star'] }],
  [/kork|fear|afraid|scared|tehlike|danger|risk/i, { props: ['warning'], action: 'scared', emotion: 'scared' }],
  [/kızgın|angry|öfke|anger|sinir|rage/i, { action: 'angry', emotion: 'angry', props: ['fire'] }],
  [/şaşır|surpris|inanılmaz|incredible|shock|şok/i, { action: 'surprised', emotion: 'surprised', props: ['exclamation'] }],
  [/telefon|phone|sosyal medya|social media|instagram|tiktok|mobil/i, { props: ['phone'], action: 'phone' }],
  [/bilgisayar|computer|laptop|yazılım|software|kod|code|internet|yapay zeka|ai\b|teknoloji|technolog/i, { props: ['laptop'], action: 'type' }],
  [/kitap|book|oku|read|öğren|learn|eğitim|educat|okul|school|ders|lesson/i, { props: ['book'], action: 'present', bg: 'classroom' }],
  [/dünya|world|ülke|countr|global|gezegen|planet|harita|map/i, { props: ['globe'] }],
  [/artı|arttı|yüksel|grow|growth|increase|rise|büyü/i, { props: ['chart-up'], action: 'present', chart: 'up' }],
  [/azal|düştü|decrease|decline|drop|kriz|crisis|çöküş|crash/i, { props: ['chart-down'], action: 'present', chart: 'down' }],
  [/uzay|space|roket|rocket|yıldız|star|ay\b|moon|mars/i, { props: ['rocket'], bg: 'space' }],
  [/doğa|nature|ağaç|tree|orman|forest|bitki|plant|çevre|environment/i, { props: ['tree'], bg: 'nature' }],
  [/ev\b|evde|home|house|aile|family/i, { props: ['house'], bg: 'home' }],
  [/şehir|city|kent|town|bina|building/i, { bg: 'city' }],
  [/iş\b|işte|ofis|office|patron|boss|çalış|work|job|kariyer|career/i, { props: ['laptop'], bg: 'office', action: 'type' }],
  [/uyku|sleep|uyu|yorgun|tired|gece|night/i, { action: 'sleep', emotion: 'tired', props: ['zzz'], bg: 'night' }],
  [/sağlık|health|ilaç|medicine|doktor|doctor|hastalık|disease|vücut|body/i, { props: ['pill'], bg: 'lab' }],
  [/bilim|science|deney|experiment|atom|kimya|chemistry|fizik|physics/i, { props: ['atom'], bg: 'lab' }],
  [/dna|gen\b|genetik|genetic|evrim|evolution/i, { props: ['dna'], bg: 'lab' }],
  [/güç|power|enerji|energy|motivasyon|motivation/i, { props: ['battery-full'], action: 'lift' }],
  [/zor|hard|difficult|mücadele|struggle|engel|obstacle/i, { action: 'push', emotion: 'tired' }],
  [/adım|step|ilerle|progress|merdiven|stairs|yüksel/i, { action: 'climb', props: ['stairs'] }],
  [/koş|run|hızlı|fast|acele|hurry/i, { action: 'run' }],
  [/yürü|walk|yolculuk|journey|yol\b|road/i, { action: 'walk', bg: 'road' }],
  [/merhaba|hello|selam|hoş geldin|welcome|hi\b/i, { action: 'wave', emotion: 'happy' }],
  [/abone|subscribe|takip|follow|beğen|like/i, { action: 'wave', props: ['thumbs-up', 'bell'], emotion: 'happy' }],
  [/sır|secret|gizli|hidden|kilit|lock|güvenlik|security/i, { props: ['lock'] }],
  [/hedef|target|odak|focus/i, { props: ['target'] }],
  [/kahve|coffee|sabah|morning/i, { props: ['coffee', 'sun'] }],
  [/insan|people|toplum|society|herkes|everyone|kalabalık|crowd/i, { props: ['people'] }],
  [/konuş|talk|tartış|argue|kavga|fight|anlaşmazlık/i, { characters: 2, action: 'argue' }],
  [/arkadaş|friend|birlikte|together|ortak|partner|anlaş|agree/i, { characters: 2, action: 'handshake', emotion: 'happy' }],
];

const CAST_RULES = [
  [/kral|king|padişah|sultan|imparator|emperor/i, 'king'], [/kraliçe|queen|prenses/i, 'queen'], [/asker|soldier|savaş|war|ordu|army|cephe/i, 'soldier'],
  [/general|komutan|paşa|commander/i, 'general'], [/doktor|doctor|hasta|sağlık|health/i, 'doctor'], [/bilim|scien|deney|araştır/i, 'scientist'],
  [/öğretmen|teacher|okul|school|ders/i, 'teacher'], [/öğrenci|student/i, 'student'], [/çiftçi|farmer|köy|tarla/i, 'farmer'], [/uzay|space|astronot/i, 'astronaut'],
  [/korsan|pirate/i, 'pirate'], [/polis|police|suç|crime/i, 'police'], [/şirket|iş dünyası|business|patron|yatırım|para|money|finans/i, 'suit'],
  [/aşçı|chef|yemek|mutfak/i, 'chef'], [/işçi|worker|inşaat|fabrika/i, 'worker'], [/büyücü|wizard|sihir/i, 'wizard'], [/şövalye|knight/i, 'knight'],
  [/roma|roman|antik/i, 'roman'], [/viking/i, 'viking'], [/mağara|caveman|ilkel/i, 'caveman'], [/dedektif|detective|gizem/i, 'detective'], [/spor|maç|sport|koş/i, 'athlete'],
];
const FLAG_RULES = [[/türk|turk/i, 'tr'], [/amerika|abd|usa|united states/i, 'us'], [/ingil|britan|england|\buk\b/i, 'gb'], [/alman|german/i, 'de'], [/frans|france|french/i, 'fr'], [/ital/i, 'it'], [/rus/i, 'ru'], [/japon|japan/i, 'jp'], [/çin|china|chinese/i, 'cn'], [/ispan|spain|spanish/i, 'es'], [/avrupa birliği|european union/i, 'eu']];
const ROTATION = ['talk', 'point', 'talk', 'present', 'think', 'talk', 'walk', 'point', 'shrug', 'talk'];
const CAM_ROT = ['zoom-in', 'static', 'pan-right', 'push', 'static', 'zoom-out', 'pan-left'];

function splitSentences(text) {
  return text
    .replace(/\r/g, '')
    .split(/\n{2,}|(?<=[.!?…。！？])\s+/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function keywordOf(sentence, locale) {
  const num = sentence.match(/(%\s?\d+[\d.,]*|\d+[\d.,]*\s?%|\d[\d.,]*\s?(milyon|milyar|million|billion|bin|thousand|yıl|years?|kat|x)?)/i);
  if (num) return num[0].trim();
  const words = sentence
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .split(/\s+/)
    .filter((w) => w.length > 4);
  if (!words.length) return '';
  const w = words.sort((a, b) => b.length - a.length)[0];
  return w.toLocaleUpperCase(locale);
}

export function offlinePlan(text, { language, pace = 'medium', title, style = 'classic', seed = 0 } = {}) {
  const sentences = splitSentences(text);
  const maxWords = { fast: 12, medium: 22, slow: 32 }[pace] || 22;
  const groups = [];
  let cur = '';
  for (const s of sentences) {
    const wc = (cur + ' ' + s).split(/\s+/).length;
    if (cur && wc > maxWords) {
      groups.push(cur);
      cur = s;
    } else cur = cur ? cur + ' ' + s : s;
  }
  if (cur) groups.push(cur);

  let lastBg = 'plain';
  const scenes = groups.map((g, i) => {
    const sc = { narration: g, action: ROTATION[(i + seed) % ROTATION.length], emotion: 'neutral', props: [], keyword: '', camera: CAM_ROT[(i + seed * 3) % CAM_ROT.length], bg: lastBg, characters: 1 };
    let matched = 0;
    for (const [re, r] of RULES) {
      if (re.test(g)) {
        matched++;
        if (r.props) sc.props.push(...r.props.filter((p) => !sc.props.includes(p)));
        if (r.action && matched <= 2) sc.action = r.action;
        if (r.emotion && matched <= 2) sc.emotion = r.emotion;
        if (r.bg) sc.bg = lastBg = r.bg;
        if (r.characters) sc.characters = r.characters;
        if (r.chart) sc.chart = { type: r.chart === 'up' ? 'line' : 'bar', values: r.chart === 'up' ? [2, 3, 5, 8, 13] : [10, 8, 6, 3, 2], labels: [] };
      }
    }
    sc.props = sc.props.slice(0, 2);
    if (sc.action === 'talk' && sc.emotion === 'neutral') sc.emotion = i % 2 ? 'happy' : 'neutral';
    sc.keyword = i % 2 === 0 || /\d/.test(g) ? keywordOf(g, language) : '';
    if (style === 'toon' && sc.bg === 'plain') sc.bg = lastBg = ['nature', 'city', 'home', 'road', 'office'][(seed + Math.floor(i / 3)) % 5];
    sc.cast = CAST_RULES.filter(([re]) => re.test(g)).map(([, c]) => c).slice(0, 2);
    sc.flags = FLAG_RULES.filter(([re]) => re.test(g)).map(([, f]) => f).slice(0, 2);
    if (sc.flags.length === 2 || sc.cast.length === 2) sc.characters = 2;
    if (style === 'cinema') sc.keyword = '';
    else if (['shorts', 'comic', 'infographic', 'kinetic'].includes(style) && !sc.keyword) sc.keyword = keywordOf(g, language);
    if (style === 'infographic' && sc.props.length < 2) sc.props.push(...['check', 'target', 'star', 'arrow-up', 'gear', 'magnifier'].slice(i % 5, (i % 5) + 2 - sc.props.length));
    if (style === 'cinema' && i % 3 === 1) sc.characters = 2;
    if (i === 0) {
      sc.camera = 'zoom-in';
      if (sc.action === 'talk') sc.action = 'wave';
    }
    // aynı aksiyonun 3 kez tekrarını engelle
    return sc;
  });
  for (let i = 2; i < scenes.length; i++) {
    if (scenes[i].action === scenes[i - 1].action && scenes[i].action === scenes[i - 2].action) scenes[i].action = 'point';
  }
  const first = sentences[0] || 'Video';
  const t = title || first.replace(/[.!?…].*$/, '').slice(0, 70);
  return {
    title: t,
    description: sentences.slice(0, 2).join(' '),
    tags: [],
    thumbnail: { text: t.split(/\s+/).slice(0, 5).join(' '), highlight: '', action: 'surprised', emotion: 'surprised', props: scenes[0]?.props?.length ? scenes[0].props : ['question'] },
    scenes,
  };
}
