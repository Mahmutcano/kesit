// Ses miksajı + video dışa aktarma (WebCodecs → MP4; yoksa MediaRecorder gerçek zamanlı yedek)
import { renderFrame } from './engine.js';
import { Mp4Muxer } from './mux.js';

const SR = 48000;

// ---------------------------------------------------------------------------
// SES
// ---------------------------------------------------------------------------
const MUSIC = {
  ambient: { prog: [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 67]], wave: 'sine', bar: 4, gain: 0.05, arp: false },
  upbeat: { prog: [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]], wave: 'triangle', bar: 2, gain: 0.04, arp: true, bpm: 112 },
  dramatic: { prog: [[45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 58], [40, 47, 52, 56]], wave: 'sawtooth', bar: 4, gain: 0.025, arp: false, lp: 900 },
  lofi: { prog: [[62, 65, 69, 72], [55, 59, 62, 65], [60, 64, 67, 71], [57, 60, 64, 67]], wave: 'triangle', bar: 3, gain: 0.04, arp: true, bpm: 80, lp: 1600 },
  mystery: { prog: [[57, 60, 63], [56, 59, 63], [54, 57, 61], [53, 56, 60]], wave: 'sine', bar: 4, gain: 0.05, arp: true, bpm: 70 },
};
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

/**
 * @param tl          timeline
 * @param buffers     sahne idx → AudioBuffer
 * @param o           { music: 'none'|'ambient'|..|'custom', musicBuffer, musicVolume (0-1), sfx: bool, voiceVolume }
 */
export async function mixAudio(tl, buffers, o = {}) {
  const len = Math.ceil((tl.total + 0.3) * SR);
  const ctx = new OfflineAudioContext(2, len, SR);
  const master = ctx.createDynamicsCompressor();
  master.threshold.value = -14;
  master.ratio.value = 3;
  master.connect(ctx.destination);
  const voice = ctx.createGain();
  voice.gain.value = o.voiceVolume ?? 1;
  voice.connect(master);
  const musicBus = ctx.createGain();
  musicBus.gain.value = o.musicVolume ?? 0.5;
  musicBus.connect(master);

  for (const s of tl.scenes) {
    if (s.kind !== 'scene') continue;
    const b = buffers[s.idx];
    if (!b) continue;
    const src = ctx.createBufferSource();
    src.buffer = b;
    src.connect(voice);
    src.start(s.audioStart);
    // ducking: anlatım sırasında müziği kıs
    musicBus.gain.setTargetAtTime((o.musicVolume ?? 0.5) * 0.55, s.audioStart, 0.15);
    musicBus.gain.setTargetAtTime(o.musicVolume ?? 0.5, s.audioStart + s.audioDur, 0.3);
  }

  if (o.music === 'custom' && o.musicBuffer) {
    const src = ctx.createBufferSource();
    src.buffer = o.musicBuffer;
    src.loop = true;
    const g = ctx.createGain();
    g.gain.value = 0.35;
    g.gain.setValueAtTime(0.35, Math.max(0, tl.total - 2));
    g.gain.linearRampToValueAtTime(0, tl.total);
    src.connect(g).connect(musicBus);
    src.start(0);
  } else if (MUSIC[o.music]) {
    synthMusic(ctx, musicBus, MUSIC[o.music], tl.total);
  }

  if (o.sfx) {
    const noise = ctx.createBuffer(1, SR * 0.5, SR);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    tl.scenes.forEach((s, i) => {
      if (i === 0) return;
      const src = ctx.createBufferSource();
      src.buffer = noise;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = 0.8;
      f.frequency.setValueAtTime(400, s.start - 0.1);
      f.frequency.exponentialRampToValueAtTime(3000, s.start + 0.25);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, s.start - 0.12);
      g.gain.linearRampToValueAtTime(0.12, s.start + 0.05);
      g.gain.linearRampToValueAtTime(0, s.start + 0.32);
      src.connect(f).connect(g).connect(master);
      src.start(Math.max(0, s.start - 0.12));
      src.stop(s.start + 0.4);
      if (s.keyword) {
        const o2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        o2.frequency.setValueAtTime(880, s.start + 0.2);
        o2.frequency.exponentialRampToValueAtTime(1500, s.start + 0.28);
        g2.gain.setValueAtTime(0, s.start + 0.2);
        g2.gain.linearRampToValueAtTime(0.06, s.start + 0.22);
        g2.gain.exponentialRampToValueAtTime(0.0001, s.start + 0.33);
        o2.connect(g2).connect(master);
        o2.start(s.start + 0.2);
        o2.stop(s.start + 0.35);
      }
    });
  }
  return ctx.startRendering();
}

function synthMusic(ctx, out, m, total) {
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = m.lp || 2400;
  lp.connect(out);
  const barLen = m.bar;
  let t = 0, ci = 0;
  while (t < total) {
    const chord = m.prog[ci % m.prog.length];
    for (const n of chord) {
      const o = ctx.createOscillator();
      o.type = m.wave;
      o.frequency.value = midi(n - 12);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(m.gain, t + Math.min(1.2, barLen * 0.3));
      g.gain.setValueAtTime(m.gain, t + barLen - 0.4);
      g.gain.linearRampToValueAtTime(0, t + barLen + 0.3);
      o.connect(g).connect(lp);
      o.start(t);
      o.stop(t + barLen + 0.35);
    }
    if (m.arp) {
      const step = 60 / (m.bpm || 100) / 2;
      let k = 0;
      for (let at = t; at < t + barLen - 0.01 && at < total; at += step, k++) {
        const n = chord[k % chord.length] + (k % 8 >= 4 ? 12 : 0);
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = midi(n);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, at);
        g.gain.linearRampToValueAtTime(m.gain * 0.7, at + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, at + step * 1.6);
        o.connect(g).connect(lp);
        o.start(at);
        o.stop(at + step * 1.7);
      }
    }
    t += barLen;
    ci++;
  }
}

// ---------------------------------------------------------------------------
// VİDEO
// ---------------------------------------------------------------------------
async function pickVideoCodec(W, H, fps, bitrate) {
  const cands = ['avc1.640028', 'avc1.4d0028', 'avc1.42002a', 'avc1.640033', 'avc1.42001f'];
  for (const hw of ['prefer-hardware', 'no-preference', 'prefer-software']) {
    for (const codec of cands) {
      const cfg = { codec, width: W, height: H, bitrate, framerate: fps, latencyMode: 'realtime', avc: { format: 'avc' }, hardwareAcceleration: hw };
      try {
        const r = await VideoEncoder.isConfigSupported(cfg);
        if (r.supported) return r.config;
      } catch {}
    }
  }
  return null;
}
async function pickAudioCodec(channels) {
  for (const [codec, name] of [['mp4a.40.2', 'aac'], ['opus', 'opus']]) {
    const cfg = { codec, sampleRate: SR, numberOfChannels: channels, bitrate: 160000 };
    try {
      const r = await AudioEncoder.isConfigSupported(cfg);
      if (r.supported) return { cfg: r.config, name };
    } catch {}
  }
  return null;
}

export function webCodecsAvailable() {
  return typeof VideoEncoder !== 'undefined' && typeof AudioEncoder !== 'undefined' && typeof VideoFrame !== 'undefined';
}

/**
 * Hızlı (gerçek zamandan hızlı) MP4 dışa aktarma.
 * @returns {Promise<{blob, ext, mime}>}
 */
export async function exportVideo({ W, H, fps = 30, tl, cfg, audio, bitrate, onProgress, signal }) {
  bitrate = bitrate || (W * H >= 1920 * 1080 * 0.9 ? 6_000_000 : 3_000_000);
  if (webCodecsAvailable()) {
    const vcfg = await pickVideoCodec(W, H, fps, bitrate);
    const acfg = audio ? await pickAudioCodec(audio.numberOfChannels) : null;
    if (vcfg && (acfg || !audio)) return exportWebCodecs({ W, H, fps, tl, cfg, audio, vcfg, acfg, onProgress, signal });
  }
  return exportRealtime({ W, H, fps, tl, cfg, audio, bitrate, onProgress, signal });
}

async function exportWebCodecs({ W, H, fps, tl, cfg, audio, vcfg, acfg, onProgress, signal }) {
  const mux = new Mp4Muxer({ width: W, height: H, fps, audio: acfg ? { codec: acfg.name, sampleRate: SR, channels: audio.numberOfChannels, bitrate: 160000 } : null });
  let err = null;
  const venc = new VideoEncoder({ output: (c, m) => mux.addVideoChunk(c, m), error: (e) => (err = e) });
  venc.configure(vcfg);

  const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(W, H) : Object.assign(document.createElement('canvas'), { width: W, height: H });
  const ctx = canvas.getContext('2d', { alpha: false });
  const frames = Math.ceil(tl.total * fps);
  const dur = 1e6 / fps;
  const t0 = performance.now();
  for (let i = 0; i < frames; i++) {
    if (signal?.aborted) throw new Error('İptal edildi');
    if (err) throw err;
    if (cfg.prepare) await cfg.prepare(i / fps);
    renderFrame(ctx, W, H, tl, i / fps, cfg);
    const vf = new VideoFrame(canvas, { timestamp: Math.round(i * dur), duration: Math.round(dur) });
    venc.encode(vf, { keyFrame: i % (fps * 2) === 0 });
    vf.close();
    while (venc.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 1));
    if (i % 15 === 0) {
      onProgress?.(i / frames, { fps: i / ((performance.now() - t0) / 1000) });
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  await venc.flush();
  venc.close();

  if (acfg) {
    const aenc = new AudioEncoder({ output: (c, m) => mux.addAudioChunk(c, m), error: (e) => (err = e) });
    aenc.configure(acfg.cfg);
    const ch = audio.numberOfChannels;
    const total = Math.min(audio.length, Math.ceil(tl.total * SR));
    const block = 4800;
    for (let off = 0; off < total; off += block) {
      const n = Math.min(block, total - off);
      const data = new Float32Array(n * ch);
      for (let c = 0; c < ch; c++) data.set(audio.getChannelData(c).subarray(off, off + n), c * n);
      const ad = new AudioData({ format: 'f32-planar', sampleRate: SR, numberOfFrames: n, numberOfChannels: ch, timestamp: Math.round((off / SR) * 1e6), data });
      aenc.encode(ad);
      ad.close();
      if (aenc.encodeQueueSize > 20) await new Promise((r) => setTimeout(r, 1));
    }
    await aenc.flush();
    aenc.close();
  }
  if (err) throw err;
  onProgress?.(1, {});
  return { blob: mux.finalize(), ext: 'mp4', mime: 'video/mp4', method: 'webcodecs' };
}

/** Yedek: MediaRecorder ile gerçek zamanlı kayıt (video süresi kadar sürer) */
async function exportRealtime({ W, H, fps, tl, cfg, audio, bitrate, onProgress, signal }) {
  const canvas = Object.assign(document.createElement('canvas'), { width: W, height: H });
  const ctx = canvas.getContext('2d', { alpha: false });
  const actx = new AudioContext({ sampleRate: SR });
  const dest = actx.createMediaStreamDestination();
  const stream = canvas.captureStream(fps);
  if (audio) dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
  const types = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];
  const mime = types.find((t) => MediaRecorder.isTypeSupported(t)) || 'video/webm';
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bitrate, audioBitsPerSecond: 160000 });
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  renderFrame(ctx, W, H, tl, 0, cfg);
  rec.start(1000);
  const startAt = actx.currentTime + 0.15;
  if (audio) {
    const src = actx.createBufferSource();
    src.buffer = audio;
    src.connect(dest);
    src.start(startAt);
  }
  await new Promise((resolve, reject) => {
    const tick = () => {
      if (signal?.aborted) return reject(new Error('İptal edildi'));
      const t = actx.currentTime - startAt;
      renderFrame(ctx, W, H, tl, Math.max(0, t), cfg);
      onProgress?.(Math.max(0, t) / tl.total, { realtime: true });
      if (t >= tl.total) return resolve();
      requestAnimationFrame(tick);
    };
    tick();
  });
  await new Promise((r) => {
    rec.onstop = r;
    rec.stop();
  });
  actx.close();
  const ext = mime.includes('mp4') ? 'mp4' : 'webm';
  return { blob: new Blob(chunks, { type: mime.split(';')[0] }), ext, mime: mime.split(';')[0], method: 'mediarecorder' };
}

/** Sessiz modda anlatım süresi tahmini */
export function estimateDuration(text, lang) {
  const cjk = ['ja', 'zh', 'ko', 'th'].includes(lang);
  if (cjk) return Math.max(1.2, [...text].length / 5.2);
  return Math.max(1.2, text.split(/\s+/).length / 2.4);
}
