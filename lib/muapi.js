// Bulut görsel API istemcisi (Open-Higgsfield-AI'nin kullandığı görsel/video API'si, MIT). Anahtar sunucuda kalır, tarayıcıya gitmez.
// Not: Muapi bulut servisidir (kredi ile çalışır) — yerel model değildir.
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'https://api.muapi.ai';

// Film stüdyosu için seçilebilir görsel modelleri (endpoint = id; flux ailesi genişlik/yükseklik ister)
export const IMAGE_MODELS = [
  { id: 'flux-schnell-image', name: 'Flux Schnell', note: 'en ucuz / hızlı', size: true },
  { id: 'flux-dev-image', name: 'Flux Dev', note: 'dengeli', size: true },
  { id: 'google-imagen4-fast', name: 'Imagen 4 Fast', note: 'temiz, hızlı' },
  { id: 'nano-banana', name: 'Nano Banana', note: 'karakter tutarlılığı iyi' },
  { id: 'bytedance-seedream-v4.5', name: 'Seedream 4.5', note: 'yüksek kalite' },
  { id: 'midjourney-v7-text-to-image', name: 'Midjourney v7', note: 'en sinematik (pahalı)' },
];
export const EDIT_MODEL = 'nano-banana-edit'; // referans görselle tutarlı karakter

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(key, method, url, body) {
  const r = await fetch(BASE + url, { method, headers: { 'x-api-key': key, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  if (!r.ok) {
    if (r.status === 401 || r.status === 403) throw new Error('Görsel API anahtarı geçersiz (Ayarlar → Görsel).');
    if (r.status === 402) throw new Error('Görsel API krediniz bitmiş.');
    throw new Error(`Görsel API ${r.status}: ${text.slice(0, 200)}`);
  }
  try { return JSON.parse(text); } catch { return {}; }
}

async function submitAndWait(key, endpoint, payload, { maxWaitMs = 4 * 60 * 1000 } = {}) {
  const sub = await call(key, 'POST', `/api/v1/${endpoint}`, payload);
  const direct = sub.outputs?.[0] || sub.url;
  const id = sub.request_id || sub.id;
  if (!id) { if (direct) return direct; throw new Error('Görsel API yanıtında istek kimliği yok'); }
  const t0 = Date.now();
  let wait = 1500;
  while (Date.now() - t0 < maxWaitMs) {
    await sleep(wait);
    wait = Math.min(4000, wait + 500);
    let d;
    try { d = await call(key, 'GET', `/api/v1/predictions/${id}/result`); } catch (e) { if (/anahtar|kredi/i.test(e.message)) throw e; continue; }
    const st = String(d.status || '').toLowerCase();
    if (['completed', 'succeeded', 'success'].includes(st)) {
      const u = d.outputs?.[0] || d.url || d.output?.url;
      if (!u) throw new Error('Görsel API çıktı vermedi');
      return u;
    }
    if (['failed', 'error'].includes(st)) throw new Error('Görsel API üretimi başarısız: ' + (d.error || 'bilinmiyor'));
  }
  throw new Error('Görsel API zaman aşımı');
}

async function download(url, file) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('Görsel indirilemedi: ' + r.status);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
}

export async function uploadFile(key, file) {
  const fd = new FormData();
  fd.append('file', new Blob([fs.readFileSync(file)]), path.basename(file));
  const r = await fetch(BASE + '/api/v1/upload_file', { method: 'POST', headers: { 'x-api-key': key }, body: fd });
  const t = await r.text();
  if (!r.ok) throw new Error(`Görsel API yükleme ${r.status}: ${t.slice(0, 160)}`);
  const d = JSON.parse(t);
  const u = d.url || d.file_url || d.data?.url;
  if (!u) throw new Error('Görsel API yükleme URL vermedi');
  return u;
}

/** Görsel üretir ve `file` yoluna indirir. refUrl varsa referanslı (tutarlı karakter) düzenleme modeli kullanılır. */
export async function generateImage(key, { model, prompt, aspect = '16:9', refUrl, seed }, file) {
  if (process.env.MS_MOCK_IMAGE) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.copyFileSync(process.env.MS_MOCK_IMAGE, file); return 'mock'; } // yalnızca testler için
  const m = IMAGE_MODELS.find((x) => x.id === model) || IMAGE_MODELS[0];
  const payload = refUrl ? { prompt, aspect_ratio: aspect, image_url: refUrl, images_list: [refUrl] } : { prompt, aspect_ratio: aspect };
  if (!refUrl && m.size) {
    delete payload.aspect_ratio;
    const [w, h] = aspect === '9:16' ? [720, 1280] : aspect === '1:1' ? [1024, 1024] : [1280, 720];
    payload.width = w;
    payload.height = h;
    payload.num_images = 1;
  }
  if (seed && !refUrl) payload.seed = seed;
  const url = await submitAndWait(key, refUrl ? EDIT_MODEL : m.id, payload);
  await download(url, file);
  return url;
}
