import { LANGUAGES, langInfo } from './vocab.js';
import { providerLogo } from './ui-icons.js';
import { initProfile, renderVoices } from './profile.js';
import { THEMES, resolveTheme } from './themes.js';
import { buildTimeline, renderFrame, renderThumbnail, toSRT, clearCache, STYLES, loadPhoto, keepPhotos } from './engine.js';
import { COSTUME_NAMES } from './costumes.js';
import { mixAudio, exportVideo, estimateDuration } from './exporter.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const api = async (path, body, opts = {}) => {
  const res = await fetch(path, body !== undefined ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), ...opts } : opts);
  if (!res.ok) {
    let msg = res.statusText;
    let code;
    try { const d = await res.json(); msg = d.error || msg; code = d.code; } catch {}
    throw Object.assign(new Error(msg), { code });
  }
  return res;
};
const json = async (path, body, opts) => (await api(path, body, opts)).json();
const toast = (m, ms = 3800) => {
  const d = Object.assign(document.createElement('div'), { className: 'toast', textContent: m });
  document.body.append(d);
  setTimeout(() => d.remove(), ms);
};
const fmtDur = (t) => `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, '0')}`;

const SAMPLE = {
  tr: 'Merhaba! Bu ses ile videolarını seslendirebilirim.', en: 'Hi! I can narrate your videos with this voice.', de: 'Hallo! Mit dieser Stimme kann ich deine Videos sprechen.', fr: 'Salut ! Je peux raconter tes vidéos avec cette voix.', es: '¡Hola! Puedo narrar tus videos con esta voz.', it: 'Ciao! Posso narrare i tuoi video con questa voce.', pt: 'Olá! Posso narrar seus vídeos com esta voz.', ru: 'Привет! Я могу озвучить твои видео этим голосом.', ar: 'مرحبا! يمكنني سرد مقاطع الفيديو الخاصة بك بهذا الصوت.', ja: 'こんにちは！この声で動画をナレーションできます。', ko: '안녕하세요! 이 목소리로 영상을 내레이션할 수 있어요.', zh: '你好！我可以用这个声音为你的视频配音。',
};
const DEF = { concept: '', direction: '', language: 'tr', aspect: '16:9', quality: '720', minutes: 1, skillId: 'stickman-director', themeId: 'classic', custom: {}, texture: '', ttsProvider: 'edge', voice: '', rate: 0, pitch: 0, randomVoice: false, music: 'upbeat', musicVol: 0.5, sfx: true, subtitles: true, subStyle: 'karaoke', subScale: 1, intro: true, outro: false, progress: false, watermark: '', ideas: [] };

// ---------------------------------------------------------------------------
// DURUM
// ---------------------------------------------------------------------------
let channels = [], cur = null, skills = [], health = null, voices = [];
let busy = false, abort = null, musicBuffer = null, inputMode = localStorage.getItem('ms-mode') || 'script';
const skillOf = (ch = cur) => skills.find((s) => s.id === ch?.skillId) || skills[0];
const lookOf = (sk) => ({ ...(STYLES[sk?.style] || STYLES.classic), ...(sk?.look || {}) });
const themeOfSkill = (sk) => (THEMES[sk?.theme] ? sk.theme : (STYLES[sk?.style] || STYLES.classic).theme);
const avatarColor = (name) => {
  let h = 0;
  for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h} 75% 68%)`;
};
const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toLocaleUpperCase();

let saveTimer;
function saveCur(now) {
  clearTimeout(saveTimer);
  const run = async () => {
    if (!cur) return;
    const { videoCount, ...body } = cur;
    await api('/api/channels', body).catch((e) => toast('Kaydedilemedi: ' + e.message));
  };
  if (now) return run();
  saveTimer = setTimeout(run, 500);
}

// ---------------------------------------------------------------------------
// KANALLAR
// ---------------------------------------------------------------------------
async function loadChannels(selectId) {
  channels = (await json('/api/channels')).map((c) => ({ ...DEF, ...c, custom: c.custom || {} }));
  if (!channels.length) {
    // Kesit tek çalışma alanıyla açılır: varsayılan kanal sessizce oluşturulur
    await json('/api/channels', { ...DEF, name: 'Kesit', concept: 'Uzun videolardan klip', language: 'tr', aspect: '9:16', watermark: '' }).catch(() => {});
    channels = (await json('/api/channels')).map((c) => ({ ...DEF, ...c, custom: c.custom || {} }));
  }
  renderRail();
  const want = selectId || localStorage.getItem('ms-channel');
  const ch = channels.find((c) => c.id === want) || channels[0];
  $('#empty').hidden = !!ch;
  $('#workspace').hidden = !ch;
  if (ch) selectChannel(ch.id);
}
function renderRail() {
  $('#channelList').innerHTML = channels.map((c) => `<button class="ch-item ${cur?.id === c.id ? 'on' : ''}" data-id="${c.id}"><span class="avatar" style="background:${avatarColor(c.name)}">${esc(initials(c.name))}</span><div><b>${esc(c.name)}</b><small>${c.videoCount || 0} video · ${esc(skills.find((s) => s.id === c.skillId)?.name || '')}</small></div></button>`).join('');
}
$('#channelList').onclick = (e) => {
  const b = e.target.closest('.ch-item');
  if (b) selectChannel(b.dataset.id);
};

/** Videonun konuşma dili (transkript/altyazı için); arayüz dilinden bağımsız */
function syncVideoLang() {
  const sel = $('#gLang');
  if (!sel) return;
  if (!sel.options.length) {
    sel.innerHTML = LANGUAGES.map((l) => `<option value="${l.code}">${l.name}</option>`).join('');
    sel.onchange = () => { if (cur) { cur.language = sel.value; saveCur(); } };
  }
  if (cur) sel.value = cur.language || 'en';
}
function selectChannel(id) {
  cur = channels.find((c) => c.id === id);
  if (!cur) return;
  syncVideoLang();
  localStorage.setItem('ms-channel', id);
  renderRail();
  fillForm();
  renderHead();
  renderStyleSelection();
  renderIdeas();
  loadVoices();
  loadLibrary();
  if (!G.running) showClipHome();
  $('#jobs').innerHTML = '';
  $('#jobsHead').hidden = true;
}
function renderHead() {
  $('#chAvatar').textContent = initials(cur.name);
  $('#chAvatar').style.background = avatarColor(cur.name);
  $('#chName').textContent = cur.name;
  $('#chConcept').textContent = cur.concept || 'Konsept eklemek için Kanal ayarları sekmesine git.';
  const v = voices.find((x) => x.id === cur.voice);
  $('#sumVoice').textContent = '🎙 ' + (cur.ttsProvider === 'none' ? 'Sessiz' : cur.randomVoice ? 'Her videoda farklı ses' : v ? v.name : 'Ses seç');
  $('#sumTheme').textContent = '🎨 ' + (THEMES[cur.themeId]?.name || 'Tema');
}

// form <-> kanal
function fillForm() {
  for (const el of $$('[data-ch]')) {
    const v = cur[el.dataset.ch];
    if (el.type === 'checkbox') el.checked = !!v;
    else el.value = v ?? '';
  }
  syncTheme(true);
  updRange();
}
document.addEventListener('input', (e) => {
  const el = e.target;
  if (!cur || !el.dataset?.ch) return;
  const k = el.dataset.ch;
  cur[k] = el.type === 'checkbox' ? el.checked : el.type === 'number' || el.type === 'range' ? Number(el.value) : el.value;
  for (const o of $$(`[data-ch="${k}"]`)) if (o !== el) o.value = el.value;
  if (k === 'name' || k === 'concept') { renderHead(); renderRail(); }
  if (k === 'language') { filterVoices(); }
  if (k === 'ttsProvider') loadVoices();
  if (['aspect', 'subtitles', 'subStyle', 'subScale', 'progress', 'watermark', 'texture'].includes(k)) renderThemePreview();
  if (k === 'music' && el.value === 'custom') $('#musicFile').click();
  updRange();
  renderHead();
  saveCur();
});
function updRange() {
  $('#rateV').textContent = (cur.rate > 0 ? '+' : '') + cur.rate + '%';
  $('#pitchV').textContent = (cur.pitch > 0 ? '+' : '') + cur.pitch + 'Hz';
}
$('#musicFile').onchange = async () => {
  const f = $('#musicFile').files[0];
  if (!f) return;
  musicBuffer = await new OfflineAudioContext(2, 1, 48000).decodeAudioData(await f.arrayBuffer());
  toast('Müzik yüklendi: ' + f.name);
};

// yeni kanal
const openNew = () => {
  $('#ncName').value = '';
  $('#ncConcept').value = '';
  $('#dlgChannel').showModal();
};
$('#btnNewChannel').onclick = openNew;
$('#btnHeroNew').onclick = openNew;
$('#btnCreateChannel').onclick = async (e) => {
  e.preventDefault();
  const name = $('#ncName').value.trim();
  if (!name) return toast('Kanala bir ad ver');
  const b = $('#btnCreateChannel');
  b.disabled = true;
  const ch = { ...DEF, name, concept: $('#ncConcept').value.trim(), language: $('#ncLang').value, aspect: $('#ncAspect').value, watermark: '@' + name.replace(/\s+/g, '').toLocaleLowerCase() };
  try {
    const useAI = $('#ncAI').checked && $('#provider').value !== 'offline';
    b.textContent = useAI ? 'Yapay zeka kanalı kuruyor…' : 'Oluşturuluyor…';
    const sug = await json('/api/channels/suggest', { name, concept: ch.concept, language: ch.language, provider: useAI ? $('#provider').value : 'offline', model: $('#model').value.trim(), themes: Object.keys(THEMES) }).catch((err) => {
      toast('AI önerisi alınamadı, varsayılanlarla kuruldu: ' + err.message, 6000);
      return {};
    });
    applySuggestion(ch, sug);
    const saved = await json('/api/channels', ch);
    $('#dlgChannel').close();
    await loadChannels(saved.id);
    toast(`"${name}" kanalı hazır`);
  } catch (err) {
    toast('Hata: ' + err.message, 6000);
  }
  b.disabled = false;
  b.textContent = 'Kanalı oluştur';
};
function applySuggestion(ch, sug) {
  if (sug.skillId && skills.some((s) => s.id === sug.skillId)) ch.skillId = sug.skillId;
  ch.themeId = sug.themeId && THEMES[sug.themeId] ? sug.themeId : themeOfSkill(skills.find((s) => s.id === ch.skillId));
  ch.custom = {};
  if (sug.direction) ch.direction = sug.direction;
  if (sug.music) ch.music = sug.music;
  if (sug.ideas?.length) ch.ideas = sug.ideas;
  if (sug.voiceGender) ch.voiceGender = sug.voiceGender;
}
$('#btnSuggest').onclick = async () => {
  if ($('#provider').value === 'offline') return toast('Öneri için soldan bir yapay zeka kaynağı seç');
  const b = $('#btnSuggest');
  b.disabled = true;
  b.textContent = 'Düşünüyor…';
  try {
    const sug = await json('/api/channels/suggest', { name: cur.name, concept: cur.concept, language: cur.language, provider: $('#provider').value, model: $('#model').value.trim(), themes: Object.keys(THEMES) });
    applySuggestion(cur, sug);
    await saveCur(true);
    selectChannel(cur.id);
    toast('Stil, tema ve konu fikirleri güncellendi');
  } catch (e) {
    toast('Hata: ' + e.message, 6000);
  }
  b.disabled = false;
  b.textContent = '✦ Konsepte göre AI önersin';
};
$('#btnDeleteChannel').onclick = async () => {
  if (!confirm(`"${cur.name}" kanalı listeden silinsin mi?\nVideo dosyaları output/ klasöründe kalır.`)) return;
  await api('/api/channels/delete', { id: cur.id });
  cur = null;
  localStorage.removeItem('ms-channel');
  loadChannels();
};

// görünümler (yan menü) ve animasyon sekmeleri
function showView(v) {
  $$('#nav [data-view]').forEach((b) => b.classList.toggle('on', b.dataset.view === v));
  $$('section.view').forEach((s) => (s.hidden = s.dataset.view !== v));
  if (v === 'library') loadLibrary();
  if (v === 'clip' && !G.running) showClipHome();
  if (v === 'anim') renderThemePreview();
  if (v === 'film') loadFilmInfo();
  localStorage.setItem('ms-view', v);
}
$('#nav').onclick = (e) => {
  const b = e.target.closest('[data-view]');
  if (b) showView(b.dataset.view);
};
$('#btnNewGen').onclick = () => {
  showView('clip');
  if (G.running) return toast('Süren üretim bitince yenisini başlatabilirsin');
  showClipHome();
  $('#clipUrl').focus();
};
function showTab(t) {
  $$('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
  $$('section.tab').forEach((s) => (s.hidden = s.dataset.tab !== t));
  if (t === 'channel') renderThemePreview();
}
$('#tabs').onclick = (e) => e.target.closest('button') && showTab(e.target.closest('button').dataset.tab);
document.addEventListener('click', (e) => {
  const g = e.target.closest('[data-goto]');
  if (g) {
    showView('anim');
    showTab(g.dataset.goto);
  }
});
$('#btnTheme').onclick = () => {
  const d = document.documentElement.classList.toggle('dark');
  localStorage.setItem('ms-theme', d ? 'dark' : 'light');
};
if (localStorage.getItem('ms-theme') === 'dark') document.documentElement.classList.add('dark');

// ---------------------------------------------------------------------------
// STİL GALERİSİ + SKILL
// ---------------------------------------------------------------------------
const PREV_PLAN = { title: '', thumbnail: {}, scenes: [
  { narration: 'Fikirler böyle doğar ve büyür.', action: 'idea', emotion: 'excited', props: ['lightbulb', 'dog'], keyword: 'Fikir!', camera: 'zoom-in', bg: 'nature', characters: 2, flags: [] },
  { narration: 'Rakamlar her yıl yükseliyor.', action: 'present', emotion: 'happy', props: [], keyword: '%30', camera: 'static', bg: 'office', characters: 1, chart: { type: 'bar', values: [2, 4, 7], labels: ['A', 'B', 'C'] } },
  { narration: 'Ve sonunda başardık!', action: 'celebrate', emotion: 'excited', props: ['trophy', 'star'], keyword: 'Başardık', camera: 'push', bg: 'nature', characters: 1 },
] };
const prevTl = buildTimeline(PREV_PLAN, [2.3, 2.3, 2.3], { aspect: '16:9' });
const prevTlFor = (sk) => (sk.cast ? { ...prevTl, scenes: prevTl.scenes.map((s, i) => ({ ...s, cast: [sk.cast[i % sk.cast.length], sk.cast[(i + 1) % sk.cast.length]], flags: sk.id === 't-history' || sk.id === 't-countries' ? ['us', 'gb'] : [] })) } : prevTl);
function skillCfg(sk) {
  const theme = resolveTheme(themeOfSkill(sk));
  theme.locale = 'tr-TR';
  return { theme, style: lookOf(sk), seed: 3, profile: { text: sk.profile?.text || 'medium', camera: 'dynamic', texture: theme.texture }, subtitles: false };
}
let catFilter = 'Tümü';
function buildStyleGrid() {
  const cats = ['Tümü', ...new Set(skills.map((s) => s.category))];
  $('#catChips').innerHTML = cats.map((c) => `<button data-cat="${esc(c)}" class="${c === catFilter ? 'on' : ''}">${esc(c)} <span class="count">${c === 'Tümü' ? skills.length : skills.filter((s) => s.category === c).length}</span></button>`).join('');
  const grid = $('#styleGrid');
  const list = skills.filter((s) => catFilter === 'Tümü' || s.category === catFilter);
  grid.innerHTML = list.map((s) => `<button class="style-card" data-id="${s.id}"><canvas width="400" height="225"></canvas><span class="src">${s.repo ? (s.installed ? '✓ skill kurulu' : 'GitHub skill') : 'hazır konsept'}</span><div class="meta"><b>${esc(s.name)}</b><small>${esc(s.desc)}</small></div></button>`).join('');
  for (const card of $$('.style-card', grid)) {
    const sk = skills.find((s) => s.id === card.dataset.id), cv = $('canvas', card), ctx = cv.getContext('2d'), cfg = skillCfg(sk), ptl = prevTlFor(sk);
    const still = () => renderFrame(ctx, 400, 225, ptl, 1.7, cfg);
    still();
    let raf = 0, t0 = 0;
    card.onmouseenter = () => {
      t0 = performance.now();
      const loop = () => {
        renderFrame(ctx, 400, 225, ptl, ((performance.now() - t0) / 1000) % ptl.total, cfg);
        raf = requestAnimationFrame(loop);
      };
      loop();
    };
    card.onmouseleave = () => {
      cancelAnimationFrame(raf);
      still();
    };
    card.onclick = () => pickSkill(sk.id);
  }
  renderStyleSelection();
}
$('#catChips').onclick = (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  catFilter = b.dataset.cat;
  buildStyleGrid();
};
function pickSkill(id) {
  if (!cur) return;
  const sk = skills.find((s) => s.id === id);
  cur.skillId = id;
  cur.themeId = themeOfSkill(sk);
  cur.custom = {};
  saveCur();
  renderStyleSelection();
  syncTheme(true);
  renderRail();
  renderHead();
  toast(`${sk.name} seçildi · tema: ${THEMES[cur.themeId].name}`);
}
function renderStyleSelection() {
  const sk = skillOf();
  if (!sk || !cur) return;
  $$('.style-card').forEach((c) => c.classList.toggle('on', c.dataset.id === sk.id));
  const p = sk.profile;
  $('#skillInfo').innerHTML = `<div class="txt"><div><span class="muted">Seçili:</span> <b>${esc(sk.name)}</b> — ${esc(sk.desc)}</div>
    <div><span class="tag">${esc(sk.category)}</span><span class="tag">görsel: ${esc(STYLES[sk.style]?.name || '')}</span><span class="tag">tempo: ${p.pace}</span><span class="tag">ekran yazısı: ${p.text}</span></div>
    <div class="muted">${sk.repo ? `${sk.installed ? `Kurulu: reponun SKILL.md talimatları senaryoya ekleniyor (${sk.skillFiles} dosya).` : 'Repo kurulu değil: hazır yönetmen profili kullanılıyor. Kurarsan SKILL.md talimatları da senaryoya eklenir.'} <a href="https://github.com/${sk.repo}" target="_blank" rel="noopener">github.com/${esc(sk.repo)}</a>` : 'Uygulamayla gelen hazır konsept; kurulum gerektirmez.'}</div></div>
    ${sk.repo ? `<button class="ghost small" id="btnInstallSkill">${sk.installed ? '↻ Skill\'i güncelle' : '⬇ Skill\'i kur'}</button>` : ''}`;
  if (sk.repo) $('#btnInstallSkill').onclick = installSkill;
}
async function installSkill() {
  const b = $('#btnInstallSkill');
  b.disabled = true;
  b.textContent = 'Kuruluyor…';
  try {
    const r = await json('/api/skills/install', { id: cur.skillId });
    toast(r.linked.length ? `Kuruldu: ${r.linked.join(', ')}` : 'Repo indirildi ama SKILL.md bulunamadı; hazır profil kullanılacak');
    skills = await json('/api/skills');
    buildStyleGrid();
  } catch (e) {
    toast('Kurulum hatası: ' + e.message, 6000);
    renderStyleSelection();
  }
}

// ---------------------------------------------------------------------------
// TEMA
// ---------------------------------------------------------------------------
$('#swatches').innerHTML = Object.entries(THEMES).map(([id, t]) => `<div class="sw" data-id="${id}" style="background:${t.bg};color:${t.stroke}" title="${t.name}"><i style="background:${t.accent}"></i>${t.name}</div>`).join('');
$('#swatches').onclick = (e) => {
  const sw = e.target.closest('.sw');
  if (!sw || !cur) return;
  cur.themeId = sw.dataset.id;
  cur.custom = {};
  syncTheme(true);
  saveCur();
};
$$('[data-color]').forEach((inp) => (inp.oninput = () => {
  cur.custom[inp.dataset.color] = inp.value;
  syncTheme(false);
  saveCur();
}));
$('#font').onchange = () => {
  cur.custom.font = $('#font').value;
  syncTheme(false);
  saveCur();
};
function syncTheme(updateInputs) {
  if (!cur) return;
  $$('.sw').forEach((s) => s.classList.toggle('on', s.dataset.id === cur.themeId));
  const t = resolveTheme(cur.themeId, cur.custom);
  if (updateInputs) {
    $$('[data-color]').forEach((i) => (i.value = t[i.dataset.color]));
    $('#font').value = t.font;
  }
  clearCache();
  renderThemePreview();
  renderHead();
}
function buildCfg(ch = cur, seed = 1, themeId = ch.themeId, custom = ch.custom) {
  const sk = skillOf(ch);
  const theme = resolveTheme(themeId, custom);
  theme.locale = langInfo(ch.language).locale;
  return {
    theme, style: lookOf(sk), seed,
    profile: { text: sk?.profile?.text || 'medium', camera: sk?.profile?.camera || 'dynamic', texture: ch.texture || theme.texture },
    subtitles: !!ch.subtitles, subtitleStyle: ch.subStyle, subtitleScale: Number(ch.subScale) || 1, progress: !!ch.progress, watermark: (ch.watermark || '').trim(),
  };
}
async function renderThemePreview() {
  if (!cur) return;
  const cv = $('#themePreview');
  const asp = cur.aspect;
  cv.width = asp === '9:16' ? 360 : asp === '1:1' ? 480 : 640;
  cv.height = asp === '9:16' ? 640 : asp === '1:1' ? 480 : 360;
  await document.fonts.ready;
  const tl = buildTimeline({ ...PREV_PLAN, scenes: [{ ...PREV_PLAN.scenes[0], narration: 'Kanalının videoları böyle görünecek, altyazı da böyle akacak.' }] }, [4], { aspect: asp });
  renderFrame(cv.getContext('2d'), cv.width, cv.height, tl, 2.4, buildCfg(cur, cur.seed || 1));
}

// ---------------------------------------------------------------------------
// SESLER
// ---------------------------------------------------------------------------
async function loadVoices() {
  if (!cur) return;
  $('#voice').innerHTML = '<option>Yükleniyor…</option>';
  voices = await json('/api/voices?provider=' + cur.ttsProvider).catch((e) => (toast('Sesler alınamadı: ' + e.message), []));
  filterVoices();
}
function filteredVoices() {
  const lang = langInfo(cur.language);
  const q = $('#voiceSearch').value.toLowerCase(), g = $('#voiceGender').value, all = $('#allLangVoices').checked;
  return voices
    .filter((v) => (all || v.locale === 'multi' || v.locale.toLowerCase().startsWith(lang.code + '-') || /Multilingual/i.test(v.id)) && (!g || v.gender === g) && (!q || (v.name + v.id + v.locale).toLowerCase().includes(q)))
    .sort((a, b) => (b.locale.startsWith(lang.code) ? 1 : 0) - (a.locale.startsWith(lang.code) ? 1 : 0));
}
function filterVoices() {
  const list = filteredVoices(), sel = $('#voice');
  sel.innerHTML = list.map((v) => `<option value="${v.id}">${v.gender === 'Female' ? '♀' : v.gender === 'Male' ? '♂' : '•'} ${esc(v.name)}</option>`).join('') || '<option disabled>Bu filtrede ses yok</option>';
  if (!list.some((v) => v.id === cur.voice)) {
    const pick = list.find((v) => cur.voiceGender && v.gender === cur.voiceGender) || list[0];
    if (pick) { cur.voice = pick.id; saveCur(); }
  }
  sel.value = cur.voice;
  renderHead();
}
['#voiceSearch', '#voiceGender', '#allLangVoices'].forEach((s) => $(s).addEventListener('input', filterVoices));
$('#voice').onchange = () => { cur.voice = $('#voice').value; saveCur(); renderHead(); };
let previewAudio;
$('#btnPreviewVoice').onclick = async () => {
  if (cur.ttsProvider === 'none') return toast('Sessiz mod seçili');
  const b = $('#btnPreviewVoice');
  b.disabled = true;
  try {
    const res = await api('/api/tts', { provider: cur.ttsProvider, voice: cur.voice, text: SAMPLE[cur.language] || SAMPLE.en, rate: cur.rate, pitch: cur.pitch });
    previewAudio?.pause();
    previewAudio = new Audio(URL.createObjectURL(await res.blob()));
    previewAudio.play();
  } catch (e) {
    toast('Ses hatası: ' + e.message, 6000);
  }
  b.disabled = false;
};

// ---------------------------------------------------------------------------
// OLUŞTUR
// ---------------------------------------------------------------------------
const PLACE = {
  script: "Script'ini buraya yapıştır.\n\nBirden fazla video için script'leri ayrı satırda --- ile ayır.",
  topic: 'Bir konu yaz, script\'i yapay zeka yazsın.\n\nHer satıra ayrı bir konu yazarsan her biri ayrı video olur.',
  topics: 'Boş bırakırsan konular kanal konseptinden üretilir.\nİstersen bir alt tema yaz (ör: "uyku ve verimlilik").',
};
function syncMode() {
  $$('#inputMode button').forEach((b) => b.classList.toggle('on', b.dataset.v === inputMode));
  $('#script').placeholder = PLACE[inputMode];
  $('#script').value = localStorage.getItem('ms-text-' + inputMode) || '';
}
$('#inputMode').onclick = (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  inputMode = b.dataset.v;
  localStorage.setItem('ms-mode', inputMode);
  syncMode();
};
$('#script').addEventListener('input', () => localStorage.setItem('ms-text-' + inputMode, $('#script').value));
function renderIdeas() {
  $('#ideas').innerHTML = (cur.ideas || []).map((i) => `<button title="Bu konuyu kullan">${esc(i)}</button>`).join('');
}
$('#ideas').onclick = (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  inputMode = 'topic';
  localStorage.setItem('ms-mode', inputMode);
  localStorage.setItem('ms-text-topic', b.textContent);
  syncMode();
};

function shuffle(a) {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}
const decodeCtx = () => new OfflineAudioContext(1, 1, 48000);

async function gatherInputs() {
  const provider = $('#provider').value, model = $('#model').value.trim();
  const count = Math.min(10, Math.max(1, Number($('#count').value) || 1));
  const text = $('#script').value.trim();
  const topics = (theme) => json('/api/topics', { theme, count, language: cur.language, minutes: cur.minutes, provider, model });
  if (inputMode === 'script') {
    const scripts = text.split(/^\s*-{3,}\s*$/m).map((s) => s.trim()).filter(Boolean);
    if (!scripts.length) throw new Error('Script boş');
    const list = scripts.length > 1 ? scripts.slice(0, 10) : Array(count).fill(scripts[0]);
    return list.map((t, i) => ({ type: 'script', text: t, label: t.split(/[.!?\n]/)[0].slice(0, 60) + (scripts.length === 1 && count > 1 ? ` (#${i + 1})` : '') }));
  }
  if (provider === 'offline') throw new Error('Konudan video için soldan bir yapay zeka kaynağı seç (Anthropic, Google…)');
  if (inputMode === 'topic') {
    const lines = text.split('\n').map((s) => s.trim()).filter(Boolean);
    if (!lines.length) throw new Error('Bir konu yaz');
    if (lines.length > 1 || count === 1) return lines.slice(0, 10).map((t) => ({ type: 'topic', text: t, label: t.slice(0, 60) }));
    $('#goInfo').textContent = 'Konu açıları üretiliyor…';
    return (await topics(lines[0])).map((t) => ({ type: 'topic', text: `${t.title}\n${t.angle || ''}`, label: t.title }));
  }
  $('#goInfo').textContent = 'Konular üretiliyor…';
  const theme = text || `${cur.name}: ${cur.concept}`;
  return (await topics(theme)).map((t) => ({ type: 'topic', text: `${t.title}\n${t.angle || ''}`, label: t.title }));
}

$('#btnGo').onclick = async () => {
  if (busy || !cur) return;
  const ch = cur;
  let inputs;
  $('#btnGo').disabled = true;
  try {
    inputs = await gatherInputs();
  } catch (e) {
    $('#btnGo').disabled = false;
    $('#goInfo').textContent = '';
    return toast(e.message, 6000);
  }
  busy = true;
  abort = new AbortController();
  $('#btnStop').hidden = false;
  $('#jobsHead').hidden = false;
  const vlist = filteredVoices();
  const voicePick = ch.randomVoice && vlist.length ? shuffle(vlist) : null;
  const sk = skillOf(ch);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
  const base = {
    provider: $('#provider').value, model: $('#model').value.trim(), skillId: ch.skillId, useSkillContext: true,
    channel: { name: ch.name, concept: ch.concept, direction: ch.direction },
    settings: { language: ch.language, minutes: Number(ch.minutes) || 1, aspect: ch.aspect, direction: ch.direction },
  };
  const jobs = inputs.map((inp, i) => {
    const node = $('#jobTpl').content.firstElementChild.cloneNode(true);
    $('.otitle', node).textContent = inp.label || `Video ${i + 1}`;
    $('#jobs').prepend(node);
    return { i, ch, input: inp, node, seed: ((ch.seed || 1) + (Date.now() % 100000) + i * 977) % 1000000, voice: voicePick ? voicePick[i % voicePick.length].id : ch.voice, vid: `${stamp}-${i + 1}` };
  });
  $('#jobsHead').scrollIntoView({ behavior: 'smooth', block: 'start' });
  const plans = new Map();
  const planOf = (j) => plans.get(j.i) || plans.set(j.i, planJob(j, base)).get(j.i);
  let done = 0, failed = 0;
  for (let k = 0; k < jobs.length; k++) {
    if (abort.signal.aborted) break;
    const j = jobs[k];
    if (jobs[k + 1]) planOf(jobs[k + 1]).catch(() => {});
    $('#goInfo').textContent = `Video ${k + 1}/${jobs.length} · ${sk.name}`;
    try {
      await planOf(j);
      await produce(j, base);
      j.node.classList.add('done');
      done++;
    } catch (e) {
      j.node.classList.add('fail');
      $('.media-wait', j.node).hidden = true;
      msg(j.node, '❌ ' + e.message);
      failed++;
      console.error(e);
    }
  }
  busy = false;
  $('#btnGo').disabled = false;
  $('#btnStop').hidden = true;
  $('#goInfo').textContent = `${done} video hazır${failed ? `, ${failed} hata` : ''}`;
  if (done) toast(`${done} video "${ch.name}" kanalına eklendi`);
  refreshCounts();
};
$('#btnStop').onclick = () => abort?.abort();

function setStage(n, s, state, pct) {
  const el = $(`.stage[data-s="${s}"]`, n);
  el.classList.toggle('active', state === 'active');
  el.classList.toggle('done', state === 'done');
  if (pct != null) el.querySelector('i').style.setProperty('--p', Math.round(pct * 100) + '%');
}
const msg = (n, m) => ($('.msg', n).textContent = m);

async function planJob(j, base) {
  const n = j.node;
  setStage(n, 'plan', 'active', 0.3);
  msg(n, base.provider === 'offline' ? 'Kural tabanlı senaryo…' : 'Yapay zeka senaryoyu yazıyor…');
  const t0 = performance.now();
  const plan = await json('/api/plan', { ...base, input: j.input, variety: j.seed }, { signal: abort.signal });
  j.plan = plan;
  $('.otitle', n).textContent = plan.title;
  setStage(n, 'plan', 'done');
  msg(n, `${plan.scenes.length} sahne · ${((performance.now() - t0) / 1000).toFixed(0)} sn`);
  return plan;
}


// ---------------------------------------------------------------------------
// KADRO: sabit karakter + sabit ses
// ---------------------------------------------------------------------------
const CAST = (() => { try { return JSON.parse(localStorage.getItem('ms-fcast')) || { narrator: { voice: '', pitch: 0 }, chars: [] }; } catch { return { narrator: { voice: '', pitch: 0 }, chars: [] }; } })();
const saveCast = () => { try { localStorage.setItem('ms-fcast', JSON.stringify(CAST)); } catch {} };
function castVoiceOpts(sel) {
  const list = voices.length ? filteredVoices() : [];
  return `<option value="">(otomatik)</option>` + list.map((v) => `<option value="${esc(v.id)}"${v.id === sel ? ' selected' : ''}>${v.gender === 'Female' ? '♀' : v.gender === 'Male' ? '♂' : '•'} ${esc(v.name)}</option>`).join('');
}
function renderCast() {
  const rows = [`<div class="cast-row"><span class="tag">🎙 Anlatıcı</span><span class="tag">(sahnede ana karakter)</span><select data-k="nv">${castVoiceOpts(CAST.narrator.voice)}</select><input type="number" data-k="np" min="-20" max="20" value="${CAST.narrator.pitch || 0}" title="Ton (Hz)" /><span></span></div>`];
  CAST.chars.forEach((c, i) => rows.push(`<div class="cast-row" data-i="${i}"><input data-k="name" value="${esc(c.name || '')}" placeholder="İsim" /><select data-k="costume">${COSTUME_NAMES.map((n) => `<option${n === c.costume ? ' selected' : ''}>${n}</option>`).join('')}</select><select data-k="voice">${castVoiceOpts(c.voice)}</select><input type="number" data-k="pitch" min="-20" max="20" value="${c.pitch || 0}" title="Ton (Hz)" /><button class="ghost" data-del="${i}" type="button">✕</button></div>`));
  $('#castRows').innerHTML = rows.join('');
}
$('#castRows').addEventListener('change', (e) => {
  const k = e.target.dataset.k, row = e.target.closest('.cast-row');
  if (!k) return;
  if (k === 'nv') CAST.narrator.voice = e.target.value;
  else if (k === 'np') CAST.narrator.pitch = Number(e.target.value) || 0;
  else CAST.chars[Number(row.dataset.i)][k] = k === 'pitch' ? Number(e.target.value) || 0 : e.target.value;
  saveCast();
});
$('#castRows').addEventListener('click', (e) => { const d = e.target.dataset.del; if (d != null) { CAST.chars.splice(Number(d), 1); saveCast(); renderCast(); } });
$('#castAdd').onclick = () => { if (CAST.chars.length >= 4) return toast('En fazla 4 karakter'); CAST.chars.push({ name: '', costume: COSTUME_NAMES[CAST.chars.length % COSTUME_NAMES.length], voice: '', pitch: 0 }); saveCast(); renderCast(); };
$('#castBox').addEventListener('toggle', renderCast);

/** Her konuşmacıya SABİT ses: kullanıcı seçtiyse o; yoksa cinsiyete göre birbirinden farklı sesler */
function buildVoiceMap(characters, ch, narratorVoice) {
  const list = voices.length ? filteredVoices() : [];
  const used = new Set([narratorVoice]);
  const map = { narrator: { voice: narratorVoice, pitch: CAST.narrator.pitch || 0 } };
  const pick = (gender) => {
    const pool = list.filter((v) => v.gender === gender && !used.has(v.id));
    return (pool[0] || list.find((v) => !used.has(v.id)) || list[0] || {}).id || narratorVoice;
  };
  for (const c of characters || []) {
    const mine = CAST.chars.find((x) => (x.name || '').trim() === c.name) || {};
    const female = c.gender === 'female' || c.gender === 'child';
    const voice = mine.voice || pick(female ? 'Female' : 'Male');
    used.add(voice);
    map[c.id] = { voice, pitch: (mine.pitch || 0) + (c.gender === 'child' ? 12 : 0) };
  }
  return map;
}

async function produce(j, base) {
  const n = j.node, plan = j.plan, ch = j.ch;
  setStage(n, 'tts', 'active', 0);
  const buffers = {}, durs = [];
  if (ch.ttsProvider === 'none') {
    plan.scenes.forEach((s, i) => (durs[i] = estimateDuration(s.narration, ch.language)));
  } else {
    let k = 0, doneN = 0;
    const worker = async () => {
      while (k < plan.scenes.length) {
        if (abort.signal.aborted) throw new Error('Durduruldu');
        const i = k++;
        const vm = (j.voiceMap || {})[plan.scenes[i].speaker] || (j.voiceMap || {}).narrator || { voice: j.voice, pitch: ch.pitch };
        const res = await api('/api/tts', { provider: ch.ttsProvider, voice: vm.voice || j.voice, text: plan.scenes[i].narration, rate: ch.rate, pitch: Math.max(-50, Math.min(50, (ch.pitch || 0) + (vm.pitch || 0))) }, { signal: abort.signal });
        const buf = await decodeCtx().decodeAudioData(await res.arrayBuffer());
        buffers[i] = buf;
        durs[i] = buf.duration;
        setStage(n, 'tts', 'active', ++doneN / plan.scenes.length);
        msg(n, `Seslendirme ${doneN}/${plan.scenes.length}`);
      }
    };
    await Promise.all([worker(), worker(), worker()]);
  }
  setStage(n, 'tts', 'done');
  j.buffers = buffers;
  j.durs = durs;
  await render(j, base);
}

async function render(j, base) {
  const n = j.node, plan = j.plan, ch = j.ch;
  const q = j.film ? j.film.quality : Number(ch.quality) || 720, aspect = j.film ? '16:9' : ch.aspect;
  const [W, H] = aspect === '9:16' ? [q, Math.round((q * 16) / 9)] : aspect === '1:1' ? [q, q] : [Math.round((q * 16) / 9), q];
  const cfg = j.film ? filmCfg(ch, j) : buildCfg(ch, j.seed);
  const tl = buildTimeline(plan, j.durs, { intro: j.film ? false : ch.intro, outro: j.film ? false : ch.outro, language: ch.language, aspect });
  if (j.film) { tl.scenes[0] && (tl.scenes[0].fadeIn = true); cfg.prepare = makePrepare(tl); await Promise.all(tl.scenes.slice(0, 3).map((s) => (s.photo || s.backdrop) && loadPhoto(s.photo || s.backdrop).catch(() => {}))); }
  setStage(n, 'render', 'active', 0);
  msg(n, 'Ses miksajı…');
  await document.fonts.ready;
  const audio = await mixAudio(tl, j.buffers, { music: ch.music, musicBuffer, musicVolume: Number(ch.musicVol), sfx: ch.sfx });
  Object.assign(j, { tl, cfg, audio, W, H });
  setupPreview(j);

  const tc = Object.assign(document.createElement('canvas'), { width: 1280, height: 720 });
  if (j.film && j.film.thumbUrl) await filmThumb(tc.getContext('2d'), j.film.thumbUrl, plan.thumbnail?.highlight || plan.thumbnail?.text || plan.title);
  else renderThumbnail(tc.getContext('2d'), 1280, 720, plan, cfg);
  const thumbBlob = await new Promise((r) => tc.toBlob(r, 'image/png'));
  $('.thumb', n).src = URL.createObjectURL(thumbBlob);

  const t0 = performance.now();
  const out = await exportVideo({
    W, H, fps: 30, tl, cfg, audio, signal: abort.signal,
    onProgress: (p, info) => {
      setStage(n, 'render', 'active', p);
      msg(n, `Render %${Math.round(p * 100)} ${info?.realtime ? '(gerçek zamanlı kayıt)' : info?.fps ? `· ${info.fps.toFixed(0)} fps` : ''}`);
    },
  });
  setStage(n, 'render', 'done');
  msg(n, 'Kaydediliyor…');
  const save = async (name, blob) => (await fetch(`/api/save?channel=${ch.id}&video=${j.vid}&name=${encodeURIComponent(name)}`, { method: 'POST', body: blob })).json();
  const v = await save('video.' + out.ext, out.blob);
  await save('thumbnail.png', thumbBlob);
  await save('altyazi.srt', new Blob([toSRT(tl.cues)], { type: 'text/plain' }));
  await save('plan.json', new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' }));
  await save('youtube.txt', new Blob([`${plan.title}\n\n${plan.description}\n\n${(plan.tags || []).map((t) => '#' + t.replace(/\s+/g, '')).join(' ')}`], { type: 'text/plain' }));
  const sk = skillOf(ch);
  await save('meta.json', new Blob([JSON.stringify({ kind: 'video', title: plan.title, createdAt: new Date().toISOString(), duration: tl.total, video: v.name, thumb: 'thumbnail.png', aspect, style: sk?.style, skill: sk?.id, theme: ch.themeId, voice: ch.ttsProvider === 'none' ? null : j.voice })], { type: 'application/json' }));
  const b = `/output/${ch.id}/${j.vid}/`;
  msg(n, `${fmtDur(tl.total)} · ${(out.blob.size / 1048576).toFixed(1)} MB · ${((performance.now() - t0) / 1000).toFixed(0)} sn'de render edildi`);
  $('.links', n).innerHTML = `<a href="${b}${v.name}" download>⬇ Video</a><a href="${b}thumbnail.png" download>Kapak</a><a href="${b}altyazi.srt" download>SRT</a><a href="${b}youtube.txt" target="_blank">Açıklama</a>`;
  $('.edit', n).hidden = !!j.film && !j.film.toon;
  $('.planjson', n).value = JSON.stringify(plan.scenes, null, 1);
  $('.rerender', n).onclick = async () => {
    try {
      const scenes = JSON.parse($('.planjson', n).value);
      if (scenes.length !== plan.scenes.length || scenes.some((s, i) => s.narration !== plan.scenes[i].narration)) return toast('Burada yalnızca görsel alanlar değişir (action, props, keyword, bg, camera). Anlatım metni için videoyu yeniden üret.', 7000);
      j.plan = { ...plan, scenes };
      abort = new AbortController();
      n.classList.remove('done');
      await render(j, base);
      n.classList.add('done');
    } catch (e) {
      toast('Hata: ' + e.message, 6000);
    }
  };
}

function setupPreview(j) {
  const n = j.node;
  $('.media-wait', n).hidden = true;
  $('.preview', n).hidden = false;
  const cv = $('.pv', n), img = $('.thumb', n);
  const scale = 540 / Math.max(j.W, j.H);
  cv.width = Math.round(j.W * scale);
  cv.height = Math.round(j.H * scale);
  const ctx = cv.getContext('2d'), seek = $('.seek', n);
  let t = Math.min(j.tl.total * 0.5, (j.tl.scenes[1]?.start ?? 0) + 1.4), playing = false, actx, src, startAt;
  const draw = () => renderFrame(ctx, cv.width, cv.height, j.tl, t, j.cfg);
  draw();
  seek.value = (t / j.tl.total) * 1000;
  const stop = () => {
    playing = false;
    try { src?.stop(); } catch {}
    actx?.close();
    actx = null;
    $('.play', n).textContent = '▶ Önizle';
  };
  $('.showthumb', n).onclick = () => {
    img.hidden = !img.hidden;
    cv.hidden = !img.hidden;
  };
  $('.play', n).onclick = () => {
    if (playing) return stop();
    if (t >= j.tl.total - 0.3 || !j.played) t = 0;
    j.played = true;
    img.hidden = true;
    cv.hidden = false;
    actx = new AudioContext();
    src = actx.createBufferSource();
    src.buffer = j.audio;
    src.connect(actx.destination);
    startAt = actx.currentTime - t;
    src.start(0, t);
    playing = true;
    $('.play', n).textContent = '❚❚ Durdur';
    const loop = () => {
      if (!playing) return;
      t = actx.currentTime - startAt;
      if (t >= j.tl.total) { t = 0; stop(); draw(); return; }
      seek.value = (t / j.tl.total) * 1000;
      draw();
      requestAnimationFrame(loop);
    };
    loop();
  };
  seek.oninput = () => {
    if (playing) stop();
    t = (seek.value / 1000) * j.tl.total;
    draw();
  };
}

// ---------------------------------------------------------------------------
// KÜTÜPHANE
// ---------------------------------------------------------------------------
async function refreshCounts() {
  const list = await json('/api/channels').catch(() => []);
  for (const c of channels) c.videoCount = list.find((x) => x.id === c.id)?.videoCount || 0;
  renderRail();
  loadLibrary();
}
async function loadLibrary() {
  if (!cur) return;
  const items = await json('/api/library?channel=' + cur.id).catch(() => []);
  LIB = items;
  if (!$('#clipHome').hidden) renderRecent();
  $('#libCount').textContent = items.length || '';
  $('#libPath').textContent = `Dosyalar: output/${cur.id}/`;
  $('#library').innerHTML = items.length
    ? items.map((it) => {
        const has = (n) => it.files.includes(n);
        const dl = (name, label, attrs = 'download') => (has(name) ? `<a class="ab" href="${it.base}${name}" ${attrs}>${label}</a>` : `<span class="ab off" aria-disabled="true">${label}</span>`);
        return `<article class="card done"><div class="media"><video src="${it.base}${it.video}" poster="${it.base}${it.thumb}" controls preload="none" playsinline></video></div>
        <div class="card-body"><h4><span class="badge">${it.kind === 'clip' ? 'Klip' : 'Video'}</span>${esc(it.title)}</h4>
        <div class="muted meta">${fmtDur(it.duration || 0)} · ${new Date(it.createdAt).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })}</div>
        <div class="acts"><div class="a2">${dl(it.video, '⬇ Video')}${dl(it.thumb, 'Kapak')}</div><div class="a3">${dl('altyazi.srt', 'SRT')}${dl('youtube.txt', 'Açıklama', 'target="_blank"')}<button class="ab del" data-del="${it.id}">Sil</button></div></div></div></article>`;
      }).join('')
    : '<div class="empty-note">Bu kanalda henüz içerik yok. Klip oluştur ya da animasyon stüdyosundan ilk videonu üret.</div>';
}
$('#library').onclick = async (e) => {
  const b = e.target.closest('[data-del]');
  if (!b) return;
  if (!confirm('Bu video ve dosyaları diskten kalıcı olarak silinsin mi? Geri alınamaz.')) return;
  await api('/api/library/delete', { channel: cur.id, id: b.dataset.del });
  refreshCounts();
};

// ---------------------------------------------------------------------------
// KLİP: uzun video → skorlanmış, altyazılı klipler
// ---------------------------------------------------------------------------
const G = { running: false, items: new Map() };
let LIB = [];
const fmtT = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
const parseT = (s) => {
  const p = String(s).trim().split(':').map(Number);
  if (!p.length || p.some(isNaN)) return null;
  return p.reduce((a, v) => a * 60 + v, 0);
};
for (const id of ['gTpl', 'gFont', 'gAspect', 'gCount', 'gLen', 'gColor', 'gHook', 'gVar']) {
  const el = $('#' + id), v = localStorage.getItem('ms-' + id);
  if (v != null) el.type === 'checkbox' ? (el.checked = v === '1') : (el.value = v);
  el.addEventListener('change', () => localStorage.setItem('ms-' + id, el.type === 'checkbox' ? (el.checked ? '1' : '0') : el.value));
}
function greet() {
  $('#greet').textContent = 'Uzun videoyu yapıştır. En iyi kesitleri al.';
}

/** Transkript kelimelerinden altyazı satırları (zamanlar klibin başına göre) */
function buildCues(meta, clip, aspect) {
  const W = (meta.words || []).filter((w) => w.s >= clip.start - 0.05 && w.e <= clip.end + 0.3);
  const max = aspect === '9:16' ? 3 : 6;
  const cues = [];
  let cur_ = [];
  const flush = () => {
    if (!cur_.length) return;
    cues.push({ start: Math.max(0, cur_[0].s - clip.start), end: cur_[cur_.length - 1].e - clip.start, text: cur_.map((w) => w.w).join(' '), words: cur_.map((w) => ({ s: Math.max(0, w.s - clip.start), e: w.e - clip.start, w: w.w })) });
    cur_ = [];
  };
  W.forEach((w, i) => {
    cur_.push(w);
    const nx = W[i + 1];
    if (cur_.length >= max || (/[.!?…,]$/.test(w.w) && cur_.length >= 2) || (nx && nx.s - w.e > 0.6)) flush();
  });
  flush();
  cues.forEach((q, i) => {
    const nx = cues[i + 1];
    if (nx && nx.start - q.end < 0.35) q.end = nx.start;
  });
  return cues;
}

function showClipHome() {
  $('#clipHome').hidden = false;
  $('#clipTask').hidden = true;
  greet();
  renderRecent();
}
function showTask(title, metaTxt) {
  $('#clipHome').hidden = true;
  $('#clipTask').hidden = false;
  $('#taskTitle').textContent = title;
  $('#taskMeta').textContent = metaTxt || '';
}
function setSteps(steps) {
  $('#taskSteps').innerHTML = steps.map((s) => `<div class="step ${s.state || ''}"><span class="dot"></span>${esc(s.label)}${s.note ? ` · ${esc(s.note)}` : ''}</div>`).join('');
}
const SCORE_LABELS = { hook: 'Hook', engagement: 'Etkileşim', value: 'Değer', shareability: 'Paylaşım' };
function clipCard(it) {
  G.items.set(it.id, it);
  const el = document.createElement('article');
  el.className = 'clipcard';
  el.dataset.id = it.id;
  const a = it.aspect === '1:1' ? 'a-1x1' : it.aspect === 'source' ? 'a-src' : '';
  const v = it.v ? `?v=${it.v}` : '';
  el.innerHTML = `<div class="cmedia ${a}"><video src="${it.base}${it.video}${v}" poster="${it.base}${it.thumb}${v}" controls preload="none" playsinline></video>${it.score != null ? `<span class="score" title="Viral skoru">${it.score}<small>/100</small></span>` : ''}</div>
    <div class="cbody"><h4>${esc(it.title)}</h4>
    ${it.reason ? `<p class="muted">${esc(it.reason)}</p>` : ''}
    ${it.scores ? `<div class="bars">${Object.entries(SCORE_LABELS).map(([k, l]) => `<div class="bar"><span>${l}<b>${it.scores[k] ?? 0}</b></span><i style="--v:${it.scores[k] ?? 0}%"></i></div>`).join('')}</div>` : ''}
    <div class="muted" style="font-size:12px">${fmtDur(it.duration || 0)}${it.wantBurn && !it.burned ? ' · Altyazı videoya gömülemedi, .srt dosyası kaydedildi' : ''}</div>
    <div class="acts"><div class="a2"><a class="ab" href="${it.base}${it.video}" download="${esc(it.title)}.mp4">⬇ İndir</a><button class="ab fxbtn" data-fx>✨ Geliştir</button></div><div class="a3"><button class="ab" data-edit>Düzenle</button>${(it.files || []).includes('altyazi.srt') ? `<a class="ab" href="${it.base}altyazi.srt" download>SRT</a>` : '<span class="ab off" aria-disabled="true">SRT</span>'}<button class="ab del" data-del>Sil</button></div></div></div>`;
  return el;
}
function pendingCard(title, aspect) {
  const el = document.createElement('article');
  el.className = 'clipcard';
  el.innerHTML = `<div class="cmedia ${aspect === '1:1' ? 'a-1x1' : aspect === 'source' ? 'a-src' : ''}"><div class="media-wait"><span class="spin"></span></div></div><div class="cbody"><h4>${esc(title)}</h4><p class="muted msg">Kesiliyor, kadrajlanıyor, altyazı gömülüyor…</p></div>`;
  return el;
}


/** Her klibe farklı bir görünüm: altyazı şablonu, yazı tipi, vurgu rengi, konum, boyut ve kadraj odağı döner */
const VARIANTS = [
  { sub: 'default', font: 'Montserrat', color: '#FFD54A', pos: 'bottom', size: 1.0, focus: 0.5, hook: true },
  { sub: 'neon', font: 'Impact', color: '#39F5C4', pos: 'middle', size: 1.1, focus: 0.35, hook: true },
  { sub: 'minimal', font: 'Helvetica', color: '#FFFFFF', pos: 'bottom', size: 0.9, focus: 0.65, hook: false },
  { sub: 'podcast', font: 'Futura', color: '#FF8A3D', pos: 'top', size: 1.0, focus: 0.5, hook: true },
  { sub: 'default', font: 'Impact', color: '#FF5C8A', pos: 'middle', size: 1.2, focus: 0.7, hook: true },
  { sub: 'minimal', font: 'Avenir Next', color: '#7DD3FC', pos: 'bottom', size: 1.0, focus: 0.3, hook: false },
];
function variantFor(i, base) {
  const v = VARIANTS[i % VARIANTS.length];
  return { style: { ...base, sub: v.sub, font: v.font, color: v.color, pos: v.pos, size: v.size }, focus: v.focus, hook: v.hook };
}

async function startGeneration(src) {
  if (G.running) return toast('Bir üretim zaten sürüyor');
  if (!cur) return;
  const ch = cur, provider = $('#provider').value, model = $('#model').value.trim();
  const o = { sub: $('#gTpl').value, font: $('#gFont').value, aspect: $('#gAspect').value, color: $('#gColor').value, count: Math.min(12, Math.max(1, Number($('#gCount').value) || 5)), length: Number($('#gLen').value), hook: $('#gHook').checked };
  G.running = true;
  const gen = 'g' + Date.now().toString(36);
  const steps = [{ key: 'fetch', label: src.file ? 'Video yükleniyor' : 'Video indiriliyor', state: 'active' }, { key: 'tr', label: 'Transkript' }, { key: 'pick', label: 'En iyi anlar seçiliyor' }, { key: 'render', label: 'Klipler hazırlanıyor' }];
  const st = (k, state, note) => {
    const s = steps.find((x) => x.key === k);
    s.state = state;
    if (note !== undefined) s.note = note;
    setSteps(steps);
  };
  showTask(src.file ? src.file.name : src.url, 'Uzun videolarda indirme birkaç dakika sürebilir. Bu sayfadan ayrılma.');
  $('#clipWall').innerHTML = '';
  setSteps(steps);
  let ok = 0;
  try {
    let meta;
    if (src.file) {
      const res = await fetch('/api/clip/upload?name=' + encodeURIComponent(src.file.name), { method: 'POST', body: src.file });
      if (!res.ok) throw new Error((await res.json()).error);
      meta = await res.json();
    } else meta = await json('/api/clip/fetch', { url: src.url, language: ch.language });
    st('fetch', 'done');
    $('#taskTitle').textContent = meta.title;
    $('#taskMeta').textContent = `${fmtDur(meta.duration)} · ${meta.width}×${meta.height}`;
    st('tr', 'active');
    if (!meta.words?.length) {
      if (health?.clip?.stt) {
        st('tr', 'active', 'konuşma yazıya dökülüyor, uzun sürebilir');
        meta = await json('/api/clip/transcribe', { id: meta.id, language: ch.language });
        st('tr', 'done', `${meta.words.length} kelime`);
      } else st('tr', 'skip', 'altyazı yok: klipler eşit bölünecek, altyazısız olacak');
    } else st('tr', 'done', `${meta.words.length} kelime · ${meta.subLang || ''}`);
    st('pick', 'active');
    const useAI = provider !== 'offline' && meta.words?.length > 0;
    const segReq = (mode) => json('/api/clip/segments', { id: meta.id, mode, length: o.length, count: o.count, provider, model, language: ch.language });
    let segs, how = useAI ? 'yapay zeka seçti' : 'otomatik bölündü';
    try {
      segs = await segReq(useAI ? 'ai' : 'auto');
    } catch (e) {
      if (!useAI) throw e;
      segs = await segReq('auto');
      how = 'yapay zeka seçemedi, otomatik bölündü: ' + e.message.slice(0, 80);
    }
    if (!segs.length) throw new Error('Kesit bulunamadı');
    st('pick', 'done', how);
    st('render', 'active', `0/${segs.length}`);
    const base = { sub: o.sub, font: o.font, aspect: o.aspect, size: 1, color: o.color, pos: 'bottom', fit: ['blur', 'camtop'].includes($('#gFit')?.value) ? $('#gFit').value : undefined, follow: ['face', 'ball', 'action'].includes($('#gFollow')?.value) ? $('#gFollow').value : undefined, cam: $('#gFit')?.value === 'camtop' ? { corner: $('#gCamCorner').value, size: 0.28, aspect: '16:9' } : undefined };
    const mix = $('#gVar').value === 'mix';
    for (const [i, seg] of segs.entries()) {
      const v = mix ? variantFor(i, base) : { style: base, focus: 0.5, hook: true };
      const style = v.style;
      const clip = { ...seg, hook: o.hook && v.hook ? seg.hook || '' : '', focus: v.focus, cues: buildCues(meta, seg, o.aspect) };
      const ph = pendingCard(seg.title, o.aspect);
      $('#clipWall').append(ph);
      try {
        const r = await json('/api/clip/render', { id: meta.id, channel: ch.id, gen, clip, style });
        ph.replaceWith(clipCard(r));
        ok++;
      } catch (e) {
        ph.classList.add('fail');
        $('.media-wait', ph).hidden = true;
        $('.msg', ph).textContent = '❌ ' + e.message;
      }
      st('render', 'active', `${i + 1}/${segs.length}`);
    }
    st('render', ok ? 'done' : 'fail', `${ok} klip hazır`);
    if (ok) { toast(`${ok} klip "${ch.name}" kanalına eklendi`); window.__kesitDone?.(`${ok} klip hazır`); }
  } catch (e) {
    const a = steps.find((x) => x.state === 'active') || steps[0];
    a.state = 'fail';
    a.note = e.message;
    setSteps(steps);
    if (e.code === 'NEEDS_COOKIES' && window.__kesitCookies) {
      G.running = false;
      refreshCounts();
      window.__kesitCookies.ask().then((saved) => { if (saved) startGeneration(src); });
      return;
    }
  }
  G.running = false;
  refreshCounts();
}
$('#btnGen').onclick = () => {
  const url = $('#clipUrl').value.trim();
  if (!url) return toast('Bir video bağlantısı yapıştır ya da dosya yükle');
  if (!/^https?:\/\//i.test(url)) return toast('Bağlantı https:// ile başlamalı');
  startGeneration({ url });
};
$('#clipUrl').addEventListener('keydown', (e) => e.key === 'Enter' && $('#btnGen').click());
$('#btnUpload').onclick = () => $('#clipFile').click();
$('#clipFile').onchange = () => {
  const f = $('#clipFile').files[0];
  $('#clipFile').value = '';
  if (f) startGeneration({ file: f });
};
const comp = $('#clipComposer');
comp.addEventListener('dragover', (e) => { e.preventDefault(); comp.classList.add('drag'); });
comp.addEventListener('dragleave', () => comp.classList.remove('drag'));
comp.addEventListener('drop', (e) => {
  e.preventDefault();
  comp.classList.remove('drag');
  const f = e.dataTransfer.files[0];
  if (f && f.type.startsWith('video/')) startGeneration({ file: f });
});
$('#btnBackHome').onclick = showClipHome;

function renderRecent() {
  const groups = new Map();
  for (const it of LIB.filter((x) => x.kind === 'clip')) {
    const k = it.gen || it.id;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(it);
  }
  $('#recent').innerHTML = groups.size
    ? [...groups.entries()].map(([k, list]) => {
        const best = Math.max(...list.map((x) => x.score ?? 0));
        return `<button class="gen" data-gen="${esc(k)}"><img src="${list[0].base}${list[0].thumb}" alt="" /><div><b>${esc(list[0].sourceTitle || list[0].title)}</b><small>${list.length} klip${best ? ` · en iyi skor ${best}` : ''} · ${new Date(list[0].createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</small></div></button>`;
      }).join('')
    : '<div class="empty-note">Henüz klip üretmedin. Yukarıya bir bağlantı yapıştır ya da video yükle.</div>';
}
$('#recent').onclick = (e) => {
  const b = e.target.closest('.gen');
  if (!b) return;
  const list = LIB.filter((x) => x.kind === 'clip' && (x.gen || x.id) === b.dataset.gen).sort((a, c) => (c.score ?? 0) - (a.score ?? 0));
  showTask(list[0].sourceTitle || list[0].title, `${list.length} klip`);
  $('#taskSteps').innerHTML = '';
  $('#clipWall').innerHTML = '';
  for (const it of list) $('#clipWall').append(clipCard(it));
};
$('#gFit')?.addEventListener('change', () => { $('#gCamWrap').hidden = $('#gFit').value !== 'camtop'; });
$('#clipWall').onclick = async (e) => {
  const card = e.target.closest('.clipcard');
  if (!card?.dataset.id) return;
  const it = G.items.get(card.dataset.id);
  if (e.target.closest('[data-edit]')) return openEditor(it);
  if (e.target.closest('[data-fx]')) return window.__kesitFx?.open(it, cur.id, [...G.items.values()]);
  if (e.target.closest('[data-del]')) {
    if (!confirm('Bu klip ve dosyaları diskten kalıcı olarak silinsin mi? Geri alınamaz.')) return;
    await api('/api/library/delete', { channel: cur.id, id: it.id });
    card.remove();
    refreshCounts();
  }
};

// ---------- klip editörü ----------
const E = { item: null, meta: null, clip: null, style: null, playEnd: null };
const video = $('#clipVideo'), dlgEd = $('#dlgEditor');
let overlayKey = '';
async function openEditor(it) {
  let meta;
  try {
    meta = await json('/api/clip/source?id=' + encodeURIComponent(it.src));
  } catch (e) {
    return toast(e.message, 6000);
  }
  const c = it.clip || { start: 0, end: it.duration, cues: [] };
  E.item = it;
  E.meta = meta;
  E.clip = { start: c.start, end: c.end, focus: c.focus ?? 0.5, hook: c.hook || '', title: it.title, cues: JSON.parse(JSON.stringify(c.cues || [])) };
  const s = it.style || {};
  E.style = { sub: { karaoke: 'default', outline: 'minimal', box: 'podcast' }[s.sub] || s.sub || 'default', font: s.font || 'Arial', aspect: s.aspect || '9:16', size: s.size || 1, color: s.color || '#FFD54A', pos: s.pos || 'bottom', fit: s.fit, follow: s.follow, cam: s.cam };
  $('#edTitle').value = E.clip.title;
  $('#edHook').value = E.clip.hook;
  $('#edFocus').value = E.clip.focus;
  E.clip.track = c.track?.path ? { mode: c.track.mode, zoom: c.track.zoom || 1, path: c.track.path, seed: c.track.seed } : null;
  const tmode = E.clip.track ? (E.clip.track.seed ? (E.clip.track.seed.kind === 'ball' ? 'mark-ball' : 'mark') : E.clip.track.mode) : (E.style.follow || 'off');
  E.style.follow = ['face', 'ball', 'action'].includes(E.style.follow) ? E.style.follow : undefined;
  $('#edFollow').value = tmode; $('#edZoom').value = E.clip.track?.zoom || 1;
  $('#edFit').value = E.style.fit || 'fill';
  const cm = E.style.cam || { corner: 'bl', size: 0.28, aspect: '16:9' };
  $('#edCamCorner').value = cm.corner; $('#edCamSize').value = cm.size; $('#edCamAR').value = cm.aspect;
  $('#edCamRow').hidden = $('#edFit').value !== 'camtop';
  $('#edTrackMsg').textContent = E.clip.track ? 'Takip hazır. Önizlemede çerçeve nesneyi izler.' : '';
  $('#cSub').value = E.style.sub;
  $('#cFont').value = E.style.font;
  $('#cAspect').value = E.style.aspect;
  $('#cSize').value = E.style.size;
  $('#cColor').value = E.style.color;
  $('#cPos').value = E.style.pos;
  $('#edMsg').textContent = '';
  renderEd();
  video.src = `/work/${meta.id}/${meta.file}`;
  video.onloadedmetadata = () => {
    video.currentTime = E.clip.start;
    layoutCrop();
  };
  dlgEd.showModal();
}
function renderEd() {
  $('#edStart').value = fmtT(E.clip.start);
  $('#edEnd').value = fmtT(E.clip.end);
  $('#edCues').innerHTML = E.clip.cues.map((q, k) => `<div class="cue"><span>${fmtT(q.start)}</span><input data-k="${k}" value="${esc(q.text)}" /><button data-rm="${k}" title="Satırı sil">✕</button></div>`).join('') || '<small class="muted">Altyazı satırı yok. Bu videonun transkripti bulunamadı; "＋ Satır" ile elle yazabilirsin.</small>';
  overlayKey = '';
}
const setTimes = (start, end) => {
  if (E.clip.track && (start !== E.clip.start || end !== E.clip.end)) { E.clip.track = null; $('#edTrackMsg').textContent = 'Süre değişti. Takibi yeniden hesapla.'; }
  E.clip.start = Math.max(0, Math.min(start, end - 1));
  E.clip.end = Math.min(E.meta.duration || end, Math.max(end, E.clip.start + 1));
  E.clip.cues = buildCues(E.meta, E.clip, E.style.aspect);
  renderEd();
};
$('#edStart').onchange = () => { const v = parseT($('#edStart').value); v == null ? renderEd() : setTimes(v, E.clip.end); };
$('#edEnd').onchange = () => { const v = parseT($('#edEnd').value); v == null ? renderEd() : setTimes(E.clip.start, v); };
$('#edSetS').onclick = () => setTimes(+video.currentTime.toFixed(2), E.clip.end);
$('#edSetE').onclick = () => setTimes(E.clip.start, +video.currentTime.toFixed(2));
$('#edPlay').onclick = () => {
  video.currentTime = E.clip.start;
  E.playEnd = E.clip.end;
  video.play();
};
$('#edRebuild').onclick = () => { E.clip.cues = buildCues(E.meta, E.clip, E.style.aspect); renderEd(); };
$('#edAddCue').onclick = () => {
  const last = E.clip.cues[E.clip.cues.length - 1], s = last ? last.end : Math.max(0, video.currentTime - E.clip.start);
  E.clip.cues.push({ start: s, end: Math.min(E.clip.end - E.clip.start, s + 2), text: '', words: [] });
  renderEd();
};
$('#edCues').addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset.k == null) return;
  const q = E.clip.cues[Number(t.dataset.k)];
  q.text = t.value;
  const ws = t.value.trim().split(/\s+/).filter(Boolean), step = (q.end - q.start) / Math.max(1, ws.length);
  q.words = ws.map((w, i) => ({ s: q.start + i * step, e: q.start + (i + 1) * step, w }));
  overlayKey = '';
});
$('#edCues').addEventListener('click', (e) => {
  if (e.target.dataset.rm == null) return;
  E.clip.cues.splice(Number(e.target.dataset.rm), 1);
  renderEd();
});
$('#edTitle').oninput = () => (E.clip.title = $('#edTitle').value);
$('#edHook').oninput = () => { E.clip.hook = $('#edHook').value; overlayKey = ''; };
$('#edFocus').oninput = () => { E.clip.focus = Number($('#edFocus').value); layoutCrop(); };
for (const [id, k, num] of [['cSub', 'sub'], ['cFont', 'font'], ['cSize', 'size', 1], ['cColor', 'color'], ['cPos', 'pos']]) $('#' + id).addEventListener('input', () => { E.style[k] = num ? Number($('#' + id).value) : $('#' + id).value; overlayKey = ''; layoutCrop(); });

// ---- Akıllı takip ve yayıncı düzeni ----
const FOLLOW_MSG = { face: 'Yüz aranıyor…', ball: 'Top aranıyor…', action: 'Hareket analiz ediliyor…', mark: 'Takip ediliyor…', 'mark-ball': 'Top takip ediliyor…' };
function videoContentRect() {
  const r = video.getBoundingClientRect(), vw = video.videoWidth || 16, vh = video.videoHeight || 9, ar = vw / vh;
  let w = r.width, h = r.width / ar;
  if (h > r.height) { h = r.height; w = h * ar; }
  return { left: (r.width - w) / 2, top: (r.height - h) / 2, w, h, rect: r };
}
async function runTrack(seed) {
  const f = $('#edFollow').value;
  if (f === 'off') { E.clip.track = null; E.style.follow = undefined; $('#edTrackMsg').textContent = ''; return layoutCrop(); }
  const mode = f.startsWith('mark') ? 'mark' : f;
  if (mode === 'mark' && !seed) {
    video.pause(); video.currentTime = E.clip.start; E.markPending = true;
    $('#edTrackMsg').textContent = 'Videoda, klibin ilk karesinde takip edilecek ' + (f === 'mark-ball' ? 'topa' : 'kişiye / nesneye') + ' tıkla.';
    $('#markDot').hidden = true;
    return;
  }
  const b = $('#edTrack'); b.disabled = true;
  $('#edTrackMsg').textContent = FOLLOW_MSG[f] + ' Bu birkaç saniye sürebilir.';
  try {
    const r = await json('/api/clip/track', { id: E.item.src, start: E.clip.start, end: E.clip.end, mode, seed: seed ? { ...seed, kind: f === 'mark-ball' ? 'ball' : 'object' } : undefined });
    E.clip.track = { mode, zoom: Number($('#edZoom').value) > 1 ? Number($('#edZoom').value) : r.zoom, path: r.path, seed: seed ? { ...seed, kind: f === 'mark-ball' ? 'ball' : 'object' } : undefined };
    $('#edZoom').value = E.clip.track.zoom;
    $('#edTrackMsg').textContent = r.note || 'Takip hazır. Oynatınca çerçeve nesneyi izler; beğenince "Kaydet ve yeniden üret".';
    layoutCrop();
  } catch (e) { $('#edTrackMsg').textContent = '❌ ' + e.message; }
  b.disabled = false;
}
$('#edFollow').onchange = () => { E.markPending = false; E.clip.track = null; runTrack(); };
$('#edTrack').onclick = () => runTrack(E.clip.track?.seed);
$('#edZoom').oninput = () => { if (E.clip.track) { E.clip.track.zoom = Number($('#edZoom').value); layoutCrop(); } };
video.addEventListener('click', (e) => {
  if (!E.markPending || !dlgEd.open) return;
  e.preventDefault();
  const c = videoContentRect(), x = (e.clientX - c.rect.left - c.left) / c.w, y = (e.clientY - c.rect.top - c.top) / c.h;
  if (x < 0 || x > 1 || y < 0 || y > 1) return;
  E.markPending = false;
  const dot = $('#markDot'); dot.hidden = false; dot.style.left = c.left + x * c.w + 'px'; dot.style.top = c.top + y * c.h + 'px';
  runTrack({ x, y });
}, true);
$('#edFit').onchange = () => {
  E.style.fit = ['blur', 'camtop'].includes($('#edFit').value) ? $('#edFit').value : undefined;
  $('#edCamRow').hidden = E.style.fit !== 'camtop';
  syncCam(); layoutCrop();
};
function syncCam() { E.style.cam = E.style.fit === 'camtop' ? { corner: $('#edCamCorner').value, size: Number($('#edCamSize').value), aspect: $('#edCamAR').value } : undefined; }
for (const id of ['edCamCorner', 'edCamSize', 'edCamAR']) $('#' + id).addEventListener('input', () => { syncCam(); layoutCrop(); });
function trackAt(t) {
  const p = E.clip.track?.path;
  if (!p?.length) return null;
  const rel = Math.max(0, Math.min(p[p.length - 1].t, t - E.clip.start));
  let i = 0; while (i < p.length - 2 && p[i + 1].t < rel) i++;
  const a = p[i], b = p[Math.min(i + 1, p.length - 1)], k = b.t > a.t ? Math.max(0, Math.min(1, (rel - a.t) / (b.t - a.t))) : 0;
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
}
function layoutTracked() {
  if (!E.style || E.style.aspect === 'source') return;
  const fr = $('#cropFrame'), c = videoContentRect(), camTop = E.style.fit === 'camtop';
  const AR = camTop ? 1080 / (1920 - Math.min(Math.round(1920 * 0.42), Math.round(1080 / (E.style.cam?.aspect === '4:3' ? 4 / 3 : 16 / 9)))) : E.style.aspect === '9:16' ? 9 / 16 : 1;
  const z = E.clip.track?.zoom || 1, baseW = Math.min(c.w, c.h * AR), fw = baseW / z, fh = fw / AR;
  const pt = trackAt(video.currentTime);
  const cx = pt ? pt.x * c.w : (c.w - baseW) * (E.clip.focus ?? 0.5) + baseW / 2, cy = pt ? pt.y * c.h : c.h / 2;
  const left = Math.max(0, Math.min(c.w - fw, cx - fw / 2)), top = Math.max(0, Math.min(c.h - fh, cy - fh / 2));
  Object.assign(fr.style, { left: c.left + left + 'px', top: c.top + top + 'px', width: fw + 'px', height: fh + 'px', bottom: 'auto' });
  const cb = $('#camBox');
  cb.hidden = !camTop;
  if (camTop && E.style.cam) {
    const cam = E.style.cam, ar = cam.aspect === '4:3' ? 4 / 3 : 16 / 9, bw = c.w * cam.size, bh = bw / ar;
    Object.assign(cb.style, { width: bw + 'px', height: bh + 'px', left: c.left + (/r$/.test(cam.corner) ? c.w - bw : 0) + 'px', top: c.top + (/^b/.test(cam.corner) ? c.h - bh : 0) + 'px' });
  }
}

$('#cAspect').onchange = () => {
  E.style.aspect = $('#cAspect').value;
  E.clip.cues = buildCues(E.meta, E.clip, E.style.aspect);
  renderEd();
  layoutCrop();
};
$('#btnEdClose').onclick = () => dlgEd.close();
dlgEd.addEventListener('close', () => video.pause());

function layoutCrop() {
  if (!E.style) return;
  const fr = $('#cropFrame'), a = E.style.aspect;
  if ((E.clip.track || E.style.fit === 'camtop') && a !== 'source') { fr.classList.remove('full'); layoutTracked(); } else { $('#camBox').hidden = true; fr.style.top = ''; fr.style.height = ''; fr.style.bottom = ''; }
  fr.classList.toggle('full', a === 'source');
  const h = video.clientHeight || 1, w = video.clientWidth || 1;
  const fw = a === 'source' ? w : Math.min(w, h * (a === '9:16' ? 9 / 16 : 1));
  if (!((E.clip.track || E.style.fit === 'camtop') && a !== 'source')) {
    fr.style.width = a === 'source' ? '' : fw + 'px';
    fr.style.left = a === 'source' ? '' : (w - fw) * (E.clip.focus ?? 0.5) + 'px';
  }
  const size = (a === '9:16' ? fw * 0.068 : h * 0.062) * E.style.size * (E.style.sub === 'minimal' ? 0.82 : 1);
  $('#subOverlay').style.fontSize = size + 'px';
  $('#subOverlay').style.fontFamily = `"${E.style.font}", Arial, sans-serif`;
  $('#hookOverlay').style.fontSize = (a === '9:16' ? fw * 0.068 : h * 0.062) * E.style.size * 1.05 + 'px';
  $('#hookOverlay').style.fontFamily = `"${E.style.font}", Arial, sans-serif`;
}
window.addEventListener('resize', layoutCrop);
(function overlayLoop() {
  requestAnimationFrame(overlayLoop);
  if (!dlgEd.open || !E.clip) return;
  const t = video.currentTime;
  if (E.clip.track && !video.paused) layoutTracked();
  if (E.playEnd != null && t >= E.playEnd) {
    video.pause();
    E.playEnd = null;
  }
  const st = E.style, ov = $('#subOverlay'), rel = t - E.clip.start, inside = rel >= 0 && t < E.clip.end;
  let html = '', key = [st.sub, st.pos, st.color, st.font, E.clip.hook, inside && rel < 3.5].join('|');
  if (inside && st.sub !== 'none') {
    const q = E.clip.cues.find((x) => rel >= x.start && rel < x.end);
    if (q && q.text.trim()) {
      const wi = st.sub === 'minimal' ? -1 : q.words.findIndex((w) => rel >= w.s && rel < w.e);
      key += q.start + '|' + q.text + '|' + wi;
      html = `<span class="line">${q.words.length ? q.words.map((w, i) => (i === wi ? `<span class="on" style="color:${st.color}">${esc(w.w)}</span>` : esc(w.w))).join(' ') : esc(q.text)}</span>`;
    }
  }
  if (key !== overlayKey) {
    overlayKey = key;
    ov.className = `sub-overlay ${st.pos} ${st.sub}`;
    ov.style.setProperty('--hl', st.color);
    ov.innerHTML = html;
    $('#hookOverlay').innerHTML = inside && rel < 3.5 && E.clip.hook.trim() ? `<span>${esc(E.clip.hook)}</span>` : '';
  }
})();
$('#edSave').onclick = async () => {
  const b = $('#edSave'), it = E.item;
  b.disabled = true;
  $('#edMsg').textContent = 'Yeniden üretiliyor…';
  try {
    const r = await json('/api/clip/render', { id: it.src, channel: cur.id, vid: it.id, gen: it.gen, createdAt: it.createdAt, clip: { ...E.clip, score: it.score, scores: it.scores, reason: it.reason }, style: E.style });
    const old = $(`.clipcard[data-id="${it.id}"]`);
    if (old) old.replaceWith(clipCard(r));
    dlgEd.close();
    toast('Klip güncellendi');
    refreshCounts();
  } catch (e) {
    $('#edMsg').textContent = '❌ ' + e.message;
  }
  b.disabled = false;
};

// ---------------------------------------------------------------------------
// AYARLAR / SAĞLIK
// ---------------------------------------------------------------------------
async function loadHealth() {
  health = await json('/api/health');
  const pill = (ok, label, logo) => `<span class="pill ${ok ? 'ok' : 'no'}">${logo ? providerLogo(logo).replace('width="20" height="20"', 'width="13" height="13"') : ''}${label}</span>`;
  const sel = $('#provider'), saved = localStorage.getItem('ms-provider');
  sel.innerHTML = health.providers.map((p) => `<option value="${p.id}">${health.llm[p.id]?.ok ? '●' : '○'} ${p.name}</option>`).join('');
  const firstOk = health.providers.find((p) => health.llm[p.id]?.ok && p.id !== 'offline');
  sel.value = saved && (health.llm[saved]?.ok || KEY_INFO[saved]) ? saved : firstOk?.id || 'offline';
  fillModels();
  $('#health').innerHTML = [...health.providers.map((p) => [p.name, health.llm[p.id]]), ['Seslendirme', health.tts.edge], ['Gelişmiş seslendirme', health.tts.elevenlabs], ['Alternatif seslendirme', health.tts.openai], ['Video işleme', health.media], ['Video alma', { ok: health.clip.fetch, version: health.clip.fetch ? 'hazır' : 'kurulum gerekli' }], ['Konuşma tanıma', { ok: !!health.clip.stt, version: health.clip.stt ? 'hazır' : 'kurulum gerekli' }], ['Altyazı gömme', { ok: health.clip.burn, version: health.clip.burn ? 'hazır' : 'kullanılamıyor' }], ['Eklenti kurulumu', health.git]]
    .map(([n, h]) => `<div><span class="hrow"><i class="hdot ${h.ok ? 'ok' : 'no'}"></i>${n}</span><small class="muted">${esc((h.version || '').slice(0, 40))}</small></div>`).join('');
}
// Model: her kaynak için hazır liste (elle yazılmaz)
const MODEL_LISTS = {
  'anthropic-sub': [['claude-sonnet-5-5', 'Sonnet 5.5 (dengeli)'], ['claude-opus-5-5', 'Opus 5.5 (güçlü)'], ['claude-haiku-5-5', 'Haiku 5.5 (hızlı)'], ['claude-fable-5-2', 'Fable 5.2 (en yetenekli)']],
  'anthropic-api': [['claude-sonnet-5-5', 'Sonnet 5.5 (dengeli)'], ['claude-opus-5-5', 'Opus 5.5 (güçlü)'], ['claude-haiku-5-5', 'Haiku 5.5 (hızlı)'], ['claude-fable-5-2', 'Fable 5.2 (en yetenekli)']],
  'gemini-api': [['gemini-2.5-flash', '2.5 Flash (hızlı)'], ['gemini-2.5-pro', '2.5 Pro (güçlü)'], ['gemini-2.0-flash', '2.0 Flash']],
  'google-legacy': [['gemini-2.5-flash', '2.5 Flash (hızlı)'], ['gemini-2.5-pro', '2.5 Pro (güçlü)']],
  'openai-sub': [['gpt-4o', 'GPT-4o'], ['gpt-4o-mini', 'GPT-4o mini (hızlı)']],
  'openai-compatible': [['gpt-4o-mini', 'GPT-4o mini'], ['gpt-4o', 'GPT-4o'], ['meta-llama/llama-3.3-70b-instruct', 'Llama 3.3 70B'], ['deepseek/deepseek-chat', 'DeepSeek Chat']],
};
function fillModels() {
  const p = $('#provider').value, list = MODEL_LISTS[p] || [];
  const wrap = $('#modelWrap'), sel = $('#model');
  wrap.hidden = !list.length;
  sel.innerHTML = `<option value="">Varsayılan</option>` + list.map(([v, n]) => `<option value="${v}">${n}</option>`).join('');
  const saved = localStorage.getItem('ms-model:' + p) || '';
  sel.value = list.some(([v]) => v === saved) ? saved : '';
}
// API anahtarı gereken kaynak seçilince anahtar penceresi açılır
const KEY_INFO = {
  'anthropic-api': { field: 'anthropicKey', name: 'Anthropic', ph: 'sk-ant-…', url: 'https://console.anthropic.com/settings/keys' },
  'gemini-api': { field: 'geminiKey', name: 'Gemini', ph: 'AIza…', url: 'https://aistudio.google.com/apikey' },
  'openai-compatible': { field: 'openaiKey', name: 'OpenAI uyumlu', ph: 'sk-…', url: 'https://openrouter.ai/keys', base: true },
};
let keyFor = null;
function askKey(p) {
  const k = KEY_INFO[p]; if (!k) return;
  keyFor = p;
  $('#kdTitle').textContent = `${k.name} API anahtarı`;
  $('#kdHint').textContent = `${k.name} ile çalışmak için API anahtarını gir. Bir kez girmen yeterli.`;
  $('#kdKey').value = ''; $('#kdKey').placeholder = k.ph;
  $('#kdBaseWrap').hidden = !k.base; $('#kdBase').value = '';
  $('#kdLink').href = k.url;
  $('#keyDlg').showModal();
  setTimeout(() => $('#kdKey').focus(), 50);
}
$('#kdSave').onclick = async (e) => {
  e.preventDefault();
  const k = KEY_INFO[keyFor], v = $('#kdKey').value.trim();
  if (!v) return toast('Anahtarı yapıştır');
  const body = { [k.field]: v };
  if (k.base && $('#kdBase').value.trim()) body.openaiBase = $('#kdBase').value.trim();
  try { await api('/api/config', body); } catch (err) { return toast(err.message); }
  $('#keyDlg').close();
  await loadHealth();
  $('#provider').value = keyFor; localStorage.setItem('ms-provider', keyFor); fillModels();
  toast('Anahtar kaydedildi');
};
$('#provider').onchange = () => {
  const p = $('#provider').value;
  localStorage.setItem('ms-provider', p);
  fillModels();
  if (KEY_INFO[p] && !health?.llm?.[p]?.ok) askKey(p);
  else if (!health?.llm?.[p]?.ok && p !== 'offline') toast('Bu hesap bu bilgisayarda bağlı değil. Ayarlar → Yapay zekâ bölümüne bak.');
};
$('#model').onchange = () => localStorage.setItem('ms-model:' + $('#provider').value, $('#model').value);
window.__openSettings = (tab) => { $('#btnSettings').click(); setTimeout(() => document.querySelector(`.snav [data-tab="${tab}"]`)?.click(), 80); };
initProfile();
$('#btnSettings').onclick = async () => {
  const c = await json('/api/config');
  for (const el of $('#settings form').elements) if (el.name) el.value = c[el.name] || '';
  loadHealth();
  renderVoices();
  $('#settings').showModal();
};
$('#btnSaveSettings').onclick = async (e) => {
  e.preventDefault();
  const body = {};
  for (const el of $('#settings form').elements) if (el.name) body[el.name] = el.value.trim();
  await api('/api/config', body);
  $('#settings').close();
  toast('Kaydedildi');
  loadHealth();
  loadVoices();
};


// ---------------------------------------------------------------------------
// FİLM STÜDYOSU — yatay, uzun, görsel anlatımlı filmler
// ---------------------------------------------------------------------------
const F = { info: null, genre: localStorage.getItem('ms-fgenre') || 'discipline', mode: 'topic', fmt: localStorage.getItem('ms-ffmt') || 'toon', running: false, abort: null };

function filmCfg(ch, j) {
  const toon = !!j.film.toon;
  const theme = resolveTheme(j.film.moody ? 'moody' : toon ? 'classic' : 'cozy');
  theme.locale = langInfo(ch.language).locale;
  return { theme, style: { ...(j.film.moody ? STYLES.moody : toon ? STYLES.toon : STYLES.film), volume: !!j.film.vol }, seed: j.seed, profile: { text: 'medium', camera: 'dynamic' }, subtitles: !!j.film.subtitles, subtitleStyle: ch.subStyle, subtitleScale: Number(ch.subScale) || 1, progress: false, watermark: (ch.watermark || '').trim() };
}
/** İhracatta yalnızca yakın sahnelerin görsellerini yükle (bellek) */
function makePrepare(tl) {
  let idx = -1;
  return async (t) => {
    let i = idx < 0 ? 0 : idx;
    while (i < tl.scenes.length - 1 && t >= tl.scenes[i + 1].start) i++;
    if (i === idx) return;
    idx = i;
    const want = [i - 1, i, i + 1, i + 2].map((k) => tl.scenes[k]?.photo || tl.scenes[k]?.backdrop).filter(Boolean);
    keepPhotos(want);
    await Promise.all(want.map((u) => loadPhoto(u).catch(() => {})));
  };
}
async function filmThumb(ctx, url, text) {
  const img = await loadPhoto(url);
  const W = 1280, H = 720;
  const r = Math.max(W / img.naturalWidth, H / img.naturalHeight);
  ctx.drawImage(img, (W - img.naturalWidth * r) / 2, (H - img.naturalHeight * r) / 2, img.naturalWidth * r, img.naturalHeight * r);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(0,0,0,0.55)');
  g.addColorStop(0.5, 'rgba(0,0,0,0.05)');
  g.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const words = String(text || '').toLocaleUpperCase('tr').split(/\s+/).filter(Boolean).slice(0, 3);
  await document.fonts.ready;
  let size = 210;
  const font = (n) => `900 ${n}px Impact, "Arial Black", Montserrat, sans-serif`;
  ctx.font = font(size);
  while (size > 70 && Math.max(...words.map((w) => ctx.measureText(w).width)) > W * 0.62) { size -= 6; ctx.font = font(size); }
  ctx.textBaseline = 'top';
  ctx.lineJoin = 'round';
  words.forEach((w, i) => {
    const y = 36 + i * size * 0.98;
    ctx.lineWidth = size * 0.1;
    ctx.strokeStyle = '#000';
    ctx.strokeText(w, 44, y);
    ctx.fillStyle = i === words.length - 1 && words.length > 1 ? '#FFD54A' : '#fff';
    ctx.fillText(w, 44, y);
  });
}

async function loadFilmInfo() {
  if (F.info) return applyFmt();
  try { F.info = await json('/api/film/info'); } catch (e) { return toast(e.message); }
  $('#genreGrid').innerHTML = F.info.genres.map((g) => `<button class="genre${g.id === F.genre ? ' on' : ''}" data-g="${g.id}"><b><i>${g.emoji}</i>${esc(g.name)}</b><small>${esc(g.desc)}</small></button>`).join('');
  $('#filmModel').innerHTML = F.info.models.map((m) => `<option value="${m.id}">${esc(m.name)} · ${esc(m.note)}</option>`).join('');
  $('#filmModel').value = localStorage.getItem('ms-fmodel') || F.info.models[0].id;
  $('#filmSrc').innerHTML = F.info.sources.map((x) => `<option value="${x.id}">${esc(x.name)}${x.ok ? '' : ' (anahtar gerek)'}</option>`).join('');
  $('#filmSrc').value = localStorage.getItem('ms-fsrc') || 'pollinations';
  applyFmt();
}
function applyFmt() {
  const toon = F.fmt === 'toon';
  $$('#filmFmt button').forEach((x) => x.classList.toggle('on', x.dataset.v === F.fmt));
  $('#filmBdWrap').hidden = !toon;
  $('#filmLookWrap').hidden = false;
  $('#filmSrcWrap').hidden = toon;
  $('#filmRefWrap').hidden = toon || !['gemini', 'muapi'].includes($('#filmSrc').value);
  renderFilmWarn();
}
$('#filmFmt').onclick = (e) => {
  const b = e.target.closest('[data-v]');
  if (!b) return;
  F.fmt = b.dataset.v;
  localStorage.setItem('ms-ffmt', F.fmt);
  applyFmt();
};
function renderFilmWarn() {
  if (F.fmt === 'toon') {
    const m = Math.min(30, Math.max(1, Number($('#filmMin').value) || 10));
    $('#filmWarn').classList.remove('bad');
    $('#filmWarn').textContent = `Tamamen token'ınla: ${m} dk ≈ ${Math.round((m * 60) / 7.5)} sahne; her sahnede karakterler yürür, konuşur, el kol hareketi yapar. Arka plan çizimi açılırsa mekân değiştikçe (dakikada ~1) bir SVG çizilir; her biri ~20-40 sn sürer.`;
    return;
  }
  const min = Math.min(30, Math.max(1, Number($('#filmMin').value) || 10));
  const n = Math.round((min * 60) / 7.5);
  const el = $('#filmWarn');
  const src = F.info?.sources?.find((x) => x.id === $('#filmSrc').value);
  $('#filmModelWrap').hidden = src?.id !== 'muapi';
  el.classList.toggle('bad', !!src && !src.ok);
  const need = { gemini: 'Ayarlar → "Gemini API key" gerekli (aistudio.google.com/apikey, ücretsiz).', muapi: 'Ayarlar → "Görsel oluşturucu API anahtarı" gerekli (muapi.ai, kredili).' };
  const info = { pollinations: 'Ücretsiz ve anahtarsız; yoğun saatlerde yavaş olabilir, o yüzden 2 görsel aynı anda üretilir.', gemini: 'Ücretsiz katmanın günlük sınırı var; uzun filmde dolarsa sonraki sahnelerde önceki görsel kullanılır.', svg: 'Yapay zekan (Claude/Gemini aboneliğin) her sahneyi vektör olarak çizer: tamamen senin token\'ınla, ama fotoğraf kalitesinde değil.', muapi: 'Görseller görsel API kredinden düşer.' };
  el.textContent = src && !src.ok ? need[src.id] : `${min} dk ≈ ${n} görsel + kapak. ${info[src?.id] || ''}`;
}
$('#genreGrid').onclick = (e) => {
  const b = e.target.closest('[data-g]');
  if (!b) return;
  F.genre = b.dataset.g;
  localStorage.setItem('ms-fgenre', F.genre);
  $$('#genreGrid .genre').forEach((x) => x.classList.toggle('on', x === b));
};
$('#filmMode').onclick = (e) => {
  const b = e.target.closest('[data-v]');
  if (!b) return;
  F.mode = b.dataset.v;
  $$('#filmMode button').forEach((x) => x.classList.toggle('on', x === b));
  $('#filmTopic').placeholder = F.mode === 'script' ? 'Hazır anlatım metnini yapıştır (olduğu gibi seslendirilir, görseller buna göre üretilir)…' : 'Örn: Telefon bağımlılığı beynini nasıl değiştiriyor ve 30 günde nasıl kurtulursun?';
};
$('#filmMin').oninput = renderFilmWarn;
$('#filmModel').onchange = () => localStorage.setItem('ms-fmodel', $('#filmModel').value);
$('#filmSrc').onchange = () => { localStorage.setItem('ms-fsrc', $('#filmSrc').value); applyFmt(); };
$('#filmStop').onclick = () => F.abort?.abort();

$('#filmGo').onclick = async () => {
  if (F.running || busy) return toast('Süren bir üretim var');
  if (!cur) return toast('Önce soldan bir kanal seç ya da oluştur (videolar kanalın altına kaydedilir)', 5000);
  const topic = $('#filmTopic').value.trim();
  if (!topic) return toast('Bir konu ya da script yaz');
  const provider = $('#provider').value, model = $('#model').value.trim();
  if (provider === 'offline') return toast('Film için soldan bir yapay zeka kaynağı seç (Anthropic, Google…)', 5000);
  const toonFmt = F.fmt === 'toon';
  const lookSel = $('#filmLook').value;
  const dayone = !toonFmt && (lookSel === 'moody' || (lookSel === 'auto' && ['discipline', 'psychology', 'horror', 'noir', 'war', 'tech'].includes(F.genre)));
  const moody = toonFmt && (lookSel === 'moody' || (lookSel === 'auto' && ['discipline', 'psychology', 'horror', 'noir', 'war', 'tech'].includes(F.genre)));
  const source = $('#filmSrc').value;
  if (!toonFmt && !F.info?.sources?.find((x) => x.id === source)?.ok) { renderFilmWarn(); return toast('Bu görsel kaynağı için önce Ayarlar\'dan anahtarı gir (ya da ücretsiz kaynağı seç)', 5000); }
  const ch = cur;
  const minutes = Math.min(30, Math.max(1, Number($('#filmMin').value) || 10));
  F.running = true; busy = true;
  F.abort = abort = new AbortController();
  $('#filmGo').disabled = true; $('#filmStop').hidden = false; $('#filmJobsHead').hidden = false;
  const node = $('#jobTpl').content.firstElementChild.cloneNode(true);
  $('.otitle', node).textContent = topic.split(/[.!?\n]/)[0].slice(0, 70);
  const st = $('.stages', node);
  st.querySelector('[data-s="tts"]').insertAdjacentHTML('beforebegin', '<div class="stage" data-s="img"><span>Görsel</span><i></i></div>');
  $('#filmJobs').prepend(node);
  node.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
  const vid = `${stamp}-film`;
  const j = { i: 0, ch, node, seed: ((ch.seed || 1) + (Date.now() % 100000)) % 1000000, voice: ch.voice, vid, film: { quality: Number($('#filmQ').value) || 720, subtitles: $('#filmSub').checked, toon: toonFmt, moody, vol: toonFmt && $('#film3d').checked } };
  const imgModel = $('#filmModel').value;
  const imgOpts = { source, provider, llmModel: model, character: undefined };
  const sig = abort.signal;
  try {
    // 1) Ana plan
    setStage(node, 'plan', 'active', 0.1);
    msg(node, 'Yapay zeka filmin ana planını çıkarıyor…');
    const outline = await json('/api/film/outline', { topic, genre: F.genre, minutes, language: ch.language, character: $('#filmChar').value.trim() || undefined, moody, dayone, toon: toonFmt, cast: toonFmt ? CAST.chars.filter((c) => (c.name || '').trim()).map((c, i) => ({ id: 'c' + (i + 1), name: c.name.trim(), costume: c.costume, gender: undefined })) : undefined, extra: $('#filmExtra').value.trim() || undefined, provider, model }, { signal: sig });
    if (toonFmt && outline.characters) { j.voiceMap = buildVoiceMap(outline.characters, ch, CAST.narrator.voice || ch.voice); j.cast = outline.characters; }
    $('.otitle', node).textContent = outline.title;
    if (F.mode === 'script') {
      // hazır script: ~1 dk'lık parçalara böl, anlatım aynen korunur
      const words = topic.split(/\s+/);
      const per = Math.max(60, Math.round(langInfo(ch.language).wpm * (langInfo(ch.language).cpm ? 0 : 1) || 140));
      const chunks = [];
      for (let k = 0; k < words.length; k += per) chunks.push(words.slice(k, k + per).join(' '));
      outline.chapters = chunks.map((text, k) => ({ title: `Bölüm ${k + 1}`, summary: text.slice(0, 160), text, share: 1 / chunks.length }));
    }
    // 2) Bölümler → sahneler; görseller aynı anda üretilir (boru hattı)
    const scenes = [];
    const queue = [];
    const imgState = { done: 0, total: 0, failed: 0, writing: true };
    const dirOf = { channel: ch.id, video: vid };
    let refName = null;
    imgOpts.character = outline.character;
    if (!toonFmt && outline.character && $('#filmRef').checked && ['gemini', 'muapi'].includes(source) && F.info.genres.find((g) => g.id === F.genre)?.hasChar !== false) {
      msg(node, 'Karakter referansı üretiliyor…');
      try {
        await json('/api/film/image', { ...dirOf, ...imgOpts, name: 'ref', model: imgModel, aspect: '16:9', prompt: `${outline.character}, full body, neutral standing pose, plain simple background. ${outline.look}. No text.` }, { signal: sig });
        refName = 'ref';
      } catch (e) { if (/anahtar|kredi/i.test(e.message)) throw e; }
    }
    const worker = async () => {
      while (true) {
        if (sig.aborted) throw new Error('Durduruldu');
        if (imgState.fatal) return;
        const s = queue.shift();
        if (!s) { if (!imgState.writing) return; await new Promise((r) => setTimeout(r, 400)); continue; }
        try {
          if (toonFmt) {
            const r = await json('/api/film/image', { ...dirOf, source: 'svg', provider, llmModel: model, character: '', name: 'b' + String(s.idx).padStart(3, '0'), aspect: '16:9', prompt: `Background location only: ${s.backdrop}. Absolutely no people or characters, wide cinematic landscape composition, keep the lower center area uncluttered for characters to stand.` }, { signal: sig });
            s.backdrop = r.url;
            imgState.done++;
            setStage(node, 'img', 'active', imgState.done / Math.max(1, imgState.total));
            msg(node, `Arka plan çizimi ${imgState.done}/${imgState.total}${imgState.failed ? ` · ${imgState.failed} hata` : ''}`);
            continue;
          }
          const r = await json('/api/film/image', { ...dirOf, ...imgOpts, name: 's' + String(s.idx).padStart(3, '0'), model: imgModel, aspect: '16:9', ref: refName || undefined, prompt: refName ? s.prompt + ' Keep the exact same main character design as in the reference image.' : s.prompt }, { signal: sig });
          s.photo = r.url;
        } catch (e) {
          if (/anahtar|kredi/i.test(e.message)) { imgState.fatal = e; throw e; }
          imgState.failed++;
        }
        imgState.done++;
        setStage(node, 'img', 'active', imgState.done / Math.max(1, imgState.total));
        msg(node, `Görsel ${imgState.done}/${imgState.total}${imgState.failed ? ` · ${imgState.failed} hata` : ''}`);
      }
    };
    const workers = Array.from({ length: toonFmt ? 4 : source === 'pollinations' ? 2 : source === 'svg' ? 2 : 3 }, () => worker());
    workers.forEach((w) => w.catch(() => {}));
    // bölümler 3'lü paralel yazılır (sıra korunur); biten bölümler sırayla görsel kuyruğuna girer
    const nCh = outline.chapters.length;
    const results = new Array(nCh);
    let nextCh = 0, released = 0, finished = 0;
    const t0 = Date.now();
    const maxBackdrops = Math.max(3, Math.round(minutes * 1.2));
    let bdCount = 0;
    const release = () => {
      while (released < nCh && results[released]) {
        for (const s of results[released]) {
          s.idx = scenes.length;
          scenes.push(s);
          if (toonFmt) {
            // mekân değişmeyen sahneler bir öncekinin arka planını kullanır; toplam çizim sayısı sınırlı
            if (s.backdrop && bdCount < maxBackdrops) { bdCount++; queue.push(s); imgState.total++; }
            else { s.backdrop = ''; s.reuse = true; }
          } else { queue.push(s); imgState.total++; }
        }
        released++;
      }
    };
    const chapterWorker = async () => {
      while (nextCh < nCh) {
        if (sig.aborted) throw new Error('Durduruldu');
        if (imgState.fatal) throw imgState.fatal;
        const c = nextCh++;
        let got;
        for (let a = 0; a < 2 && !got; a++) {
          try { got = await json('/api/film/chapter', { outline, index: c, minutes, language: ch.language, genre: F.genre, prevTail: results[c - 1]?.at(-1)?.narration || '', offset: c * 20, provider, model, toon: toonFmt, moody, dialogue: $('#castDialog').checked, backdrops: toonFmt && $('#filmBd').checked }, { signal: sig }); } catch (e) { if (a || sig.aborted) throw e; }
        }
        results[c] = got;
        finished++;
        release();
        const el = (Date.now() - t0) / 1000;
        setStage(node, 'plan', 'active', finished / nCh);
        msg(node, `Senaryo ${finished}/${nCh} bölüm yazıldı · ${fmtDur(el)} geçti${finished < nCh ? ` · kalan ≈ ${fmtDur((el / finished) * (nCh - finished))}` : ''}`);
      }
    };
    msg(node, `${nCh} bölüm yazılıyor (3'lü paralel)…`);
    await Promise.all([chapterWorker(), chapterWorker(), chapterWorker()]);
    release();
    setStage(node, 'plan', 'done');
    // kapak görseli
    if (!toonFmt) imgState.total++;
    const thumbP = toonFmt ? Promise.resolve() : json('/api/film/image', { ...dirOf, ...imgOpts, name: 'thumb', model: imgModel, aspect: '16:9', prompt: `${outline.thumbnail?.prompt || outline.title}. ${outline.look}. Dramatic composition, leave empty space on the left for big title text. No text, no letters.` }, { signal: sig }).then((r) => (j.film.thumbUrl = r.url)).catch(() => {});
    imgState.writing = false;
    await Promise.all([...workers, thumbP]);
    if (toonFmt) {
      let lastBd = '';
      for (const s of scenes) { if (s.backdrop && /^\/output\//.test(s.backdrop)) lastBd = s.backdrop; else s.backdrop = lastBd; }
      setStage(node, 'img', 'done');
      j.plan = {
        title: outline.title, description: outline.description || '', tags: outline.tags || [],
        thumbnail: { text: outline.thumbnail?.text || outline.title, highlight: (outline.thumbnail?.text || '').split(/\s+/).pop(), action: 'surprised', emotion: 'surprised', props: [] },
        scenes: scenes.map(({ idx, prompt, image, ...rest }) => rest),
      };
    } else {
    // hata veren sahnelerde bir öncekinin görselini kullan
    let last = null;
    for (const s of scenes) { if (s.photo) last = s.photo; else if (last) s.photo = last; }
    if (!scenes.some((s) => s.photo)) throw new Error('Hiç görsel üretilemedi — farklı bir görsel kaynağı dene ya da internet bağlantını kontrol et');
    const nextPhoto = scenes.find((s) => s.photo)?.photo;
    scenes.forEach((s) => { if (!s.photo) s.photo = nextPhoto; });
    setStage(node, 'img', 'done');
    j.plan = {
      title: outline.title, description: outline.description || '', tags: outline.tags || [],
      thumbnail: { text: outline.thumbnail?.text || outline.title, highlight: outline.thumbnail?.text },
      scenes: scenes.map((s) => ({ narration: s.narration, action: 'talk', emotion: 'neutral', props: [], keyword: '', camera: s.camera, bg: 'plain', characters: 1, photo: s.photo, image: s.image })),
    };
    }
    j.input = { type: 'film' };
    const base = { provider, model };
    await produce(j, base);
    node.classList.add('done');
    toast(`Film "${ch.name}" kanalına eklendi`);
  } catch (e) {
    node.classList.add('fail');
    $('.media-wait', node).hidden = true;
    msg(node, '❌ ' + e.message);
    console.error(e);
  }
  F.running = false; busy = false;
  $('#filmGo').disabled = false; $('#filmStop').hidden = true;
  refreshCounts();
};

// ---------------------------------------------------------------------------
// BAŞLAT
// ---------------------------------------------------------------------------
const langOpts = LANGUAGES.map((l) => `<option value="${l.code}">${l.name}</option>`).join('');
$('#language').innerHTML = langOpts;
$('#ncLang').innerHTML = langOpts;
syncMode();
await document.fonts.ready;
[skills] = await Promise.all([json('/api/skills').catch(() => []), loadHealth().catch((e) => toast('Sunucuya ulaşılamadı: ' + e.message))]);
buildStyleGrid();
await loadChannels();
showView(localStorage.getItem('ms-view') || 'clip');
