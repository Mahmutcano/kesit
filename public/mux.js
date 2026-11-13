// Minimal MP4 (ISO BMFF) muxer — H.264 video + AAC veya Opus ses, faststart (moov başta).
// Harici bağımlılık yok. WebCodecs çıktılarını doğrudan dosyaya çevirir.

class W {
  constructor() {
    this.parts = [];
    this.len = 0;
  }
  u8(v) { this.bytes([v & 255]); }
  u16(v) { this.bytes([(v >> 8) & 255, v & 255]); }
  u24(v) { this.bytes([(v >> 16) & 255, (v >> 8) & 255, v & 255]); }
  u32(v) { this.bytes([(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255]); }
  u64(v) {
    const hi = Math.floor(v / 4294967296), lo = v >>> 0;
    this.u32(hi);
    this.u32(lo);
  }
  str(s) { this.bytes([...s].map((c) => c.charCodeAt(0))); }
  bytes(arr) {
    const u = arr instanceof Uint8Array ? arr : new Uint8Array(arr);
    this.parts.push(u);
    this.len += u.length;
  }
  zeros(n) { this.bytes(new Uint8Array(n)); }
  out() {
    const o = new Uint8Array(this.len);
    let p = 0;
    for (const x of this.parts) {
      o.set(x, p);
      p += x.length;
    }
    return o;
  }
}

function box(type, ...children) {
  const w = new W();
  const body = children.map((c) => (c instanceof Uint8Array ? c : c.out ? c.out() : new Uint8Array(c)));
  const size = 8 + body.reduce((a, b) => a + b.length, 0);
  w.u32(size);
  w.str(type);
  for (const b of body) w.bytes(b);
  return w.out();
}
function full(type, version, flags, fill) {
  const w = new W();
  w.u8(version);
  w.u24(flags);
  fill(w);
  return box(type, w.out());
}
const MATRIX = [0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000];

function runs(deltas) {
  const out = [];
  for (const d of deltas) {
    const last = out[out.length - 1];
    if (last && last[1] === d) last[0]++;
    else out.push([1, d]);
  }
  return out;
}

export class Mp4Muxer {
  /**
   * @param o { width, height, fps, audio: { codec: 'aac'|'opus', sampleRate, channels } | null }
   */
  constructor(o) {
    this.o = o;
    this.v = { samples: [], desc: null, timescale: 90000 };
    this.a = o.audio ? { samples: [], desc: null, timescale: o.audio.sampleRate } : null;
    this.data = []; // Uint8Array parçaları (mdat içeriği)
    this.dataLen = 0;
  }
  addVideoChunk(chunk, meta) {
    if (meta?.decoderConfig?.description && !this.v.desc) this.v.desc = new Uint8Array(toAB(meta.decoderConfig.description));
    const buf = new Uint8Array(chunk.byteLength);
    chunk.copyTo(buf);
    this.v.samples.push({ off: this.dataLen, size: buf.length, key: chunk.type === 'key', pts: chunk.timestamp });
    this.data.push(buf);
    this.dataLen += buf.length;
  }
  addAudioChunk(chunk, meta) {
    if (!this.a) return;
    if (meta?.decoderConfig?.description && !this.a.desc) this.a.desc = new Uint8Array(toAB(meta.decoderConfig.description));
    const buf = new Uint8Array(chunk.byteLength);
    chunk.copyTo(buf);
    const dur = chunk.duration ? Math.round((chunk.duration * this.a.timescale) / 1e6) : this.o.audio.codec === 'aac' ? 1024 : 960;
    this.a.samples.push({ off: this.dataLen, size: buf.length, dur });
    this.data.push(buf);
    this.dataLen += buf.length;
  }

  finalize() {
    const ftyp = box('ftyp', strBytes('isom'), u32b(512), strBytes('isom'), strBytes('iso2'), strBytes('avc1'), strBytes('mp41'));
    // moov boyutu offset'lere bağlı değil (co64 sabit boyutlu) → iki geçiş
    let moov = this.moov(0);
    const mdatHeader = 16; // 64-bit mdat
    const base = ftyp.length + moov.length + mdatHeader;
    moov = this.moov(base);
    const mh = new W();
    mh.u32(1);
    mh.str('mdat');
    mh.u64(this.dataLen + 16);
    return new Blob([ftyp, moov, mh.out(), ...this.data], { type: 'video/mp4' });
  }

  moov(base) {
    const { width, height, fps } = this.o;
    const vDelta = Math.round(this.v.timescale / fps);
    const vDur = this.v.samples.length * vDelta;
    const aDur = this.a ? this.a.samples.reduce((s, x) => s + x.dur, 0) : 0;
    const movieDur = Math.max((vDur / this.v.timescale) * 1000, this.a ? (aDur / this.a.timescale) * 1000 : 0);
    const mvhd = full('mvhd', 0, 0, (w) => {
      w.u32(0); w.u32(0); w.u32(1000); w.u32(Math.round(movieDur));
      w.u32(0x00010000); w.u16(0x0100); w.zeros(10);
      MATRIX.forEach((m) => w.u32(m));
      w.zeros(24);
      w.u32(this.a ? 3 : 2);
    });
    const traks = [this.videoTrak(base, vDelta, vDur)];
    if (this.a && this.a.samples.length) traks.push(this.audioTrak(base, aDur));
    return box('moov', mvhd, ...traks);
  }

  tkhd(id, durMs, isAudio, w, h) {
    return full('tkhd', 0, 3, (x) => {
      x.u32(0); x.u32(0); x.u32(id); x.u32(0); x.u32(Math.round(durMs));
      x.zeros(8); x.u16(0); x.u16(0); x.u16(isAudio ? 0x0100 : 0); x.u16(0);
      MATRIX.forEach((m) => x.u32(m));
      x.u32((w || 0) * 65536); x.u32((h || 0) * 65536);
    });
  }
  mdhd(ts, dur) {
    return full('mdhd', 0, 0, (x) => { x.u32(0); x.u32(0); x.u32(ts); x.u32(dur); x.u16(0x55c4); x.u16(0); });
  }
  hdlr(type, name) {
    return full('hdlr', 0, 0, (x) => { x.u32(0); x.str(type); x.zeros(12); x.str(name); x.u8(0); });
  }
  dinf() {
    return box('dinf', full('dref', 0, 0, (x) => { x.u32(1); x.bytes(full('url ', 0, 1, () => {})); }));
  }
  tables(samples, base, deltas) {
    const stts = full('stts', 0, 0, (x) => {
      const r = runs(deltas);
      x.u32(r.length);
      r.forEach(([n, d]) => { x.u32(n); x.u32(d); });
    });
    const stsc = full('stsc', 0, 0, (x) => { x.u32(1); x.u32(1); x.u32(1); x.u32(1); });
    const stsz = full('stsz', 0, 0, (x) => { x.u32(0); x.u32(samples.length); samples.forEach((s) => x.u32(s.size)); });
    const co64 = full('co64', 0, 0, (x) => { x.u32(samples.length); samples.forEach((s) => x.u64(base + s.off)); });
    return { stts, stsc, stsz, co64 };
  }

  videoTrak(base, delta, dur) {
    const { width, height } = this.o;
    const S = this.v.samples;
    if (!this.v.desc) throw new Error('H.264 decoder config (avcC) alınamadı');
    const avcC = box('avcC', this.v.desc);
    const se = new W();
    se.zeros(6); se.u16(1); se.u16(0); se.u16(0); se.zeros(12);
    se.u16(width); se.u16(height); se.u32(0x00480000); se.u32(0x00480000); se.u32(0); se.u16(1);
    se.zeros(32); se.u16(0x0018); se.u16(0xffff);
    se.bytes(avcC);
    const avc1 = box('avc1', se.out());
    const stsd = full('stsd', 0, 0, (x) => { x.u32(1); x.bytes(avc1); });
    const { stts, stsc, stsz, co64 } = this.tables(S, base, S.map(() => delta));
    const keys = S.map((s, i) => (s.key ? i + 1 : 0)).filter(Boolean);
    const stss = full('stss', 0, 0, (x) => { x.u32(keys.length); keys.forEach((k) => x.u32(k)); });
    // B-frame varsa ctts
    const extra = [];
    const ptsTicks = S.map((s) => Math.round((s.pts * this.v.timescale) / 1e6));
    const t0 = Math.min(...ptsTicks);
    let reorder = false;
    for (let i = 1; i < ptsTicks.length; i++) if (ptsTicks[i] < ptsTicks[i - 1]) reorder = true;
    if (reorder) {
      const offs = ptsTicks.map((p, i) => p - t0 - i * delta);
      const mn = Math.min(...offs);
      extra.push(full('ctts', 0, 0, (x) => {
        const r = runs(offs.map((o) => o - mn));
        x.u32(r.length);
        r.forEach(([n, d]) => { x.u32(n); x.u32(d); });
      }));
    }
    const stbl = box('stbl', stsd, stts, ...extra, stss, stsc, stsz, co64);
    const vmhd = full('vmhd', 0, 1, (x) => { x.u16(0); x.zeros(6); });
    const minf = box('minf', vmhd, this.dinf(), stbl);
    const mdia = box('mdia', this.mdhd(this.v.timescale, dur), this.hdlr('vide', 'VideoHandler'), minf);
    return box('trak', this.tkhd(1, (dur / this.v.timescale) * 1000, false, width, height), mdia);
  }

  audioTrak(base, dur) {
    const A = this.a;
    const ao = this.o.audio;
    let entry;
    const se = new W();
    se.zeros(6); se.u16(1); se.zeros(8); se.u16(ao.channels); se.u16(16); se.u16(0); se.u16(0); se.u32((ao.sampleRate & 0xffff) * 65536);
    if (ao.codec === 'aac') {
      const asc = A.desc || aacASC(ao.sampleRate, ao.channels);
      const dsi = desc(0x05, asc);
      const dcd = new W();
      dcd.u8(0x40); dcd.u8(0x15); dcd.u24(0); dcd.u32(ao.bitrate || 128000); dcd.u32(ao.bitrate || 128000); dcd.bytes(dsi);
      const es = new W();
      es.u16(1); es.u8(0); es.bytes(desc(0x04, dcd.out())); es.bytes(desc(0x06, [0x02]));
      const esds = full('esds', 0, 0, (x) => x.bytes(desc(0x03, es.out())));
      se.bytes(esds);
      entry = box('mp4a', se.out());
    } else {
      const dops = new W();
      dops.u8(0); dops.u8(ao.channels); dops.u16(312); dops.u32(ao.sampleRate); dops.u16(0); dops.u8(0);
      se.bytes(box('dOps', dops.out()));
      entry = box('Opus', se.out());
    }
    const stsd = full('stsd', 0, 0, (x) => { x.u32(1); x.bytes(entry); });
    const { stts, stsc, stsz, co64 } = this.tables(A.samples, base, A.samples.map((s) => s.dur));
    const stbl = box('stbl', stsd, stts, stsc, stsz, co64);
    const smhd = full('smhd', 0, 0, (x) => { x.u16(0); x.u16(0); });
    const minf = box('minf', smhd, this.dinf(), stbl);
    const mdia = box('mdia', this.mdhd(A.timescale, dur), this.hdlr('soun', 'SoundHandler'), minf);
    return box('trak', this.tkhd(2, (dur / A.timescale) * 1000, true), mdia);
  }
}

function desc(tag, payload) {
  const p = payload instanceof Uint8Array ? payload : new Uint8Array(payload);
  const w = new W();
  w.u8(tag);
  // 4 baytlık uzunluk kodlaması (her zaman geçerli)
  const n = p.length;
  w.bytes([0x80 | ((n >> 21) & 0x7f), 0x80 | ((n >> 14) & 0x7f), 0x80 | ((n >> 7) & 0x7f), n & 0x7f]);
  w.bytes(p);
  return w.out();
}
function aacASC(sr, ch) {
  const idx = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000].indexOf(sr);
  const i = idx < 0 ? 3 : idx;
  return new Uint8Array([(2 << 3) | (i >> 1), ((i & 1) << 7) | (ch << 3)]);
}
function toAB(d) {
  if (d instanceof ArrayBuffer) return d;
  return d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength);
}
function strBytes(s) {
  return new Uint8Array([...s].map((c) => c.charCodeAt(0)));
}
function u32b(v) {
  return new Uint8Array([(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255]);
}
