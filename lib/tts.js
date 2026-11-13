import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { run, hasCommand, CACHE_DIR, hash, IS_WIN } from './util.js';

/**
 * Ses sağlayıcıları
 *  - edge       : Microsoft Edge neural sesleri (ücretsiz, 400+ ses, 140+ dil/aksan) — `pip install edge-tts`
 *  - elevenlabs : ElevenLabs (API anahtarı) — kendi ses kütüphanen + klon sesler
 *  - openai     : OpenAI TTS (API anahtarı)
 *  - none       : Sessiz (sadece müzik/altyazı) — süre metinden tahmin edilir
 */

// edge-tts kurulmadan önce de arayüzde gösterilecek geniş yedek liste
const EDGE_FALLBACK = `tr-TR-AhmetNeural M|tr-TR-EmelNeural F|en-US-AndrewMultilingualNeural M|en-US-AvaMultilingualNeural F|en-US-BrianMultilingualNeural M|en-US-EmmaMultilingualNeural F|en-US-AriaNeural F|en-US-GuyNeural M|en-US-JennyNeural F|en-US-ChristopherNeural M|en-US-EricNeural M|en-US-MichelleNeural F|en-US-RogerNeural M|en-US-SteffanNeural M|en-US-AndrewNeural M|en-US-AvaNeural F|en-US-BrianNeural M|en-US-EmmaNeural F|en-US-AnaNeural F|en-GB-SoniaNeural F|en-GB-RyanNeural M|en-GB-LibbyNeural F|en-GB-ThomasNeural M|en-GB-MaisieNeural F|en-AU-NatashaNeural F|en-AU-WilliamNeural M|en-CA-ClaraNeural F|en-CA-LiamNeural M|en-IN-NeerjaNeural F|en-IN-PrabhatNeural M|en-IE-ConnorNeural M|en-IE-EmilyNeural F|en-NZ-MitchellNeural M|en-NZ-MollyNeural F|en-ZA-LeahNeural F|en-ZA-LukeNeural M|de-DE-SeraphinaMultilingualNeural F|de-DE-FlorianMultilingualNeural M|de-DE-KatjaNeural F|de-DE-ConradNeural M|de-DE-AmalaNeural F|de-DE-KillianNeural M|de-AT-IngridNeural F|de-AT-JonasNeural M|de-CH-LeniNeural F|de-CH-JanNeural M|fr-FR-VivienneMultilingualNeural F|fr-FR-RemyMultilingualNeural M|fr-FR-DeniseNeural F|fr-FR-HenriNeural M|fr-FR-EloiseNeural F|fr-CA-SylvieNeural F|fr-CA-JeanNeural M|fr-CA-AntoineNeural M|es-ES-ElviraNeural F|es-ES-AlvaroNeural M|es-ES-XimenaNeural F|es-MX-DaliaNeural F|es-MX-JorgeNeural M|es-AR-ElenaNeural F|es-AR-TomasNeural M|es-CO-SalomeNeural F|es-CO-GonzaloNeural M|es-US-PalomaNeural F|es-US-AlonsoNeural M|it-IT-ElsaNeural F|it-IT-DiegoNeural M|it-IT-IsabellaNeural F|it-IT-GiuseppeMultilingualNeural M|pt-BR-FranciscaNeural F|pt-BR-AntonioNeural M|pt-BR-ThalitaMultilingualNeural F|pt-PT-RaquelNeural F|pt-PT-DuarteNeural M|ru-RU-SvetlanaNeural F|ru-RU-DmitryNeural M|uk-UA-PolinaNeural F|uk-UA-OstapNeural M|pl-PL-ZofiaNeural F|pl-PL-MarekNeural M|nl-NL-ColetteNeural F|nl-NL-FennaNeural F|nl-NL-MaartenNeural M|nl-BE-ArnaudNeural M|nl-BE-DenaNeural F|sv-SE-SofieNeural F|sv-SE-MattiasNeural M|nb-NO-PernilleNeural F|nb-NO-FinnNeural M|da-DK-ChristelNeural F|da-DK-JeppeNeural M|fi-FI-NooraNeural F|fi-FI-HarriNeural M|el-GR-AthinaNeural F|el-GR-NestorasNeural M|ro-RO-AlinaNeural F|ro-RO-EmilNeural M|cs-CZ-VlastaNeural F|cs-CZ-AntoninNeural M|hu-HU-NoemiNeural F|hu-HU-TamasNeural M|bg-BG-KalinaNeural F|bg-BG-BorislavNeural M|hr-HR-GabrijelaNeural F|hr-HR-SreckoNeural M|sr-RS-SophieNeural F|sr-RS-NicholasNeural M|az-AZ-BanuNeural F|az-AZ-BabekNeural M|kk-KZ-AigulNeural F|kk-KZ-DauletNeural M|uz-UZ-MadinaNeural F|uz-UZ-SardorNeural M|ar-SA-ZariyahNeural F|ar-SA-HamedNeural M|ar-EG-SalmaNeural F|ar-EG-ShakirNeural M|ar-AE-FatimaNeural F|ar-AE-HamdanNeural M|ar-MA-MounaNeural F|ar-MA-JamalNeural M|fa-IR-DilaraNeural F|fa-IR-FaridNeural M|he-IL-HilaNeural F|he-IL-AvriNeural M|hi-IN-SwaraNeural F|hi-IN-MadhurNeural M|ur-PK-UzmaNeural F|ur-PK-AsadNeural M|bn-BD-NabanitaNeural F|bn-BD-PradeepNeural M|ta-IN-PallaviNeural F|ta-IN-ValluvarNeural M|id-ID-GadisNeural F|id-ID-ArdiNeural M|ms-MY-YasminNeural F|ms-MY-OsmanNeural M|vi-VN-HoaiMyNeural F|vi-VN-NamMinhNeural M|th-TH-PremwadeeNeural F|th-TH-NiwatNeural M|fil-PH-BlessicaNeural F|fil-PH-AngeloNeural M|ja-JP-NanamiNeural F|ja-JP-KeitaNeural M|ko-KR-SunHiNeural F|ko-KR-InJoonNeural M|ko-KR-HyunsuMultilingualNeural M|zh-CN-XiaoxiaoNeural F|zh-CN-XiaoyiNeural F|zh-CN-YunxiNeural M|zh-CN-YunjianNeural M|zh-CN-YunyangNeural M|zh-CN-YunxiaNeural M|zh-TW-HsiaoChenNeural F|zh-TW-YunJheNeural M|zh-HK-HiuMaanNeural F|zh-HK-WanLungNeural M|sw-KE-ZuriNeural F|sw-KE-RafikiNeural M|af-ZA-AdriNeural F|af-ZA-WillemNeural M`
  .split('|')
  .map((s) => {
    const [name, g] = s.split(' ');
    return { id: name, name: prettyEdge(name), locale: name.split('-').slice(0, 2).join('-'), gender: g === 'F' ? 'Female' : 'Male', provider: 'edge' };
  });

function prettyEdge(id) {
  const parts = id.split('-');
  const loc = parts.slice(0, 2).join('-');
  const nm = parts.slice(2).join('-').replace('Neural', '').replace('Multilingual', ' (Çok dilli)');
  return `${nm} · ${loc}`;
}

let edgeCmd = null;
async function findEdge() {
  if (edgeCmd) return edgeCmd;
  const candidates = [
    ['edge-tts', []],
    [IS_WIN ? 'python' : 'python3', ['-m', 'edge_tts']],
    ['python', ['-m', 'edge_tts']],
    ['py', ['-m', 'edge_tts']],
  ];
  for (const [c, pre] of candidates) {
    const r = await hasCommand(c, [...pre, '--help']);
    if (r.ok) {
      edgeCmd = { c, pre };
      return edgeCmd;
    }
  }
  return null;
}

export async function ttsHealth(config) {
  const e = await findEdge();
  return {
    edge: { ok: !!e, version: e ? 'edge-tts kurulu' : 'pip install edge-tts' },
    elevenlabs: { ok: !!config.elevenKey, version: config.elevenKey ? 'anahtar var' : 'anahtar yok' },
    openai: { ok: !!config.openaiTtsKey || !!config.openaiKey, version: config.openaiTtsKey || config.openaiKey ? 'anahtar var' : 'anahtar yok' },
    none: { ok: true, version: 'sessiz' },
  };
}

let edgeVoiceCache = null;
export async function listVoices(provider, config) {
  if (provider === 'edge') {
    if (edgeVoiceCache) return edgeVoiceCache;
    const e = await findEdge();
    if (!e) return EDGE_FALLBACK;
    try {
      const r = await run(e.c, [...e.pre, '--list-voices'], { timeout: 60000 });
      const voices = parseEdgeList(r.stdout);
      if (voices.length) return (edgeVoiceCache = voices);
    } catch {}
    return EDGE_FALLBACK;
  }
  if (provider === 'elevenlabs') {
    if (!config.elevenKey) return [];
    const res = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': config.elevenKey } });
    const j = await res.json();
    return (j.voices || []).map((v) => ({
      id: v.voice_id,
      name: v.name + (v.labels?.accent ? ` · ${v.labels.accent}` : ''),
      locale: 'multi',
      gender: v.labels?.gender ? cap(v.labels.gender) : '',
      provider: 'elevenlabs',
    }));
  }
  if (provider === 'openai') {
    return ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer', 'verse'].map((v) => ({
      id: v,
      name: cap(v) + ' · çok dilli',
      locale: 'multi',
      gender: ['alloy', 'ash', 'echo', 'fable', 'onyx', 'verse', 'ballad'].includes(v) ? 'Male' : 'Female',
      provider: 'openai',
    }));
  }
  return [{ id: 'none', name: 'Sessiz', locale: 'multi', gender: '', provider: 'none' }];
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function parseEdgeList(out) {
  const voices = [];
  // Yeni format: tablo
  const lines = out.split('\n');
  if (lines.some((l) => /^Name\s+Gender/.test(l))) {
    for (const l of lines) {
      const m = l.match(/^([a-z]{2,3}-[A-Za-z0-9-]+Neural)\s+(Male|Female)/);
      if (m) voices.push({ id: m[1], name: prettyEdge(m[1]), locale: m[1].split('-').slice(0, 2).join('-'), gender: m[2], provider: 'edge' });
    }
    return voices;
  }
  // Eski format: "Name: xx\nGender: Female"
  const blocks = out.split(/\n\s*\n/);
  for (const b of blocks) {
    const n = b.match(/Name:\s*(\S+)/);
    const g = b.match(/Gender:\s*(\S+)/);
    if (n) voices.push({ id: n[1], name: prettyEdge(n[1]), locale: n[1].split('-').slice(0, 2).join('-'), gender: g ? g[1] : '', provider: 'edge' });
  }
  return voices;
}

/** Metni sese çevirir → mp3 Buffer. Önbellekli. */
export async function synthesize({ provider, voice, text, rate = 0, pitch = 0, config }) {
  const key = hash([provider, voice, rate, pitch, text].join('|'));
  const file = path.join(CACHE_DIR, `${key}.mp3`);
  if (fs.existsSync(file) && fs.statSync(file).size > 0) return fs.readFileSync(file);

  let buf;
  if (provider === 'edge') {
    const e = await findEdge();
    if (!e) throw new Error('Seslendirme modülü hazır değil. Kurulum için destek ekibiyle iletişime geç.');
    const tf = path.join(os.tmpdir(), `ms-tts-${key}.txt`);
    fs.writeFileSync(tf, text);
    const r = Number(rate) || 0;
    const p = Number(pitch) || 0;
    await run(e.c, [...e.pre, '--voice', voice, `--rate=${r >= 0 ? '+' : ''}${r}%`, `--pitch=${p >= 0 ? '+' : ''}${p}Hz`, '--file', tf, '--write-media', file], { timeout: 180000 });
    buf = fs.readFileSync(file);
  } else if (provider === 'elevenlabs') {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': config.elevenKey, 'content-type': 'application/json' },
      body: JSON.stringify({ text, model_id: config.elevenModel || 'eleven_multilingual_v2', voice_settings: { stability: 0.45, similarity_boost: 0.8, speed: 1 + (Number(rate) || 0) / 100 } }),
    });
    if (!res.ok) throw new Error('ElevenLabs: ' + (await res.text()).slice(0, 300));
    buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(file, buf);
  } else if (provider === 'openai') {
    const base = (config.openaiTtsBase || 'https://api.openai.com/v1').replace(/\/$/, '');
    const res = await fetch(base + '/audio/speech', {
      method: 'POST',
      headers: { authorization: `Bearer ${config.openaiTtsKey || config.openaiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: config.openaiTtsModel || 'gpt-4o-mini-tts', voice, input: text, response_format: 'mp3', speed: 1 + (Number(rate) || 0) / 100 }),
    });
    if (!res.ok) throw new Error('OpenAI TTS: ' + (await res.text()).slice(0, 300));
    buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(file, buf);
  } else {
    throw new Error('Sessiz modda TTS çağrılmaz');
  }
  return buf;
}
