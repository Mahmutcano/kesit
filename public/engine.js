// Stickman Motion Engine — deterministik: renderFrame(t) her zaman aynı kareyi üretir (export için şart)
import { drawIcon } from './icons.js';
import { withAlpha } from './themes.js';
import { COSTUMES, SKINS, GROUND_ITEMS } from './costumes.js';

const D = Math.PI / 180;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const easeOut = (k) => 1 - Math.pow(1 - clamp(k), 3);
const easeInOut = (k) => (k = clamp(k), k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeBack = (k) => {
  k = clamp(k);
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
};
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const noise = (i, j) => {
  const x = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ---------------------------------------------------------------------------
// GÖRSEL STİLLER — her skill bir stile bağlıdır; stil yerleşimi, giriş animasyonlarını,
// arka plan efektini, yazı tipini ve geçişleri kökten değiştirir.
// ---------------------------------------------------------------------------
export const STYLES = {
  classic: { name: 'Klasik Stickman', desc: 'Yanında ikonlar ve anahtar kelimeyle anlatan çöp adam', layout: 'side', reveal: 'pop', bgfx: 'none', text: 'keyword', theme: 'classic', transitions: ['fade', 'slide', 'zoom'] },
  whiteboard: { name: 'Beyaz Tahta', desc: 'Her şey kalemle çizilerek belirir, el yazısı başlıklar', layout: 'side', reveal: 'draw', bgfx: 'none', text: 'handwrite', plainBg: true, still: true, theme: 'whiteboard', transitions: ['wipe', 'fade'] },
  chalk: { name: 'Kara Tahta', desc: 'Tebeşirle çizilen ders anlatımı', layout: 'side', reveal: 'draw', bgfx: 'none', text: 'handwrite', plainBg: true, still: true, theme: 'chalk', transitions: ['fade', 'wipe'] },
  kinetic: { name: 'Kinetik Yazı', desc: 'Kelimeler dev puntolarla ekrana vurur, renk blokları değişir', layout: 'type', reveal: 'slam', bgfx: 'blocks', text: 'kinetic', theme: 'neon', transitions: ['cut', 'push', 'flash'] },
  collage: { name: 'Kağıt Kolaj', desc: 'Kağıt kartlar, bant, fosforlu kalem — belgesel havası', layout: 'side', reveal: 'drop', bgfx: 'halftone', text: 'marker', cards: true, theme: 'history', transitions: ['slide', 'push'] },
  shorts: { name: 'Shorts Enerjisi', desc: 'Hızlı kesmeler, dev yazılar, dönen ışın arka planı', layout: 'side', reveal: 'slam', bgfx: 'burst', text: 'punch', theme: 'sunset', transitions: ['zoom', 'flash', 'cut', 'push'] },
  film: { name: 'Film (görsel)', desc: 'Yapay zeka görselleri + sinema kamerası', photo: true, layout: 'center', reveal: 'fade', bgfx: 'none', text: 'none', theme: 'cozy', transitions: ['fade'] },
  cinema: { name: 'Sinematik Hikaye', desc: 'Sinema şeridi, ortada karakter, yazısız sakin anlatım', layout: 'center', reveal: 'fade', bgfx: 'none', text: 'none', letterbox: true, theme: 'cozy', transitions: ['fade'] },
  infographic: { name: 'İnfografik', desc: 'Numaralı etiketler, kart paneli, hareketli geometrik arka plan', layout: 'split', reveal: 'slide', bgfx: 'shapes', text: 'label', cards: true, theme: 'blueprint', transitions: ['wipe', 'slide', 'push'] },
  comic: { name: 'Çizgi Roman', desc: 'Panel çerçevesi, konuşma balonu, noktalı baskı', layout: 'side', reveal: 'slam', bgfx: 'halftone', text: 'bubble', panel: true, still: true, theme: 'pop', transitions: ['cut', 'slide', 'flash'] },
  toon: { name: 'Çizgi Film', desc: 'Giyimli karakterler, dolu renkli manzaralar, bayraklar ve hayvanlar', layout: 'side', reveal: 'pop', bgfx: 'none', text: 'keyword', toon: true, theme: 'classic', transitions: ['fade', 'slide', 'cut'] },
  moody: { name: 'Karanlık Sinema', desc: 'Solgun yuvarlak kafalı karakter, karanlık odalar, ışık ve gölge, dev beyaz yazılar', layout: 'side', reveal: 'pop', bgfx: 'none', text: 'punch', toon: true, moody: true, theme: 'moody', transitions: ['fade', 'cut', 'fade'] },
  pixel: { name: '8-bit Oyun', desc: 'Piksel piksel görüntü, can ve seviye göstergesi', layout: 'side', reveal: 'pop', bgfx: 'none', text: 'keyword', pixel: 5, hud: true, theme: 'pixel', transitions: ['cut', 'flash'] },
};

const easeBounce = (k) => {
  k = clamp(k);
  const n = 7.5625, d = 2.75;
  if (k < 1 / d) return n * k * k;
  if (k < 2 / d) return n * (k -= 1.5 / d) * k + 0.75;
  if (k < 2.5 / d) return n * (k -= 2.25 / d) * k + 0.9375;
  return n * (k -= 2.625 / d) * k + 0.984375;
};
/** Video tohumu + sahne sırasına göre deterministik seçim (her videoda farklı, aynı videoda sabit) */
function variant(cfg, scene, salt, n) {
  return Math.floor(noise((cfg.seed || 1) * 0.137 + (scene.idx || 0) * 1.71, salt * 3.3) * n) % n;
}
function sceneTheme(th, st, scene) {
  if (st.bgfx !== 'blocks') return th;
  const pal = [th.accent, th.bg, th.accent2, th.stroke];
  const c = pal[(scene.idx || 0) % pal.length];
  const dark = luminanceHex(c) < 0.5;
  const ink = dark ? '#FFFFFF' : '#111111';
  return { ...th, bg: c, bg2: c, stroke: ink, text: ink, dark, accent: c === th.accent ? (dark ? '#FFD54A' : '#E5484D') : th.accent, accent2: c === th.accent2 ? th.accent : th.accent2 };
}


// ---------------------------------------------------------------------------
// ZAMAN ÇİZELGESİ
// ---------------------------------------------------------------------------
const OUTRO_TEXT = { tr: 'Abone ol!', en: 'Subscribe!', de: 'Abonnieren!', fr: 'Abonne-toi !', es: '¡Suscríbete!', it: 'Iscriviti!', pt: 'Inscreva-se!', ru: 'Подпишись!', ar: 'اشترك!', az: 'Abunə ol!', nl: 'Abonneer!', pl: 'Subskrybuj!', uk: 'Підпишись!', ja: 'チャンネル登録!', ko: '구독하기!', zh: '订阅!', hi: 'सब्सक्राइब करें!', id: 'Subscribe!', fa: 'سابسکرایب!', el: 'Εγγραφείτε!', sv: 'Prenumerera!', ro: 'Abonează-te!', vi: 'Đăng ký!', th: 'กดติดตาม!' };

/**
 * @param plan       normalize edilmiş plan
 * @param durations  her sahnenin ses süresi (sn) — sessiz modda tahmin
 * @param o          { intro, outro, language, aspect }
 */
export function buildTimeline(plan, durations, o = {}) {
  const PAD = 0.45; // sahne sonu nefes payı
  const scenes = [];
  let t = 0;
  if (o.intro) {
    scenes.push({ kind: 'intro', cast: plan.scenes[0]?.cast, flags: plan.scenes[0]?.flags, narration: '', action: 'wave', emotion: 'happy', props: plan.thumbnail?.props || [], keyword: plan.title, camera: 'zoom-in', bg: plan.scenes[0]?.bg || 'plain', characters: 1, start: 0, dur: 2.6, audioStart: 0, audioDur: 0 });
    t = 2.6;
  }
  plan.scenes.forEach((s, i) => {
    const ad = Math.max(0.6, durations[i] || 2);
    const dur = ad + PAD + (i === 0 ? 0.15 : 0);
    scenes.push({ ...s, kind: 'scene', idx: i, start: t, dur, audioStart: t + (i === 0 ? 0.15 : 0.08), audioDur: ad });
    t += dur;
  });
  if (o.outro) {
    scenes.push({ kind: 'outro', cast: plan.scenes[0]?.cast, narration: '', action: 'wave', emotion: 'happy', props: ['thumbs-up', 'bell'], keyword: OUTRO_TEXT[o.language] || OUTRO_TEXT.en, camera: 'static', bg: 'plain', characters: 1, start: t, dur: 3, audioStart: t, audioDur: 0 });
    t += 3;
  }
  const cues = [];
  for (const s of scenes) if (s.kind === 'scene') cues.push(...makeCues(s, o.aspect));
  return { scenes, total: t, cues };
}

/** Altyazı parçaları: süre karakter uzunluğuna orantılı dağıtılır, kelime zamanları karaoke için */
function makeCues(s, aspect) {
  const words = s.narration.split(/\s+/).filter(Boolean);
  const cjk = /[぀-ヿ一-鿿가-힯]/.test(s.narration) && words.length < 3;
  const maxW = aspect === '9:16' ? 4 : aspect === '1:1' ? 5 : 7;
  const chunks = [];
  if (cjk) {
    const chars = [...s.narration];
    for (let i = 0; i < chars.length; i += 14) chunks.push([chars.slice(i, i + 14).join('')]);
  } else {
    let cur = [];
    for (const w of words) {
      cur.push(w);
      if (cur.length >= maxW || (/[.,!?;:…]$/.test(w) && cur.length >= 2)) {
        chunks.push(cur);
        cur = [];
      }
    }
    if (cur.length) {
      if (cur.length <= 1 && chunks.length) chunks[chunks.length - 1].push(...cur);
      else chunks.push(cur);
    }
  }
  const weight = (w) => w.length + 2 + (/[.,!?;:…]$/.test(w) ? 4 : 0);
  const totalW = chunks.flat().reduce((a, w) => a + weight(w), 0) || 1;
  let t = s.audioStart;
  return chunks.map((ws) => {
    const wt = ws.map((w) => (weight(w) / totalW) * s.audioDur);
    const start = t;
    const wordTimes = [];
    for (let i = 0; i < ws.length; i++) {
      wordTimes.push([t, t + wt[i]]);
      t += wt[i];
    }
    return { start, end: t, words: ws, wordTimes, text: ws.join(cjk ? '' : ' ') };
  });
}

export function toSRT(cues) {
  const f = (s) => {
    const ms = Math.round(s * 1000);
    const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
    const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
    const se = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
    return `${h}:${m}:${se},${String(ms % 1000).padStart(3, '0')}`;
  };
  return cues.map((c, i) => `${i + 1}\n${f(c.start)} --> ${f(c.end)}\n${c.text}\n`).join('\n');
}

// ---------------------------------------------------------------------------
// POZLAR
// ---------------------------------------------------------------------------
// Açılar derece; 0 = dümdüz aşağı, + = karakterin baktığı yöne doğru. A2/L2 bir önceki parçaya göre.
const BASE = { x: 0, y: 0, lean: 0, head: 0, lA1: -14, lA2: -6, rA1: 14, rA2: 6, lL1: -7, lL2: 0, rL1: 7, rL2: 0, rot: 0, hipH: null, look: 0, shake: 0 };
const P = (o) => ({ ...BASE, ...o });
const mix = (a, b, k) => {
  const r = {};
  for (const key in a) r[key] = typeof a[key] === 'number' && typeof b[key] === 'number' ? lerp(a[key], b[key], k) : k < 0.5 ? a[key] : b[key];
  return r;
};
const S = Math.sin, C = Math.cos;

function walkLegs(ph, amp = 28) {
  return {
    lL1: S(ph) * amp,
    lL2: -Math.max(0, S(ph + 1.7)) * amp * 1.4,
    rL1: S(ph + Math.PI) * amp,
    rL2: -Math.max(0, S(ph + Math.PI + 1.7)) * amp * 1.4,
  };
}

/** aksiyon + yerel zaman → poz + ekstra çizimler */
function poseFor(action, lt, dur, seed) {
  const p = lt / Math.max(0.01, dur);
  const intro = easeOut(lt / 0.35);
  const ex = {};
  let pose;
  switch (action) {
    case 'idle':
      pose = P({ lA1: -14 + S(lt * 2) * 2, rA1: 14 - S(lt * 2) * 2, head: S(lt * 1.3) * 3, y: S(lt * 2) * 0.01 });
      break;
    case 'talk':
      pose = P({ rA1: 35 + S(lt * 4.6 + seed) * 22, rA2: 55 + S(lt * 5.3 + 1) * 28, lA1: -22 - S(lt * 3.1 + seed) * 14, lA2: -35 - S(lt * 3.7) * 15, head: S(lt * 5.5) * 4, lean: S(lt * 1.7) * 2.5 });
      break;
    case 'walk':
    case 'run': {
      const run = action === 'run';
      const ph = lt * (run ? 11 : 6.5);
      pose = P({
        ...walkLegs(ph, run ? 48 : 28),
        lA1: -S(ph) * (run ? 55 : 24) + (run ? 10 : 0), lA2: run ? 85 : 18,
        rA1: S(ph) * (run ? 55 : 24) + (run ? 10 : 0), rA2: run ? 85 : 18,
        lean: run ? 16 : 4, y: Math.abs(S(ph)) * (run ? 0.14 : 0.04),
        x: lerp(run ? -1.8 : -1.1, run ? 1.8 : 1.1, p),
      });
      if (run) ex.speedLines = true;
      break;
    }
    case 'point':
      pose = mix(BASE, P({ rA1: 95 + S(lt * 2) * 3, rA2: -4, lA1: -38, lA2: 115, lean: 3, head: -3 }), intro);
      break;
    case 'present':
      pose = mix(BASE, P({ rA1: 122 + S(lt * 2.2) * 6, rA2: -8, lA1: -22, lA2: -20 + S(lt * 3) * 10, head: -5, lean: -2 }), intro);
      ex.board = true;
      break;
    case 'write':
      pose = mix(BASE, P({ rA1: 112 + S(lt * 7) * 9, rA2: -18 + C(lt * 7) * 14, lA1: -12, lA2: -8, head: -8, lean: 4, x: -0.35 }), intro);
      ex.board = true;
      ex.writing = true;
      break;
    case 'think':
      pose = mix(BASE, P({ rA1: 18, rA2: 148, lA1: -8, lA2: 98, head: 9 + S(lt * 1.2) * 4, look: -1 }), intro);
      ex.thought = true;
      break;
    case 'idea': {
      const k = clamp((lt - dur * 0.35) / 0.25);
      const think = P({ rA1: 18, rA2: 148, lA1: -8, lA2: 98, head: 9, look: -1 });
      const eureka = P({ rA1: 168, rA2: -4, lA1: -40, lA2: -50, head: -6, y: k < 1 ? S(k * Math.PI) * 0.25 : 0 });
      pose = mix(mix(BASE, think, intro), eureka, easeBack(k));
      ex.ideaK = k;
      break;
    }
    case 'celebrate': {
      const j = Math.max(0, S(lt * 7.5));
      pose = P({ lA1: -150 + S(lt * 15) * 10, lA2: -12, rA1: 150 - S(lt * 15) * 10, rA2: 12, y: j * 0.38, lL1: -12 - j * 10, lL2: j * 25, rL1: 12 + j * 10, rL2: -j * 25 });
      ex.confetti = true;
      break;
    }
    case 'sad':
      pose = mix(BASE, P({ lean: 14, head: 24, lA1: -4, lA2: 0, rA1: 4, rA2: 0, y: -0.03 + S(lt * 1.2) * 0.01, look: 1 }), intro);
      ex.rainCloud = true;
      break;
    case 'cry': {
      const wipe = S(lt * 2.5) > 0.3;
      pose = mix(BASE, P({ lean: 10, head: 18, rA1: wipe ? 25 : 6, rA2: wipe ? 150 : 0, lA1: -6, look: 1, shake: 0.004 }), intro);
      ex.tears = true;
      break;
    }
    case 'angry': {
      const st = S(lt * 9);
      pose = P({ lA1: -38, lA2: -95, rA1: 38, rA2: 95, lean: 8, head: 4, shake: 0.012, lL1: -7 + Math.max(0, st) * 18, lL2: -Math.max(0, st) * 30, rL1: 7 });
      ex.steam = true;
      break;
    }
    case 'scared':
      pose = mix(BASE, P({ lA1: -150, lA2: 40, rA1: 150, rA2: -40, lean: -12, lL1: -18, lL2: 22, rL1: 18, rL2: -22, y: -0.05, shake: 0.016 }), intro);
      ex.sweat = true;
      break;
    case 'surprised': {
      const j = clamp(lt / 0.5);
      pose = P({ lA1: -125, lA2: -25, rA1: 125, rA2: 25, lean: -12, x: -0.35 * easeOut(j), y: S(j * Math.PI) * 0.3, head: -6 });
      ex.exclaim = true;
      break;
    }
    case 'shrug': {
      const k = 0.5 + 0.5 * S(lt * 2.5);
      pose = P({ lA1: -48, lA2: -85, rA1: 48, rA2: 85, y: k * 0.03, head: S(lt * 2.5) * 10 });
      break;
    }
    case 'wave':
      pose = mix(BASE, P({ rA1: 150, rA2: 15 + S(lt * 11) * 28, lA1: -14, head: -4 }), intro);
      break;
    case 'jump': {
      const ph = (lt % 1.3) / 1.3;
      const crouch = ph < 0.3 ? S((ph / 0.3) * Math.PI) : 0;
      const air = ph >= 0.3 && ph < 0.8 ? S(((ph - 0.3) / 0.5) * Math.PI) : 0;
      pose = P({ lL1: 40 * crouch - 8, lL2: -80 * crouch, rL1: 40 * crouch + 8, rL2: -80 * crouch, y: air * 0.55, lA1: -40 - air * 110, rA1: 40 + air * 110, lean: crouch * 15 });
      break;
    }
    case 'sit':
    case 'sleep':
    case 'type': {
      const sleep = action === 'sleep';
      const ty = action === 'type';
      pose = P({ hipH: 0.78, lL1: 86, lL2: -86, rL1: 80, rL2: -80, lA1: ty ? 70 + S(lt * 18) * 3 : 48, lA2: ty ? 25 : 30, rA1: ty ? 75 + S(lt * 16 + 1) * 3 : 25 + S(lt * 3) * 12, rA2: ty ? 20 : 60, lean: sleep ? 10 : 4, head: sleep ? 25 + S(lt * 1.5) * 3 : S(lt * 2) * 3, look: ty ? 1 : 0 });
      ex.chair = true;
      if (ty) ex.desk = true;
      if (sleep) {
        ex.zzz = true;
        ex.eyesClosed = true;
      }
      break;
    }
    case 'facepalm':
      pose = mix(BASE, P({ rA1: 28, rA2: 150, lA1: -6, head: 18 + S(lt * 3) * 6, lean: 8 }), intro);
      ex.eyesClosed = true;
      break;
    case 'push': {
      const ph = lt * 3;
      pose = P({ lean: 34, lA1: 82, lA2: 8, rA1: 88, rA2: 4, ...walkLegs(ph, 22), lL1: -28 + S(ph) * 12, rL1: 18 + S(ph + 3) * 12, x: lerp(-1, 0.2, p), shake: 0.004 });
      ex.block = lerp(-1, 0.2, p);
      ex.sweat = true;
      break;
    }
    case 'climb': {
      const ph = lt * 5;
      const step = Math.min(4, Math.floor(p * 4.999));
      const k = easeInOut((p * 5) % 1);
      pose = P({ ...walkLegs(ph, 20), lA1: -S(ph) * 22, rA1: S(ph) * 22, lA2: 15, rA2: 15, x: -1.2 + (step + k) * 0.55, y: (step + k) * 0.28, lean: 8 });
      ex.stairs = true;
      break;
    }
    case 'fall': {
      const k = clamp((lt - dur * 0.3) / 0.5);
      const ph = lt * 6.5;
      const w = P({ ...walkLegs(ph, 26), lA1: -S(ph) * 22, rA1: S(ph) * 22, x: lerp(-1.2, 0, clamp(lt / (dur * 0.3))) });
      const fallen = P({ rot: 88, lA1: -120 + S(lt * 10) * 20, rA1: 130 - S(lt * 9) * 20, x: 0.2, lL1: -20, rL1: 25 });
      pose = mix(w, fallen, easeOut(k));
      if (k >= 1) ex.dizzy = true;
      break;
    }
    case 'dance': {
      const b = lt * 6;
      pose = P({ x: S(b * 0.5) * 0.3, lA1: S(b) > 0 ? -150 : -40, lA2: -20, rA1: S(b) > 0 ? 40 : 150, rA2: 20, lL1: -7 + Math.max(0, S(b)) * 35, rL1: 7 + Math.max(0, -S(b)) * 35, lean: S(b * 0.5) * 8, y: Math.abs(S(b)) * 0.08 });
      ex.music = true;
      break;
    }
    case 'meditate':
      pose = P({ hipH: 0.25 + S(lt * 1.6) * 0.06, lL1: 82, lL2: -160, rL1: 70, rL2: -150, lA1: -40, lA2: 80, rA1: 40, rA2: -80, head: 0 });
      ex.eyesClosed = true;
      ex.aura = true;
      break;
    case 'phone':
      pose = mix(BASE, P({ rA1: 28, rA2: 105, lA1: 10, lA2: 95, head: 16, look: 1 }), intro);
      ex.phone = true;
      break;
    case 'lift': {
      const k = easeOut(lt / 0.8);
      pose = P({ lA1: lerp(-30, -168, k), lA2: lerp(-60, 8, k), rA1: lerp(30, 168, k), rA2: lerp(60, -8, k), y: S(lt * 3) * 0.015, lL1: -14, rL1: 14, head: -8 });
      ex.liftItem = true;
      break;
    }
    case 'fight': {
      const pu = Math.max(0, S(lt * 7));
      pose = P({ rA1: 70 + pu * 22, rA2: 110 - pu * 105, lA1: 55, lA2: 120, lean: 10, lL1: -22, rL1: 18, rL2: -10, y: Math.abs(S(lt * 7)) * 0.03 });
      break;
    }
    case 'hug': {
      const k = easeOut(lt / (dur * 0.4));
      pose = P({ x: lerp(-0.4, 0.55, k), lA1: lerp(-14, 72, k), lA2: lerp(-6, 70, k), rA1: lerp(14, 78, k), rA2: lerp(6, 64, k), lean: 6 * k });
      ex.hearts = k > 0.9;
      break;
    }
    case 'handshake': {
      const k = easeOut(lt / (dur * 0.35));
      pose = P({ x: lerp(-0.4, 0.6, k), rA1: lerp(14, 72, k) + (k >= 1 ? S(lt * 9) * 6 : 0), rA2: lerp(6, 12, k), lean: 3 });
      break;
    }
    case 'argue':
      pose = P({ rA1: 85 + S(lt * 8) * 12, rA2: -5, lA1: -30, lA2: -90, lean: 10, head: S(lt * 7) * 5, shake: 0.006 });
      ex.jagged = true;
      break;
    default:
      pose = P({});
  }
  return { pose, ex };
}

const EMO_FOR_ACTION = { celebrate: 'excited', sad: 'sad', cry: 'sad', angry: 'angry', scared: 'scared', surprised: 'surprised', think: 'thinking', idea: 'excited', sleep: 'tired', facepalm: 'tired', push: 'tired', meditate: 'happy', hug: 'love', argue: 'angry', handshake: 'happy', dance: 'happy', wave: 'happy', fall: 'surprised' };

// ---------------------------------------------------------------------------
// STICKMAN ÇİZİMİ
// ---------------------------------------------------------------------------
const INK = '#1d1a17';
function shade(hex, amt) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  const f = (v) => Math.max(0, Math.min(255, v + amt));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
function hashStr(s) {
  let h = 7;
  for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  return h;
}
/** Kostüm adı + video tohumu → sabit ten rengiyle kostüm (aynı karakter tüm sahnelerde aynı görünür) */
export function makeCostume(name, seed = 1, slot = 0) {
  const base = COSTUMES[name] || COSTUMES.casual;
  return { ...base, name, skin: base.skin || SKINS[Math.floor(noise(hashStr(name) * 0.37 + seed * 0.011, slot + 1.7) * SKINS.length) % SKINS.length] };
}

function drawStickman(c, x, groundY, H, pose, emotion, facing, color, th, t, boil, ex = {}) {
  const cs = ex.costume || null;
  const s = (H / 2.85) * (cs?.small ? 0.8 : 1);
  const lw = Math.max(3, s * 0.12);
  const TH = 0.56 * s, SH = 0.56 * s, TO = (cs ? 0.9 : 1.0) * s, UA = 0.5 * s, FA = 0.46 * s, HR = (cs ? 0.43 * (cs.headScale || 1) : 0.33) * s, NK = (cs ? -0.04 : 0.08) * s;
  const f = facing;
  const j = (i) => (boil ? (noise(Math.floor(t * 8), i) - 0.5) * s * 0.025 : 0);
  const dir = (deg) => [S(deg * D) * f, C(deg * D)];

  // Kalça yüksekliği: en alttaki ayak yere değsin
  const legDrop = (a1, a2) => C(a1 * D) * TH + C((a1 + a2) * D) * SH;
  const hipY0 = pose.hipH != null ? groundY - pose.hipH * s : groundY - Math.max(legDrop(pose.lL1, pose.lL2), legDrop(pose.rL1, pose.rL2));
  const hx = x + pose.x * s * f + (pose.shake ? (noise(Math.floor(t * 30), 7) - 0.5) * pose.shake * H * 2 : 0);
  const hy = hipY0 - pose.y * s;

  c.save();
  if (pose.rot) {
    // Düşme: ayak noktası etrafında dön
    c.translate(hx, groundY);
    c.rotate(pose.rot * D * f);
    c.translate(-hx, -groundY);
  }
  c.lineCap = 'round';
  c.lineJoin = 'round';

  const L = pose.lean;
  const neck = [hx + S(L * D) * TO * f + j(1), hy - C(L * D) * TO + j(2)];
  const sh = [lerp(neck[0], hx, cs ? 0.16 : 0.1), lerp(neck[1], hy, cs ? 0.16 : 0.1)];
  const ha = L + pose.head * 0.5;
  const head = [neck[0] + S(ha * D) * (NK + HR) * f, neck[1] - C(ha * D) * (NK + HR)];

  const pts = (o, a1, a2, l1, l2, k) => {
    const d1 = dir(a1), d2 = dir(a1 + a2);
    const m = [o[0] + d1[0] * l1 + j(k), o[1] + d1[1] * l1 + j(k + 1)];
    return [o, m, [m[0] + d2[0] * l2 + j(k + 2), m[1] + d2[1] * l2 + j(k + 3)]];
  };
  const stroke = (p, col, w, outline) => {
    const path = () => {
      c.beginPath();
      c.moveTo(p[0][0], p[0][1]);
      c.lineTo(p[1][0], p[1][1]);
      c.lineTo(p[2][0], p[2][1]);
    };
    if (outline) {
      c.strokeStyle = INK;
      c.lineWidth = w + lw * 0.55;
      path();
      c.stroke();
    }
    c.strokeStyle = col;
    c.lineWidth = w;
    path();
    c.stroke();
  };
  const legL = pts([hx, hy], pose.lL1, pose.lL2, TH, SH, 10), legR = pts([hx, hy], pose.rL1, pose.rL2, TH, SH, 30);
  const armL = pts(sh, pose.lA1, pose.lA2, UA, FA, 20), armR = pts(sh, pose.rA1, pose.rA2, UA, FA, 40);
  const lHand = armL[2], rHand = armR[2];

  if (!cs) {
    // Arka kol/bacak hafif soluk → derinlik
    c.globalAlpha = 0.85;
    stroke(legL, color, lw);
    stroke(armL, color, lw);
    c.globalAlpha = 1;
    c.strokeStyle = color;
    c.lineWidth = lw;
    c.beginPath();
    c.moveTo(hx, hy);
    c.quadraticCurveTo(lerp(hx, neck[0], 0.5) + j(3), lerp(hy, neck[1], 0.5), neck[0], neck[1]);
    c.stroke();
    stroke(legR, color, lw);
    stroke(armR, color, lw);
    c.strokeStyle = color;
    c.lineWidth = lw;
    c.beginPath();
    c.arc(head[0] + j(5), head[1] + j(6), HR, 0, Math.PI * 2);
    c.fillStyle = th.bg;
    c.fill();
    c.stroke();
    drawFace(c, head[0], head[1], HR, emotion, f, color, th, t, pose.look, ex.eyesClosed, lw);
  } else {
    const skin = cs.skin || SKINS[0];
    const dx = neck[0] - hx, dy = neck[1] - hy, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    const long = cs.detail === 'dress', coat = cs.detail === 'coat';
    const swd = s * 0.3, hwd = s * (long ? 0.46 : coat ? 0.4 : 0.34), tail = s * (long ? 0.62 : coat ? 0.34 : 0.1);
    const P = (along, side) => [hx + ux * along + nx * side, hy + uy * along + ny * side];
    const legCol = cs.barefoot ? skin : cs.legs;
    for (const leg of [legL, legR]) {
      stroke(leg, legCol, lw * 0.95, true);
      c.beginPath();
      c.ellipse(leg[2][0] + f * s * 0.07, leg[2][1] - lw * 0.1, s * 0.15, s * 0.075, 0, 0, 7);
      c.fillStyle = cs.barefoot ? skin : INK;
      c.fill();
      if (cs.barefoot) {
        c.lineWidth = lw * 0.3;
        c.strokeStyle = INK;
        c.stroke();
      }
    }
    const hand = (h) => {
      c.beginPath();
      c.arc(h[0], h[1], lw * 0.78, 0, 7);
      c.fillStyle = skin;
      c.fill();
      c.lineWidth = lw * 0.3;
      c.strokeStyle = INK;
      c.stroke();
    };
    stroke(armL, shade(cs.body, -22), lw * 1.3, true);
    hand(lHand);
    // gövde
    const a = P(len, swd), b = P(len, -swd), d = P(-tail, -hwd), e2 = P(-tail, hwd), top = P(len + s * 0.14, 0);
    c.beginPath();
    c.moveTo(a[0], a[1]);
    c.quadraticCurveTo(top[0], top[1], b[0], b[1]);
    c.lineTo(d[0], d[1]);
    c.lineTo(e2[0], e2[1]);
    c.closePath();
    c.fillStyle = cs.body;
    c.fill();
    c.lineWidth = lw * 0.45;
    c.strokeStyle = INK;
    c.stroke();
    const seg = (p1, p2, col, w) => {
      c.beginPath();
      c.moveTo(p1[0], p1[1]);
      c.lineTo(p2[0], p2[1]);
      c.strokeStyle = col;
      c.lineWidth = w;
      c.stroke();
    };
    const dot = (p, r, col) => {
      c.beginPath();
      c.arc(p[0], p[1], r, 0, 7);
      c.fillStyle = col;
      c.fill();
    };
    switch (cs.detail) {
      case 'tie':
        seg(P(len * 0.98, 0), P(len * 0.5, 0), '#B3261E', lw * 0.7);
        seg(P(len * 1.0, swd * 0.5), P(len * 0.85, 0), '#FFFFFF', lw * 0.4);
        seg(P(len * 1.0, -swd * 0.5), P(len * 0.85, 0), '#FFFFFF', lw * 0.4);
        break;
      case 'buttons':
        for (const k of [0.75, 0.5, 0.25]) dot(P(len * k, 0), lw * 0.2, INK);
        break;
      case 'medals':
        dot(P(len * 0.72, swd * 0.5), lw * 0.3, '#F4C430');
        dot(P(len * 0.72, swd * 0.1), lw * 0.3, '#E5484D');
        for (const k of [0.5, 0.25]) dot(P(len * k, 0), lw * 0.18, '#C9A227');
        break;
      case 'sash':
        seg(P(len * 0.95, swd * 0.8), P(len * 0.05, -hwd * 0.8), '#F4C430', lw * 0.8);
        break;
      case 'overalls':
        c.beginPath();
        for (const q of [P(len * 0.55, swd * 0.7), P(len * 0.55, -swd * 0.7), d, e2]) c.lineTo(q[0], q[1]);
        c.closePath();
        c.fillStyle = '#35527A';
        c.fill();
        seg(P(len * 0.55, swd * 0.6), P(len * 0.98, swd * 0.55), '#35527A', lw * 0.5);
        seg(P(len * 0.55, -swd * 0.6), P(len * 0.98, -swd * 0.55), '#35527A', lw * 0.5);
        break;
      case 'vest':
        seg(P(len * 0.95, 0), P(0, 0), shade(cs.body, 60), lw * 1.1);
        break;
      case 'steth':
        seg(P(len * 0.98, swd * 0.4), P(len * 0.6, swd * 0.15), '#3A4A5A', lw * 0.3);
        seg(P(len * 0.98, -swd * 0.4), P(len * 0.6, swd * 0.15), '#3A4A5A', lw * 0.3);
        dot(P(len * 0.55, swd * 0.15), lw * 0.3, '#9AA3AD');
        break;
      case 'pocket':
        seg(P(len * 0.62, swd * 0.2), P(len * 0.62, swd * 0.7), shade(cs.body, -40), lw * 0.35);
        break;
      case 'badge':
        dot(P(len * 0.7, swd * 0.45), lw * 0.35, '#F4C430');
        break;
      case 'cross':
        seg(P(len * 0.8, 0), P(len * 0.3, 0), '#B3261E', lw * 0.5);
        seg(P(len * 0.6, swd * 0.5), P(len * 0.6, -swd * 0.5), '#B3261E', lw * 0.5);
        break;
      case 'spots':
        for (const [k, sd] of [[0.7, 0.4], [0.4, -0.4], [0.2, 0.3]]) dot(P(len * k, swd * sd), lw * 0.4, '#5A3A1A');
        break;
      case 'stripes':
        for (const k of [0.8, 0.6, 0.4, 0.2]) seg(P(len * k, swd * 0.95), P(len * k, -swd * 0.95), '#F1F1F1', lw * 0.35);
        break;
      case 'number':
        seg(P(len * 0.7, 0), P(len * 0.4, 0), '#FFFFFF', lw * 0.6);
        break;
      case 'backpack':
        seg(P(len * 0.98, swd * 0.6), P(len * 0.3, swd * 0.75), '#3A6EA5', lw * 0.5);
        seg(P(len * 0.98, -swd * 0.6), P(len * 0.3, -swd * 0.75), '#3A6EA5', lw * 0.5);
        break;
    }
    if (cs.belt) {
      seg(P(len * 0.22, hwd * 0.92), P(len * 0.22, -hwd * 0.92), cs.belt, lw * 0.55);
      dot(P(len * 0.22, 0), lw * 0.3, shade(cs.belt, 50));
    }
    stroke(armR, cs.body, lw * 1.3, true);
    hand(rHand);
    // kafa
    if (cs.hood) {
      c.beginPath();
      c.arc(head[0] - f * HR * 0.1, head[1] + HR * 0.04, HR * 1.14, 0, Math.PI * 2);
      c.fillStyle = shade(cs.body, -18);
      c.fill();
      c.lineWidth = lw * 0.5;
      c.strokeStyle = INK;
      c.stroke();
    }
    c.beginPath();
    c.arc(head[0], head[1], HR, 0, Math.PI * 2);
    c.fillStyle = skin;
    c.fill();
    c.lineWidth = lw * 0.5;
    c.strokeStyle = INK;
    c.stroke();
    const hairCol = cs.hairColor || '#2A1E18';
    c.save();
    c.translate(head[0], head[1]);
    c.rotate(ha * D * f * 0.6);
    if (cs.facial === 'beard' || cs.facial === 'longbeard') {
      c.beginPath();
      c.arc(0, HR * 0.02, HR * 1.0, Math.PI * 0.06, Math.PI * 0.94);
      if (cs.facial === 'longbeard') c.quadraticCurveTo(f * HR * 0.2, HR * 2.4, HR * 0.99, HR * 0.2);
      else c.quadraticCurveTo(0, HR * 0.35, HR * 0.99, HR * 0.2);
      c.fillStyle = hairCol;
      c.fill();
    }
    c.restore();
    drawFace(c, head[0], head[1], HR, emotion, f, INK, { ...th, bg: '#FFFFFF' }, t, pose.look, ex.eyesClosed, lw * 0.85);
    if (cs.brows) {
      // kalın, ifadeli kaşlar (iç uç: >0 aşağı = kızgın, <0 yukarı = üzgün/korkmuş)
      const mx = head[0] + f * HR * 0.22, by = head[1] - HR * 0.08 - HR * 0.27, gap2 = HR * 0.36;
      const tilt = { angry: 0.55, tired: 0.18, sad: -0.45, scared: -0.5, surprised: -0.25, excited: -0.1, thinking: 0.3 }[emotion] ?? 0.06;
      c.lineCap = 'round';
      c.strokeStyle = INK;
      c.lineWidth = Math.max(3, HR * 0.17);
      for (const ex0 of [mx - gap2 / 2 - f * HR * 0.04, mx + gap2 / 2 + f * HR * 0.04]) {
        const inner = Math.sign(mx - ex0) || 1, w = HR * 0.27;
        c.beginPath();
        c.moveTo(ex0 - inner * w, by - tilt * w);
        c.lineTo(ex0 + inner * w, by + tilt * w);
        c.stroke();
      }
    }
    c.save();
    c.translate(head[0], head[1]);
    c.rotate(ha * D * f * 0.6);
    drawHeadgear(c, HR, cs, f, hairCol, lw);
    c.restore();
  }

  // el ile taşınan şeyler
  if (ex.phone) {
    c.save();
    c.translate(rHand[0] + f * s * 0.05, rHand[1] - s * 0.1);
    c.rotate(-0.3 * f);
    drawIcon(c, 'phone', s * 0.42, th, t);
    c.restore();
  }
  if (ex.liftItem) {
    c.save();
    c.translate((lHand[0] + rHand[0]) / 2, Math.min(lHand[1], rHand[1]) - s * 0.25);
    drawIcon(c, ex.liftItem === true ? 'trophy' : ex.liftItem, s * 0.6, th, t);
    c.restore();
  }
  c.restore();
  return { head, s, hx, hy, lHand, rHand, neck };
}

/** Saç, şapka, bıyık, gözlük — baş merkezli yerel koordinatlarda (r = baş yarıçapı) */
function drawHeadgear(c, r, cs, f, hairCol, lw) {
  const ol = () => {
    c.lineWidth = lw * 0.4;
    c.strokeStyle = INK;
    c.stroke();
  };
  const fill = (col) => {
    c.fillStyle = col;
    c.fill();
    ol();
  };
  const hc = cs.hatColor || '#333333';
  // saç (şapka yoksa ya da şapka saçı gösteriyorsa)
  const showHair = !cs.hat || ['crown', 'headband', 'sunhat', 'beret', 'ballcap'].includes(cs.hat);
  if (showHair && cs.hair) {
    c.fillStyle = hairCol;
    if (cs.hair === 'bald') {
      for (const sd of [-1, 1]) {
        c.beginPath();
        c.ellipse(sd * r * 0.95, -r * 0.05, r * 0.16, r * 0.3, 0, 0, 7);
        c.fill();
      }
    } else {
      c.beginPath();
      c.arc(0, 0, r * 1.03, Math.PI * 1.08, Math.PI * 1.92);
      c.quadraticCurveTo(f * r * 0.2, -r * 0.55, -r * 0.98, -r * 0.24);
      c.fill();
      if (cs.hair === 'long') {
        c.beginPath();
        c.moveTo(-f * r * 0.6, -r * 0.8);
        c.quadraticCurveTo(-f * r * 1.5, -r * 0.2, -f * r * 1.15, r * 1.25);
        c.lineTo(-f * r * 0.7, r * 0.9);
        c.quadraticCurveTo(-f * r * 1.0, 0, -f * r * 0.6, -r * 0.8);
        c.fill();
      } else if (cs.hair === 'bun') {
        c.beginPath();
        c.arc(-f * r * 0.2, -r * 1.2, r * 0.36, 0, 7);
        c.fill();
      } else if (cs.hair === 'spiky') {
        c.beginPath();
        for (let i = 0; i <= 6; i++) {
          const a = Math.PI * (1.12 + (i / 6) * 0.76);
          c.lineTo(Math.cos(a) * r * (i % 2 ? 0.95 : 1.4), Math.sin(a) * r * (i % 2 ? 0.95 : 1.4));
        }
        c.fill();
      } else if (cs.hair === 'wild') {
        for (let i = 0; i < 6; i++) {
          const a = Math.PI * (1.05 + (i / 5) * 0.9);
          c.beginPath();
          c.arc(Math.cos(a) * r * 1.02, Math.sin(a) * r * 1.02, r * 0.32, 0, 7);
          c.fill();
        }
      }
    }
  }
  const brim = (w, y, h, col) => {
    c.beginPath();
    c.ellipse(0, y, w, h, 0, 0, 7);
    fill(col);
  };
  const dome = (w, y, h, col) => {
    c.beginPath();
    c.ellipse(0, y, w, h, 0, Math.PI, 0);
    c.closePath();
    fill(col);
  };
  switch (cs.hat) {
    case 'tophat':
      c.beginPath();
      c.rect(-r * 0.72, -r * 2.15, r * 1.44, r * 1.4);
      fill(hc);
      c.fillStyle = '#8C1C2C';
      c.fillRect(-r * 0.72, -r * 1.05, r * 1.44, r * 0.2);
      c.beginPath();
      c.rect(-r * 1.2, -r * 0.86, r * 2.4, r * 0.2);
      fill(hc);
      break;
    case 'cap':
    case 'ballcap':
      dome(r * 1.0, -r * 0.5, r * (cs.hat === 'cap' ? 0.72 : 0.6), hc);
      c.beginPath();
      c.ellipse(f * r * 0.85, -r * 0.5, r * 0.6, r * 0.12, 0, 0, 7);
      fill(shade(hc, -50));
      if (cs.hat === 'cap') {
        c.beginPath();
        c.arc(f * r * 0.25, -r * 0.8, r * 0.13, 0, 7);
        c.fillStyle = '#FFF2B0';
        c.fill();
      }
      break;
    case 'helmet':
    case 'hardhat':
      dome(r * 1.14, -r * 0.18, r * 0.98, hc);
      c.beginPath();
      c.rect(-r * 1.22, -r * 0.3, r * 2.44, r * 0.16);
      fill(shade(hc, -25));
      break;
    case 'crown':
      c.beginPath();
      c.moveTo(-r * 0.85, -r * 0.72);
      for (const [x, y] of [[-0.95, -1.5], [-0.45, -1.05], [0, -1.65], [0.45, -1.05], [0.95, -1.5], [0.85, -0.72]]) c.lineTo(x * r, y * r);
      c.closePath();
      fill(hc);
      for (const x of [-0.45, 0, 0.45]) {
        c.beginPath();
        c.arc(x * r, -r * 0.9, r * 0.09, 0, 7);
        c.fillStyle = x ? '#3B82F6' : '#E5484D';
        c.fill();
      }
      break;
    case 'strawhat':
    case 'sunhat':
    case 'cowboy':
    case 'fedora':
      brim(r * (cs.hat === 'fedora' ? 1.3 : 1.6), -r * 0.72, r * 0.2, hc);
      dome(r * 0.78, -r * 0.75, r * (cs.hat === 'cowboy' ? 0.85 : 0.7), hc);
      c.fillStyle = cs.hat === 'sunhat' ? '#C4567A' : shade(hc, -45);
      c.fillRect(-r * 0.76, -r * 0.95, r * 1.52, r * 0.16);
      break;
    case 'chef':
      for (const [x, y, q] of [[-0.5, -1.55, 0.45], [0.5, -1.55, 0.45], [0, -1.8, 0.55]]) {
        c.beginPath();
        c.arc(x * r, y * r, q * r, 0, 7);
        fill(hc);
      }
      c.beginPath();
      c.rect(-r * 0.75, -r * 1.45, r * 1.5, r * 0.7);
      fill(hc);
      break;
    case 'wizard':
      c.beginPath();
      c.moveTo(-r * 0.85, -r * 0.7);
      c.quadraticCurveTo(-r * 0.1, -r * 1.6, -f * r * 0.5, -r * 2.6);
      c.quadraticCurveTo(r * 0.4, -r * 1.5, r * 0.85, -r * 0.7);
      c.closePath();
      fill(hc);
      brim(r * 1.5, -r * 0.7, r * 0.18, hc);
      c.beginPath();
      c.arc(0, -r * 1.25, r * 0.12, 0, 7);
      c.fillStyle = '#F4C430';
      c.fill();
      break;
    case 'tricorn':
      c.beginPath();
      c.moveTo(-r * 1.5, -r * 0.6);
      c.quadraticCurveTo(-r * 0.9, -r * 1.7, 0, -r * 1.45);
      c.quadraticCurveTo(r * 0.9, -r * 1.7, r * 1.5, -r * 0.6);
      c.quadraticCurveTo(0, -r * 1.0, -r * 1.5, -r * 0.6);
      fill(hc);
      c.beginPath();
      c.arc(0, -r * 1.05, r * 0.14, 0, 7);
      c.fillStyle = '#F1F1F1';
      c.fill();
      break;
    case 'knight':
      dome(r * 1.12, -r * 0.05, r * 1.1, hc);
      c.beginPath();
      c.rect(f * r * 0.15, -r * 0.5, r * 0.14, r * 0.85);
      fill(shade(hc, -30));
      c.beginPath();
      c.moveTo(0, -r * 1.1);
      c.quadraticCurveTo(-f * r * 0.9, -r * 2.0, -f * r * 1.1, -r * 0.9);
      c.quadraticCurveTo(-f * r * 0.6, -r * 1.3, 0, -r * 1.1);
      fill('#B3261E');
      break;
    case 'roman':
      dome(r * 1.1, -r * 0.2, r * 0.95, hc);
      c.beginPath();
      c.ellipse(0, -r * 1.25, r * 0.95, r * 0.34, 0, Math.PI, 0);
      c.closePath();
      fill('#B3261E');
      break;
    case 'viking':
      for (const sd of [-1, 1]) {
        c.beginPath();
        c.moveTo(sd * r * 0.8, -r * 0.7);
        c.quadraticCurveTo(sd * r * 1.7, -r * 0.9, sd * r * 1.35, -r * 1.8);
        c.quadraticCurveTo(sd * r * 1.2, -r * 1.1, sd * r * 0.55, -r * 1.0);
        c.closePath();
        fill('#F3EBD3');
      }
      dome(r * 1.1, -r * 0.25, r * 0.92, hc);
      break;
    case 'ninja':
      c.save();
      c.beginPath();
      c.arc(0, 0, r * 1.02, 0, 7);
      c.clip();
      c.fillStyle = hc;
      c.fillRect(-r * 1.1, -r * 1.1, r * 2.2, r * 0.72);
      c.fillRect(-r * 1.1, r * 0.2, r * 2.2, r);
      c.restore();
      break;
    case 'headband':
      c.beginPath();
      c.arc(0, 0, r * 1.02, Math.PI * 1.13, Math.PI * 1.87);
      c.lineWidth = r * 0.2;
      c.strokeStyle = hc;
      c.stroke();
      break;
    case 'beret':
      c.beginPath();
      c.ellipse(-f * r * 0.15, -r * 0.95, r * 1.05, r * 0.38, -f * 0.2, 0, 7);
      fill(hc);
      break;
    case 'beanie':
      dome(r * 1.05, -r * 0.35, r * 0.85, hc);
      break;
  }
  const ex = f * r * 0.22, ey = -r * 0.08, gap = r * 0.36;
  if (cs.facial === 'mustache') {
    c.fillStyle = hairCol;
    for (const sd of [-1, 1]) {
      c.beginPath();
      c.ellipse(f * r * 0.24 + sd * r * 0.2, r * 0.24, r * 0.24, r * 0.09, sd * 0.35, 0, 7);
      c.fill();
    }
  }
  if (cs.glasses) {
    c.lineWidth = lw * 0.3;
    c.strokeStyle = INK;
    for (const sd of [-1, 1]) {
      c.beginPath();
      c.arc(ex + (sd * gap) / 2 + sd * f * r * 0.04, ey, r * 0.17, 0, 7);
      c.stroke();
    }
  }
  if (cs.eyepatch) {
    c.beginPath();
    c.arc(ex + gap / 2 + f * r * 0.04, ey, r * 0.16, 0, 7);
    c.fillStyle = '#111';
    c.fill();
    c.beginPath();
    c.moveTo(-r, -r * 0.35);
    c.lineTo(r, -r * 0.05);
    c.lineWidth = lw * 0.25;
    c.strokeStyle = '#111';
    c.stroke();
  }
  if (cs.hat === 'astronaut') {
    c.beginPath();
    c.arc(0, -r * 0.05, r * 1.38, 0, 7);
    c.fillStyle = 'rgba(190,225,255,0.28)';
    c.fill();
    c.lineWidth = lw * 0.6;
    c.strokeStyle = '#EDEFF2';
    c.stroke();
    ol();
  }
}

// ---------------------------------------------------------------------------
// ÇİZGİ FİLM MANZARALARI (dolu renkli, konturlu olmayan düz şekiller)
// ---------------------------------------------------------------------------

/** Karanlık sinema: sahneyi karart, karaktere duygu rengiyle ışık düşür, vinyet */
function drawMoodyLight(c, W, H, scene, L, lt) {
  const emo = scene.emotion || 'neutral';
  const col = { sad: [70, 110, 220], tired: [90, 100, 200], scared: [60, 200, 170], angry: [255, 60, 50], happy: [255, 190, 90], excited: [255, 170, 60], love: [255, 100, 160], thinking: [120, 150, 255], surprised: [255, 210, 90], neutral: [255, 170, 90] }[emo] || [255, 170, 90];
  c.fillStyle = 'rgba(6,8,16,0.66)';
  c.fillRect(0, 0, W, H);
  const cx = L.charX[0], cy = L.groundY - L.charH * 0.55;
  const pulse = 0.9 + 0.1 * Math.sin(lt * 2.2);
  const g = c.createRadialGradient(cx, cy, 0, cx, cy, L.charH * 1.25 * pulse);
  g.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},0.42)`);
  g.addColorStop(0.5, `rgba(${col[0]},${col[1]},${col[2]},0.12)`);
  g.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
  c.fillStyle = g;
  c.globalCompositeOperation = 'screen';
  c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'source-over';
  const v = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) * 0.62);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.75)');
  c.fillStyle = v;
  c.fillRect(0, 0, W, H);
}

function drawScenery(c, W, H, bg, th, L, t) {
  const hz = L.groundY - L.charH * 0.32; // ufuk / zemin çizgisi
  const u = Math.min(W, H) / 10;
  const img = cached(`sc:${bg}:${th.bg}:${Math.round(hz)}`, W, H, (g) => {
    const r = rng(bg.length * 131 + 5);
    const grad = (c0, c1, y0 = 0, y1 = hz) => {
      const gr = g.createLinearGradient(0, y0, 0, y1);
      gr.addColorStop(0, c0);
      gr.addColorStop(1, c1);
      return gr;
    };
    const rect = (x, y, w, h, col) => {
      g.fillStyle = col;
      g.fillRect(x, y, w, h);
    };
    const tri = (x, y, w, h, col) => {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(x - w / 2, y);
      g.lineTo(x, y - h);
      g.lineTo(x + w / 2, y);
      g.fill();
    };
    const ell = (x, y, rx, ry, col) => {
      g.fillStyle = col;
      g.beginPath();
      g.ellipse(x, y, rx, ry, 0, 0, 7);
      g.fill();
    };
    const pine = (x, y, h, col) => {
      rect(x - h * 0.04, y - h * 0.2, h * 0.08, h * 0.2, '#6B4A2A');
      for (let i = 0; i < 3; i++) tri(x, y - h * (0.15 + i * 0.22), h * (0.5 - i * 0.1), h * 0.42, col);
    };
    const ground = (col, col2) => {
      rect(0, hz, W, H - hz, col);
      g.fillStyle = col2;
      for (let i = 0; i < 4; i++) {
        const y = hz + (H - hz) * (0.25 + i * 0.22), x = r() * W;
        g.beginPath();
        g.ellipse(x, y, u * (1.5 + r() * 2), u * 0.12, 0, 0, 7);
        g.fill();
      }
    };
    const stars = (n, col) => {
      for (let i = 0; i < n; i++) ell(r() * W, r() * hz, u * (0.015 + r() * 0.04), u * (0.015 + r() * 0.04), col);
    };
    const floor = (col, col2) => {
      rect(0, hz, W, H - hz, col);
      g.strokeStyle = col2;
      g.lineWidth = Math.max(1, u * 0.03);
      for (let i = 1; i < 5; i++) {
        const y = hz + (H - hz) * Math.pow(i / 5, 1.4);
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(W, y);
        g.stroke();
      }
      rect(0, hz - u * 0.12, W, u * 0.12, col2);
    };
    switch (bg) {
      case 'nature': {
        rect(0, 0, W, hz, grad('#F6D9B8', '#FBEFDC'));
        tri(W * 0.55, hz, W * 0.75, hz * 0.62, '#EBD9B4');
        tri(W * 0.55, hz - hz * 0.42, W * 0.24, hz * 0.2, '#F7EFD9');
        tri(W * 0.15, hz, W * 0.5, hz * 0.4, '#E3CDA2');
        for (let i = 0; i < 6; i++) pine(W * (0.04 + i * 0.19) + r() * u, hz + u * 0.1, u * (1.6 + r() * 1.6), i % 2 ? '#4C8B3F' : '#3F7A36');
        rect(0, hz - u * 0.42, W, u * 0.09, '#9A6B3F');
        for (let x = u * 0.3; x < W; x += u * 1.1) rect(x, hz - u * 0.6, u * 0.1, u * 0.6, '#8A5C33');
        ground('#8FB84B', '#7FA63F');
        for (let i = 0; i < 5; i++) {
          const bx = r() * W;
          ell(bx, hz + u * 0.1, u * 0.7, u * 0.3, '#5E9B45');
          ell(bx - u * 0.2, hz, u * 0.07, u * 0.07, '#F7C6D0');
          ell(bx + u * 0.25, hz + u * 0.05, u * 0.07, u * 0.07, '#FFFFFF');
        }
        break;
      }
      case 'city': {
        rect(0, 0, W, hz, grad('#BFDDF0', '#EAF4FB'));
        let x = -u * 0.2;
        const cols = ['#9FB3C8', '#B8C7D9', '#8798AD', '#C9D3DF'];
        while (x < W) {
          const w = u * (0.9 + r() * 1.1), h = hz * (0.3 + r() * 0.55);
          rect(x, hz - h, w, h, cols[Math.floor(r() * 4)]);
          for (let wy = hz - h + u * 0.25; wy < hz - u * 0.35; wy += u * 0.42) for (let wx = x + u * 0.16; wx < x + w - u * 0.25; wx += u * 0.3) if (r() > 0.35) rect(wx, wy, u * 0.13, u * 0.2, '#F7E9A0');
          x += w + u * 0.06;
        }
        rect(0, hz, W, H - hz, '#C9CCD1');
        rect(0, hz + (H - hz) * 0.45, W, (H - hz) * 0.55, '#6B7078');
        for (let dx = u * 0.3; dx < W; dx += u * 1.4) rect(dx, hz + (H - hz) * 0.7, u * 0.7, u * 0.08, '#F1F1F1');
        break;
      }
      case 'desert': {
        rect(0, 0, W, hz, grad('#F9C784', '#FCEBC8'));
        ell(W * 0.8, hz * 0.3, u * 0.7, u * 0.7, '#FFF3C4');
        ell(W * 0.25, hz + u * 0.3, W * 0.4, hz * 0.3, '#E3B76B');
        ell(W * 0.8, hz + u * 0.3, W * 0.35, hz * 0.22, '#D9A85C');
        rect(0, hz, W, H - hz, '#E8C67E');
        for (let i = 0; i < 3; i++) {
          const cx = W * (0.12 + i * 0.38) + r() * u, ch = u * (1.1 + r() * 0.7);
          rect(cx - u * 0.1, hz - ch, u * 0.2, ch + u * 0.1, '#4E9A51');
          rect(cx - u * 0.4, hz - ch * 0.65, u * 0.3, u * 0.14, '#4E9A51');
          rect(cx - u * 0.4, hz - ch * 0.9, u * 0.14, ch * 0.3, '#4E9A51');
          rect(cx + u * 0.1, hz - ch * 0.5, u * 0.3, u * 0.14, '#4E9A51');
          rect(cx + u * 0.26, hz - ch * 0.78, u * 0.14, ch * 0.3, '#4E9A51');
        }
        break;
      }
      case 'ocean': {
        rect(0, 0, W, hz, grad('#9FD8F2', '#E6F6FC'));
        ell(W * 0.82, hz * 0.28, u * 0.6, u * 0.6, '#FFE9A8');
        rect(0, hz - u * 1.2, W, u * 1.2, '#3FA7D6');
        g.strokeStyle = '#BFE8F7';
        g.lineWidth = u * 0.05;
        for (let k = 0; k < 3; k++) {
          g.beginPath();
          for (let x = 0; x <= W; x += u * 0.2) g.lineTo(x, hz - u * (0.25 + k * 0.35) + Math.sin(x / (u * 0.45) + k) * u * 0.05);
          g.stroke();
        }
        rect(0, hz, W, H - hz, '#F2DDA4');
        rect(W * 0.1, hz - u * 2, u * 0.16, u * 2.1, '#8A5C33');
        for (let i = 0; i < 5; i++) {
          g.save();
          g.translate(W * 0.1 + u * 0.08, hz - u * 2);
          g.rotate(-1.2 + i * 0.6);
          ell(u * 0.7, 0, u * 0.75, u * 0.16, '#4E9A51');
          g.restore();
        }
        break;
      }
      case 'home': {
        rect(0, 0, W, hz, '#EBDCC7');
        rect(W * 0.58, hz * 0.18, W * 0.3, hz * 0.45, '#FFFFFF');
        rect(W * 0.595, hz * 0.2, W * 0.27, hz * 0.41, grad('#BFE3F5', '#E9F6FC', hz * 0.2, hz * 0.61));
        rect(W * 0.725, hz * 0.18, W * 0.012, hz * 0.45, '#FFFFFF');
        rect(W * 0.08, hz * 0.22, u * 1.5, u * 1.1, '#8A5C33');
        rect(W * 0.08 + u * 0.12, hz * 0.22 + u * 0.12, u * 1.26, u * 0.86, '#F4E3B5');
        tri(W * 0.08 + u * 0.75, hz * 0.22 + u * 0.9, u * 0.9, u * 0.5, '#6FA36B');
        floor('#B98B5E', '#9C7248');
        ell(W * 0.5, hz + (H - hz) * 0.55, W * 0.3, (H - hz) * 0.22, '#B3475A');
        ell(W * 0.5, hz + (H - hz) * 0.55, W * 0.24, (H - hz) * 0.16, '#C75D70');
        break;
      }
      case 'office': {
        rect(0, 0, W, hz, '#DDE5EC');
        rect(W * 0.5, hz * 0.12, W * 0.42, hz * 0.55, '#FFFFFF');
        rect(W * 0.51, hz * 0.14, W * 0.4, hz * 0.51, grad('#BFDDF0', '#EAF4FB', hz * 0.14, hz * 0.65));
        for (let i = 0; i < 6; i++) rect(W * (0.52 + i * 0.065), hz * (0.3 + r() * 0.2), W * 0.05, hz * 0.4, '#A9BACB');
        rect(W * 0.51, hz * 0.6, W * 0.4, hz * 0.05, '#DDE5EC');
        for (let i = 1; i < 3; i++) rect(W * (0.51 + i * 0.133), hz * 0.12, W * 0.008, hz * 0.55, '#FFFFFF');
        rect(W * 0.07, hz * 0.25, u * 1.3, u * 0.9, '#FFFFFF');
        rect(W * 0.07 + u * 0.15, hz * 0.25 + u * 0.5, u * 0.2, u * 0.3, '#E5484D');
        rect(W * 0.07 + u * 0.5, hz * 0.25 + u * 0.3, u * 0.2, u * 0.5, '#3B82F6');
        rect(W * 0.07 + u * 0.85, hz * 0.25 + u * 0.15, u * 0.2, u * 0.65, '#2BB673');
        floor('#8E9AA6', '#7B8792');
        rect(W * 0.93 - u * 0.25, hz - u * 0.5, u * 0.5, u * 0.55, '#C0684A');
        ell(W * 0.93, hz - u * 0.9, u * 0.4, u * 0.6, '#4E9A51');
        break;
      }
      case 'classroom': {
        rect(0, 0, W, hz, '#EDE6D3');
        rect(W * 0.1, hz * 0.14, W * 0.8, hz * 0.5, '#8A5C33');
        rect(W * 0.115, hz * 0.165, W * 0.77, hz * 0.45, '#2F5D50');
        g.strokeStyle = 'rgba(255,255,255,0.55)';
        g.lineWidth = u * 0.04;
        for (let i = 0; i < 3; i++) {
          g.beginPath();
          for (let x = 0; x < W * 0.25; x += u * 0.1) g.lineTo(W * 0.16 + x, hz * (0.26 + i * 0.1) + Math.sin(x / (u * 0.12)) * u * 0.04);
          g.stroke();
        }
        floor('#C29B6B', '#A8824F');
        break;
      }
      case 'lab': {
        rect(0, 0, W, hz, '#D8ECEA');
        rect(W * 0.06, hz * 0.4, W * 0.4, u * 0.1, '#7C8F8D');
        const fc = ['#E5484D', '#3B82F6', '#2BB673', '#F4C430', '#9B5DE5'];
        for (let i = 0; i < 5; i++) {
          const fx = W * (0.09 + i * 0.075);
          tri(fx, hz * 0.4, u * 0.5, u * 0.5, fc[i]);
          rect(fx - u * 0.06, hz * 0.4 - u * 0.75, u * 0.12, u * 0.35, '#EAF6F5');
        }
        rect(W * 0.62, hz * 0.15, W * 0.28, hz * 0.4, '#FFFFFF');
        rect(W * 0.635, hz * 0.175, W * 0.25, hz * 0.35, '#BFE3F5');
        floor('#B8C9C7', '#9FB3B0');
        break;
      }
      case 'night': {
        rect(0, 0, W, hz, grad('#141B3C', '#2F3B73'));
        stars(70, 'rgba(255,255,255,0.8)');
        ell(W * 0.82, hz * 0.25, u * 0.6, u * 0.6, '#FFF3B0');
        ell(W * 0.82 + u * 0.22, hz * 0.25 - u * 0.1, u * 0.5, u * 0.5, '#1B2450');
        ell(W * 0.3, hz + u * 0.4, W * 0.45, hz * 0.3, '#1F2B4A');
        ell(W * 0.85, hz + u * 0.4, W * 0.4, hz * 0.22, '#243257');
        for (let i = 0; i < 5; i++) pine(W * (0.06 + i * 0.22) + r() * u, hz + u * 0.1, u * (1.5 + r() * 1.5), '#1E3A2A');
        rect(0, hz, W, H - hz, '#24402E');
        break;
      }
      case 'space': {
        rect(0, 0, W, H, '#0B0B1E');
        stars(110, 'rgba(255,255,255,0.85)');
        ell(W * 0.8, hz * 0.3, u * 1.0, u * 1.0, '#C77DFF');
        g.strokeStyle = '#E0AAFF';
        g.lineWidth = u * 0.1;
        g.beginPath();
        g.ellipse(W * 0.8, hz * 0.3, u * 1.6, u * 0.4, -0.3, 0, 7);
        g.stroke();
        ell(W * 0.15, hz * 0.22, u * 0.45, u * 0.45, '#4EA8DE');
        rect(0, hz, W, H - hz, '#8C8F99');
        ell(W * 0.5, hz, W * 0.7, u * 0.35, '#8C8F99');
        for (let i = 0; i < 6; i++) ell(r() * W, hz + (H - hz) * (0.2 + r() * 0.7), u * (0.3 + r() * 0.6), u * 0.12, '#74777F');
        break;
      }
      case 'road': {
        rect(0, 0, W, hz, grad('#BFE3F5', '#EAF6FC'));
        ell(W * 0.25, hz + u * 0.5, W * 0.45, hz * 0.35, '#8FB84B');
        ell(W * 0.8, hz + u * 0.5, W * 0.4, hz * 0.28, '#7FA63F');
        rect(0, hz, W, H - hz, '#8FB84B');
        rect(0, hz + (H - hz) * 0.18, W, (H - hz) * 0.82, '#5F646B');
        for (let dx = u * 0.3; dx < W; dx += u * 1.5) rect(dx, hz + (H - hz) * 0.58, u * 0.8, u * 0.09, '#F4E285');
        rect(W * 0.88, hz - u * 1.7, u * 0.1, u * 1.9, '#7C8F8D');
        rect(W * 0.88 - u * 0.45, hz - u * 2.2, u * 1.0, u * 0.55, '#2BB673');
        break;
      }
      case 'stage': {
        rect(0, 0, W, hz, '#3A1620');
        g.fillStyle = 'rgba(255,245,200,0.14)';
        g.beginPath();
        g.moveTo(W * 0.45, 0);
        g.lineTo(W * 0.55, 0);
        g.lineTo(W * 0.75, hz);
        g.lineTo(W * 0.25, hz);
        g.fill();
        for (const sd of [0, 1]) {
          for (let i = 0; i < 4; i++) {
            const x0 = sd ? W - (i + 1) * W * 0.045 : i * W * 0.045;
            rect(x0, 0, W * 0.045, hz, i % 2 ? '#8C1C2C' : '#A3242F');
          }
        }
        rect(0, 0, W, hz * 0.12, '#A3242F');
        floor('#8B5E3C', '#70492C');
        break;
      }
      default: {
        rect(0, 0, W, hz, grad(th.bg, th.bg2 || th.bg));
        rect(0, hz, W, H - hz, shade(th.bg2 && th.bg2.startsWith('#') && th.bg2.length === 7 ? th.bg2 : '#DDDDDD', th.dark ? 18 : -22));
        ell(W * 0.5, hz + (H - hz) * 0.5, W * 0.45, (H - hz) * 0.3, 'rgba(0,0,0,0.05)');
      }
    }
  });
  c.drawImage(img, 0, 0);
  // hareketli bulutlar (açık hava gündüz sahneleri)
  if (['nature', 'city', 'desert', 'ocean', 'road'].includes(bg)) {
    c.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 3; i++) {
      const cx = ((W * (0.2 + i * 0.37) + t * u * (0.12 + i * 0.05)) % (W + u * 4)) - u * 2, cy = hz * (0.14 + i * 0.13), sz = u * (0.5 + i * 0.12);
      c.beginPath();
      c.ellipse(cx, cy, sz * 1.5, sz * 0.5, 0, 0, 7);
      c.ellipse(cx - sz * 0.5, cy - sz * 0.3, sz * 0.7, sz * 0.5, 0, 0, 7);
      c.ellipse(cx + sz * 0.4, cy - sz * 0.4, sz * 0.8, sz * 0.6, 0, 0, 7);
      c.fill();
    }
  }
}

// ---------------------------------------------------------------------------
// BAYRAKLAR (üst köşelerden sarkan, dalgalanan)
// ---------------------------------------------------------------------------
const FLAG_H = { de: ['#000000', '#DD0000', '#FFCE00'], ru: ['#FFFFFF', '#0039A6', '#D52B1E'], nl: ['#AE1C28', '#FFFFFF', '#21468B'], ua: ['#0057B7', '#FFD700'], pl: ['#FFFFFF', '#DC143C'], at: ['#ED2939', '#FFFFFF', '#ED2939'], es: ['#AA151B', '#F1BF00', '#F1BF00', '#AA151B'], in: ['#FF9933', '#FFFFFF', '#138808'], az: ['#00B5E2', '#EF3340', '#509E2F'] };
const FLAG_V = { fr: ['#0055A4', '#FFFFFF', '#EF4135'], it: ['#009246', '#FFFFFF', '#CE2B37'], ie: ['#169B62', '#FFFFFF', '#FF883E'], be: ['#000000', '#FAE042', '#ED2939'], ro: ['#002B7F', '#FCD116', '#CE1126'], ca: ['#D52B1E', '#FFFFFF', '#FFFFFF', '#D52B1E'] };
function paintFlag(g, code, w, h) {
  const R = (x, y, ww, hh, col) => {
    g.fillStyle = col;
    g.fillRect(x, y, ww, hh);
  };
  const star = (x, y, r, col, n = 5) => {
    g.fillStyle = col;
    g.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = (i * Math.PI) / n - Math.PI / 2, rr = i % 2 ? r * 0.42 : r;
      g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.fill();
  };
  const circle = (x, y, r, col) => {
    g.fillStyle = col;
    g.beginPath();
    g.arc(x, y, r, 0, 7);
    g.fill();
  };
  if (FLAG_H[code]) FLAG_H[code].forEach((col, i, a) => R(0, (h * i) / a.length, w, h / a.length + 1, col));
  else if (FLAG_V[code]) FLAG_V[code].forEach((col, i, a) => R((w * i) / a.length, 0, w / a.length + 1, h, col));
  switch (code) {
    case 'tr':
      R(0, 0, w, h, '#E30A17');
      circle(w * 0.38, h * 0.5, h * 0.27, '#FFFFFF');
      circle(w * 0.44, h * 0.5, h * 0.215, '#E30A17');
      star(w * 0.6, h * 0.5, h * 0.13, '#FFFFFF');
      break;
    case 'jp':
      R(0, 0, w, h, '#FFFFFF');
      circle(w / 2, h / 2, h * 0.3, '#BC002D');
      break;
    case 'cn':
      R(0, 0, w, h, '#DE2910');
      star(w * 0.2, h * 0.28, h * 0.17, '#FFDE00');
      for (const [x, y] of [[0.36, 0.12], [0.43, 0.24], [0.43, 0.4], [0.36, 0.52]]) star(w * x, h * y, h * 0.055, '#FFDE00');
      break;
    case 'se':
      R(0, 0, w, h, '#006AA7');
      R(w * 0.3, 0, w * 0.13, h, '#FECC00');
      R(0, h * 0.4, w, h * 0.2, '#FECC00');
      break;
    case 'us':
      for (let i = 0; i < 7; i++) R(0, (h * i) / 7, w, h / 7 + 1, i % 2 ? '#FFFFFF' : '#B22234');
      R(0, 0, w * 0.42, h * 0.57, '#3C3B6E');
      for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) circle(w * (0.06 + i * 0.1), h * (0.1 + k * 0.18), h * 0.03, '#FFFFFF');
      break;
    case 'gb': {
      R(0, 0, w, h, '#012169');
      const diag = (col, lw) => {
        g.strokeStyle = col;
        g.lineWidth = lw;
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(w, h);
        g.moveTo(w, 0);
        g.lineTo(0, h);
        g.stroke();
      };
      diag('#FFFFFF', h * 0.2);
      diag('#C8102E', h * 0.07);
      R(w * 0.4, 0, w * 0.2, h, '#FFFFFF');
      R(0, h * 0.33, w, h * 0.34, '#FFFFFF');
      R(w * 0.44, 0, w * 0.12, h, '#C8102E');
      R(0, h * 0.4, w, h * 0.2, '#C8102E');
      break;
    }
    case 'br':
      R(0, 0, w, h, '#009C3B');
      g.fillStyle = '#FFDF00';
      g.beginPath();
      g.moveTo(w * 0.5, h * 0.1);
      g.lineTo(w * 0.9, h * 0.5);
      g.lineTo(w * 0.5, h * 0.9);
      g.lineTo(w * 0.1, h * 0.5);
      g.fill();
      circle(w / 2, h / 2, h * 0.22, '#002776');
      break;
    case 'eu':
      R(0, 0, w, h, '#003399');
      for (let i = 0; i < 12; i++) star(w / 2 + Math.cos((i / 12) * Math.PI * 2) * h * 0.3, h / 2 + Math.sin((i / 12) * Math.PI * 2) * h * 0.3, h * 0.045, '#FFCC00');
      break;
    case 'gr':
      for (let i = 0; i < 9; i++) R(0, (h * i) / 9, w, h / 9 + 1, i % 2 ? '#FFFFFF' : '#0D5EAF');
      R(0, 0, w * 0.37, h * 0.555, '#0D5EAF');
      R(w * 0.148, 0, w * 0.074, h * 0.555, '#FFFFFF');
      R(0, h * 0.222, w * 0.37, h * 0.111, '#FFFFFF');
      break;
    case 'in':
      g.strokeStyle = '#000080';
      g.lineWidth = h * 0.02;
      g.beginPath();
      g.arc(w / 2, h / 2, h * 0.13, 0, 7);
      g.stroke();
      break;
    case 'az':
      circle(w * 0.46, h / 2, h * 0.13, '#FFFFFF');
      circle(w * 0.49, h / 2, h * 0.105, '#EF3340');
      star(w * 0.57, h / 2, h * 0.06, '#FFFFFF', 8);
      break;
    case 'ca':
      star(w / 2, h / 2, h * 0.26, '#D52B1E', 6);
      break;
  }
}
function drawFlags(c, W, H, codes, t) {
  const fw = Math.min(W * 0.34, H * 0.42), fh = fw * 0.6;
  codes.slice(0, 2).forEach((code, i) => {
    const flag = cached(`flag:${code}:${Math.round(fw)}`, Math.ceil(fw), Math.ceil(fh), (g) => paintFlag(g, code, Math.ceil(fw), Math.ceil(fh)));
    const left = i === 0;
    c.save();
    c.translate(left ? -fw * 0.08 : W - fw * 0.92, -fh * 0.42);
    c.rotate(left ? 0.06 : -0.06);
    // dalgalanan alt kenar
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(fw, 0);
    for (let k = 10; k >= 0; k--) c.lineTo((fw * k) / 10, fh + Math.sin(t * 2.4 + k * 0.7 + i) * fh * 0.06);
    c.closePath();
    c.save();
    c.clip();
    c.drawImage(flag, 0, 0, fw, fh * 1.08);
    // kumaş gölgeleri
    for (let k = 0; k < 5; k++) {
      c.fillStyle = `rgba(0,0,0,${0.05 + 0.04 * Math.sin(t * 2.4 + k * 1.3 + i)})`;
      c.fillRect((fw * (k + 0.3)) / 5, 0, fw / 12, fh * 1.1);
    }
    c.restore();
    c.lineWidth = Math.max(2, fh * 0.025);
    c.strokeStyle = INK;
    c.stroke();
    c.restore();
  });
}

/** Yerde duran nesneler ve hayvanlar (karakterlerin arasında) */
function drawGroundItems(c, items, L, th, lt, two) {
  if (!items.length) return;
  const size = L.charH * 0.36;
  const W = c.canvas.width;
  const cx = two ? (L.charX[0] + L.charX[1]) / 2 : L.charX[0] + L.facing * L.charH * 0.62;
  items.slice(0, 2).forEach((p, i) => {
    const k = easeBack((lt - 0.25 - i * 0.2) / 0.4);
    if (k <= 0) return;
    const x = Math.max(size * 0.6, Math.min(W - size * 0.6, cx + (items.length > 1 ? (i - 0.5) * size * 1.3 : 0)));
    c.save();
    c.translate(x, L.groundY + L.charH * 0.06 - size * 0.45);
    c.fillStyle = 'rgba(0,0,0,0.14)';
    c.beginPath();
    c.ellipse(0, size * 0.47, size * 0.5, size * 0.08, 0, 0, 7);
    c.fill();
    c.scale(k, k);
    drawIcon(c, p, size, { ...th, stroke: INK, bg: '#FFFFFF', dark: false }, lt);
    c.restore();
  });
}

function drawFace(c, x, y, r, emo, f, color, th, t, look = 0, closed = false, lw) {
  c.save();
  c.fillStyle = color;
  c.strokeStyle = color;
  c.lineWidth = Math.max(2, lw * 0.5);
  const ex = x + f * r * 0.22;
  const ey = y - r * 0.08 + look * r * 0.12;
  const blink = (t % 3.7) < 0.12;
  const gap = r * 0.36;
  const eyes = [ex - gap / 2 - f * r * 0.04, ex + gap / 2 + f * r * 0.04];
  if (emo === 'love') {
    for (const e of eyes) {
      c.save();
      c.translate(e, ey);
      c.beginPath();
      c.moveTo(0, r * 0.1);
      c.bezierCurveTo(-r * 0.2, -r * 0.02, -r * 0.12, -r * 0.18, 0, -r * 0.06);
      c.bezierCurveTo(r * 0.12, -r * 0.18, r * 0.2, -r * 0.02, 0, r * 0.1);
      c.fillStyle = '#E5484D';
      c.fill();
      c.restore();
    }
  } else if (closed || blink || emo === 'tired') {
    for (const e of eyes) {
      c.beginPath();
      if (emo === 'tired' && !closed) {
        c.moveTo(e - r * 0.1, ey);
        c.lineTo(e + r * 0.1, ey);
      } else c.arc(e, ey - r * 0.03, r * 0.09, 0.2, Math.PI - 0.2);
      c.stroke();
    }
  } else if (emo === 'surprised' || emo === 'scared') {
    for (const e of eyes) {
      c.beginPath();
      c.arc(e, ey, r * 0.12, 0, 7);
      c.fillStyle = th.bg;
      c.fill();
      c.stroke();
      c.beginPath();
      c.arc(e + f * r * 0.02, ey, r * 0.05, 0, 7);
      c.fillStyle = color;
      c.fill();
    }
  } else {
    for (const e of eyes) {
      c.beginPath();
      c.arc(e, ey + (emo === 'thinking' ? -r * 0.06 : 0), r * 0.075, 0, 7);
      c.fill();
    }
  }
  // kaşlar
  if (emo === 'angry' || emo === 'sad' || emo === 'surprised' || emo === 'scared') {
    c.lineWidth = Math.max(2, lw * 0.38);
    c.beginPath();
    for (const [i, e] of eyes.entries()) {
      const inner = i === 0 ? 1 : -1;
      const tilt = emo === 'angry' ? 1 : emo === 'sad' ? -1 : 0;
      const by = ey - r * (emo === 'surprised' || emo === 'scared' ? 0.32 : 0.22);
      c.moveTo(e - r * 0.12, by - tilt * inner * r * 0.08);
      c.lineTo(e + r * 0.12, by + tilt * inner * r * 0.08);
    }
    c.stroke();
  }
  // ağız
  const mx = x + f * r * 0.24, my = y + r * 0.38;
  c.beginPath();
  switch (emo) {
    case 'happy':
    case 'love':
      c.arc(mx, my - r * 0.12, r * 0.22, 0.25 * Math.PI, 0.75 * Math.PI);
      c.stroke();
      break;
    case 'excited':
      c.moveTo(mx - r * 0.22, my - r * 0.08);
      c.quadraticCurveTo(mx, my + r * 0.3, mx + r * 0.22, my - r * 0.08);
      c.closePath();
      c.fillStyle = color;
      c.fill();
      break;
    case 'sad':
      c.arc(mx, my + r * 0.12, r * 0.18, 1.2 * Math.PI, 1.8 * Math.PI);
      c.stroke();
      break;
    case 'angry':
      c.moveTo(mx - r * 0.16, my);
      c.lineTo(mx + r * 0.16, my - r * 0.03);
      c.stroke();
      break;
    case 'surprised':
      c.ellipse(mx, my, r * 0.09, r * 0.13, 0, 0, 7);
      c.fill();
      break;
    case 'scared':
      c.moveTo(mx - r * 0.18, my);
      for (let i = 1; i <= 4; i++) c.lineTo(mx - r * 0.18 + i * r * 0.09, my + (i % 2 ? -1 : 1) * r * 0.05);
      c.stroke();
      break;
    case 'thinking':
      c.moveTo(mx - r * 0.06, my);
      c.lineTo(mx + r * 0.14, my - r * 0.05);
      c.stroke();
      break;
    case 'tired':
      c.ellipse(mx, my, r * 0.08, r * 0.05, 0, 0, 7);
      c.stroke();
      break;
    default:
      c.moveTo(mx - r * 0.12, my);
      c.lineTo(mx + r * 0.12, my);
      c.stroke();
  }
  c.restore();
}

// ---------------------------------------------------------------------------
// ARKA PLAN & DOKU (önbellekli)
// ---------------------------------------------------------------------------
const cache = new Map();
function cached(key, W, H, draw) {
  const k = key + '|' + W + 'x' + H;
  if (cache.has(k)) return cache.get(k);
  const cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(W, H) : Object.assign(document.createElement('canvas'), { width: W, height: H });
  draw(cv.getContext('2d'));
  if (cache.size > 60) cache.delete(cache.keys().next().value);
  cache.set(k, cv);
  return cv;
}
export function clearCache() {
  cache.clear();
}

function drawBackground(c, W, H, bg, th, L) {
  const img = cached(`bg:${bg}:${th.bg}:${th.bg2}:${th.stroke}:${th.accent}`, W, H, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, th.bg);
    grad.addColorStop(1, th.bg2 || th.bg);
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    const ink = withAlpha(th.stroke, th.dark ? 0.16 : 0.12);
    const inkS = withAlpha(th.stroke, th.dark ? 0.1 : 0.07);
    g.strokeStyle = ink;
    g.fillStyle = inkS;
    g.lineWidth = Math.max(2, Math.min(W, H) * 0.004);
    g.lineCap = 'round';
    const gy = L.groundY;
    const r = rng(bg.length * 99 + 7);
    const u = Math.min(W, H) / 10;
    switch (bg) {
      case 'city': {
        let x = -u * 0.3;
        while (x < W) {
          const w = u * (0.6 + r() * 0.9), h = u * (1 + r() * 3.2);
          g.fillRect(x, gy - h, w - u * 0.08, h);
          g.strokeRect(x, gy - h, w - u * 0.08, h);
          g.save();
          g.fillStyle = withAlpha(th.accent, 0.18);
          for (let wy = gy - h + u * 0.25; wy < gy - u * 0.3; wy += u * 0.4) for (let wx = x + u * 0.12; wx < x + w - u * 0.25; wx += u * 0.25) if (r() > 0.45) g.fillRect(wx, wy, u * 0.1, u * 0.15);
          g.restore();
          x += w;
        }
        break;
      }
      case 'nature':
      case 'desert': {
        const des = bg === 'desert';
        g.beginPath();
        g.moveTo(0, gy - u * 1.2);
        g.bezierCurveTo(W * 0.25, gy - u * 2.6, W * 0.45, gy - u * 0.4, W * 0.7, gy - u * 1.8);
        g.bezierCurveTo(W * 0.85, gy - u * 2.4, W * 0.95, gy - u * 1.4, W, gy - u * 1.6);
        g.lineTo(W, gy);
        g.lineTo(0, gy);
        g.closePath();
        g.fill();
        g.stroke();
        g.beginPath();
        g.arc(W * 0.86, H * 0.16, u * 0.6, 0, 7);
        g.fillStyle = withAlpha(des ? '#FFB300' : th.accent, 0.25);
        g.fill();
        for (let i = 0; i < 4; i++) {
          const tx = W * (0.08 + i * 0.27) + r() * u;
          if (des) {
            g.beginPath();
            g.moveTo(tx, gy);
            g.lineTo(tx, gy - u * 1.1);
            g.moveTo(tx, gy - u * 0.6);
            g.lineTo(tx - u * 0.3, gy - u * 0.6);
            g.lineTo(tx - u * 0.3, gy - u * 0.85);
            g.moveTo(tx, gy - u * 0.5);
            g.lineTo(tx + u * 0.28, gy - u * 0.5);
            g.lineTo(tx + u * 0.28, gy - u * 0.8);
            g.lineWidth *= 2.4;
            g.stroke();
            g.lineWidth /= 2.4;
          } else {
            g.beginPath();
            g.moveTo(tx, gy);
            g.lineTo(tx, gy - u * 0.9);
            g.stroke();
            g.beginPath();
            g.arc(tx, gy - u * 1.2, u * 0.45, 0, 7);
            g.fillStyle = withAlpha('#57B05A', 0.2);
            g.fill();
            g.stroke();
          }
        }
        break;
      }
      case 'office':
      case 'home': {
        const off = bg === 'office';
        const wx = W * (L.portrait ? 0.15 : 0.62), wy = H * (L.portrait ? 0.08 : 0.12), ww = W * (L.portrait ? 0.7 : 0.3), wh = H * (L.portrait ? 0.14 : 0.32);
        g.strokeRect(wx, wy, ww, wh);
        g.beginPath();
        g.moveTo(wx + ww / 2, wy);
        g.lineTo(wx + ww / 2, wy + wh);
        if (off) for (let i = 1; i < 6; i++) {
          g.moveTo(wx, wy + (wh * i) / 6);
          g.lineTo(wx + ww, wy + (wh * i) / 6);
        }
        else {
          g.moveTo(wx, wy + wh / 2);
          g.lineTo(wx + ww, wy + wh / 2);
        }
        g.stroke();
        if (!off) {
          // tablo + abajur
          g.strokeRect(W * 0.08, H * 0.15, u * 1.3, u * 1);
          g.beginPath();
          g.moveTo(W * 0.08 + u * 0.2, H * 0.15 + u * 0.8);
          g.lineTo(W * 0.08 + u * 0.6, H * 0.15 + u * 0.35);
          g.lineTo(W * 0.08 + u * 1.1, H * 0.15 + u * 0.8);
          g.stroke();
          g.beginPath();
          g.moveTo(W * 0.92, gy);
          g.lineTo(W * 0.92, gy - u * 1.8);
          g.moveTo(W * 0.92 - u * 0.35, gy - u * 1.8);
          g.lineTo(W * 0.92 + u * 0.35, gy - u * 1.8);
          g.lineTo(W * 0.92 + u * 0.2, gy - u * 2.3);
          g.lineTo(W * 0.92 - u * 0.2, gy - u * 2.3);
          g.closePath();
          g.stroke();
        } else {
          g.beginPath();
          g.moveTo(W * 0.04, H * 0.2);
          g.lineTo(W * 0.04, gy);
          g.stroke();
          g.strokeRect(W * 0.04, H * 0.2, u * 0.9, u * 0.6);
        }
        break;
      }
      case 'space':
      case 'night': {
        for (let i = 0; i < 90; i++) {
          const sx = r() * W, sy = r() * L.groundY * 0.95, sz = r() * u * 0.05 + u * 0.015;
          g.fillStyle = withAlpha(th.dark ? '#ffffff' : th.stroke, 0.15 + r() * 0.35);
          g.beginPath();
          g.arc(sx, sy, sz, 0, 7);
          g.fill();
        }
        if (bg === 'space') {
          g.beginPath();
          g.arc(W * 0.82, H * 0.25, u * 0.9, 0, 7);
          g.fillStyle = withAlpha(th.accent2, 0.25);
          g.fill();
          g.stroke();
          g.beginPath();
          g.ellipse(W * 0.82, H * 0.25, u * 1.5, u * 0.35, -0.3, 0, 7);
          g.stroke();
        } else {
          g.fillStyle = withAlpha('#0A1030', th.dark ? 0.2 : 0.12);
          g.fillRect(0, 0, W, H);
          g.beginPath();
          g.arc(W * 0.85, H * 0.15, u * 0.55, 0, 7);
          g.fillStyle = withAlpha('#FFF3B0', 0.5);
          g.fill();
        }
        break;
      }
      case 'classroom': {
        const bx = W * 0.08, by = H * 0.08, bw = W * 0.84, bh = H * (L.portrait ? 0.12 : 0.1);
        g.strokeRect(bx, by, bw, bh);
        g.beginPath();
        g.arc(W * 0.9, H * 0.3, u * 0.35, 0, 7);
        g.stroke();
        break;
      }
      case 'lab': {
        const sy = H * 0.3;
        g.beginPath();
        g.moveTo(W * 0.05, sy);
        g.lineTo(W * 0.4, sy);
        g.stroke();
        for (let i = 0; i < 4; i++) {
          const fx = W * 0.08 + i * u * 0.8;
          g.beginPath();
          g.moveTo(fx, sy);
          g.lineTo(fx + u * 0.15, sy - u * 0.4);
          g.lineTo(fx + u * 0.15, sy - u * 0.7);
          g.lineTo(fx + u * 0.35, sy - u * 0.7);
          g.lineTo(fx + u * 0.35, sy - u * 0.4);
          g.lineTo(fx + u * 0.5, sy);
          g.closePath();
          g.fillStyle = withAlpha(i % 2 ? th.accent : th.accent2, 0.2);
          g.fill();
          g.stroke();
        }
        break;
      }
      case 'ocean':
        for (let k = 0; k < 4; k++) {
          g.beginPath();
          const yy = gy - u * (0.3 + k * 0.35);
          for (let x = 0; x <= W; x += u * 0.2) g.lineTo(x, yy + S(x / (u * 0.5) + k) * u * 0.08);
          g.stroke();
        }
        break;
      case 'road':
        g.save();
        g.setLineDash([u * 0.5, u * 0.4]);
        g.beginPath();
        g.moveTo(0, gy + u * 0.35);
        g.lineTo(W, gy + u * 0.35);
        g.stroke();
        g.restore();
        g.beginPath();
        g.moveTo(W * 0.9, gy);
        g.lineTo(W * 0.9, gy - u * 1.6);
        g.stroke();
        g.strokeRect(W * 0.9 - u * 0.4, gy - u * 2.1, u * 0.8, u * 0.5);
        break;
      case 'stage': {
        g.fillStyle = withAlpha(th.accent, 0.18);
        for (const side of [0, 1]) {
          g.beginPath();
          const x0 = side ? W : 0, x1 = side ? W * 0.85 : W * 0.15;
          g.moveTo(x0, 0);
          g.lineTo(x1, 0);
          g.quadraticCurveTo(lerp(x0, x1, 0.4), H * 0.4, x1 + (side ? 1 : -1) * W * 0.05, gy);
          g.lineTo(x0, gy);
          g.fill();
          g.stroke();
        }
        g.fillStyle = withAlpha('#FFFFFF', th.dark ? 0.06 : 0.25);
        g.beginPath();
        g.moveTo(W * 0.45, 0);
        g.lineTo(W * 0.55, 0);
        g.lineTo(W * 0.68, gy);
        g.lineTo(W * 0.22, gy);
        g.fill();
        break;
      }
    }
    // zemin çizgisi (el çizimi dalgalı)
    g.strokeStyle = withAlpha(th.stroke, 0.55);
    g.lineWidth = Math.max(2, u * 0.05);
    g.beginPath();
    for (let x = 0; x <= W; x += u * 0.25) g.lineTo(x, gy + S(x * 0.013) * u * 0.02 + (noise(x, 3) - 0.5) * u * 0.02);
    g.stroke();
  });
  c.drawImage(img, 0, 0);
}

function drawTexture(c, W, H, tex, th, t) {
  if (!tex || tex === 'none') {
    if (th.dark) drawVignette(c, W, H, 0.35);
    return;
  }
  if (tex === 'grain') {
    const frame = Math.floor(t * 12) % 3;
    c.drawImage(cached(`grain${frame}`, W, H, (g) => {
      const r = rng(frame + 1);
      for (let i = 0; i < (W * H) / 90; i++) {
        g.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
        g.fillRect(r() * W, r() * H, 1.5, 1.5);
      }
    }), 0, 0);
    drawVignette(c, W, H, 0.4);
    return;
  }
  const img = cached(`tex:${tex}:${th.stroke}:${th.bg}`, W, H, (g) => {
    const r = rng(tex.length * 31);
    const u = Math.min(W, H) / 10;
    if (tex === 'paper' || tex === 'whiteboard') {
      for (let i = 0; i < (W * H) / 260; i++) {
        g.fillStyle = `rgba(80,60,30,${r() * 0.05})`;
        g.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2);
      }
      if (tex === 'paper') {
        g.strokeStyle = 'rgba(120,90,40,0.05)';
        for (let i = 0; i < 40; i++) {
          g.beginPath();
          const x = r() * W, y = r() * H;
          g.moveTo(x, y);
          g.quadraticCurveTo(x + r() * u, y + r() * u * 0.3, x + r() * u * 2, y + (r() - 0.5) * u);
          g.stroke();
        }
      } else {
        g.strokeStyle = 'rgba(0,0,0,0.025)';
        g.lineWidth = u * 0.4;
        for (let i = 0; i < 8; i++) {
          g.beginPath();
          const y = r() * H;
          g.moveTo(0, y);
          g.lineTo(W, y + (r() - 0.5) * u * 2);
          g.stroke();
        }
      }
      const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, tex === 'paper' ? 'rgba(90,60,20,0.18)' : 'rgba(0,0,0,0.06)');
      g.fillStyle = vg;
      g.fillRect(0, 0, W, H);
    } else if (tex === 'grid') {
      g.strokeStyle = withAlpha(th.stroke, 0.07);
      g.lineWidth = 1;
      const step = u * 0.5;
      for (let x = 0; x < W; x += step) {
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x, H);
        g.stroke();
      }
      for (let y = 0; y < H; y += step) {
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(W, y);
        g.stroke();
      }
    } else if (tex === 'chalk') {
      for (let i = 0; i < 60; i++) {
        g.fillStyle = `rgba(255,255,255,${0.012 + r() * 0.02})`;
        g.beginPath();
        g.ellipse(r() * W, r() * H, u * (0.5 + r() * 2), u * (0.2 + r() * 0.6), r() * 3, 0, 7);
        g.fill();
      }
      for (let i = 0; i < (W * H) / 300; i++) {
        g.fillStyle = `rgba(255,255,255,${r() * 0.05})`;
        g.fillRect(r() * W, r() * H, 1.5, 1.5);
      }
    } else if (tex === 'crt') {
      g.fillStyle = 'rgba(0,0,0,0.08)';
      for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 2);
      const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.4)');
      g.fillStyle = vg;
      g.fillRect(0, 0, W, H);
    }
  });
  c.drawImage(img, 0, 0);
  if (tex === 'crt' && Math.floor(t * 30) % 47 === 0) {
    c.fillStyle = 'rgba(255,255,255,0.04)';
    c.fillRect(0, 0, W, H);
  }
}
function drawVignette(c, W, H, a) {
  c.drawImage(cached(`vig${a}`, W, H, (g) => {
    const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, `rgba(0,0,0,${a})`);
    g.fillStyle = vg;
    g.fillRect(0, 0, W, H);
  }), 0, 0);
}

// ---------------------------------------------------------------------------
// YERLEŞİM
// ---------------------------------------------------------------------------
function baseLayout(W, H, scene) {
  const portrait = H > W * 1.2;
  const square = !portrait && W < H * 1.2;
  const two = scene.characters === 2;
  if (portrait) {
    return {
      portrait, groundY: H * 0.7, charH: H * (two ? 0.2 : 0.25), charX: two ? [W * 0.28, W * 0.72] : [W * 0.5],
      props: { x: W * 0.5, y: H * 0.34, size: W * 0.24, spread: W * 0.3 }, kw: { x: W * 0.5, y: H * 0.16, size: W * 0.11, maxW: W * 0.9 },
      board: { x: W * 0.08, y: H * 0.22, w: W * 0.84, h: H * 0.22 }, sub: { y: H * 0.83, size: W * 0.062, maxW: W * 0.88 },
    };
  }
  if (square) {
    return {
      portrait, groundY: H * 0.8, charH: H * (two ? 0.36 : 0.42), charX: two ? [W * 0.26, W * 0.74] : [W * 0.3],
      props: two ? { x: W * 0.5, y: H * 0.3, size: H * 0.16, spread: H * 0.2 } : { x: W * 0.7, y: H * 0.45, size: H * 0.2, spread: H * 0.2 },
      kw: two ? { x: W * 0.5, y: H * 0.12, size: H * 0.085, maxW: W * 0.9 } : { x: W * 0.68, y: H * 0.18, size: H * 0.085, maxW: W * 0.58 },
      board: { x: W * 0.5, y: H * 0.18, w: W * 0.44, h: H * 0.48 }, sub: { y: H * 0.92, size: H * 0.05, maxW: W * 0.9 },
    };
  }
  return {
    portrait, groundY: H * 0.8, charH: H * (two ? 0.4 : 0.46), charX: two ? [W * 0.27, W * 0.73] : [W * 0.32],
    props: two ? { x: W * 0.5, y: H * 0.32, size: H * 0.17, spread: H * 0.22 } : { x: W * 0.68, y: H * 0.47, size: H * 0.22, spread: H * 0.26 },
    kw: two ? { x: W * 0.5, y: H * 0.13, size: H * 0.085, maxW: W * 0.8 } : { x: W * 0.68, y: H * 0.19, size: H * 0.09, maxW: W * 0.55 },
    board: { x: W * 0.5, y: H * 0.2, w: W * 0.42, h: H * 0.48 }, sub: { y: H * 0.92, size: H * 0.052, maxW: W * 0.86 },
  };
}

function layout(W, H, scene, st = {}, flip = false) {
  const L = baseLayout(W, H, scene);
  L.facing = 1;
  if (scene.characters !== 2 && scene.kind === 'scene') {
    if (st.layout === 'type') {
      if (L.portrait) {
        L.charH = H * 0.17;
        L.kw = { x: W * 0.5, y: H * 0.3, size: W * 0.16, maxW: W * 0.9 };
        L.props = { x: W * 0.5, y: H * 0.43, size: W * 0.13, spread: W * 0.22 };
      } else {
        L.charH = H * 0.34;
        L.charX = [W * 0.14];
        L.kw = { x: W * 0.6, y: H * 0.4, size: H * 0.15, maxW: W * 0.7 };
        L.props = { x: W * 0.6, y: H * 0.7, size: H * 0.12, spread: H * 0.2 };
      }
    } else if (st.layout === 'center') {
      L.charX = [W * 0.5];
      L.flank = !L.portrait;
    } else if (st.layout === 'split' && !L.portrait) {
      L.panel = { x: W * 0.52, y: H * 0.1, w: W * 0.43, h: H * 0.66 };
      L.props = { x: W * 0.735, y: H * 0.5, size: H * 0.15, spread: H * 0.19 };
      L.kw = { x: W * 0.735, y: H * 0.17, size: H * 0.06, maxW: W * 0.36 };
      L.list = true;
    }
  }
  if (flip) {
    L.facing = -1;
    L.charX = L.charX.map((x) => W - x);
    L.props.x = W - L.props.x;
    L.kw.x = W - L.kw.x;
    L.board.x = W - L.board.x - L.board.w;
    if (L.panel) L.panel.x = W - L.panel.x - L.panel.w;
  }
  return L;
}

function drawBgFx(c, W, H, st, th, scene, lt, L, cfg) {
  const u = Math.min(W, H) / 10, idx = scene.idx || 0;
  switch (st.bgfx) {
    case 'shapes': {
      const r = rng(idx * 7 + (cfg.seed || 1));
      c.save();
      const cx = W * (0.15 + r() * 0.7), cy = H * (0.15 + r() * 0.45), rad = u * (1.5 + r() * 2);
      c.lineWidth = u * 0.25;
      c.strokeStyle = withAlpha(th.accent2, 0.25);
      c.beginPath();
      c.arc(cx + S(lt * 0.5) * u * 0.3, cy, rad * easeOut(lt / 0.8), 0, 7);
      c.stroke();
      c.save();
      c.translate(W * (0.2 + r() * 0.6), 0);
      c.rotate(0.5);
      const sw = u * (0.6 + r());
      c.fillStyle = withAlpha(th.accent, 0.13);
      c.fillRect(-sw / 2, -H, sw, H * 3 * easeOut(lt / 0.6));
      c.fillRect(sw, -H, sw * 0.3, H * 3 * easeOut((lt - 0.15) / 0.6));
      c.restore();
      c.fillStyle = withAlpha(th.stroke, 0.2);
      const gx = W * (0.05 + r() * 0.25), gy = H * (0.07 + r() * 0.1);
      for (let a = 0; a < 6; a++) for (let b = 0; b < 4; b++) {
        const pk = clamp((lt - (a + b) * 0.05) / 0.2);
        c.beginPath();
        c.arc(gx + a * u * 0.36, gy + b * u * 0.36, u * 0.045 * pk, 0, 7);
        c.fill();
      }
      if (L.panel) {
        const p = L.panel, k = easeOut(lt / 0.45);
        c.globalAlpha = k;
        roundRect(c, p.x + (1 - k) * L.facing * W * 0.08, p.y, p.w, p.h, u * 0.3);
        c.fillStyle = withAlpha(th.accent2, th.dark ? 0.16 : 0.13);
        c.fill();
        c.lineWidth = u * 0.04;
        c.strokeStyle = withAlpha(th.stroke, 0.45);
        c.stroke();
      }
      c.restore();
      break;
    }
    case 'halftone': {
      const corner = (idx + (cfg.seed || 0)) % 4;
      c.drawImage(cached(`ht:${th.accent}:${corner}`, W, H, (g) => {
        const ox = corner % 2 ? W : 0, oy = corner < 2 ? 0 : H * 0.8;
        const step = u * 0.3, R = u * 6.5;
        g.fillStyle = withAlpha(th.accent, 0.4);
        for (let x = 0; x < W; x += step) for (let y = 0; y < H; y += step) {
          const d = Math.hypot(x - ox, y - oy) / R;
          if (d >= 1) continue;
          g.beginPath();
          g.arc(x + ((y / step) % 2 ? step / 2 : 0), y, step * 0.46 * (1 - d), 0, 7);
          g.fill();
        }
      }), 0, 0);
      break;
    }
    case 'burst': {
      c.save();
      c.translate(L.charX[0], L.groundY - L.charH * 0.6);
      c.rotate(lt * 0.14 + idx);
      const len = Math.max(W, H) * 1.3;
      for (let i = 0; i < 14; i++) {
        c.rotate((Math.PI * 2) / 14);
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(len, -len * 0.1);
        c.lineTo(len, len * 0.1);
        c.closePath();
        c.fillStyle = withAlpha(i % 2 ? th.accent : th.accent2, th.dark ? 0.13 : 0.11);
        c.fill();
      }
      c.restore();
      break;
    }
    case 'stripes': {
      c.save();
      c.translate(W / 2, H / 2);
      c.rotate(-0.55);
      const sw = u * 1.1, off = (lt * u * 0.5) % (sw * 2), R = Math.hypot(W, H);
      c.fillStyle = withAlpha(th.accent, th.dark ? 0.1 : 0.09);
      for (let x = -R; x < R; x += sw * 2) c.fillRect(x + off, -R, sw, R * 2);
      c.restore();
      break;
    }
    case 'bubbles': {
      const r = rng(idx * 5 + (cfg.seed || 1) + 11);
      for (let i = 0; i < 14; i++) {
        const bx = r() * W, rad = u * (0.25 + r() * 0.9), sp = 0.03 + r() * 0.06, by0 = r();
        const by = ((((by0 - lt * sp) % 1) + 1) % 1) * (H + rad * 2) - rad;
        c.beginPath();
        c.arc(bx + S(lt * 0.8 + i) * u * 0.2, by, rad, 0, 7);
        c.fillStyle = withAlpha(i % 2 ? th.accent : th.accent2, 0.15);
        c.fill();
      }
      break;
    }
    case 'spotlight': {
      const sx = L.charX[0] + S(lt * 0.7) * u * 0.15, sy = L.groundY - L.charH * 0.5;
      const g = c.createRadialGradient(sx, sy, L.charH * 0.35, sx, sy, Math.max(W, H) * 0.75);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.62)');
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
      c.beginPath();
      c.moveTo(sx - u * 0.3, 0);
      c.lineTo(sx + u * 0.3, 0);
      c.lineTo(sx + L.charH * 0.55, L.groundY);
      c.lineTo(sx - L.charH * 0.55, L.groundY);
      c.closePath();
      c.fillStyle = withAlpha('#FFFFFF', th.dark ? 0.07 : 0.18);
      c.fill();
      break;
    }
    case 'floor': {
      const gy = L.groundY, vx = W / 2;
      c.save();
      c.beginPath();
      c.arc(vx, gy, u * 1.9, Math.PI, 0);
      c.fillStyle = withAlpha(th.accent2, 0.25);
      c.fill();
      c.strokeStyle = withAlpha(th.accent, 0.5);
      c.lineWidth = Math.max(1, u * 0.025);
      for (let i = -10; i <= 10; i++) {
        c.beginPath();
        c.moveTo(vx + i * u * 0.5, gy);
        c.lineTo(vx + i * u * 4, H);
        c.stroke();
      }
      for (let k = 0; k < 7; k++) {
        const pp = (k + ((lt * 0.5) % 1)) / 7;
        const y = gy + (H - gy) * pp * pp;
        c.beginPath();
        c.moveTo(0, y);
        c.lineTo(W, y);
        c.stroke();
      }
      c.restore();
      break;
    }
    case 'blocks': {
      c.save();
      c.fillStyle = withAlpha(th.stroke, 0.07);
      c.beginPath();
      c.arc(L.kw.x, L.kw.y, H * 0.75 * easeOut(lt / 0.5), 0, 7);
      c.fill();
      c.fillStyle = withAlpha(th.stroke, 0.5);
      for (let i = 0; i < 3; i++) {
        const k = easeOut((lt - i * 0.08) / 0.4);
        const y = H * (0.06 + i * 0.018);
        c.fillRect(idx % 2 ? W * (1 - 0.3 * k) : 0, y, W * 0.3 * k, H * 0.006);
      }
      c.restore();
      break;
    }
  }
}

/** Stile özel ekran yazısı. true dönerse klasik anahtar kelime çizilmez. */
function drawStyledText(c, W, H, scene, lt, L, th, st, cfg, anchor) {
  if (scene.kind !== 'scene') return false;
  const mode = st.text || 'keyword';
  if (mode === 'keyword' || mode === 'marker') return false;
  if (mode === 'none') return true;
  const up = (s) => s.toLocaleUpperCase(th.locale || undefined);
  const idx = scene.idx || 0;
  const kw = (scene.keyword || '').trim();
  const boardY = (size) => (scene.board ? Math.min(L.kw.y, L.board.y - size * 0.8) : L.kw.y);

  if (mode === 'kinetic') {
    const tl = cfg._tl;
    if (!tl) return true;
    const t = scene.start + lt;
    const cues = tl.cues.filter((q) => q.start >= scene.audioStart - 0.01 && q.start < scene.start + scene.dur);
    const cue = cues.find((q) => t >= q.start && t < q.end) || [...cues].reverse().find((q) => t >= q.start);
    if (!cue) return true;
    let size = L.kw.size * (scene.board ? 0.4 : 1);
    const words = cue.words.map(up);
    let lines, widths, gap;
    c.save();
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (let tries = 0; tries < 6; tries++) {
      c.font = `900 ${size}px ${th.fontFamily}`;
      gap = size * 0.28;
      widths = words.map((w) => c.measureText(w).width);
      lines = [[]];
      let lw = 0;
      words.forEach((w, i) => {
        if (lw + widths[i] > L.kw.maxW && lines[lines.length - 1].length) {
          lines.push([]);
          lw = 0;
        }
        lines[lines.length - 1].push(i);
        lw += widths[i] + gap;
      });
      if (lines.length <= 3 && Math.max(...widths) <= L.kw.maxW) break;
      size *= 0.85;
    }
    const lh = size * 1.02;
    const y0 = Math.max(boardY(size) - ((lines.length - 1) * lh) / 2, lh * 0.6 + H * 0.02);
    lines.forEach((ln, li) => {
      const total = ln.reduce((a, i) => a + widths[i], 0) + gap * (ln.length - 1);
      let x = L.kw.x - total / 2;
      for (const i of ln) {
        const [ws, we] = cue.wordTimes[i];
        if (t >= ws) {
          const k = easeBack((t - ws) / 0.16);
          const active = t < we;
          c.save();
          c.translate(x + widths[i] / 2, y0 + li * lh);
          c.rotate(((i % 2 ? 1 : -1) * (1 - clamp((t - ws) / 0.16)) * 0.15));
          c.scale(k * (active ? 1.07 : 1), k * (active ? 1.07 : 1));
          c.lineJoin = 'round';
          c.lineWidth = size * 0.1;
          c.strokeStyle = th.bg;
          c.strokeText(words[i], 0, 0);
          c.fillStyle = active ? th.accent : th.text;
          c.fillText(words[i], 0, 0);
          c.restore();
        }
        x += widths[i] + gap;
      }
    });
    c.restore();
    return true;
  }
  if (!kw) return true;
  c.save();
  c.textAlign = 'center';
  c.textBaseline = 'middle';

  if (mode === 'handwrite') {
    const size = L.kw.size * 0.95;
    c.font = `700 ${size}px ${th.fontFamily}`;
    const lines = wrap(c, kw, L.kw.maxW);
    const lh = size * 1.1;
    const y0 = boardY(size) - ((lines.length - 1) * lh) / 2;
    const prog = clamp((lt - 0.25) / (0.5 + lines.length * 0.35)) * lines.length;
    c.translate(L.kw.x, 0);
    c.rotate(-0.02);
    lines.forEach((ln, i) => {
      const k = clamp(prog - i);
      if (k <= 0) return;
      const w = c.measureText(ln).width, y = y0 + i * lh;
      c.save();
      c.beginPath();
      c.rect(-w / 2 - size * 0.1, y - lh / 2, (w + size * 0.2) * k, lh);
      c.clip();
      c.fillStyle = th.text;
      c.fillText(ln, 0, y);
      c.restore();
      c.strokeStyle = th.accent;
      c.lineWidth = size * 0.07;
      c.lineCap = 'round';
      c.beginPath();
      for (let x = 0; x <= w * k; x += size * 0.12) c.lineTo(-w / 2 + x, y + size * 0.55 + S(x / (size * 0.25)) * size * 0.04);
      c.stroke();
      if (k < 1) {
        c.save();
        c.translate(-w / 2 + w * k + size * 0.25, y - size * 0.2 + S(lt * 40) * size * 0.08);
        drawIcon(c, 'pen', size * 0.9, th, 0);
        c.restore();
      }
    });
  } else if (mode === 'punch') {
    let size = L.kw.size * 1.35;
    const txt = up(kw);
    c.font = `900 ${size}px ${th.fontFamily}`;
    let lines = wrap(c, txt, L.kw.maxW);
    if (lines.length > 2) {
      size *= 0.75;
      c.font = `900 ${size}px ${th.fontFamily}`;
      lines = wrap(c, txt, L.kw.maxW);
    }
    const k = clamp((lt - 0.1) / 0.22);
    if (k > 0) {
      const sc = lerp(1.9, 1, easeOut(k)) * (1 + S(lt * 6) * 0.012);
      const lh = size * 1.02;
      c.globalAlpha = k;
      c.translate(L.kw.x, boardY(size) + ((lines.length - 1) * lh) / 2 * 0);
      c.rotate((idx % 2 ? 1 : -1) * 0.05);
      c.scale(sc, sc);
      const fill = [th.accent, '#FFFFFF', '#FFD54A'][idx % 3];
      lines.forEach((ln, i) => {
        const y = (i - (lines.length - 1) / 2) * lh;
        c.lineJoin = 'round';
        c.lineWidth = size * 0.24;
        c.strokeStyle = '#111111';
        c.strokeText(ln, size * 0.05, y + size * 0.06);
        c.strokeText(ln, 0, y);
        c.fillStyle = fill;
        c.fillText(ln, 0, y);
      });
    }
  } else if (mode === 'bubble') {
    const size = L.kw.size * 0.62;
    c.font = `800 ${size}px ${th.fontFamily}`;
    const lines = wrap(c, up(kw), L.kw.maxW * 0.8);
    const lh = size * 1.15;
    const bw = Math.max(...lines.map((l) => c.measureText(l).width)) + size * 1.4;
    const bh = lines.length * lh + size * 0.9;
    const bx = L.kw.x, by = boardY(size);
    const k = easeBack((lt - 0.15) / 0.3);
    if (k > 0) {
      c.translate(bx, by);
      c.scale(k, k);
      c.lineWidth = size * 0.11;
      c.strokeStyle = '#111111';
      c.fillStyle = '#FFFFFF';
      if (anchor) {
        const ax = anchor[0] - bx, ay = anchor[1] - by;
        const d = Math.hypot(ax, ay) || 1;
        const tx = (ax / d) * Math.min(d * 0.55, bh * 1.6), ty = (ay / d) * Math.min(d * 0.55, bh * 1.6);
        const nx = -ay / d, ny = ax / d;
        c.beginPath();
        c.moveTo(nx * size * 0.4, ny * size * 0.4);
        c.lineTo(tx, ty);
        c.lineTo(-nx * size * 0.4, -ny * size * 0.4);
        c.closePath();
        c.fill();
        c.stroke();
      }
      c.beginPath();
      c.ellipse(0, 0, bw / 2 + size * 0.2, bh / 2 + size * 0.15, 0, 0, 7);
      c.fill();
      c.stroke();
      if (anchor) {
        // kuyruğun balonla birleştiği yerdeki çizgiyi kapat
        c.beginPath();
        c.ellipse(0, 0, bw / 2 + size * 0.2 - c.lineWidth * 0.6, bh / 2 + size * 0.15 - c.lineWidth * 0.6, 0, 0, 7);
        c.fill();
      }
      c.fillStyle = '#111111';
      lines.forEach((ln, i) => c.fillText(ln, 0, (i - (lines.length - 1) / 2) * lh));
    }
  } else if (mode === 'stamp' || mode === 'neon') {
    let size = L.kw.size * 1.08;
    const txt = up(kw);
    c.font = `900 ${size}px ${th.fontFamily}`;
    while (c.measureText(txt).width > L.kw.maxW * 0.88 && size > 8) {
      size *= 0.92;
      c.font = `900 ${size}px ${th.fontFamily}`;
    }
    const tw = c.measureText(txt).width;
    c.translate(L.kw.x, boardY(size));
    if (mode === 'stamp') {
      const k = clamp((lt - 0.15) / 0.18);
      if (k > 0) {
        const sc = lerp(2.2, 1, easeOut(k));
        c.globalAlpha = k * 0.93;
        c.rotate((idx % 2 ? 1 : -1) * 0.09);
        c.scale(sc, sc);
        c.strokeStyle = th.accent;
        c.lineWidth = size * 0.1;
        roundRect(c, -tw / 2 - size * 0.42, -size * 0.78, tw + size * 0.84, size * 1.56, size * 0.15);
        c.stroke();
        c.lineWidth = size * 0.035;
        roundRect(c, -tw / 2 - size * 0.28, -size * 0.64, tw + size * 0.56, size * 1.28, size * 0.1);
        c.stroke();
        c.fillStyle = th.accent;
        c.fillText(txt, 0, size * 0.05);
      }
    } else {
      const k = clamp((lt - 0.15) / 0.3);
      if (k > 0) {
        const flick = lt > 1 || noise(Math.floor(lt * 18), idx + 1) > 0.15 ? 1 : 0.3;
        c.globalAlpha = k * flick;
        c.shadowColor = th.accent;
        c.shadowBlur = size * 0.6;
        c.lineJoin = 'round';
        c.lineWidth = size * 0.09;
        c.strokeStyle = th.accent;
        c.strokeText(txt, 0, 0);
        c.shadowBlur = size * 0.2;
        c.fillStyle = '#FFFFFF';
        c.fillText(txt, 0, 0);
      }
    }
  } else if (mode === 'ticker') {
    const bh = (L.portrait ? W : H) * 0.085, y = H * (L.portrait ? 0.12 : 0.115);
    const k = easeOut((lt - 0.1) / 0.4);
    if (k > 0) {
      const bw = bh * 1.7;
      c.fillStyle = th.accent;
      c.fillRect(0, y - bh / 2, W * k, bh);
      c.fillStyle = th.stroke;
      c.fillRect(0, y - bh / 2, bw * k, bh);
      if (k > 0.6) {
        c.font = `900 ${bh * 0.46}px ${th.fontFamily}`;
        c.fillStyle = th.bg;
        c.fillText('● ' + String(idx + 1).padStart(2, '0'), bw / 2, y + bh * 0.03);
      }
      c.beginPath();
      c.rect(bw, y - bh / 2, W - bw, bh);
      c.clip();
      c.textAlign = 'left';
      c.font = `800 ${bh * 0.56}px ${th.fontFamily}`;
      c.fillStyle = luminanceHex(th.accent) > 0.6 ? '#111111' : '#FFFFFF';
      c.fillText(up(kw), bw + bh * 0.4 + (1 - k) * W * 0.5, y + bh * 0.03);
    }
  } else if (mode === 'label') {
    let size = L.kw.size;
    const txt = up(kw);
    c.font = `800 ${size}px ${th.fontFamily}`;
    while (c.measureText(txt).width > L.kw.maxW - size * 2.6 && size > 8) {
      size *= 0.92;
      c.font = `800 ${size}px ${th.fontFamily}`;
    }
    const tw = c.measureText(txt).width;
    const ph = size * 1.7, pw = tw + size * 3.1;
    const k = easeOut((lt - 0.15) / 0.4);
    if (k > 0) {
      c.globalAlpha = clamp(k * 1.5);
      c.translate(L.kw.x + (1 - k) * L.facing * size * 3, boardY(size));
      roundRect(c, -pw / 2, -ph / 2, pw, ph, ph / 2);
      c.fillStyle = th.accent;
      c.fill();
      c.beginPath();
      c.arc(-pw / 2 + ph / 2, 0, ph * 0.4, 0, 7);
      c.fillStyle = th.bg;
      c.fill();
      c.fillStyle = th.text;
      c.font = `900 ${size * 0.8}px ${th.fontFamily}`;
      c.fillText(String(idx + 1).padStart(2, '0'), -pw / 2 + ph / 2, size * 0.04);
      c.font = `800 ${size}px ${th.fontFamily}`;
      c.fillStyle = luminanceHex(th.accent) > 0.6 ? '#111111' : '#FFFFFF';
      c.fillText(txt, ph * 0.42, size * 0.04);
    }
  }
  c.restore();
  return true;
}


// ---------------------------------------------------------------------------
// METİN
// ---------------------------------------------------------------------------
function wrap(c, text, maxW) {
  const words = text.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (c.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawKeyword(c, scene, lt, L, th, prof) {
  const kw = (scene.keyword || '').trim();
  if (!kw) return;
  const lvl = { low: 0.75, medium: 1, high: 1.2, max: 1.45 }[prof.text || 'medium'] || 1;
  const isTitle = scene.kind !== 'scene';
  const k = easeBack((lt - 0.15) / 0.45);
  if (k <= 0) return;
  const size = L.kw.size * lvl * (isTitle ? 1.25 : 1);
  c.save();
  const CW = c.canvas.width, CH = c.canvas.height;
  let pos = L.kw;
  let maxW = L.kw.maxW;
  if (scene.kind === 'intro') {
    pos = L.portrait ? { x: CW / 2, y: CH * 0.24 } : { x: CW * 0.66, y: CH * 0.42 };
    maxW = L.portrait ? CW * 0.88 : CW * 0.58;
  } else if (isTitle) {
    pos = { x: CW / 2, y: L.portrait ? L.kw.y + size : L.kw.y + size * 0.4 };
    maxW = CW * 0.85;
  } else if (scene.board) {
    pos = { x: L.kw.x, y: Math.min(L.kw.y, L.board.y - size * 0.75) };
  }
  c.translate(pos.x, pos.y);
  c.rotate(-0.025);
  c.scale(k, k);
  c.font = `900 ${size}px ${th.fontFamily}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const text = prof.text === 'max' || isTitle ? kw.toLocaleUpperCase(th.locale || undefined) : kw;
  const lines = wrap(c, text, maxW);
  const lh = size * 1.08;
  const y0 = (-(lines.length - 1) * lh) / 2;
  lines.forEach((ln, i) => {
    const y = y0 + i * lh;
    const w = c.measureText(ln).width;
    if (prof.text === 'high' || prof.text === 'max' || isTitle) {
      const sw = clamp((lt - 0.3) / 0.35);
      c.fillStyle = th.accent;
      c.fillRect(-w / 2 - size * 0.15, y - size * 0.5, (w + size * 0.3) * sw, size * 1.0);
      c.fillStyle = luminanceHex(th.accent) > 0.6 ? '#111' : '#fff';
      c.fillText(ln, 0, y + size * 0.04);
    } else {
      c.lineWidth = size * 0.16;
      c.strokeStyle = th.bg;
      c.lineJoin = 'round';
      c.strokeText(ln, 0, y);
      c.fillStyle = th.text;
      c.fillText(ln, 0, y);
      const sw = clamp((lt - 0.35) / 0.3);
      c.strokeStyle = th.accent;
      c.lineWidth = size * 0.09;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(-w / 2, y + size * 0.55);
      c.lineTo(-w / 2 + w * sw, y + size * 0.55);
      c.stroke();
    }
  });
  c.restore();
}
function luminanceHex(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

function drawSubtitles(c, W, H, tl, t, L, th, cfg) {
  const cue = tl.cues.find((q) => t >= q.start && t < q.end + 0.12);
  if (!cue) return;
  const st = cfg.subtitleStyle || 'outline';
  const size = L.sub.size * (cfg.subtitleScale || 1);
  c.save();
  c.font = `800 ${size}px ${cfg.subtitleFont || th.fontFamily}`;
  c.textAlign = 'left';
  c.textBaseline = 'middle';
  // kalın kontur kelime arasını kapatmasın diye boşluğu genişlet
  const space = c.measureText(' ').width + (st === 'minimal' ? 0 : size * 0.2);
  // satırlara böl (kelime bazlı)
  const lines = [[]];
  let lw = 0;
  cue.words.forEach((w, i) => {
    const ww = c.measureText(w).width;
    if (lw + ww > L.sub.maxW && lines[lines.length - 1].length) {
      lines.push([]);
      lw = 0;
    }
    lines[lines.length - 1].push({ w, ww, i });
    lw += ww + space;
  });
  const lh = size * 1.25;
  const yBase = L.sub.y - ((lines.length - 1) * lh) / 2;
  const pop = easeBack((t - cue.start) / 0.18);
  lines.forEach((ln, li) => {
    const total = ln.reduce((a, x) => a + x.ww, 0) + space * (ln.length - 1);
    let x = W / 2 - total / 2;
    const y = yBase + li * lh;
    if (st === 'box') {
      c.fillStyle = 'rgba(0,0,0,0.62)';
      const pad = size * 0.3;
      roundRect(c, x - pad, y - lh / 2, total + pad * 2, lh, size * 0.2);
      c.fill();
    }
    for (const it of ln) {
      const [ws, we] = cue.wordTimes[it.i];
      const active = t >= ws && t < we;
      const spoken = t >= ws;
      c.save();
      const sc = st === 'karaoke' && active ? 1.12 : 1;
      c.translate(x + it.ww / 2, y);
      c.scale(sc * (st === 'minimal' ? 1 : lerp(0.85, 1, pop)), sc * (st === 'minimal' ? 1 : lerp(0.85, 1, pop)));
      c.translate(-it.ww / 2, 0);
      if (st === 'minimal') {
        c.fillStyle = withAlpha(th.text, 0.92);
        c.fillText(it.w, 0, 0);
      } else if (st === 'box') {
        c.fillStyle = active ? (cfg.subtitleColor || '#FFD54A') : '#FFFFFF';
        c.fillText(it.w, 0, 0);
      } else {
        c.lineWidth = size * 0.2;
        c.lineJoin = 'round';
        c.strokeStyle = '#000';
        c.strokeText(it.w, 0, 0);
        const hl = cfg.subtitleColor || th.accent;
        c.fillStyle = st === 'karaoke' ? (active ? hl : spoken ? '#FFFFFF' : 'rgba(255,255,255,0.75)') : active ? hl : '#FFFFFF';
        c.fillText(it.w, 0, 0);
      }
      c.restore();
      x += it.ww + space;
    }
  });
  c.restore();
}
function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

// ---------------------------------------------------------------------------
// SAHNE ÇİZİMİ
// ---------------------------------------------------------------------------
function drawBoard(c, L, th, scene, lt) {
  const b = L.board;
  const k = easeOut(lt / 0.4);
  c.save();
  c.globalAlpha = k;
  c.translate(0, (1 - k) * b.h * 0.1);
  roundRect(c, b.x, b.y, b.w, b.h, b.h * 0.04);
  c.fillStyle = th.dark ? withAlpha('#ffffff', 0.06) : '#FFFFFF';
  c.fill();
  c.lineWidth = Math.max(3, b.h * 0.018);
  c.strokeStyle = th.stroke;
  c.stroke();
  // ayak
  c.beginPath();
  c.moveTo(b.x + b.w * 0.25, b.y + b.h);
  c.lineTo(b.x + b.w * 0.2, L.groundY);
  c.moveTo(b.x + b.w * 0.75, b.y + b.h);
  c.lineTo(b.x + b.w * 0.8, L.groundY);
  c.stroke();
  const ch = scene.chart;
  if (ch) drawChart(c, b, ch, th, lt);
  else if (scene.props?.length) {
    const n = scene.props.length;
    scene.props.forEach((p, i) => {
      const pk = easeBack((lt - 0.3 - i * 0.25) / 0.4);
      if (pk <= 0) return;
      c.save();
      c.translate(b.x + (b.w * (i + 1)) / (n + 1), b.y + b.h * 0.5);
      c.scale(pk, pk);
      drawIcon(c, p, Math.min(b.h * 0.55, (b.w / (n + 0.5)) * 0.8), th, lt);
      c.restore();
    });
  } else if (scene.action === 'write') {
    c.strokeStyle = th.accent2;
    c.lineWidth = b.h * 0.03;
    for (let i = 0; i < 4; i++) {
      const w = clamp((lt - i * 0.7) / 0.7);
      if (w <= 0) break;
      c.beginPath();
      const y = b.y + b.h * (0.22 + i * 0.18);
      for (let x = 0; x <= w * b.w * 0.75; x += b.w * 0.02) c.lineTo(b.x + b.w * 0.12 + x, y + S(x * 0.15) * b.h * 0.02);
      c.stroke();
    }
  }
  c.restore();
}

function drawChart(c, b, ch, th, lt) {
  const vals = ch.values;
  const max = Math.max(...vals, 1);
  const pad = b.w * 0.1;
  const x0 = b.x + pad, y0 = b.y + b.h - pad * 0.9, w = b.w - pad * 2, h = b.h - pad * 1.8;
  const k = easeInOut((lt - 0.3) / 1.2);
  c.lineWidth = Math.max(2, b.h * 0.012);
  c.strokeStyle = th.stroke;
  c.beginPath();
  c.moveTo(x0, y0 - h);
  c.lineTo(x0, y0);
  c.lineTo(x0 + w, y0);
  c.stroke();
  c.font = `700 ${b.h * 0.07}px ${th.fontFamily}`;
  c.textAlign = 'center';
  c.fillStyle = th.text;
  if (ch.type === 'pie') {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2, r = Math.min(b.w, b.h) * 0.36;
    const sum = vals.reduce((a, v) => a + v, 0) || 1;
    let a0 = -Math.PI / 2;
    const cols = [th.accent, th.accent2, '#FFD54A', '#2BB673', '#9B5DE5', '#F15BB5'];
    vals.forEach((v, i) => {
      const a1 = a0 + (v / sum) * Math.PI * 2 * k;
      c.beginPath();
      c.moveTo(cx, cy);
      c.arc(cx, cy, r, a0, a1);
      c.closePath();
      c.fillStyle = cols[i % cols.length];
      c.fill();
      c.stroke();
      a0 = a1;
    });
    return;
  }
  const n = vals.length;
  if (ch.type === 'line') {
    c.strokeStyle = th.accent;
    c.lineWidth = b.h * 0.025;
    c.beginPath();
    const upto = k * (n - 1);
    for (let i = 0; i <= Math.floor(upto); i++) {
      const px = x0 + (w * i) / (n - 1), py = y0 - (vals[i] / max) * h * 0.9;
      i ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    const fi = Math.floor(upto);
    if (fi < n - 1) {
      const f = upto - fi;
      c.lineTo(x0 + (w * (fi + f)) / (n - 1), y0 - (lerp(vals[fi], vals[fi + 1], f) / max) * h * 0.9);
    }
    c.stroke();
  } else {
    const bw = (w / n) * 0.6;
    vals.forEach((v, i) => {
      const bk = easeOut((lt - 0.3 - i * 0.12) / 0.6);
      const bh = (v / max) * h * 0.9 * bk;
      const bx = x0 + (w / n) * i + (w / n - bw) / 2;
      c.fillStyle = i === vals.indexOf(max) ? th.accent : th.accent2;
      c.fillRect(bx, y0 - bh, bw, bh);
      c.strokeRect(bx, y0 - bh, bw, bh);
      if (ch.labels?.[i]) {
        c.fillStyle = th.text;
        c.fillText(ch.labels[i], bx + bw / 2, y0 + b.h * 0.07);
      }
    });
  }
}

function drawExtras(c, ex, info, L, th, lt, scene, s, f) {
  const u = s;
  c.save();
  c.strokeStyle = th.stroke;
  c.lineWidth = Math.max(2, u * 0.06);
  c.lineCap = 'round';
  const hx = info.head[0], hy = info.head[1];
  if (ex.thought) {
    for (let i = 0; i < 3; i++) {
      const k = clamp((lt - 0.3 - i * 0.2) / 0.2);
      c.globalAlpha = k;
      c.beginPath();
      c.arc(hx + f * u * (0.45 + i * 0.25), hy - u * (0.5 + i * 0.3), u * (0.06 + i * 0.04), 0, 7);
      c.stroke();
    }
    c.globalAlpha = 1;
  }
  if (ex.ideaK > 0 && !scene.props.includes('lightbulb')) {
    c.save();
    c.translate(hx, hy - u * 0.9);
    const k = easeBack(ex.ideaK);
    c.scale(k, k);
    drawIcon(c, 'lightbulb', u * 0.7, th, lt);
    c.restore();
  }
  if (ex.exclaim) {
    const k = easeBack(lt / 0.3);
    c.save();
    c.translate(hx + f * u * 0.2, hy - u * 0.8);
    c.scale(k, k);
    drawIcon(c, 'exclamation', u * 0.7, th, lt);
    c.restore();
  }
  if (ex.steam) {
    c.strokeStyle = withAlpha(th.accent, 0.8);
    for (const sd of [-1, 1]) {
      const k = (lt * 1.5) % 1;
      c.globalAlpha = 1 - k;
      c.beginPath();
      const sx = hx + sd * u * 0.35, sy = hy - u * 0.3 - k * u * 0.6;
      c.arc(sx, sy, u * 0.08 + k * u * 0.1, 0, 7);
      c.stroke();
    }
    c.globalAlpha = 1;
  }
  if (ex.sweat || ex.tears) {
    c.fillStyle = '#4FC3F7';
    const n = ex.tears ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const k = (lt * (ex.tears ? 1.6 : 1) + i * 0.5) % 1;
      const dx = ex.tears ? hx + f * u * (0.12 + i * 0.22) : hx - f * u * 0.3;
      const dy = hy + (ex.tears ? 0 : -u * 0.1) + k * u * 0.5;
      c.globalAlpha = 1 - k * 0.6;
      c.beginPath();
      c.moveTo(dx, dy - u * 0.08);
      c.quadraticCurveTo(dx + u * 0.06, dy, dx, dy + u * 0.04);
      c.quadraticCurveTo(dx - u * 0.06, dy, dx, dy - u * 0.08);
      c.fill();
    }
    c.globalAlpha = 1;
  }
  if (ex.rainCloud) {
    c.save();
    c.translate(hx, hy - u * 1.0);
    drawIcon(c, 'rain', u * 0.85, th, lt);
    c.restore();
  }
  if (ex.zzz) {
    c.save();
    c.translate(hx + f * u * 0.5, hy - u * 0.5);
    drawIcon(c, 'zzz', u * 0.8, th, lt);
    c.restore();
  }
  if (ex.dizzy) {
    for (let i = 0; i < 3; i++) {
      const a = lt * 4 + (i * Math.PI * 2) / 3;
      c.save();
      c.translate(info.hx + Math.cos(a) * u * 0.4 + f * u * 1.4, L.groundY - u * 0.55 + Math.sin(a) * u * 0.12);
      drawIcon(c, 'star', u * 0.25, th, lt);
      c.restore();
    }
  }
  if (ex.music) {
    c.save();
    c.translate(hx + u * 0.9, hy - u * 0.4 + S(lt * 3) * u * 0.1);
    drawIcon(c, 'music', u * 0.5, th, lt);
    c.restore();
  }
  if (ex.hearts) {
    for (let i = 0; i < 3; i++) {
      const k = (lt * 0.7 + i / 3) % 1;
      c.save();
      c.globalAlpha = 1 - k;
      c.translate(c.canvas.width / 2 + (i - 1) * u * 0.4, hy - u * 0.4 - k * u * 1.2);
      drawIcon(c, 'heart', u * 0.35, th, lt);
      c.restore();
    }
  }
  if (ex.aura) {
    c.strokeStyle = withAlpha(th.accent, 0.35 + 0.15 * S(lt * 2));
    c.lineWidth = u * 0.05;
    c.beginPath();
    c.ellipse(info.hx, info.hy - u * 0.5, u * 1.1, u * 1.4, 0, 0, 7);
    c.stroke();
  }
  if (ex.speedLines) {
    c.strokeStyle = withAlpha(th.stroke, 0.35);
    for (let i = 0; i < 4; i++) {
      const y = info.hy - u * 0.8 + i * u * 0.35;
      const off = ((lt * 6 + i * 0.3) % 1) * u * 0.6;
      c.beginPath();
      c.moveTo(info.hx - f * (u * 0.8 + off), y);
      c.lineTo(info.hx - f * (u * 1.6 + off), y);
      c.stroke();
    }
  }
  if (ex.confetti) {
    const r = rng(scene.idx * 13 + 5);
    const cols = [th.accent, th.accent2, '#FFD54A', '#2BB673'];
    for (let i = 0; i < 26; i++) {
      const px = info.hx + (r() - 0.5) * u * 4;
      const sp = 0.5 + r();
      const py = info.hy - u * 2.5 + ((lt * sp * u * 1.3 + r() * u * 3) % (u * 3.2));
      c.save();
      c.translate(px, py);
      c.rotate(lt * 5 * sp + i);
      c.fillStyle = cols[i % 4];
      c.fillRect(-u * 0.04, -u * 0.07, u * 0.08, u * 0.14);
      c.restore();
    }
  }
  c.restore();
}

function drawProps(c, scene, lt, L, th, skip, st = {}, cfg = {}) {
  if (skip || !scene.props?.length) return;
  const n = scene.props.length;
  const P0 = L.props;
  const W = c.canvas.width, H = c.canvas.height;
  const arr = L.list ? 'list' : L.flank ? 'flank' : ['row', 'arc', 'orbit'][variant(cfg, scene, 5, 3)];
  const cardTh = st.cards ? { ...th, stroke: '#1B1B1B', bg: '#FFFDF5', dark: false } : th;
  scene.props.forEach((p, i) => {
    const kRaw = (lt - 0.2 - i * 0.28) / 0.45;
    if (kRaw <= 0) return;
    let size = P0.size * (n === 1 ? 1.15 : n === 2 ? 0.95 : 0.8) * (st.cards && L.portrait ? 0.74 : 1);
    const off = n === 1 ? 0 : (i - (n - 1) / 2) * P0.spread;
    let x = P0.x + off, y = P0.y + (n === 3 && i === 1 ? -size * 0.25 : 0);
    if (arr === 'list') {
      size = P0.size * (n === 1 ? 1.3 : n === 2 ? 1 : 0.8);
      x = P0.x;
      y = P0.y + (i - (n - 1) / 2) * size * 1.45;
    } else if (arr === 'flank') {
      size = H * 0.17;
      x = W * 0.5 + (i === 0 ? 1 : i === 1 ? -1 : 0) * W * 0.27;
      y = i === 2 ? H * 0.2 : H * 0.43;
    } else if (arr === 'arc' && n > 1) {
      y = P0.y - size * 0.15 + (Math.abs(off) / (P0.spread || 1)) * size * 0.4;
    } else if (arr === 'orbit' && n > 1) {
      const a = lt * 0.6 + (i * Math.PI * 2) / n;
      x = P0.x + C(a) * P0.spread * 0.6;
      y = P0.y + S(a) * P0.spread * 0.32;
    }
    y += S(lt * 2 + i * 1.7) * size * 0.04;
    c.save();
    c.translate(x, y);
    const k = clamp(kRaw);
    switch (st.reveal) {
      case 'slam': {
        const kk = clamp(kRaw * 1.7);
        const sc = lerp(3, 1, easeOut(kk));
        c.globalAlpha = kk;
        c.scale(sc, sc);
        c.rotate((1 - kk) * (i % 2 ? 0.5 : -0.5));
        break;
      }
      case 'drop':
        c.translate(0, -(1 - easeBounce(k)) * size * 4);
        c.rotate((1 - k) * (i % 2 ? 0.7 : -0.7));
        break;
      case 'slide':
        c.globalAlpha = k;
        c.translate((1 - easeOut(k)) * size * 3 * (L.facing || 1), 0);
        break;
      case 'fade':
        c.globalAlpha = k;
        break;
      case 'draw':
        c.beginPath();
        c.rect(-size * 0.85, -size * 0.85, size * 1.7 * clamp(kRaw * 0.6), size * 1.7);
        c.clip();
        break;
      default: {
        const s = easeBack(kRaw);
        c.scale(s, s);
      }
    }
    if (st.cards) {
      c.rotate((noise(i + 1, (scene.idx || 0) + 3) - 0.5) * 0.22);
      const cs = size * 1.45;
      c.fillStyle = 'rgba(0,0,0,0.22)';
      c.fillRect(-cs / 2 + size * 0.06, -cs / 2 + size * 0.08, cs, cs);
      c.fillStyle = cardTh.bg;
      c.fillRect(-cs / 2, -cs / 2, cs, cs);
      if (arr === 'list') {
        c.fillStyle = th.accent;
        c.font = `900 ${size * 0.3}px ${th.fontFamily}`;
        c.textAlign = 'left';
        c.textBaseline = 'top';
        c.fillText(String(i + 1), -cs / 2 + size * 0.1, -cs / 2 + size * 0.08);
      } else {
        c.save();
        c.translate(0, -cs / 2);
        c.rotate(-0.08);
        c.fillStyle = withAlpha(th.accent, 0.55);
        c.fillRect(-size * 0.3, -size * 0.09, size * 0.6, size * 0.18);
        c.restore();
      }
    } else if (st.reveal !== 'draw') {
      c.beginPath();
      c.arc(0, 0, size * 0.62, 0, 7);
      c.fillStyle = withAlpha(th.accent, th.dark ? 0.12 : 0.1);
      c.fill();
    }
    drawIcon(c, p, size, cardTh, lt);
    c.restore();
    if (st.reveal === 'draw' && kRaw * 0.6 < 1) {
      c.save();
      c.translate(x - size * 0.85 + size * 1.7 * clamp(kRaw * 0.6) + size * 0.2, y + S(lt * 38) * size * 0.3);
      drawIcon(c, 'pen', size * 0.6, th, 0);
      c.restore();
    }
  });
}

function drawFurniture(c, ex, x, L, s, th, f) {
  c.save();
  c.strokeStyle = th.stroke;
  c.lineWidth = Math.max(3, s * 0.1);
  c.lineCap = 'round';
  if (ex.chair) {
    const sy = L.groundY - s * 0.78;
    const bx = x - f * s * 0.12;
    c.beginPath();
    c.moveTo(bx - f * s * 0.35, sy);
    c.lineTo(bx + f * s * 0.45, sy);
    c.moveTo(bx - f * s * 0.3, sy);
    c.lineTo(bx - f * s * 0.3, L.groundY);
    c.moveTo(bx + f * s * 0.4, sy);
    c.lineTo(bx + f * s * 0.4, L.groundY);
    c.moveTo(bx - f * s * 0.35, sy);
    c.lineTo(bx - f * s * 0.42, sy - s * 0.9);
    c.stroke();
  }
  if (ex.desk) {
    const dy = L.groundY - s * 1.2;
    const dx = x + f * s * 1.15;
    c.beginPath();
    c.moveTo(dx - s * 0.6, dy);
    c.lineTo(dx + s * 0.6, dy);
    c.moveTo(dx - s * 0.5, dy);
    c.lineTo(dx - s * 0.5, L.groundY);
    c.moveTo(dx + s * 0.5, dy);
    c.lineTo(dx + s * 0.5, L.groundY);
    c.stroke();
    c.save();
    c.translate(dx, dy - s * 0.22);
    c.scale(-f, 1);
    drawIcon(c, 'laptop', s * 0.75, th, 0);
    c.restore();
  }
  if (ex.block != null) {
    const bx = x + (ex.block + 0.85) * s * f;
    c.fillStyle = withAlpha(th.accent2, 0.35);
    c.fillRect(bx - s * 0.05, L.groundY - s * 1.3, s * 1.3 * f, s * 1.3);
    c.strokeRect(bx - s * 0.05, L.groundY - s * 1.3, s * 1.3 * f, s * 1.3);
  }
  if (ex.stairs) {
    c.beginPath();
    let sx = x - s * 1.2 + s * 0.35;
    let sy = L.groundY;
    c.moveTo(x - s * 2, L.groundY);
    for (let i = 0; i < 5; i++) {
      c.lineTo(sx, sy);
      sy -= s * 0.28;
      c.lineTo(sx, sy);
      sx += s * 0.55;
    }
    c.lineTo(sx + s * 0.6, sy);
    c.stroke();
  }
  c.restore();
}


// ---------------------------------------------------------------------------
// SAHNE BLOKAJI — karakter nasıl girer, gezinir, çıkar (her sahnede / videoda farklı)
// ---------------------------------------------------------------------------
export const MOVES_1 = ['stay', 'walk-in', 'pace', 'slide-in', 'hop-in', 'walk-out', 'bounce', 'spin-in', 'walk-in', 'pace'];
export const MOVES_2 = ['stay', 'meet', 'approach', 'bounce-alt', 'walk-out', 'lean-in', 'meet', 'approach'];
const STILL_ACTIONS = new Set(['walk', 'run', 'push', 'climb', 'fall', 'sit', 'sleep', 'type', 'meditate', 'phone', 'lift', 'cry', 'fight', 'write', 'present', 'jump', 'dance']);
function moveOf(cfg, scene, two) {
  const list = two ? MOVES_2 : MOVES_1;
  const raw = (idx) => list[variant(cfg, { idx }, 21, list.length)];
  if (scene.move && list.includes(scene.move)) return scene.move;
  let m = raw(scene.idx || 0);
  if ((scene.idx || 0) === 0 && !two && variant(cfg, scene, 22, 3)) m = 'walk-in';
  const prev = (scene.idx || 0) > 0 ? raw((scene.idx || 0) - 1) : null;
  if (m !== 'stay' && m === prev) m = list[(list.indexOf(m) + 1 + variant(cfg, scene, 23, list.length - 1)) % list.length];
  return m;
}
/** → { dx:[a,b], y:[a,b], face:[a,b]|null, walk:[bool,bool], rot, lean } (dx piksel) */
function stageState(move, lt, dur, L, W, two, f) {
  const R = { dx: [0, 0], y: [0, 0], face: [null, null], walk: [false, false], rot: [0, 0], lean: [0, 0], t0: 0 };
  const eo = (k) => 1 - (1 - k) * (1 - k);
  const D0 = (f > 0 ? L.charX[0] : W - L.charX[0]) + L.charH * 0.5;
  if (!two) {
    switch (move) {
      case 'walk-in': { const T = Math.min(1.4, dur * 0.42), k = clamp(lt / T); R.dx[0] = -f * D0 * (1 - eo(k)); R.walk[0] = k < 1; R.face[0] = f; R.t0 = T; break; }
      case 'walk-out': { const T = Math.min(1.2, dur * 0.35), k = clamp((lt - (dur - 0.4 - T)) / T); R.dx[0] = f * D0 * k * k; R.walk[0] = k > 0 && k < 1; R.face[0] = f; break; }
      case 'pace': { const a = W * (L.portrait ? 0.1 : 0.06), ph = lt * 1.05; R.dx[0] = a * Math.sin(ph) - a * 0.2 * f; R.walk[0] = true; R.face[0] = Math.cos(ph) >= 0 ? 1 : -1; break; }
      case 'slide-in': { const k = clamp(lt / 0.55); R.dx[0] = -f * D0 * 0.7 * (1 - eo(k)); R.lean[0] = 14 * (1 - k) * f; break; }
      case 'hop-in': { const T = Math.min(1.1, dur * 0.4), k = clamp(lt / T); R.dx[0] = -f * D0 * (1 - eo(k)); R.y[0] = k < 1 ? Math.abs(S(lt * 10)) * 0.2 : 0; break; }
      case 'bounce': R.y[0] = Math.abs(S(lt * 4.2)) * 0.07; break;
      case 'spin-in': { const k = clamp(lt / 0.8); R.rot[0] = (1 - eo(k)) * 360 * -f; R.dx[0] = -f * D0 * 0.5 * (1 - eo(k)); R.y[0] = Math.sin(k * Math.PI) * 0.15; break; }
    }
  } else {
    const DA = L.charX[0] + L.charH * 0.5, DB = W - L.charX[1] + L.charH * 0.5;
    switch (move) {
      case 'meet': { const T = Math.min(1.5, dur * 0.45), k = clamp(lt / T); R.dx = [-DA * (1 - eo(k)), DB * (1 - eo(k))]; R.walk = [k < 1, k < 1]; R.t0 = T; break; }
      case 'approach': { const T = Math.min(1.6, dur * 0.5), k = clamp(lt / T); R.dx[1] = DB * (1 - eo(k)); R.walk[1] = k < 1; break; }
      case 'bounce-alt': R.y = [Math.abs(S(lt * 4)) * 0.06, Math.abs(S(lt * 4 + 1.6)) * 0.06]; break;
      case 'lean-in': { const k = easeInOut(clamp((lt - 0.3) / 1.2)); R.dx = [W * 0.045 * k, -W * 0.045 * k]; break; }
      case 'walk-out': { const T = Math.min(1.2, dur * 0.35), k = clamp((lt - (dur - 0.4 - T)) / T); R.dx = [W * 0.9 * k * k, W * 0.9 * k * k]; R.walk = [k > 0 && k < 1, k > 0 && k < 1]; if (k > 0) R.face = [1, 1]; break; }
    }
  }
  return R;
}
function withWalk(pose, ph, run, k = 1) {
  return { ...pose, ...walkLegs(ph, 28), y: (pose.y || 0) + Math.abs(S(ph)) * 0.035, lean: (pose.lean || 0) + 3 };
}

function cameraTransform(c, W, H, scene, lt, prof, L) {
  const p = clamp(lt / scene.dur);
  const I = prof.camera === 'calm' ? 0.55 : 1;
  const cx = L.charX[0], cy = L.groundY - L.charH * 0.6;
  let sc = 1, tx = 0, ty = 0;
  switch (scene.camera) {
    case 'zoom-in': sc = 1 + 0.12 * I * easeInOut(p); break;
    case 'zoom-out': sc = 1 + 0.12 * I * (1 - easeInOut(p)); break;
    case 'push': sc = 1 + 0.05 * I * p; ty = -H * 0.01 * p; break;
    case 'tilt': c.translate(cx, cy); c.rotate((p - 0.5) * 0.05 * I); c.translate(-cx, -cy); sc = 1.07; break;
    case 'drift': tx = W * 0.02 * I * Math.sin(lt * 0.8); ty = H * 0.012 * I * Math.cos(lt * 0.6); sc = 1.05 + 0.03 * p; break;
    case 'rise': ty = H * 0.04 * I * (1 - easeInOut(p)); sc = 1.06; break;
    case 'whip': { const k = clamp(lt / 0.35); tx = W * 0.12 * I * (1 - easeOut(k)); sc = 1.05; break; }
    case 'pan-left': tx = W * 0.035 * I * (0.5 - p) * 2; sc = 1.06; break;
    case 'pan-right': tx = -W * 0.035 * I * (0.5 - p) * 2; sc = 1.06; break;
    case 'shake': {
      const a = H * 0.006 * I;
      tx = (noise(Math.floor(lt * 24), 1) - 0.5) * a * 2;
      ty = (noise(Math.floor(lt * 24), 2) - 0.5) * a * 2;
      sc = 1.03;
      break;
    }
  }
  c.translate(cx, cy);
  c.scale(sc, sc);
  c.translate(-cx + tx, -cy + ty);
}


// ---------------------------------------------------------------------------
// FOTOĞRAF SAHNELERİ (film stüdyosu): üretilmiş görsel + Ken Burns kamera + sinema dokusu
// ---------------------------------------------------------------------------
const PHOTOS = new Map(); // url → { img, state }
export function loadPhoto(url) {
  let e = PHOTOS.get(url);
  if (e) return e.promise || Promise.resolve(e.img);
  e = { img: new Image(), state: 0 };
  e.promise = new Promise((resolve, reject) => {
    e.img.onload = async () => { try { await e.img.decode?.(); } catch {} e.state = 1; e.promise = null; resolve(e.img); };
    e.img.onerror = () => { e.state = -1; e.promise = null; reject(new Error('Görsel yüklenemedi: ' + url)); };
  });
  e.img.src = url;
  PHOTOS.set(url, e);
  return e.promise;
}
/** Bellek: yalnızca listedeki görselleri tut */
export function keepPhotos(urls) {
  const keep = new Set(urls);
  for (const [u] of PHOTOS) if (!keep.has(u)) PHOTOS.delete(u);
}
const photoOf = (url) => {
  const e = PHOTOS.get(url);
  if (!e) loadPhoto(url).catch(() => {});
  return e && e.state === 1 ? e.img : null;
};

function renderPhoto(c, W, H, scene, lt, cfg) {
  const img = scene.photo ? photoOf(scene.photo) : null;
  c.fillStyle = '#0b0b0d';
  c.fillRect(0, 0, W, H);
  if (!img) return;
  const p = Math.min(1.25, Math.max(0, lt / Math.max(0.5, scene.dur)));
  const e = p * p * (3 - 2 * Math.min(1, p));
  const v = scene.camera || 'zoom-in';
  // kaynak dikdörtgeni: görseli ekrana "cover" oturt, üstüne kamera ölçeği/kaydırması uygula
  const ir = img.naturalWidth / img.naturalHeight, cr = W / H;
  let bw = ir > cr ? img.naturalHeight * cr : img.naturalWidth;
  let bh = ir > cr ? img.naturalHeight : img.naturalWidth / cr;
  let zoom = 1, px = 0, py = 0; // px,py: -1..1 kaydırma (kırpma payı içinde)
  const Z = 0.16;
  switch (v) {
    case 'zoom-in': zoom = 1 + Z * e; break;
    case 'zoom-out': zoom = 1 + Z * (1 - e); break;
    case 'push': zoom = 1 + Z * 0.7 * p; py = -0.3 * p; break;
    case 'pan-left': zoom = 1 + Z * 0.8; px = 1 - 2 * e; break;
    case 'pan-right': zoom = 1 + Z * 0.8; px = -1 + 2 * e; break;
    case 'rise': zoom = 1 + Z * 0.8; py = 1 - 2 * e; break;
    case 'drift': zoom = 1.08 + 0.06 * p; px = Math.sin(lt * 0.5) * 0.7; py = Math.cos(lt * 0.4) * 0.5; break;
    case 'tilt': zoom = 1.1 + 0.05 * p; px = -0.5 + e; break;
  }
  const sw = bw / zoom, sh = bh / zoom;
  const mx = (img.naturalWidth - sw) / 2, my = (img.naturalHeight - sh) / 2;
  const sx = mx + px * mx * 0.9, sy = my + py * my * 0.9;
  c.save();
  if (v === 'tilt') { c.translate(W / 2, H / 2); c.rotate((p - 0.5) * 0.03); c.translate(-W / 2, -H / 2); }
  c.drawImage(img, Math.max(0, Math.min(img.naturalWidth - sw, sx)), Math.max(0, Math.min(img.naturalHeight - sh, sy)), sw, sh, 0, 0, W, H);
  c.restore();
  // sinema rötuşu: yumuşak vinyet + hafif ilk/son kararma
  const g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.6);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.5)');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  if (scene.fadeIn && lt < 1.2) { c.fillStyle = `rgba(0,0,0,${1 - lt / 1.2})`; c.fillRect(0, 0, W, H); }
}

function renderScene(c, W, H, scene, lt, cfg) {
  VOL = !!cfg.style?.volume;
  const st = cfg.style || STYLES.classic;
  if (st.photo) return renderPhoto(c, W, H, scene, lt, cfg);
  const th = sceneTheme(cfg.theme, st, scene);
  const prof = { ...(cfg.profile || {}) };
  if (st.text === 'marker') prof.text = 'high';
  const seed = (scene.idx || 0) * 1.37 + (cfg.seed || 0) * 0.013;
  const { pose, ex } = poseFor(scene.action, lt, scene.dur, seed);
  const needsBoard = !!(ex.board || scene.chart);
  const two = scene.characters === 2;
  const isScene = scene.kind === 'scene';
  const flip = isScene && !two && st.layout !== 'center' && variant(cfg, scene, 3, 100) < 38;
  const L = layout(W, H, scene, needsBoard ? { ...st, layout: 'side' } : st, flip);
  c.save();
  if (!st.still) cameraTransform(c, W, H, scene, lt, prof, L);
  const toon = !!st.toon;
  const cast = scene.cast?.length ? scene.cast : ['casual', 'suit'];
  const cos = (i) => (toon ? makeCostume(cast[i % cast.length], cfg.seed, cast[0] === cast[1] ? i : 0) : null);
  const groundItems = toon ? (scene.props || []).filter((p) => GROUND_ITEMS.includes(p)) : [];
  const fscene = groundItems.length ? { ...scene, props: scene.props.filter((p) => !groundItems.includes(p)) } : scene;
  if (toon) {
    const bd = scene.backdrop ? photoOf(scene.backdrop) : null;
    if (bd) {
      const r = Math.max(W / bd.naturalWidth, H / bd.naturalHeight);
      const k = 1 + 0.03 * Math.min(1, lt / Math.max(1, scene.dur));
      c.save();
      c.translate(W / 2, H / 2);
      c.scale(k, k);
      c.drawImage(bd, -bd.naturalWidth * r / 2, -bd.naturalHeight * r / 2, bd.naturalWidth * r, bd.naturalHeight * r);
      c.restore();
    } else drawScenery(c, W, H, st.plainBg ? 'plain' : scene.bg || 'plain', th, L, scene.start + lt);
    if (st.moody) drawMoodyLight(c, W, H, scene, L, lt);
    if (scene.flags?.length) drawFlags(c, W, H, scene.flags, scene.start + lt);
  } else drawBackground(c, W, H, st.plainBg ? 'plain' : scene.bg || 'plain', th, L);
  drawBgFx(c, W, H, st, th, scene, lt, L, cfg);

  const emo = scene.emotion !== 'neutral' ? scene.emotion : EMO_FOR_ACTION[scene.action] || 'neutral';
  const boil = cfg.boil !== false;
  if (needsBoard) drawBoard(c, L, th, scene, lt);
  const s = L.charH / 2.85;
  const pair = ['hug', 'handshake', 'argue'].includes(scene.action);
  let anchor = null;
  if (two) {
    // A: aksiyon, B: dinleyen / karşılık veren
    const mv2 = isScene && !STILL_ACTIONS.has(scene.action) ? moveOf(cfg, scene, true) : 'stay';
    const m2 = stageState(mv2, lt, scene.dur, L, W, true, 1);
    const wk = (pz, i) => {
      let r = pz;
      if (m2.walk[i]) { r = { ...withWalk(pz, lt * 6.8 + i * 1.3), x: 0 }; }
      if (m2.y[i]) r = { ...r, y: (r.y || 0) + m2.y[i] };
      return r;
    };
    const A = drawStickWithFurniture(c, L.charX[0] + m2.dx[0], L, wk(pose, 0), emo, m2.face[0] ?? 1, th.stroke, th, lt, boil, { ...ex, costume: cos(0) }, s);
    let bPose, bEmo, bEx = {};
    if (pair) {
      const r = poseFor(scene.action, lt, scene.dur, seed + 2);
      bPose = r.pose;
      bEx = r.ex;
      bEmo = emo;
      if (scene.action === 'argue' && Math.floor(lt / 1.6) % 2) bPose = poseFor('angry', lt, scene.dur, seed).pose;
    } else {
      const listen = poseFor(Math.floor(lt / 2.2) % 2 ? 'idle' : 'shrug', lt, scene.dur, seed + 3);
      bPose = mix(BASE, listen.pose, 0.6);
      bEmo = emo === 'angry' ? 'scared' : emo === 'sad' ? 'sad' : 'neutral';
    }
    const B = drawStickWithFurniture(c, L.charX[1] + m2.dx[1], L, wk(bPose, 1), bEmo, m2.face[1] ?? -1, th.accent2, th, lt, boil, { ...bEx, costume: cos(1) }, s);
    drawExtras(c, ex, A, L, th, lt, scene, s, 1);
    if (scene.action === 'argue') drawJagged(c, Math.floor(lt / 1.6) % 2 ? B : A, s, th, lt);
    drawProps(c, fscene, lt, L, th, needsBoard, st, cfg);
    drawGroundItems(c, groundItems, L, th, lt, true);
    anchor = A.head;
  } else {
    let f = L.facing;
    const selfMove = ['walk', 'run', 'push', 'climb', 'fall'].includes(scene.action);
    const mvName = isScene && !STILL_ACTIONS.has(scene.action) ? moveOf(cfg, scene, false) : 'stay';
    const ms = stageState(mvName, lt, scene.dur, L, W, false, f);
    let pose1 = pose;
    if (ms.walk[0]) {
      const ph = lt * 6.8;
      pose1 = ms.t0 && lt < ms.t0 ? mix(poseFor('walk', lt, scene.dur, seed).pose, pose, easeOut(clamp((lt - ms.t0 * 0.7) / (ms.t0 * 0.3 + 0.001)))) : withWalk(pose, ph);
      pose1 = { ...pose1, x: 0 };
    }
    if (ms.y[0] || ms.rot[0] || ms.lean[0]) pose1 = { ...pose1, y: (pose1.y || 0) + ms.y[0], rot: (pose1.rot || 0) + ms.rot[0], lean: (pose1.lean || 0) + ms.lean[0] };
    if (ms.face[0] != null) f = ms.face[0];
    const x0 = L.charX[0] + ms.dx[0];
    c.save();
    if (st.reveal === 'draw') {
      if (lt < 0.55) {
        c.beginPath();
        c.rect(0, 0, W, H * clamp(lt / 0.55));
        c.clip();
      }
    } else if (isScene && !selfMove && mvName === 'stay') {
      // sahneye giriş çeşitleri — her sahnede farklı
      const v = variant(cfg, scene, 11, 4);
      const k = easeOut(lt / 0.4);
      if (v === 1) c.translate(-f * (1 - k) * W * 0.35, 0);
      else if (v === 2) c.translate(0, -(1 - easeBounce(lt / 0.6)) * H * 0.6);
      else if (v === 3) {
        const sc = easeBack(lt / 0.35);
        c.translate(L.charX[0], L.groundY);
        c.scale(sc, sc);
        c.translate(-L.charX[0], -L.groundY);
      }
    }
    const A = drawStickWithFurniture(c, x0, L, pose1, emo, f, th.stroke, th, lt, boil, { ...ex, costume: cos(0) }, s);
    c.restore();
    drawExtras(c, ex, A, L, th, lt, scene, s, f);
    drawProps(c, fscene, lt, L, th, needsBoard || scene.kind === 'intro', st, cfg);
    drawGroundItems(c, groundItems, L, th, lt, false);
    anchor = A.head;
  }
  c.restore();
  if (scene.speakerName && scene.kind === 'scene') {
    // konuşan karakterin isim plakası (sol alt) — kimin konuştuğu hep belli
    const fs = Math.round(H * 0.034), nm = String(scene.speakerName);
    c.save();
    c.font = `800 ${fs}px "Arial Black", Arial, sans-serif`;
    const tw = c.measureText(nm).width, px = fs * 0.7, bx = W * 0.04, by = H * 0.80, bh = fs * 1.6;
    const a = Math.min(1, lt * 6);
    c.globalAlpha = a;
    c.fillStyle = 'rgba(10,10,12,0.78)';
    c.beginPath(); c.roundRect(bx, by, tw + px * 2, bh, bh / 2); c.fill();
    c.fillStyle = '#FFD54A';
    c.beginPath(); c.arc(bx + px * 0.7, by + bh / 2, fs * 0.16, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff'; c.textBaseline = 'middle';
    c.fillText(nm, bx + px * 1.2, by + bh / 2 + fs * 0.04);
    c.restore();
  }
  const sc2 = { ...scene, board: needsBoard };
  if (!drawStyledText(c, W, H, sc2, lt, L, th, st, cfg, anchor)) drawKeyword(c, sc2, lt, L, th, prof);
}

let VOL = false, VOLC = null;
/** 3D görünüm: karakteri ayrı katmana çiz, ışık/gölge/parlak kenar bindir, yere yumuşak gölge düşür */
function drawStickman3D(c, x, groundY, H, pose, emotion, f, color, th, lt, boil, ex) {
  const cv = c.canvas;
  if (!VOLC || VOLC.width !== cv.width || VOLC.height !== cv.height) {
    VOLC = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(cv.width, cv.height) : Object.assign(document.createElement('canvas'), { width: cv.width, height: cv.height });
  }
  const o = VOLC.getContext('2d');
  o.setTransform(1, 0, 0, 1, 0, 0);
  o.clearRect(0, 0, VOLC.width, VOLC.height);
  o.setTransform(c.getTransform());
  const a = drawStickman(o, x, groundY, H, pose, emotion, f, color, th, lt, boil, ex);
  const s = H / 2.85, key = -f; // ışık karakterin önünden-yukarıdan gelir
  // yere yumuşak temas gölgesi (ana tuvale, karakterin altına)
  const sg = c.createRadialGradient(x, groundY, 0, x, groundY, s * 0.95);
  sg.addColorStop(0, 'rgba(0,0,0,0.8)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
  c.save(); c.translate(x, groundY); c.scale(1, 0.22); c.translate(-x, -groundY);
  c.fillStyle = sg; c.beginPath(); c.arc(x, groundY, s * 0.95, 0, Math.PI * 2); c.fill(); c.restore();
  // hacim: yatay ışık geçişi + alttan koyulaşma + üstten yumuşak ışık
  o.globalCompositeOperation = 'source-atop';
  const gx = o.createLinearGradient(x - s * 0.55, 0, x + s * 0.55, 0);
  gx.addColorStop(0, key < 0 ? 'rgba(255,235,200,0.42)' : 'rgba(0,0,25,0.62)');
  gx.addColorStop(0.5, 'rgba(0,0,0,0)');
  gx.addColorStop(1, key < 0 ? 'rgba(0,0,25,0.62)' : 'rgba(255,235,200,0.42)');
  o.fillStyle = gx; o.fillRect(x - s * 2, groundY - H * 1.3, s * 4, H * 1.5);
  const gy = o.createLinearGradient(0, groundY - H * 1.05, 0, groundY);
  gy.addColorStop(0, 'rgba(255,255,255,0.14)'); gy.addColorStop(0.55, 'rgba(0,0,0,0)'); gy.addColorStop(1, 'rgba(0,0,10,0.38)');
  o.fillStyle = gy; o.fillRect(x - s * 2, groundY - H * 1.3, s * 4, H * 1.5);
  // kafa/gövde için küre parlaması
  const hx = a?.head?.[0] ?? x, hy = a?.head?.[1] ?? groundY - H * 0.8;
  const hl = o.createRadialGradient(hx + key * s * 0.14, hy - s * 0.14, 0, hx, hy, s * 0.55);
  hl.addColorStop(0, 'rgba(255,255,255,0.5)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
  o.fillStyle = hl; o.fillRect(hx - s, hy - s, s * 2, s * 2);
  // arka kenar ışığı (rim): karakteri ters yöne kaydırıp 'destination-over' ile ince hat
  o.globalCompositeOperation = 'source-over';
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = s * 0.07; c.shadowOffsetX = -key * s * 0.05; c.shadowOffsetY = s * 0.03;
  c.drawImage(VOLC, 0, 0);
  c.restore();
  return a;
}
function drawStickWithFurniture(c, x, L, pose, emo, f, color, th, lt, boil, ex, s) {
  drawFurniture(c, ex, x, L, s, th, f);
  return (VOL ? drawStickman3D : drawStickman)(c, x, L.groundY, L.charH, pose, emo, f, color, th, lt, boil, ex);
}

function drawJagged(c, info, s, th, lt) {
  c.save();
  c.translate(info.head[0], info.head[1] - s * 0.9);
  c.strokeStyle = th.stroke;
  c.fillStyle = '#fff';
  c.lineWidth = s * 0.05;
  c.beginPath();
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const r = (i % 2 ? 0.28 : 0.42) * s * (1 + S(lt * 10) * 0.03);
    c.lineTo(Math.cos(a) * r * 1.3, Math.sin(a) * r);
  }
  c.closePath();
  c.fill();
  c.stroke();
  c.font = `900 ${s * 0.3}px ${th.fontFamily}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = th.accent;
  c.fillText('#@!', 0, 0);
  c.restore();
}

// ---------------------------------------------------------------------------
// ANA KARE FONKSİYONU
// ---------------------------------------------------------------------------
const TD = 0.38; // geçiş süresi
const pixelCanvases = new Map();

function drawComposite(c, W, H, tl, t, cfg, i) {
  const st = cfg.style || STYLES.classic;
  const sc = tl.scenes[i];
  const lt = t - sc.start;
  const tr = st.transitions?.length ? st.transitions[variant(cfg, sc, 7, st.transitions.length)] : cfg.profile?.transition || 'fade';
  c.fillStyle = cfg.theme.bg;
  c.fillRect(0, 0, W, H);
  if (i > 0 && lt < TD && tr !== 'cut') {
    const prev = tl.scenes[i - 1];
    const k = easeInOut(lt / TD);
    if (tr === 'flash') {
      renderScene(c, W, H, sc, lt, cfg);
      c.fillStyle = `rgba(255,255,255,${1 - k})`;
      c.fillRect(0, 0, W, H);
      return;
    }
    c.save();
    if (tr === 'push') c.translate(0, -H * k);
    renderScene(c, W, H, prev, prev.dur + lt, cfg);
    c.restore();
    c.save();
    switch (tr) {
      case 'slide':
        c.translate(W * (1 - k), 0);
        break;
      case 'push':
        c.translate(0, H * (1 - k));
        break;
      case 'wipe':
        c.beginPath();
        c.arc(W / 2, H / 2, Math.hypot(W, H) * 0.55 * k, 0, 7);
        c.clip();
        break;
      case 'zoom':
        c.globalAlpha = k;
        c.translate(W / 2, H / 2);
        c.scale(1.25 - 0.25 * k, 1.25 - 0.25 * k);
        c.translate(-W / 2, -H / 2);
        break;
      default:
        c.globalAlpha = k;
    }
    renderScene(c, W, H, sc, lt, cfg);
    c.restore();
  } else {
    renderScene(c, W, H, sc, lt, cfg);
  }
}

/**
 * @param cfg { theme, style, seed, profile:{text,camera}, subtitles, subtitleStyle, subtitleColor, progress, watermark }
 */
export function renderFrame(c, W, H, tl, t, cfg) {
  const th = cfg.theme;
  const st = cfg.style || STYLES.classic;
  cfg._tl = tl;
  let i = tl.scenes.findIndex((s) => t >= s.start && t < s.start + s.dur);
  if (i < 0) i = t < 0 ? 0 : tl.scenes.length - 1;
  const sc = tl.scenes[i];
  c.save();
  if (st.pixel) {
    const w = Math.round(W / st.pixel), h = Math.round(H / st.pixel);
    const key = w + 'x' + h;
    let pc = pixelCanvases.get(key);
    if (!pc) {
      pc = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
      pixelCanvases.set(key, pc);
    }
    drawComposite(pc.getContext('2d'), w, h, tl, t, cfg, i);
    c.imageSmoothingEnabled = false;
    c.drawImage(pc, 0, 0, W, H);
    c.imageSmoothingEnabled = true;
  } else {
    drawComposite(c, W, H, tl, t, cfg, i);
  }
  drawTexture(c, W, H, cfg.profile?.texture || th.texture, th, t);
  const m = Math.min(W, H);
  if (st.letterbox) {
    c.fillStyle = '#000';
    c.fillRect(0, 0, W, H * 0.085);
    c.fillRect(0, H * 0.915, W, H * 0.085);
  }
  if (st.panel) {
    c.lineWidth = m * 0.035;
    c.strokeStyle = '#FFFFFF';
    c.strokeRect(m * 0.0175, m * 0.0175, W - m * 0.035, H - m * 0.035);
    c.lineWidth = m * 0.009;
    c.strokeStyle = '#111111';
    c.strokeRect(m * 0.038, m * 0.038, W - m * 0.076, H - m * 0.076);
  }
  if (st.hud) {
    const n = tl.scenes.filter((s) => s.kind === 'scene').length;
    for (let h = 0; h < 3; h++) {
      c.save();
      c.translate(W - m * (0.06 + h * 0.065), m * 0.06);
      drawIcon(c, 'heart', m * 0.055, th, 0);
      c.restore();
    }
    c.font = `700 ${m * 0.026}px "Press Start 2P", monospace`;
    c.textAlign = 'center';
    c.textBaseline = 'top';
    c.lineWidth = m * 0.008;
    c.strokeStyle = '#000';
    const txt = `LEVEL ${Math.min(n, (sc.idx ?? 0) + 1)}/${n}`;
    c.strokeText(txt, W / 2, m * 0.04);
    c.fillStyle = '#FFFFFF';
    c.fillText(txt, W / 2, m * 0.04);
  }
  const L = baseLayout(W, H, sc);
  if (cfg.subtitles) drawSubtitles(c, W, H, tl, t, L, th, cfg);
  if (cfg.progress) {
    c.fillStyle = withAlpha(th.stroke, 0.15);
    c.fillRect(0, H - H * 0.008, W, H * 0.008);
    c.fillStyle = th.accent;
    c.fillRect(0, H - H * 0.008, W * clamp(t / tl.total), H * 0.008);
  }
  if (cfg.watermark) {
    c.font = `700 ${m * 0.032}px ${th.fontFamily}`;
    c.textAlign = 'left';
    c.textBaseline = 'top';
    c.fillStyle = st.letterbox ? 'rgba(255,255,255,0.6)' : withAlpha(th.text, 0.55);
    c.fillText(cfg.watermark, m * (st.panel ? 0.06 : 0.03), m * (st.panel ? 0.055 : 0.03));
  }
  c.restore();
}

// ---------------------------------------------------------------------------
// THUMBNAIL (1280×720)
// ---------------------------------------------------------------------------

function renderMoodyThumb(c, W, H, plan, cfg) {
  const th = cfg.theme;
  const tb = plan.thumbnail || {};
  c.save();
  const g = c.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#07080C');
  g.addColorStop(1, '#1B1420');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  const cx = W * 0.74, cy = H * 0.52;
  const gl = c.createRadialGradient(cx, cy, 0, cx, cy, H * 0.95);
  gl.addColorStop(0, 'rgba(255,170,80,0.55)');
  gl.addColorStop(0.5, 'rgba(255,120,60,0.14)');
  gl.addColorStop(1, 'rgba(255,120,60,0)');
  c.fillStyle = gl;
  c.fillRect(0, 0, W, H);
  const { pose, ex } = poseFor(tb.action || 'surprised', 0.45, 3, 1);
  const L = { groundY: H * 1.0, charH: H * 0.74, charX: [cx], portrait: false };
  drawFurniture(c, ex, cx, L, L.charH / 2.85, th, -1);
  drawStickman(c, cx, L.groundY, L.charH, pose, tb.emotion || 'angry', -1, '#F1E9DA', th, 0.45, false, { ...ex, costume: makeCostume('blob', cfg.seed, 0) });
  (tb.props || []).slice(0, 2).forEach((p, i) => {
    c.save();
    c.translate(i ? cx + H * 0.3 : cx - H * 0.42, H * (i ? 0.72 : 0.22));
    c.rotate((i ? 1 : -1) * 0.15);
    drawIcon(c, p, H * 0.26, th, 0.4);
    c.restore();
  });
  const words = (tb.text || plan.title || '').toLocaleUpperCase(th.locale || undefined).split(/\s+/).filter(Boolean).slice(0, 4);
  const hl = (tb.highlight || '').toLocaleUpperCase(th.locale || undefined);
  let size = H * 0.26;
  const font = (n) => `900 ${n}px ${th.fontFamily}`;
  c.font = font(size);
  while (size > 40 && (Math.max(...words.map((w) => c.measureText(w).width)) > W * 0.55 || words.length * size * 0.95 > H * 0.92)) { size *= 0.93; c.font = font(size); }
  c.textBaseline = 'top';
  c.lineJoin = 'round';
  const y0 = (H - words.length * size * 0.95) / 2;
  words.forEach((w, i) => {
    const y = y0 + i * size * 0.95;
    c.lineWidth = size * 0.12;
    c.strokeStyle = '#000';
    c.strokeText(w, W * 0.04, y);
    c.fillStyle = w === hl ? th.accent : '#fff';
    c.fillText(w, W * 0.04, y);
  });
  c.restore();
}

export function renderThumbnail(c, W, H, plan, cfg) {
  const th = cfg.theme;
  const tb = plan.thumbnail || {};
  if (cfg.style?.moody) return renderMoodyThumb(c, W, H, plan, cfg);
  c.save();
  const g = c.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, th.bg);
  g.addColorStop(1, th.bg2 || th.bg);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  // ışın patlaması
  const cx = W * 0.78, cy = H * 0.5;
  c.save();
  c.translate(cx, cy);
  for (let i = 0; i < 18; i++) {
    c.rotate((Math.PI * 2) / 18);
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(W, -W * 0.09);
    c.lineTo(W, W * 0.09);
    c.closePath();
    c.fillStyle = withAlpha(i % 2 ? th.accent : th.accent2, th.dark ? 0.14 : 0.12);
    c.fill();
  }
  c.restore();
  c.beginPath();
  c.arc(cx, cy, H * 0.38, 0, 7);
  c.fillStyle = withAlpha(th.accent, 0.18);
  c.fill();

  // karakter
  const { pose, ex } = poseFor(tb.action || 'surprised', 0.45, 3, 1);
  const L = { groundY: H * 0.95, charH: H * 0.78, charX: [cx], portrait: false };
  drawFurniture(c, ex, cx, L, L.charH / 2.85, th, -1);
  drawStickman(c, cx, L.groundY, L.charH, pose, tb.emotion || 'surprised', -1, th.stroke, th, 0.45, false, cfg.style?.toon ? { ...ex, costume: makeCostume(plan.scenes?.[0]?.cast?.[0] || 'casual', cfg.seed, 0) } : ex);
  // proplar
  (tb.props || []).slice(0, 2).forEach((p, i) => {
    c.save();
    c.translate(i ? cx + H * 0.2 : cx - H * 0.36, H * (i ? 0.8 : 0.2));
    c.rotate((i ? 1 : -1) * 0.15);
    drawIcon(c, p, H * 0.24, th, 0.4);
    c.restore();
  });
  // metin
  const words = (tb.text || plan.title || '').toLocaleUpperCase(th.locale || undefined).split(/\s+/).filter(Boolean);
  const hl = (tb.highlight || '').toLocaleUpperCase(th.locale || undefined);
  let size = H * 0.17;
  c.font = `900 ${size}px ${th.fontFamily}`;
  let lines;
  for (let tries = 0; tries < 8; tries++) {
    c.font = `900 ${size}px ${th.fontFamily}`;
    lines = wrap(c, words.join(' '), W * 0.5);
    if (lines.length <= 3) break;
    size *= 0.88;
  }
  const lh = size * 1.02;
  const y0 = H * 0.5 - ((lines.length - 1) * lh) / 2;
  c.textBaseline = 'middle';
  c.textAlign = 'left';
  lines.forEach((ln, li) => {
    let x = W * 0.05;
    const y = y0 + li * lh;
    for (const w of ln.split(' ')) {
      const ww = c.measureText(w).width;
      const isHl = hl && w.replace(/[^\p{L}\p{N}]/gu, '') === hl.replace(/[^\p{L}\p{N}]/gu, '');
      if (isHl) {
        c.save();
        c.translate(x + ww / 2, y);
        c.rotate(-0.04);
        c.fillStyle = th.accent;
        c.fillRect(-ww / 2 - size * 0.1, -size * 0.52, ww + size * 0.2, size * 1.02);
        c.restore();
      }
      c.lineWidth = size * 0.16;
      c.lineJoin = 'round';
      c.strokeStyle = th.dark ? '#000' : th.stroke;
      c.strokeText(w, x, y);
      c.fillStyle = isHl ? '#FFFFFF' : th.dark ? '#FFFFFF' : '#FFFFFF';
      c.fillText(w, x, y);
      x += ww + size * 0.25;
    }
  });
  drawTexture(c, W, H, cfg.profile?.texture || th.texture, th, 0);
  c.restore();
}

export const _internal = { poseFor, layout };
