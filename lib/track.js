// Akıllı kadraj takibi: ek kurulum gerektirmez (yalnızca ffmpeg + Node).
// Modlar: face (yüz, ten rengi + şekil), ball (top: küçük, hareketli, beyaz yuvarlak), action (hareketin yoğun olduğu yer),
// mark (kullanıcının işaretlediği nesne: blok eşleştirme). Çıktı: normalize (0..1) kaynak koordinatlarında yumuşatılmış yol.
import { spawn } from 'node:child_process';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** ffmpeg'ten ham kareleri akıtır; her kare için cb(buf, index, t) çağırır. */
function streamFrames(src, { start, dur, fps, w, h, pix }, cb) {
  return new Promise((resolve, reject) => {
    const bpp = pix === 'gray' ? 1 : 3, size = w * h * bpp;
    const p = spawn('ffmpeg', ['-v', 'error', '-ss', String(start), '-t', String(dur), '-i', src, '-an', '-vf', `fps=${fps},scale=${w}:${h}`, '-pix_fmt', pix === 'gray' ? 'gray' : 'rgb24', '-f', 'rawvideo', '-'], { windowsHide: true });
    let buf = Buffer.alloc(0), n = 0, err = '';
    p.stderr.on('data', (d) => { err += d; });
    p.stdout.on('data', (d) => {
      buf = buf.length ? Buffer.concat([buf, d]) : d;
      while (buf.length >= size) {
        cb(buf.subarray(0, size), n, n / fps);
        n++;
        buf = buf.subarray(size);
      }
    });
    p.on('error', reject);
    p.on('close', (code) => (code === 0 || n > 0 ? resolve(n) : reject(new Error('Kare okunamadı: ' + err.slice(-200)))));
  });
}

/** Etiketleme (4 komşuluk, iteratif). mask: Uint8Array w*h → [{area, x0,y0,x1,y1, sx, sy}] */
function blobs(mask, w, h, minArea, maxArea) {
  const seen = new Uint8Array(w * h), out = [], stack = new Int32Array(w * h);
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i] || seen[i]) continue;
    let sp = 0, area = 0, x0 = w, y0 = h, x1 = 0, y1 = 0, sx = 0, sy = 0;
    stack[sp++] = i; seen[i] = 1;
    while (sp) {
      const k = stack[--sp], x = k % w, y = (k / w) | 0;
      area++; sx += x; sy += y;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (x > 0 && mask[k - 1] && !seen[k - 1]) { seen[k - 1] = 1; stack[sp++] = k - 1; }
      if (x < w - 1 && mask[k + 1] && !seen[k + 1]) { seen[k + 1] = 1; stack[sp++] = k + 1; }
      if (y > 0 && mask[k - w] && !seen[k - w]) { seen[k - w] = 1; stack[sp++] = k - w; }
      if (y < h - 1 && mask[k + w] && !seen[k + w]) { seen[k + w] = 1; stack[sp++] = k + w; }
    }
    if (area >= minArea && area <= maxArea) out.push({ area, x0, y0, x1, y1, cx: sx / area, cy: sy / area, bw: x1 - x0 + 1, bh: y1 - y0 + 1 });
  }
  return out;
}

const dims = (meta, w) => ({ w, h: Math.max(2, 2 * Math.round((w * meta.height) / meta.width / 2)) });

// ---------- Yüz: ten rengi bölgeleri ----------
async function faceSamples(src, meta, start, dur) {
  const { w, h } = dims(meta, 256), fps = 4, mask = new Uint8Array(w * h), samples = [];
  let cur = null, challenger = 0;
  await streamFrames(src, { start, dur, fps, w, h, pix: 'rgb' }, (f, n, t) => {
    for (let i = 0, j = 0; i < mask.length; i++, j += 3) {
      const r = f[j], g = f[j + 1], b = f[j + 2];
      const y = 0.299 * r + 0.587 * g + 0.114 * b, cb = 128 - 0.1687 * r - 0.3313 * g + 0.5 * b, cr = 128 + 0.5 * r - 0.4187 * g - 0.0813 * b;
      mask[i] = y > 55 && cb > 78 && cb < 124 && cr > 136 && cr < 172 && r > g && r > b ? 1 : 0;
    }
    const cand = blobs(mask, w, h, w * h * 0.004, w * h * 0.28).filter((b) => {
      const ar = b.bw / b.bh, fill = b.area / (b.bw * b.bh);
      return ar > 0.5 && ar < 1.35 && fill > 0.5;
    });
    if (!cand.length) { if (cur) samples.push({ t, x: cur.x, y: cur.y, c: 0.2 }); return; }
    const score = (b) => b.area * (0.6 + 0.4 * (b.cy < h * 0.65 ? 1 : 0)) * (cur ? 1 / (1 + Math.hypot(b.cx / w - cur.x, b.cy / h - cur.y) * 3) : 1);
    cand.sort((a, b) => score(b) - score(a));
    const best = cand[0], bx = best.cx / w, by = best.cy / h;
    if (!cur) cur = { x: bx, y: by };
    else {
      const near = Math.hypot(bx - cur.x, by - cur.y) < 0.18;
      if (near) { cur = { x: bx, y: by }; challenger = 0; }
      else if (++challenger >= 5) { cur = { x: bx, y: by }; challenger = 0; } // konuşan kişi değişti: gecikmeli geçiş
    }
    samples.push({ t, x: cur.x, y: cur.y, c: 1 });
  });
  return samples;
}

// ---------- Hareket: değişimin yoğun olduğu yer ----------
async function actionSamples(src, meta, start, dur) {
  const { w, h } = dims(meta, 320), fps = 6, samples = [];
  let prev = null;
  await streamFrames(src, { start, dur, fps, w, h, pix: 'gray' }, (f, n, t) => {
    if (prev) {
      const d = new Float32Array(f.length);
      let sum = 0, sq = 0;
      for (let i = 0; i < f.length; i++) { const v = Math.abs(f[i] - prev[i]); d[i] = v; sum += v; sq += v * v; }
      const mu = sum / f.length, sd = Math.sqrt(Math.max(0, sq / f.length - mu * mu)), th = Math.max(18, mu + 1.8 * sd);
      let sx = 0, sy = 0, sw = 0;
      for (let i = 0; i < f.length; i++) if (d[i] > th) { const x = i % w, y = (i / w) | 0; sx += x * d[i]; sy += y * d[i]; sw += d[i]; }
      if (sw > 800) samples.push({ t, x: sx / sw / w, y: sy / sw / h, c: 1 });
    }
    prev = Buffer.from(f);
  });
  return samples;
}

// ---------- Top: küçük, hareketli, beyaz yuvarlak ----------
async function ballSamples(src, meta, start, dur, init) {
  const { w, h } = dims(meta, 640), fps = 8, mask = new Uint8Array(w * h), samples = [];
  let prev = null, cur = init ? { x: init.x, y: init.y } : null, lost = 0;
  await streamFrames(src, { start, dur, fps, w, h, pix: 'rgb' }, (f, n, t) => {
    if (prev) {
      for (let i = 0, j = 0; i < mask.length; i++, j += 3) {
        const r = f[j], g = f[j + 1], b = f[j + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        const moved = Math.abs(r - prev[j]) + Math.abs(g - prev[j + 1]) + Math.abs(b - prev[j + 2]) > 60;
        mask[i] = mn > 175 && mx - mn < 50 && moved ? 1 : 0;
      }
      const c = blobs(mask, w, h, 3, 260).filter((b) => b.bw <= 26 && b.bh <= 26 && b.bw / b.bh > 0.45 && b.bw / b.bh < 2.2 && b.area / (b.bw * b.bh) > 0.45);
      let best = null, bs = 0;
      for (const b of c) {
        const near = cur ? 1 / (1 + (Math.hypot(b.cx / w - cur.x, b.cy / h - cur.y) / 0.08) ** 2) : 0.5;
        const s = near * (0.4 + Math.min(1, b.area / 40));
        if (s > bs) { bs = s; best = b; }
      }
      if (best && (bs > 0.12 || !cur)) { cur = { x: best.cx / w, y: best.cy / h }; lost = 0; samples.push({ t, x: cur.x, y: cur.y, c: 1 }); }
      else if (cur) { lost++; samples.push({ t, x: cur.x, y: cur.y, c: 0 }); }
    }
    prev = Buffer.from(f);
  });
  return { samples, ok: samples.filter((s) => s.c > 0).length };
}

// ---------- İşaretli nesne: blok eşleştirme ----------
async function markSamples(src, meta, start, dur, seed) {
  const { w, h } = dims(meta, 640), fps = 8, samples = [];
  const half = seed.kind === 'ball' ? 6 : Math.round(w * 0.04), R = seed.kind === 'ball' ? Math.round(w * 0.085) : Math.round(w * 0.05);
  let tpl = null, px = clamp(seed.x, 0.02, 0.98) * w, py = clamp(seed.y, 0.02, 0.98) * h, lost = 0;
  const T = half * 2 + 1;
  const grab = (f, cx, cy) => { const o = new Float32Array(T * T); for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const X = clamp(Math.round(cx) - half + x, 0, w - 1), Y = clamp(Math.round(cy) - half + y, 0, h - 1); o[y * T + x] = f[Y * w + X]; } return o; };
  await streamFrames(src, { start, dur, fps, w, h, pix: 'gray' }, (f, n, t) => {
    if (!tpl) { tpl = grab(f, px, py); samples.push({ t, x: px / w, y: py / h, c: 1 }); return; }
    let bestS = Infinity, bx = px, by = py;
    const x0 = Math.max(half, Math.round(px) - R), x1 = Math.min(w - 1 - half, Math.round(px) + R), y0 = Math.max(half, Math.round(py) - R), y1 = Math.min(h - 1 - half, Math.round(py) + R);
    const step = R > 30 ? 2 : 1;
    for (let cy = y0; cy <= y1; cy += step) for (let cx = x0; cx <= x1; cx += step) {
      let s = 0;
      for (let y = 0; y < T && s < bestS; y += 2) { const row = (cy - half + y) * w + cx - half; for (let x = 0; x < T; x++) s += Math.abs(f[row + x] - tpl[y * T + x]); }
      if (s < bestS) { bestS = s; bx = cx; by = cy; }
    }
    if (step === 2) for (let cy = by - 1; cy <= by + 1; cy++) for (let cx = bx - 1; cx <= bx + 1; cx++) {
      if (cx < half || cy < half || cx > w - 1 - half || cy > h - 1 - half) continue;
      let s = 0;
      for (let y = 0; y < T; y += 2) { const row = (cy - half + y) * w + cx - half; for (let x = 0; x < T; x++) s += Math.abs(f[row + x] - tpl[y * T + x]); }
      if (s < bestS) { bestS = s; bx = cx; by = cy; }
    }
    const per = bestS / (Math.ceil(T / 2) * T);
    if (per < 34) { px = bx; py = by; lost = 0; { const nt = grab(f, px, py); for (let i = 0; i < tpl.length; i++) tpl[i] = tpl[i] * 0.9 + nt[i] * 0.1; } samples.push({ t, x: px / w, y: py / h, c: 1 }); }
    else { lost++; samples.push({ t, x: px / w, y: py / h, c: 0 }); }
  });
  return samples;
}

/** Eksik/zayıf örnekleri doldur, ölü bölgeli takip + yumuşatma, 0.4 sn aralıklı yol üret. */
export function smoothPath(samples, dur, { deadzone = 0.05, step = 0.4, maxSpeed = 0.55, fallback = null } = {}) {
  const good = samples.filter((s) => s.c > 0);
  const base = good.length ? good : fallback?.length ? fallback : samples;
  if (!base.length) return [{ t: 0, x: 0.5, y: 0.5 }, { t: dur, x: 0.5, y: 0.5 }];
  const at = (t, key) => {
    let a = base[0], b = base[base.length - 1];
    if (t <= a.t) return a[key];
    if (t >= b.t) return b[key];
    let lo = 0, hi = base.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (base[m].t <= t) lo = m; else hi = m; }
    a = base[lo]; b = base[hi];
    return a[key] + ((b[key] - a[key]) * (t - a.t)) / Math.max(1e-6, b.t - a.t);
  };
  const dt = 0.1, N = Math.ceil(dur / dt) + 1, xs = [], ys = [];
  let cx = at(0, 'x'), cy = at(0, 'y');
  for (let i = 0; i < N; i++) {
    const t = i * dt, tx = at(t, 'x'), ty = at(t, 'y');
    const ex = tx - cx, ey = ty - cy;
    if (Math.abs(ex) > deadzone) cx += clamp(ex - Math.sign(ex) * deadzone, -maxSpeed * dt, maxSpeed * dt);
    if (Math.abs(ey) > deadzone) cy += clamp(ey - Math.sign(ey) * deadzone, -maxSpeed * dt, maxSpeed * dt);
    xs.push(cx); ys.push(cy);
  }
  const blur = (a, r) => a.map((_, i) => { let s = 0, k = 0; for (let j = Math.max(0, i - r); j <= Math.min(a.length - 1, i + r); j++) { const wgt = r + 1 - Math.abs(j - i); s += a[j] * wgt; k += wgt; } return s / k; });
  const sx = blur(xs, 6), sy = blur(ys, 6);
  const out = [];
  for (let t = 0; t <= dur + 1e-6; t += step) { const i = Math.min(N - 1, Math.round(t / dt)); out.push({ t: +t.toFixed(2), x: +sx[i].toFixed(4), y: +sy[i].toFixed(4) }); }
  if (out[out.length - 1].t < dur) out.push({ t: +dur.toFixed(2), x: out[out.length - 1].x, y: out[out.length - 1].y });
  return out;
}

/**
 * mode: face | ball | action | mark. seed (mark): {x,y,kind:'ball'|'object'}.
 * Dönüş: { path:[{t,x,y}], zoom, found, note }
 */
export async function trackSubject({ src, meta, start, end, mode, seed }) {
  const dur = Math.max(0.5, end - start);
  let samples = [], found = 0, note = '';
  if (mode === 'face') {
    samples = await faceSamples(src, meta, start, dur);
    found = samples.filter((s) => s.c > 0.5).length;
    note = found < 3 ? 'Yüz bulunamadı; kadraj sabit kaldı. "İşaretlediğim nesne" ile elle seçebilirsin.' : '';
  } else if (mode === 'ball') {
    const r = await ballSamples(src, meta, start, dur);
    const act = await actionSamples(src, meta, start, dur);
    found = r.ok;
    const total = Math.max(1, Math.round(dur * 8));
    samples = r.samples;
    if (r.ok / total < 0.15) { samples = act; note = 'Top net seçilemedi; oyunun yoğun olduğu bölge takip edildi. "İşaretlediğim nesne" ile topu elle seçebilirsin.'; found = act.length; }
    else samples = [...r.samples.filter((s) => s.c > 0), ...act.filter((a) => !r.samples.some((s) => s.c > 0 && Math.abs(s.t - a.t) < 0.8))].sort((a, b) => a.t - b.t);
  } else if (mode === 'action') {
    samples = await actionSamples(src, meta, start, dur);
    found = samples.length;
    note = found < 3 ? 'Belirgin hareket bulunamadı; kadraj sabit kaldı.' : '';
  } else if (mode === 'mark') {
    if (!seed || !(seed.x >= 0 && seed.y >= 0)) throw new Error('Önce videoda takip edilecek noktayı işaretle');
    if (seed.kind === 'ball') { const r = await ballSamples(src, meta, start, dur, seed); samples = r.samples; }
    else samples = await markSamples(src, meta, start, dur, seed);
    found = samples.filter((s) => s.c > 0).length;
    if (found < samples.length * 0.5) note = 'Nesne birçok karede kayboldu; sonuç kısmen tahmindir.';
  } else throw new Error('Bilinmeyen takip türü');
  const ball = mode === 'ball' || (mode === 'mark' && seed?.kind === 'ball');
  const path = smoothPath(samples, dur, ball ? { deadzone: 0.04, maxSpeed: 0.9 } : mode === 'action' ? { deadzone: 0.1, maxSpeed: 0.35 } : {});
  return { path, found, note, zoom: ball ? 1.6 : mode === 'face' ? 1.15 : 1 };
}

/** Yol → ffmpeg ifadesi (t'ye göre parçalı doğrusal) */
export function pathExpr(path, key, scale = 1, offset = 0) {
  const terms = [];
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1], span = Math.max(0.01, b.t - a.t);
    const v0 = (a[key] * scale + offset).toFixed(2), v1 = (b[key] * scale + offset).toFixed(2);
    terms.push(`gte(t,${a.t})*lt(t,${b.t})*(${v0}+(${v1}-${v0})*(t-${a.t})/${span.toFixed(2)})`);
  }
  const last = path[path.length - 1];
  if (last) terms.push(`gte(t,${last.t})*${(last[key] * scale + offset).toFixed(2)}`);
  return terms.join('+') || '0';
}
