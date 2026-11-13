// ASS (libass) yardımcıları: yazı, kutu, ilerleme çubuğu, flaş. Tüm metin/şekil efektleri tek bir .ass dosyasında toplanır.
const ms = (s) => Math.round(s * 100) / 100;
export const assTime = (t) => {
  t = Math.max(0, t);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return `${h}:${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`;
};
/** #RRGGBB → ASS &HBBGGRR& */
export const assColor = (hex = '#FFFFFF') => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  const h = m ? m[1] : 'FFFFFF';
  return `&H${h.slice(4, 6)}${h.slice(2, 4)}${h.slice(0, 2)}&`.toUpperCase();
};
const esc = (t) => String(t ?? '').replace(/[{}\\]/g, '').replace(/\n/g, '\\N');

export function assDoc(W, H, events = [], font = 'Arial') {
  const head = `[Script Info]\nScriptType: v4.00+\nPlayResX: ${W}\nPlayResY: ${H}\nWrapStyle: 2\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,${font},48,&H00FFFFFF,&H000000FF,&H00000000,&H64000000,0,0,0,0,100,100,0,0,1,3,0,2,40,40,40,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
  return head + events.map((e) => `Dialogue: ${e.layer ?? 0},${assTime(e.t0)},${assTime(e.t1)},Default,,0,0,0,,${e.text}`).join('\n') + '\n';
}

/** Metin: konum (px), boyut, renk, çerçeve, "pop" girişi */
export function assText({ t0, t1, text, x, y, size = 64, color = '#FFFFFF', outline = '#000000', font, bold = true, align = 5, pop = false, fade = 0.15, layer = 5 }) {
  const tags = [`\\an${align}`, `\\pos(${Math.round(x)},${Math.round(y)})`, `\\fs${Math.round(size)}`, `\\1c${assColor(color)}`, `\\3c${assColor(outline)}`, '\\bord4', `\\b${bold ? 1 : 0}`];
  if (font) tags.push(`\\fn${font}`);
  if (pop) tags.push('\\fscx0', '\\fscy0', '\\t(0,160,\\fscx118\\fscy118)', '\\t(160,300,\\fscx100\\fscy100)');
  if (fade) tags.push(`\\fad(${Math.round(fade * 1000)},${Math.round(fade * 1000)})`);
  return { t0, t1, layer, text: `{${tags.join('')}}${esc(text)}` };
}

/** Zengin yazı: giriş animasyonu (pop, fade, slide, typewriter, none), kalın/italik, çerçeve, hizalama. */
export function assRichText({ t0, t1, text, x, y, size = 64, color = '#FFFFFF', outline = '#000000', outlineW = 4, font, bold = true, italic = false, align = 5, anim = 'pop', fade = 0.15, layer = 5, shadow = 0, slideFrom = 'bottom' }) {
  const base = [`\\an${align}`, `\\fs${Math.round(size)}`, `\\1c${assColor(color)}`, `\\3c${assColor(outline)}`, `\\bord${outlineW}`, `\\shad${shadow}`, `\\b${bold ? 1 : 0}`, `\\i${italic ? 1 : 0}`];
  if (font) base.push(`\\fn${font}`);
  const X = Math.round(x), Y = Math.round(y), dur = Math.max(0.2, t1 - t0);
  if (anim === 'typewriter') {
    const chars = [...String(text ?? '')];
    const step = Math.min(0.12, Math.max(0.03, Math.min(1.6, dur * 0.5) / Math.max(1, chars.length)));
    const out = [];
    chars.forEach((_, i) => {
      const a = t0 + i * step, b = i === chars.length - 1 ? t1 : Math.min(t1, t0 + (i + 1) * step);
      out.push({ t0: a, t1: b, layer, text: `{${base.join('')}\\pos(${X},${Y})}${esc(chars.slice(0, i + 1).join(''))}{\\alpha&HFF&}${esc(chars.slice(i + 1).join(''))}` });
    });
    if (!out.length) return [];
    out[out.length - 1].t1 = t1;
    return out;
  }
  const tags = [...base];
  if (anim === 'slide') {
    const d = Math.round(size * 1.4);
    const [dx, dy] = { bottom: [0, d], top: [0, -d], left: [-d * 3, 0], right: [d * 3, 0] }[slideFrom] || [0, d];
    tags.push(`\\move(${X + dx},${Y + dy},${X},${Y},0,380)`);
  } else tags.push(`\\pos(${X},${Y})`);
  if (anim === 'pop') tags.push('\\fscx0', '\\fscy0', '\\t(0,160,\\fscx118\\fscy118)', '\\t(160,300,\\fscx100\\fscy100)');
  const fd = anim === 'none' ? 0 : fade;
  if (fd) tags.push(`\\fad(${Math.round(fd * 1000)},${Math.round(fd * 1000)})`);
  return [{ t0, t1, layer, text: `{${tags.join('')}}${esc(text)}` }];
}

/** Dolu dikdörtgen (alpha 0 = opak, 255 = saydam). fadeOut ms ile sönebilir. */
export function assRect({ t0, t1, x, y, w, h, color = '#000000', alpha = 0, fadeOutMs = 0, layer = 1 }) {
  const tags = ['\\an7', '\\pos(0,0)', '\\p1', '\\bord0', '\\shad0', `\\1c${assColor(color)}`, `\\alpha&H${alpha.toString(16).padStart(2, '0').toUpperCase()}&`];
  if (fadeOutMs) tags.push(`\\t(0,${fadeOutMs},\\alpha&HFF&)`);
  const X = Math.round(x), Y = Math.round(y), X2 = Math.round(x + w), Y2 = Math.round(y + h);
  return { t0, t1, layer, text: `{${tags.join('')}}m ${X} ${Y} l ${X2} ${Y} ${X2} ${Y2} ${X} ${Y2}{\\p0}` };
}

/** İlerleme çubuğu: soldan sağa dolan şerit (klip boyunca) */
export function assProgress({ t0, t1, W, H, thickness = 10, color = '#FFFFFF', top = false }) {
  const y = top ? 0 : H - thickness;
  const dur = Math.max(0.1, t1 - t0);
  const tags = ['\\an7', '\\pos(0,0)', '\\p1', '\\bord0', '\\shad0', `\\1c${assColor(color)}`, `\\clip(0,0,0,${H})`, `\\t(0,${Math.round(dur * 1000)},\\clip(0,0,${W},${H}))`];
  return { t0, t1, layer: 6, text: `{${tags.join('')}}m 0 ${y} l ${W} ${y} ${W} ${y + thickness} 0 ${y + thickness}{\\p0}` };
}
export { ms };
