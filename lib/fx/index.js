// Efekt "skill"leri: her biri küçük bir modül. lib/fx/packs/*.js (hazır) ve proje kökündeki fx/*.js (senin eklediklerin) otomatik yüklenir.
// Mevcut klip üretimine dokunmaz: biten klibin üstüne ayrı dosya (fx_*.mp4) olarak uygulanır.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { run, ROOT, DATA_DIR } from '../util.js';
import { assDoc } from './ass.js';

const registry = new Map();
export const ASSET_DIR = path.join(DATA_DIR, 'assets');

async function loadDir(dir, source) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir).sort()) {
    if (!/\.(m?js)$/.test(f) || f.startsWith('_')) continue;
    try {
      const mod = await import(pathToFileURL(path.join(dir, f)).href + `?t=${Date.now()}`);
      const list = [].concat(mod.default || []);
      for (const e of list) if (e?.id && typeof e.build === 'function') registry.set(e.id, { ...e, source });
    } catch (err) { console.error(`[fx] ${f} yüklenemedi:`, err.message); }
  }
}
let loaded;
export async function loadEffects(force = false) {
  if (loaded && !force) return loaded;
  registry.clear();
  loaded = (async () => {
    await loadDir(path.join(ROOT, 'lib', 'fx', 'packs'), 'builtin');
    await loadDir(path.join(ROOT, 'fx'), 'custom');
    return registry;
  })();
  return loaded;
}

export function listAssets(kind) {
  const dir = path.join(ASSET_DIR, kind);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => !f.startsWith('.')).map((f) => ({ id: f, name: f.replace(/^\d+-/, ''), size: fs.statSync(path.join(dir, f)).size }));
}
export const assetPath = (kind, id) => {
  if (!/^[\w .()\-]+$/.test(id || '')) throw new Error('Geçersiz dosya');
  const p = path.join(ASSET_DIR, kind, id);
  if (!fs.existsSync(p)) throw new Error('Dosya bulunamadı: ' + id);
  return p;
};

export async function describeEffects() {
  await loadEffects();
  return [...registry.values()].map(({ build, ...meta }) => meta);
}

async function probe(file) {
  const r = await run('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,width,height,r_frame_rate:format=duration', '-of', 'json', file], { timeout: 30000 });
  const j = JSON.parse(r.stdout || '{}');
  const v = (j.streams || []).find((s) => s.codec_type === 'video') || {};
  const [n, d] = String(v.r_frame_rate || '30/1').split('/').map(Number);
  return { W: v.width, H: v.height, fps: Math.round(((n / (d || 1)) || 30) * 100) / 100, hasAudio: (j.streams || []).some((s) => s.codec_type === 'audio'), duration: Number(j.format?.duration) || 0 };
}
const ENC = ['-c:v', 'libx264', '-preset', 'superfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];

/** Atempo zinciri: 0.5'ten küçük hızlar için iki aşama */
export const atempoChain = (sp) => (sp >= 0.5 ? `atempo=${sp.toFixed(3)}` : `atempo=0.5,atempo=${(sp / 0.5).toFixed(3)}`);

/**
 * input: biten klip. effects: [{id, params}]. Aşamalar: zaman → görüntü/ses filtreleri (+ASS) → müzik → logo → kapanış kartı.
 * Orijinal dosyaya dokunmaz; sonucu outFile olarak yazar.
 */
export async function applyEffects({ input, outFile, effects, workDir }) {
  await loadEffects();
  fs.mkdirSync(workDir, { recursive: true });
  const tmp = (n) => path.join(workDir, n);
  let info = await probe(input);
  let cur = input;
  const cleanup = [];
  const built = [];
  const report = {};
  for (const e of effects) {
    const fx = registry.get(e.id);
    if (!fx) throw new Error('Bilinmeyen efekt: ' + e.id);
    const params = {};
    for (const p of fx.params || []) params[p.key] = e.params?.[p.key] ?? p.default;
    built.push({ fx, params });
  }
  // ses yoksa sessiz iz ekle (müzik / kapanış / dengeleme için)
  const needsAudio = built.some(({ fx }) => fx.needsAudio);
  if (!info.hasAudio && needsAudio) {
    const o = tmp('a0.mp4');
    await run('ffmpeg', ['-y', '-i', cur, '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-shortest', '-c:v', 'copy', '-c:a', 'aac', o], { timeout: 600000 });
    cur = o; cleanup.push(o); info = await probe(cur);
  }
  const ctxFor = () => ({ ...info, tmp, assetPath });
  const parts = built.map(({ fx, params }) => ({ fx, params, out: fx.build(params, ctxFor()) || {} }));

  // 1) zaman işlemleri (her biri ayrı geçiş)
  let step = 0;
  for (const { out } of parts) for (const op of out.time || []) {
    const o = tmp(`t${step++}.mp4`);
    await timePass(cur, o, op, info, report);
    cur = o; cleanup.push(o); info = await probe(cur);
  }
  // süre değiştiyse (sessizlik kırpma) zamana bağlı efektleri yeni süreyle yeniden kur
  if (parts.some((p) => (p.out.time || []).some((t) => t.type === 'silencecut'))) {
    for (const p of parts) if (!(p.out.time || []).length) p.out = p.fx.build(p.params, ctxFor()) || {};
  }
  // 2) filtreler + ASS (tek geçiş)
  const vf = parts.flatMap((p) => p.out.vf || []);
  const af = parts.flatMap((p) => p.out.af || []);
  const ev = parts.flatMap((p) => p.out.ass || []);
  if (vf.length || af.length || ev.length) {
    const o = tmp('f.mp4');
    const chain = [...vf];
    if (ev.length) { fs.writeFileSync(tmp('fx.ass'), assDoc(info.W, info.H, ev)); chain.push('ass=fx.ass'); }
    const args = ['-y', '-i', path.resolve(cur)];
    if (chain.length) args.push('-vf', chain.join(','), ...ENC); else args.push('-c:v', 'copy');
    if (af.length && info.hasAudio) args.push('-af', af.join(','), '-c:a', 'aac', '-b:a', '192k'); else args.push('-c:a', 'copy');
    args.push(path.basename(o));
    await run('ffmpeg', args, { cwd: workDir, timeout: 60 * 60 * 1000 });
    cur = o; cleanup.push(o);
  }
  // 3) müzik / 4) logo / 5) kapanış
  for (const { out } of parts) {
    if (out.mix) { const o = tmp(`m${step++}.mp4`); await mixPass(cur, o, out.mix, info); cur = o; cleanup.push(o); }
    if (out.voice) { const o = tmp(`v${step++}.mp4`); await voicePass(cur, o, out.voice, info); cur = o; cleanup.push(o); }
    if (out.overlay) { const o = tmp(`l${step++}.mp4`); await overlayPass(cur, o, out.overlay, info); cur = o; cleanup.push(o); }
    if (out.outro) { const o = tmp(`o${step++}.mp4`); await outroPass(cur, o, out.outro, info, workDir); cur = o; cleanup.push(o); info = await probe(cur); }
  }
  report.visual = parts.some((p) => (p.out.vf || []).length || (p.out.ass || []).length || p.out.overlay || p.out.outro || (p.out.time || []).some((t) => t.type !== 'silencecut'));
  report.audio = parts.some((p) => (p.out.af || []).length || p.out.mix || p.out.voice);
  fs.copyFileSync(cur, outFile);
  for (const f of cleanup) { try { fs.unlinkSync(f); } catch {} }
  try { fs.unlinkSync(tmp('fx.ass')); } catch {}
  return { duration: info.duration, report };
}

async function silenceSegments(inp, op, info) {
  const th = Number(op.threshold) || -34, ms = Math.max(0.2, Number(op.minSilence) || 0.45);
  let err = '';
  try { err = (await run('ffmpeg', ['-hide_banner', '-nostats', '-i', inp, '-vn', '-af', `silencedetect=noise=${th}dB:d=${ms}`, '-f', 'null', '-'], { timeout: 10 * 60 * 1000 })).stderr; } catch (e) { err = e.stderr || ''; }
  const sil = [];
  let st = null;
  for (const m of err.matchAll(/silence_(start|end): (-?[\d.]+)/g)) {
    if (m[1] === 'start') st = Math.max(0, Number(m[2]));
    else if (st !== null) { sil.push([st, Number(m[2])]); st = null; }
  }
  if (st !== null) sil.push([st, info.duration]);
  const pad = 0.12, keep = [];
  let pos = 0;
  for (const [a, b] of sil) {
    const cutA = a + pad, cutB = b - pad;
    if (cutB - cutA < 0.15) continue;
    if (cutA > pos) keep.push([pos, cutA]);
    pos = cutB;
  }
  if (pos < info.duration) keep.push([pos, info.duration]);
  return keep.filter(([a, b]) => b - a > 0.08);
}

async function timePass(inp, out, op, info, rep = {}) {
  if (op.type === 'silencecut') {
    rep.silenceChecked = true;
    if (!info.hasAudio) { fs.copyFileSync(inp, out); return; }
    const keep = await silenceSegments(inp, op, info);
    const removed = info.duration - keep.reduce((s, [a, b]) => s + (b - a), 0);
    if (keep.length < 2 || removed < 0.4) { fs.copyFileSync(inp, out); return; }
    rep.silenceRemoved = (rep.silenceRemoved || 0) + removed;
    const n = keep.length, g = [`[0:v]split=${n}${keep.map((_, i) => `[vs${i}]`).join('')}`, `[0:a]asplit=${n}${keep.map((_, i) => `[as${i}]`).join('')}`];
    keep.forEach(([a, b], i) => {
      g.push(`[vs${i}]trim=${a.toFixed(3)}:${b.toFixed(3)},setpts=PTS-STARTPTS[v${i}]`);
      g.push(`[as${i}]atrim=${a.toFixed(3)}:${b.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.02[a${i}]`);
    });
    g.push(keep.map((_, i) => `[v${i}][a${i}]`).join('') + `concat=n=${n}:v=1:a=1[ov][oa]`);
    await run('ffmpeg', ['-y', '-i', inp, '-filter_complex', g.join(';'), '-map', '[ov]', '-map', '[oa]', '-c:a', 'aac', '-b:a', '192k', ...ENC, out], { timeout: 60 * 60 * 1000 });
    return;
  }
  const sp = Math.min(1, Math.max(0.1, Number(op.speed) || 0.5));
  const D = info.duration;
  const s = Math.max(0, Math.min(D - 0.2, Number(op.start) || 0));
  const e = Math.max(s + 0.2, Math.min(D, Number(op.end) || s + 2));
  const seg = []; // {a,b,speed,mute}
  if (op.type === 'replay') {
    seg.push({ a: 0, b: e, speed: 1 }, { a: s, b: e, speed: sp, slow: true }, { a: e, b: D, speed: 1 });
  } else {
    seg.push({ a: 0, b: s, speed: 1 }, { a: s, b: e, speed: sp, slow: true }, { a: e, b: D, speed: 1 });
  }
  const live = seg.filter((x) => x.b - x.a > 0.04);
  const n = live.length, aud = info.hasAudio;
  const g = [`[0:v]split=${n}${live.map((_, i) => `[vs${i}]`).join('')}`];
  if (aud) g.push(`[0:a]asplit=${n}${live.map((_, i) => `[as${i}]`).join('')}`);
  live.forEach((x, i) => {
    g.push(`[vs${i}]trim=${x.a.toFixed(3)}:${x.b.toFixed(3)},setpts=(PTS-STARTPTS)/${x.speed}${x.slow && op.smooth ? `,minterpolate=fps=${Math.min(60, info.fps * 2)}:mi_mode=blend` : ''}[v${i}]`);
    if (aud) {
      const mute = x.slow && op.audio === 'mute';
      g.push(`[as${i}]atrim=${x.a.toFixed(3)}:${x.b.toFixed(3)},asetpts=PTS-STARTPTS${x.speed < 1 ? ',' + atempoChain(x.speed) : ''}${mute ? ',volume=0' : x.slow ? ',volume=0.5' : ''}[a${i}]`);
    }
  });
  g.push(live.map((_, i) => `[v${i}]${aud ? `[a${i}]` : ''}`).join('') + `concat=n=${n}:v=1:a=${aud ? 1 : 0}[ov]${aud ? '[oa]' : ''}`);
  const args = ['-y', '-i', inp, '-filter_complex', g.join(';'), '-map', '[ov]'];
  if (aud) args.push('-map', '[oa]', '-c:a', 'aac', '-b:a', '192k');
  args.push(...ENC, out);
  await run('ffmpeg', args, { timeout: 60 * 60 * 1000 });
}

async function mixPass(inp, out, m, info) {
  const vol = Math.min(1.5, Math.max(0.02, Number(m.volume) || 0.25));
  const fi = Math.max(0, Number(m.fadeIn) || 0), fo = Math.max(0, Number(m.fadeOut) || 0);
  const D = info.duration, off = Math.max(0, Number(m.startAt) || 0);
  let mus = `[1:a]atrim=start=${off},asetpts=PTS-STARTPTS,aloop=loop=-1:size=2147483647,atrim=0:${D.toFixed(3)},asetpts=PTS-STARTPTS,volume=${vol}`;
  if (fi) mus += `,afade=t=in:st=0:d=${fi}`;
  if (fo) mus += `,afade=t=out:st=${Math.max(0, D - fo).toFixed(3)}:d=${fo}`;
  mus += '[mus]';
  const g = m.duck
    ? [mus, '[0:a]asplit=2[vo][vsc]', '[mus][vsc]sidechaincompress=threshold=0.04:ratio=9:attack=15:release=350[duck]', '[vo][duck]amix=inputs=2:duration=first:normalize=0[oa]']
    : [mus, '[0:a][mus]amix=inputs=2:duration=first:normalize=0[oa]'];
  await run('ffmpeg', ['-y', '-i', inp, '-i', m.file, '-filter_complex', g.join(';'), '-map', '0:v', '-map', '[oa]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', D.toFixed(3), out], { timeout: 60 * 60 * 1000 });
}

/** Kullanıcının kendi sesi: orijinal sesin yerine geçer ya da üstüne karışır (konuşurken orijinal kısılabilir). */
async function voicePass(inp, out, v, info) {
  const D = info.duration;
  const vol = Math.min(3, Math.max(0.1, Number(v.volume) || 1));
  const off = Math.max(0, Math.round((Number(v.startAt) || 0) * 1000));
  const orig = Math.min(1.5, Math.max(0, Number(v.origVolume) ?? 0.25));
  const voice = `[1:a]aresample=44100,aformat=channel_layouts=stereo,volume=${vol},adelay=${off}|${off}`;
  let g;
  if (v.mode === 'replace') g = [`${voice},apad[oa]`];
  else if (v.duck) g = [`${voice},asplit=2[v1][v2]`, `[0:a]volume=${orig}[o]`, '[o][v2]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=300[od]', '[od][v1]amix=inputs=2:duration=first:normalize=0[oa]'];
  else g = [`${voice}[v1]`, `[0:a]volume=${orig}[o]`, '[o][v1]amix=inputs=2:duration=first:normalize=0[oa]'];
  await run('ffmpeg', ['-y', '-i', inp, '-i', v.file, '-filter_complex', g.join(';'), '-map', '0:v', '-map', '[oa]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', D.toFixed(3), out], { timeout: 60 * 60 * 1000 });
}

async function overlayPass(inp, out, o, info) {
  const w = Math.round(info.W * Math.min(0.5, Math.max(0.04, (Number(o.size) || 16) / 100)));
  const mg = Math.round(info.W * 0.035);
  const pos = { tl: `${mg}:${mg}`, tr: `W-w-${mg}:${mg}`, bl: `${mg}:H-h-${mg}`, br: `W-w-${mg}:H-h-${mg}` }[o.position] || `W-w-${mg}:${mg}`;
  const op = Math.min(1, Math.max(0.1, Number(o.opacity) || 0.85));
  const g = `[1:v]scale=${w}:-1,format=rgba,colorchannelmixer=aa=${op}[lg];[0:v][lg]overlay=${pos}[ov]`;
  await run('ffmpeg', ['-y', '-i', inp, '-i', o.file, '-filter_complex', g, '-map', '[ov]', '-map', '0:a?', ...ENC, '-c:a', 'copy', out], { timeout: 60 * 60 * 1000 });
}

async function outroPass(inp, out, o, info, workDir) {
  const d = Math.min(8, Math.max(1.5, Number(o.duration) || 3));
  const card = path.join(workDir, 'outro_card.mp4');
  const col = (o.bg || '#1F1E1D').replace('#', '0x');
  fs.writeFileSync(path.join(workDir, 'outro.ass'), assDoc(info.W, info.H, o.ass || []));
  await run('ffmpeg', ['-y', '-f', 'lavfi', '-i', `color=c=${col}:s=${info.W}x${info.H}:r=${info.fps}:d=${d}`, '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-t', String(d), '-vf', 'ass=outro.ass', ...ENC, '-c:a', 'aac', '-shortest', 'outro_card.mp4'], { cwd: workDir, timeout: 600000 });
  const g = `[0:v]setsar=1,fps=${info.fps}[v0];[1:v]setsar=1,fps=${info.fps}[v1];[0:a]aresample=44100[a0];[1:a]aresample=44100[a1];[v0][a0][v1][a1]concat=n=2:v=1:a=1[ov][oa]`;
  await run('ffmpeg', ['-y', '-i', inp, '-i', card, '-filter_complex', g, '-map', '[ov]', '-map', '[oa]', ...ENC, '-c:a', 'aac', '-b:a', '192k', out], { timeout: 60 * 60 * 1000 });
  try { fs.unlinkSync(card); fs.unlinkSync(path.join(workDir, 'outro.ass')); } catch {}
}
