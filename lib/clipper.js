// YouTube / yerel video → kesitler + gömülü altyazı. yt-dlp ve ffmpeg kullanıcının bilgisayarında çalışır.
import fs from 'node:fs';
import path from 'node:path';
import { run, hasCommand, hash, ROOT, WORK_DIR, IS_WIN, readJSON, writeJSON } from './util.js';

let ytCmd = null;
async function findYt() {
  if (ytCmd) return ytCmd;
  for (const [c, pre] of [['yt-dlp', []], [IS_WIN ? 'python' : 'python3', ['-m', 'yt_dlp']], ['python', ['-m', 'yt_dlp']]]) {
    if ((await hasCommand(c, [...pre, '--version'])).ok) return (ytCmd = { c, pre });
  }
  return null;
}
let burnOk = null;
async function canBurn() {
  if (burnOk != null) return burnOk;
  try {
    const r = await run('ffmpeg', ['-hide_banner', '-filters'], { timeout: 20000 });
    burnOk = /\bsubtitles\b/.test(r.stdout);
  } catch {
    burnOk = false;
  }
  return burnOk;
}
export async function clipHealth() {
  const [yt, ff] = await Promise.all([findYt(), hasCommand('ffmpeg', ['-version'])]);
  return { ytdlp: !!yt, ffmpeg: ff.ok, burn: ff.ok ? await canBurn() : false, whisper: await findWhisper() };
}

const okId = (s) => /^[A-Za-z0-9_-]{1,80}$/.test(String(s || ''));
const dirOf = (id) => {
  if (!okId(id)) throw new Error('Geçersiz kimlik');
  return path.join(WORK_DIR, id);
};
export const sourcePath = (id) => { const m = getMeta(id); return m ? path.join(dirOf(id), m.file) : null; };
export const getMeta = (id) => readJSON(path.join(dirOf(id), 'meta.json'), null);

async function probe(file) {
  const r = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration', '-of', 'json', file], { timeout: 60000 });
  const j = JSON.parse(r.stdout);
  return { width: j.streams?.[0]?.width || 1280, height: j.streams?.[0]?.height || 720, duration: Number(j.format?.duration) || 0 };
}

function parseJson3(j) {
  const words = [];
  for (const ev of j.events || []) {
    const segs = (ev.segs || []).filter((s) => s.utf8 && s.utf8.trim());
    if (!segs.length) continue;
    const t0 = (ev.tStartMs || 0) / 1000, dur = (ev.dDurationMs || 2000) / 1000;
    const timed = segs.some((s) => s.tOffsetMs != null) && segs.length > 1;
    const spans = timed
      ? segs.map((s, i) => [t0 + (s.tOffsetMs || 0) / 1000, i < segs.length - 1 ? t0 + (segs[i + 1].tOffsetMs || 0) / 1000 : t0 + dur, s.utf8])
      : [[t0, t0 + dur, segs.map((s) => s.utf8).join(' ')]];
    for (const [s, e, txt] of spans) {
      const ws = txt.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
      const step = Math.max(0.05, (e - s) / ws.length);
      ws.forEach((w, i) => words.push({ s: s + i * step, e: s + (i + 1) * step, w }));
    }
  }
  words.sort((a, b) => a.s - b.s);
  for (let i = 0; i < words.length; i++) {
    const nx = words[i + 1];
    if (nx && words[i].e > nx.s) words[i].e = Math.max(words[i].s + 0.05, nx.s);
    if (words[i].e - words[i].s > 1.5) words[i].e = words[i].s + 1.5;
    words[i].s = +words[i].s.toFixed(3);
    words[i].e = +words[i].e.toFixed(3);
  }
  return words;
}

export async function fetchVideo(url, lang = 'tr') {
  if (!/^https?:\/\/[^\s]+$/i.test(url || '')) throw new Error('Geçerli bir video bağlantısı gir (https://…)');
  const yt = await findYt();
  if (!yt) throw new Error('Video alma modülü hazır değil. Kurulum için destek ekibiyle iletişime geç.');
  const id = 'yt_' + hash(url);
  const dir = dirOf(id);
  fs.mkdirSync(dir, { recursive: true });
  let src = path.join(dir, 'source.mp4');
  const findSrc = () => {
    if (fs.existsSync(src)) return src;
    const alt = fs.readdirSync(dir).find((f) => /^source\.(mp4|mkv|webm|mov)$/.test(f));
    return alt ? path.join(dir, alt) : null;
  };
  let srcFile = findSrc();
  if (!srcFile) {
    // 1) VİDEO — altyazıdan bağımsız indirilir (altyazı 429'u videoyu düşürmesin)
    const fmt = 'bv*[height<=1080][ext=mp4]+ba[ext=m4a]/bv*[height<=1080]+ba/b[height<=1080]/b';
    const base = [...yt.pre, '-f', fmt, '--merge-output-format', 'mp4', '--no-playlist', '--write-info-json', '--no-warnings', '--retries', '5', '--fragment-retries', '5', '-o', 'source.%(ext)s'];
    const ladder = [
      ['--js-runtimes', 'node', '--remote-components', 'ejs:github'], // YouTube şifre çözücü (Node ile)
      ['--js-runtimes', 'node'],
      [],
      ['--extractor-args', 'youtube:player_client=tv,web_safari,ios'],
    ];
    let lastErr = '';
    for (const extra of ladder) {
      try {
        await run(yt.c, [...base, ...extra, '--', url], { cwd: dir, timeout: 45 * 60 * 1000 });
      } catch (e) {
        lastErr = String(e.message || e);
        if (/no such option|unrecognized arguments|usage:/i.test(lastErr)) continue; // eski yt-dlp: bu bayrak yok
      }
      srcFile = findSrc();
      if (srcFile) break;
    }
    // 2) Son çare: tarayıcı oturumu (bot doğrulaması / giriş isteyen videolar)
    let cookieNote = '';
    if (!srcFile && /sign in|confirm you.re not a bot|cookies|429|403/i.test(lastErr)) {
      const firstErr = lastErr;
      // a) proje klasörüne konan cookies.txt (en güvenilir yol: yaş sınırlı videolar için)
      const cookieFile = path.join(ROOT, 'cookies.txt');
      const tries = [];
      if (fs.existsSync(cookieFile)) tries.push(['--cookies', cookieFile]);
      // b) tarayıcı oturumları (Chrome'un tüm profilleri dahil)
      for (const prof of ['', ':Default', ':Profile 1', ':Profile 2', ':Profile 3']) tries.push(['--cookies-from-browser', 'chrome' + prof]);
      tries.push(['--cookies-from-browser', 'safari'], ['--cookies-from-browser', 'firefox'], ['--cookies-from-browser', 'edge'], ['--cookies-from-browser', 'brave']);
      for (const c of tries) {
        try {
          await run(yt.c, [...base, '--js-runtimes', 'node', ...c, '--', url], { cwd: dir, timeout: 45 * 60 * 1000 });
        } catch (e) {
          const m = String(e.message || e);
          if (/sign in|age|confirm/i.test(m)) lastErr = m; // oturum bulundu ama video yine reddedildi
          else if (!cookieNote && /cookie|keychain|permission|not found|could not/i.test(m)) cookieNote = m.split('\n').filter((l) => /ERROR/.test(l)).slice(-1)[0] || '';
        }
        srcFile = findSrc();
        if (srcFile) break;
      }
      if (!srcFile && !lastErr) lastErr = firstErr;
    }
    if (!srcFile) {
      let hint = '';
      if (/429|Too Many/i.test(lastErr)) hint = ' → YouTube geçici olarak istek sınırı koydu; 10-15 dk bekle ya da VPN/ağ değiştir.';
      else if (/ejs|js.?runtime|n challenge|signature|Requested format/i.test(lastErr)) hint = ' → Video alma modülünün güncellenmesi gerekiyor. Birkaç dakika sonra tekrar dene.';
      else if (/confirm your age|inappropriate/i.test(lastErr)) hint = ' → Bu video yaş sınırlı. Yaşı doğrulanmış bir Google hesabıyla YouTube\'a giriş yapılmış olmalı. En güvenilir yol: tarayıcıdan "Get cookies.txt LOCALLY" eklentisiyle youtube.com çerezlerini dışa aktarıp dosyayı proje klasörüne cookies.txt adıyla koy (Kesit klasörü, server.js yanına). Olmazsa videoyu elle indirip "Video yükle" ile ekleyebilirsin.' + (cookieNote ? ' (Çerez notu: ' + cookieNote.slice(0, 120) + ')' : '');
      else if (/sign in|bot/i.test(lastErr)) hint = ' → Chrome\'da YouTube\'a giriş yapıp tekrar dene; olmazsa cookies.txt koy (proje klasörü).';
      const err = new Error('Video indirilemedi.' + hint);
      if (/sign in|confirm your age|inappropriate|confirm you.re not a bot|cookies/i.test(lastErr)) err.code = 'NEEDS_COOKIES';
      throw err;
    }
    // 3) ALTYAZI — ayrı, başarısız olursa sorun değil (Whisper ya da eşit bölme devreye girer)
    const L = String(lang || 'tr').split('-')[0];
    for (let k = 0; k < 2; k++) {
      try {
        await run(yt.c, [...yt.pre, '--skip-download', '--write-subs', '--write-auto-subs', '--sub-langs', `${L},${L}-orig,en,en-orig`, '--sub-format', 'json3',
          '--sleep-subtitles', '2', '--no-warnings', '--no-playlist', '--js-runtimes', 'node', '-o', 'source.%(ext)s', '--', url], { cwd: dir, timeout: 5 * 60 * 1000 });
        break;
      } catch (e) {
        if (/no such option|unrecognized/i.test(String(e.message))) {
          try { await run(yt.c, [...yt.pre, '--skip-download', '--write-subs', '--write-auto-subs', '--sub-langs', `${L},en`, '--sub-format', 'json3', '-o', 'source.%(ext)s', '--', url], { cwd: dir, timeout: 5 * 60 * 1000 }); } catch {}
          break;
        }
        if (fs.readdirSync(dir).some((f) => f.endsWith('.json3'))) break;
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }
  src = srcFile || src;
  const info = readJSON(path.join(dir, 'source.info.json'), {});
  const subs = fs.readdirSync(dir).filter((f) => f.endsWith('.json3'));
  const pick = subs.find((f) => f.startsWith(`source.${lang}`)) || subs[0];
  let words = [];
  if (pick) {
    try {
      words = parseJson3(JSON.parse(fs.readFileSync(path.join(dir, pick), 'utf8')));
    } catch {}
  }
  const pr = await probe(src);
  const meta = { id, title: info.title || 'Video', source: url, file: path.basename(src), ...pr, duration: pr.duration || info.duration || 0, words, subLang: pick ? pick.split('.')[1] : null };
  writeJSON(path.join(dir, 'meta.json'), meta);
  return meta;
}

export async function saveUpload(req, name = 'video.mp4') {
  const ext = (path.extname(name).toLowerCase().match(/^\.(mp4|mov|m4v|webm|mkv)$/) || ['.mp4'])[0];
  const id = 'up_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const dir = dirOf(id);
  fs.mkdirSync(dir, { recursive: true });
  const file = 'source' + ext;
  await new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(path.join(dir, file));
    req.pipe(ws);
    ws.on('finish', resolve);
    ws.on('error', reject);
    req.on('error', reject);
  });
  const pr = await probe(path.join(dir, file));
  const meta = { id, title: path.basename(name, path.extname(name)), file, ...pr, words: [], subLang: null };
  writeJSON(path.join(dir, 'meta.json'), meta);
  return meta;
}

const titleOf = (words, s, e) => words.filter((w) => w.s >= s && w.s < e).slice(0, 7).map((w) => w.w).join(' ');

/** Kural tabanlı bölme: hedef uzunluğa yakın, cümle sonu / duraklamaya denk gelen yerlerden keser */
export function autoSegments(meta, { length = 45, count = 0 } = {}) {
  const out = [];
  const max = Math.min(count || 20, 20);
  const W = meta.words || [];
  if (!W.length) {
    for (let s = 0; s < meta.duration - 3 && out.length < max; s += length) out.push({ start: +s.toFixed(2), end: +Math.min(meta.duration, s + length).toFixed(2), title: `Kesit ${out.length + 1}` });
    return out;
  }
  let i = 0;
  while (i < W.length && out.length < max) {
    const start = W[i].s;
    let j = i;
    while (j < W.length - 1) {
      const d = W[j].e - start;
      const pause = W[j + 1].s - W[j].e > 0.55 || /[.!?…]$/.test(W[j].w);
      if ((d >= length * 0.8 && pause) || d >= length * 1.2) break;
      j++;
    }
    const end = W[j].e + 0.15;
    if (end - start >= Math.min(8, length * 0.4)) out.push({ start: +Math.max(0, start - 0.1).toFixed(2), end: +Math.min(meta.duration || end, end).toFixed(2), title: titleOf(W, start, end) || `Kesit ${out.length + 1}` });
    i = j + 1;
  }
  return out;
}

export function transcriptForLLM(meta, maxChars = 14000) {
  const W = meta.words || [];
  const lines = [];
  for (let i = 0; i < W.length; i += 10) {
    const t = W[i].s;
    lines.push(`[${Math.floor(t)}s] ${W.slice(i, i + 10).map((w) => w.w).join(' ')}`);
  }
  let txt = lines.join('\n');
  if (txt.length > maxChars) {
    const keep = Math.floor((lines.length * maxChars) / txt.length);
    const stepN = lines.length / keep;
    txt = Array.from({ length: keep }, (_, k) => lines[Math.floor(k * stepN)]).join('\n');
  }
  return txt;
}

export function snapSegments(meta, segs, length) {
  const W = meta.words || [];
  return (Array.isArray(segs) ? segs : segs.clips || [])
    .map((s) => {
      let start = Math.max(0, Number(s.start) || 0), end = Number(s.end) || start + length;
      if (end - start < 5) end = start + length;
      if (end - start > 180) end = start + 180;
      const a = W.find((w) => w.s >= start - 0.3), b = [...W].reverse().find((w) => w.e <= end + 0.3);
      if (a) start = Math.max(0, a.s - 0.1);
      if (b && b.e > start + 4) end = b.e + 0.15;
      const n = (v) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
      const sc = s.scores && typeof s.scores === 'object' ? { hook: n(s.scores.hook), engagement: n(s.scores.engagement), value: n(s.scores.value), shareability: n(s.scores.shareability) } : null;
      return {
        start: +start.toFixed(2), end: +Math.min(meta.duration || end, end).toFixed(2), title: String(s.title || titleOf(W, start, end) || 'Kesit').slice(0, 90),
        hook: s.hook ? String(s.hook).slice(0, 60) : '', reason: s.reason ? String(s.reason).slice(0, 200) : undefined,
        scores: sc, score: sc ? Math.round((sc.hook + sc.engagement + sc.value + sc.shareability) / 4) : null,
      };
    })
    .filter((s) => s.end > s.start + 2)
    .slice(0, 20);
}

// ---------- ASS altyazı ----------
const assTime = (t) => {
  const cs = Math.max(0, Math.round(t * 100));
  return `${Math.floor(cs / 360000)}:${String(Math.floor(cs / 6000) % 60).padStart(2, '0')}:${String(Math.floor(cs / 100) % 60).padStart(2, '0')}.${String(cs % 100).padStart(2, '0')}`;
};
const assColor = (hex) => {
  const h = String(hex || '#FFFFFF').replace('#', '').padEnd(6, 'F');
  return `&H00${h.slice(4, 6)}${h.slice(2, 4)}${h.slice(0, 2)}`.toUpperCase();
};
const esc = (s) => String(s).replace(/[{}]/g, '').replace(/\r?\n/g, '\\N');

const FONTS = ['Arial', 'Helvetica', 'Impact', 'Georgia', 'Verdana', 'Trebuchet MS', 'Courier New', 'Montserrat', 'Avenir Next', 'Futura'];
/**
 * Şablonlar: default (kelime vurgulu), minimal (ince beyaz), neon (renkli parlama), podcast (kutulu)
 * eski adlar: karaoke→default, outline→minimal, box→podcast
 */
export function buildAss(cues, { W, H, sub = 'default', size = 1, color = '#FFD54A', pos = 'bottom', font = 'Arial', hook = '', duration = 0 }) {
  const tpl = { karaoke: 'default', outline: 'minimal', box: 'podcast' }[sub] || sub;
  const fname = FONTS.includes(font) ? font : 'Arial';
  const fs_ = Math.round((H > W ? W * 0.068 : H * 0.062) * size * (tpl === 'minimal' ? 0.82 : 1));
  const align = pos === 'top' ? 8 : pos === 'middle' ? 5 : 2;
  const mv = Math.round(H * (pos === 'bottom' ? (H > W ? 0.16 : 0.07) : pos === 'top' ? 0.2 : 0.08));
  const box = tpl === 'podcast';
  const hl = assColor(color);
  const outlineCol = tpl === 'neon' ? hl : box ? '&HA0000000' : '&H00000000';
  const outline = box ? Math.round(fs_ * 0.22) : tpl === 'minimal' ? Math.max(1, Math.round(fs_ * 0.05)) : Math.max(2, Math.round(fs_ * 0.1));
  const ml = Math.round(W * 0.06);
  const head = `[Script Info]\nScriptType: v4.00+\nPlayResX: ${W}\nPlayResY: ${H}\nWrapStyle: 0\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,${fname},${fs_},&H00FFFFFF,&H00FFFFFF,${outlineCol},&HA0000000,${tpl === 'minimal' ? 0 : -1},0,0,0,100,100,0,0,${box ? 3 : 1},${outline},0,${align},${ml},${ml},${mv},1\nStyle: Hook,${fname},${Math.round(fs_ * 1.05)},&H00111111,&H00111111,&H00FFFFFF,&H00FFFFFF,-1,0,0,0,100,100,0,0,3,${Math.round(fs_ * 0.28)},0,8,${ml},${ml},${Math.round(H * 0.09)},1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`.replace(/\\n/g, '\n');
  const pre = tpl === 'neon' ? '{\\blur1.5}' : '';
  const lines = [];
  if (String(hook || '').trim()) lines.push(`Dialogue: 1,${assTime(0)},${assTime(Math.min(3.5, duration || 3.5))},Hook,,0,0,0,,{\\fad(150,250)}${esc(hook)}`);
  if (tpl !== 'none') for (const q of cues) {
    if (!String(q.text || '').trim()) continue;
    const ws = q.words && q.words.length ? q.words : null;
    if (tpl === 'minimal' || !ws) {
      lines.push(`Dialogue: 0,${assTime(q.start)},${assTime(q.end)},Default,,0,0,0,,${pre}${esc(q.text)}`);
      continue;
    }
    ws.forEach((w, i) => {
      const s = i === 0 ? q.start : w.s, e = i === ws.length - 1 ? q.end : ws[i + 1].s;
      if (e <= s) return;
      const on = tpl === 'neon' ? `{\\c&H00FFFFFF&\\fscx108\\fscy108}` : `{\\c${hl}}`;
      const off = tpl === 'neon' ? `{\\c${hl}\\fscx100\\fscy100}` : '{\\c&H00FFFFFF&}';
      const base = tpl === 'neon' ? `{\\c${hl}}` : '';
      const txt = ws.map((x, k) => (k === i ? `${on}${esc(x.w)}${off}` : esc(x.w))).join(' ');
      lines.push(`Dialogue: 0,${assTime(s)},${assTime(e)},Default,,0,0,0,,${pre}${base}${txt}`);
    });
  }
  return head + lines.join('\n') + '\n';
}

const srtTime = (t) => {
  const ms = Math.max(0, Math.round(t * 1000));
  const p = (n, l = 2) => String(n).padStart(l, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};

/** Tek bir kesiti keser, kadrajlar ve altyazıyı gömer */
import { trackSubject, pathExpr } from './track.js';
const even = (n) => Math.max(2, 2 * Math.floor(n / 2));

export async function renderClip({ id, clip, style = {}, outDir }) {
  const meta = getMeta(id);
  if (!meta) throw new Error('Kaynak video bulunamadı — bağlantıyı yeniden getir');
  const src = path.join(dirOf(id), meta.file);
  const start = Math.max(0, Number(clip.start) || 0), end = Number(clip.end);
  if (!(end > start)) throw new Error('Kesit bitişi başlangıçtan büyük olmalı');
  fs.mkdirSync(outDir, { recursive: true });
  let W, H, vf;
  const F = Math.max(0, Math.min(1, clip.focus == null ? 0.5 : Number(clip.focus))).toFixed(3);
  if (style.aspect === '9:16') [W, H, vf] = [1080, 1920, `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920:(iw-1080)*${F}:(ih-1920)/2`];
  else if (style.aspect === '1:1') [W, H, vf] = [1080, 1080, `scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080:(iw-1080)*${F}:(ih-1080)/2`];
  else {
    W = Math.floor(meta.width / 2) * 2;
    H = Math.floor(meta.height / 2) * 2;
    vf = `scale=${W}:${H}`;
  }
  // Akıllı kadraj: takip yolu (yüz / top / hareket / işaretli nesne) ve yayıncı düzeni (kamera üstte)
  const portrait = style.aspect === '9:16' || style.aspect === '1:1';
  const camTop = portrait && style.fit === 'camtop' && style.cam;
  const mode = clip.track?.mode || (['face', 'ball', 'action'].includes(style.follow) ? style.follow : '');
  let trk = null;
  if (portrait && mode && mode !== 'off') {
    trk = clip.track?.path?.length ? clip.track : await trackSubject({ src, meta, start, end, mode, seed: clip.track?.seed });
    trk = { ...trk, zoom: Number(clip.track?.zoom) || trk.zoom || 1 };
  }
  const SW = meta.width, SH = meta.height;
  const clampE = (e, lo, hi) => `min(max(${e},${lo}),${hi})`;
  let graph = null; // filter_complex (yayıncı düzeni)
  if (camTop) {
    const cam = style.cam, camAR = cam.aspect === '4:3' ? 4 / 3 : 16 / 9, size = Math.min(0.6, Math.max(0.12, Number(cam.size) || 0.28));
    const cw = even(SW * size), ch = even(cw / camAR), m = Math.round(SW * 0.004);
    const cx = /r$/.test(cam.corner) ? SW - cw - m : m, cy = /^b/.test(cam.corner) ? SH - ch - m : m;
    const Ht = even(Math.min(Math.round(H * 0.42), Math.round(W / camAR))), Hb = H - Ht;
    let gw = SH * (W / Hb), gh = SH;
    if (gw > SW) { gw = SW; gh = SW * (Hb / W); }
    gw = even(gw / (trk?.zoom || 1)); gh = even(gh / (trk?.zoom || 1));
    const gx = trk ? clampE(pathExpr(trk.path, 'x', SW, -gw / 2), 0, SW - gw) : ((SW - gw) * Number(F)).toFixed(1);
    const gy = trk ? clampE(pathExpr(trk.path, 'y', SH, -gh / 2), 0, SH - gh) : ((SH - gh) / 2).toFixed(1);
    graph = `[0:v]split=2[cs][gs];[cs]crop=${cw}:${ch}:${cx}:${cy},scale=${W}:${Ht}:force_original_aspect_ratio=increase,crop=${W}:${Ht}[cam];[gs]delogo=x=${Math.max(1, cx)}:y=${Math.max(1, cy)}:w=${Math.min(cw, SW - Math.max(1, cx) - 2)}:h=${Math.min(ch, SH - Math.max(1, cy) - 2)},crop=${gw}:${gh}:'${gx}':'${gy}',scale=${W}:${Hb}[game];[cam][game]vstack=inputs=2`;
  } else if (trk) {
    const AR = W / H, baseW = Math.min(SW, SH * AR), z = trk.zoom || 1;
    const cw = even(baseW / z), ch = even(baseW / z / AR);
    const x = clampE(pathExpr(trk.path, 'x', SW, -cw / 2), 0, SW - cw), y = clampE(pathExpr(trk.path, 'y', SH, -ch / 2), 0, SH - ch);
    vf = `crop=w=${cw}:h=${ch}:x='${x}':y='${y}',scale=${W}:${H}`;
  }
  const cues = (clip.cues || []).filter((q) => String(q.text || '').trim());
  const hook = String(clip.hook || '').trim();
  const wantBurn = (style.sub && style.sub !== 'none' && cues.length > 0) || !!hook;
  const burned = wantBurn && (await canBurn());
  if (burned) {
    fs.writeFileSync(path.join(outDir, 'sub.ass'), buildAss(cues, { W, H, ...style, hook, duration: end - start }));
    vf += ',subtitles=sub.ass';
  }
  if (cues.length) fs.writeFileSync(path.join(outDir, 'altyazi.srt'), cues.map((q, i) => `${i + 1}\n${srtTime(q.start)} --> ${srtTime(q.end)}\n${q.text}\n`).join('\n'));
  // İsteğe bağlı yerleşim: "blur" → yatay görüntü tam görünür, boşluklar bulanık arka planla dolar (varsayılan davranış değişmez)
  let vArgs = ['-vf', vf];
  if (graph) vArgs = ['-filter_complex', `${graph}${burned ? ',subtitles=sub.ass' : ''}[vout]`, '-map', '[vout]', '-map', '0:a?'];
  else if (style.fit === 'blur' && (style.aspect === '9:16' || style.aspect === '1:1')) {
    const g = `[0:v]split=2[bgs][fgs];[bgs]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=28:6,eq=brightness=-0.1[bg];[fgs]scale=${W}:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2${burned ? ',subtitles=sub.ass' : ''}[vout]`;
    vArgs = ['-filter_complex', g, '-map', '[vout]', '-map', '0:a?'];
  }
  await run('ffmpeg', ['-y', '-ss', String(start), '-to', String(end), '-i', src, ...vArgs, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', 'video.mp4'], { cwd: outDir, timeout: 60 * 60 * 1000 });
  await run('ffmpeg', ['-y', '-ss', String(Math.min(1.5, (end - start) / 2)), '-i', 'video.mp4', '-frames:v', '1', '-vf', 'scale=640:-2', 'thumbnail.jpg'], { cwd: outDir, timeout: 60000 }).catch(() => {});
  try { fs.unlinkSync(path.join(outDir, 'sub.ass')); } catch {}
  return { burned, wantBurn, duration: end - start, track: trk ? { mode, found: trk.found, note: trk.note } : null };
}

// ---------- Yerel transkripsiyon (isteğe bağlı): openai-whisper / whisper-ctranslate2 / mlx_whisper ----------
let whisperCmd;
export async function findWhisper() {
  if (whisperCmd !== undefined) return whisperCmd;
  for (const c of ['mlx_whisper', 'whisper', 'whisper-ctranslate2']) {
    if ((await hasCommand(c, ['--help'])).ok) return (whisperCmd = c);
  }
  return (whisperCmd = null);
}
export async function transcribe(id, lang = 'tr', model = '') {
  const cmd = await findWhisper();
  if (!cmd) throw new Error('Konuşma tanıma modülü hazır değil. Kurulum için destek ekibiyle iletişime geç.');
  const meta = getMeta(id);
  if (!meta) throw new Error('Kaynak bulunamadı');
  const dir = dirOf(id);
  const wav = 'audio.wav';
  await run('ffmpeg', ['-y', '-i', meta.file, '-vn', '-ac', '1', '-ar', '16000', wav], { cwd: dir, timeout: 30 * 60 * 1000 });
  const variants = cmd === 'mlx_whisper'
    ? [['--word-timestamps', 'True', '--output-format', 'json', '--output-dir', '.'], ['--word_timestamps', 'True', '--output_format', 'json', '--output_dir', '.']]
    : [['--word_timestamps', 'True', '--output_format', 'json', '--output_dir', '.']];
  let lastErr;
  for (const flags of variants) {
    try {
      await run(cmd, [wav, '--language', lang, ...(model ? ['--model', model] : cmd === 'mlx_whisper' ? [] : ['--model', 'small']), ...flags], { cwd: dir, timeout: 3 * 60 * 60 * 1000 });
      lastErr = null;
      break;
    } catch (e) {
      lastErr = e;
    }
  }
  if (lastErr) throw new Error('Transkripsiyon başarısız: ' + lastErr.message.slice(-300));
  const j = readJSON(path.join(dir, 'audio.json'), null);
  if (!j) throw new Error('Transkript dosyası oluşmadı');
  const words = [];
  for (const seg of j.segments || []) {
    if (seg.words?.length) for (const w of seg.words) words.push({ s: +Number(w.start).toFixed(3), e: +Number(w.end).toFixed(3), w: String(w.word).trim() });
    else {
      const ws = String(seg.text || '').trim().split(/\s+/).filter(Boolean), step = (seg.end - seg.start) / Math.max(1, ws.length);
      ws.forEach((w, i) => words.push({ s: +(seg.start + i * step).toFixed(3), e: +(seg.start + (i + 1) * step).toFixed(3), w }));
    }
  }
  meta.words = words.filter((w) => w.w);
  meta.subLang = lang + ' (whisper)';
  writeJSON(path.join(dir, 'meta.json'), meta);
  return meta;
}
