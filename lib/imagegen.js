// Film görselleri için kaynaklar:
//  pollinations : ücretsiz, anahtarsız (Flux) — varsayılan
//  gemini       : Google AI Studio ücretsiz anahtarı (gemini-2.5-flash-image, referans görsel destekler)
//  svg          : bilgisayarındaki yapay zeka (Claude Code / Gemini aboneliği) vektör çizim yapar — görsel anahtarı gerekmez
//  muapi        : kredili bulut (en sinematik)
import fs from 'node:fs';
import path from 'node:path';
import * as muapi from './muapi.js';
import { complete } from './llm.js';

export const SOURCES = [
  { id: 'pollinations', name: 'Ücretsiz Flux (anahtarsız)', note: 'Pollinations · yavaş olabilir', needs: null },
  { id: 'gemini', name: 'Gemini görsel (ücretsiz anahtar)', note: 'Google AI Studio · karakter tutarlılığı iyi', needs: 'geminiKey' },
  { id: 'svg', name: 'Yapay zeka çizimi (token)', note: 'Claude/Gemini aboneliğin · basit vektör', needs: null },
  { id: 'muapi', name: 'Bulut görsel API (kredili)', note: 'en sinematik', needs: 'muapiKey' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const POLL = () => process.env.MS_POLL_BASE || 'https://image.pollinations.ai';
const GEM = () => process.env.MS_GEMINI_BASE || 'https://generativelanguage.googleapis.com';

async function pollinations({ prompt, aspect, seed }, file) {
  const [w, h] = aspect === '9:16' ? [720, 1280] : aspect === '1:1' ? [1024, 1024] : [1280, 720];
  const u = `${POLL()}/prompt/${encodeURIComponent(prompt.slice(0, 1400))}?width=${w}&height=${h}&model=flux&nologo=true&private=true&enhance=false${seed ? '&seed=' + seed : ''}`;
  const r = await fetch(u);
  if (r.status === 429) throw new Error('Pollinations yoğun (429), bekleyip tekrar denenecek');
  const buf = Buffer.from(await r.arrayBuffer());
  if (!r.ok || buf.length < 2000 || !/image/.test(r.headers.get('content-type') || 'image')) throw new Error('Pollinations görsel vermedi (' + r.status + ')');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
}

async function gemini(key, { prompt, aspect, refFile }, file) {
  const parts = [{ text: prompt + ` Widescreen ${aspect} composition.` }];
  if (refFile && fs.existsSync(refFile)) parts.push({ inline_data: { mime_type: 'image/jpeg', data: fs.readFileSync(refFile).toString('base64') } });
  const url = `${GEM()}/v1beta/models/gemini-2.5-flash-image:generateContent?key=${encodeURIComponent(key)}`;
  const body = (cfg) => JSON.stringify({ contents: [{ parts }], generationConfig: cfg });
  let r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: body({ responseModalities: ['IMAGE'], imageConfig: { aspectRatio: aspect } }) });
  if (r.status === 400) r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: body({ responseModalities: ['IMAGE', 'TEXT'] }) });
  const t = await r.text();
  if (r.status === 429) throw new Error('Gemini günlük/dakikalık ücretsiz sınırına ulaştı (429)');
  if (r.status === 403 || r.status === 401) throw new Error('Gemini anahtarı geçersiz (Ayarlar → Gemini API key).');
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${t.slice(0, 160)}`);
  const d = JSON.parse(t);
  const part = d.candidates?.[0]?.content?.parts?.find((p) => (p.inlineData || p.inline_data)?.data);
  const data = (part?.inlineData || part?.inline_data)?.data;
  if (!data) throw new Error('Gemini görsel döndürmedi (içerik filtresi olabilir)');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(data, 'base64'));
}

async function svg({ prompt, aspect, provider, model, config, character }, file) {
  const [w, h] = aspect === '9:16' ? [720, 1280] : aspect === '1:1' ? [1024, 1024] : [1280, 720];
  const q = `Draw this scene as a single cinematic flat-vector SVG illustration.
SCENE: ${prompt}
Rules: viewBox="0 0 ${w} ${h}" width="${w}" height="${h}". Layered background (gradient sky/room, simple depth, a few silhouettes), bold simple shapes, limited cohesive palette. KEEP IT COMPACT: under 2500 characters, at most ~25 shapes, one or two gradients — it must be written fast. Characters: simple round-headed figures with expressive faces${character ? ` (${character})` : ''}. No <text>, no external images or fonts, no scripts. Output ONLY the raw <svg>…</svg> markup, nothing else.`;
  const out = await complete(provider, q, { model, config });
  const m = out.match(/<svg[\s\S]*<\/svg>/i);
  if (!m) throw new Error('Yapay zeka geçerli SVG döndürmedi');
  let s = m[0];
  if (!/\swidth=/.test(s.split('>')[0])) s = s.replace(/<svg/i, `<svg width="${w}" height="${h}"`);
  if (!/xmlns=/.test(s.split('>')[0])) s = s.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, s);
}

export const extOf = (source) => (source === 'svg' ? '.svg' : '.jpg');

/** → dosya yazar. opts: { source, prompt, aspect, seed, refFile, refUrl, model, provider, config, character } */
export async function makeImage(opts, file) {
  const { source = 'pollinations', config = {} } = opts;
  if (process.env.MS_MOCK_IMAGE) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.copyFileSync(process.env.MS_MOCK_IMAGE, file); return; }
  switch (source) {
    case 'pollinations': return pollinations(opts, file);
    case 'gemini':
      if (!config.geminiKey) throw new Error('Gemini anahtarı yok: Ayarlar → Gemini API key (aistudio.google.com, ücretsiz)');
      return gemini(config.geminiKey, opts, file);
    case 'svg': return svg(opts, file);
    case 'muapi':
      if (!config.muapiKey) throw new Error('Görsel API anahtarı yok: Ayarlar → Görsel');
      return muapi.generateImage(config.muapiKey, { model: opts.model, prompt: opts.prompt, aspect: opts.aspect, refUrl: opts.refUrl, seed: opts.seed }, file);
    default: throw new Error('Bilinmeyen görsel kaynağı');
  }
}
