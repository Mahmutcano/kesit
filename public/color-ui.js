// Renk seçici: <input type="color"> alanlarını özel bir seçiciyle değiştirir.
// Asıl input gizli kalır; değer ve input/change olayları aynen çalışır.
const PRESET = ['#FFD54A', '#FF9E7A', '#D97757', '#FF5A5F', '#F472B6', '#A78BFA', '#60A5FA', '#22D3EE', '#34D399', '#A3E635', '#FFFFFF', '#E5E7EB', '#9CA3AF', '#4B5563', '#1F2937', '#000000'];
const EYE = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"/></svg>';
let openCP = null;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
function hsv2rgb(h, s, v) { const f = (n) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); }; return [f(5), f(3), f(1)].map((x) => Math.round(x * 255)); }
function rgb2hsv(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), d = mx - Math.min(r, g, b); let h = 0; if (d) { h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; } return [h, mx ? d / mx : 0, mx]; }
const toHex = ([r, g, b]) => '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
const parse = (s) => { s = String(s || '').trim().replace(/^#/, ''); if (/^[0-9a-f]{3}$/i.test(s)) s = s.replace(/./g, '$&$&'); return /^[0-9a-f]{6}$/i.test(s) ? [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)) : null; };

function enhance(inp) {
  if (inp.dataset.cp || inp.hasAttribute('data-native')) return;
  inp.dataset.cp = '1';
  const wrap = document.createElement('span'); wrap.className = 'cp';
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'cp-btn'; btn.setAttribute('aria-haspopup', 'dialog'); btn.setAttribute('aria-expanded', 'false');
  const pop = document.createElement('div'); pop.className = 'cp-pop'; pop.setAttribute('popover', 'manual'); pop.tabIndex = -1; pop.setAttribute('role', 'dialog');
  pop.innerHTML = `<div class="cp-sv"><i class="cp-knob"></i></div><div class="cp-hue"><i class="cp-knob"></i></div>
    <div class="cp-row"><input class="cp-in" maxlength="7" spellcheck="false" aria-label="Hex" />${window.EyeDropper ? `<button type="button" class="cp-eye" title="Ekrandan renk seç" aria-label="Ekrandan renk seç">${EYE}</button>` : ''}</div>
    <div class="cp-sw">${PRESET.map((c) => `<button type="button" style="--c:${c}" data-c="${c}" aria-label="${c}"></button>`).join('')}</div>`;
  inp.after(wrap); wrap.append(btn, pop); inp.style.cssText = 'position:absolute;opacity:0;pointer-events:none;width:1px;height:1px'; wrap.prepend(inp);
  const sv = pop.querySelector('.cp-sv'), hue = pop.querySelector('.cp-hue'), hex = pop.querySelector('.cp-in');
  let H = 0, S = 1, V = 1;
  const cur = () => toHex(hsv2rgb(H, S, V));
  const paint = () => {
    const c = cur();
    btn.innerHTML = `<span class="cp-dot" style="--c:${c}"></span><span class="cp-hex">${c.slice(1)}</span>`;
    sv.style.setProperty('--h', H); sv.firstChild.style.left = S * 100 + '%'; sv.firstChild.style.top = (1 - V) * 100 + '%';
    hue.firstChild.style.left = (H / 360) * 100 + '%'; hue.firstChild.style.background = `hsl(${H} 100% 50%)`;
    if (document.activeElement !== hex) hex.value = c.slice(1);
    pop.querySelectorAll('.cp-sw button').forEach((b) => b.classList.toggle('on', b.dataset.c.toLowerCase() === c));
  };
  const load = () => { const r = parse(inp.value); if (r) { [H, S, V] = rgb2hsv(...r); if (S === 0) {} } paint(); };
  const emit = (final) => {
    const c = cur(); if (inp.value !== c) { NV.set.call(inp, c); inp.dispatchEvent(new Event('input', { bubbles: true })); }
    if (final) inp.dispatchEvent(new Event('change', { bubbles: true })); paint();
  };
  const drag = (el, fn) => {
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.setPointerCapture(e.pointerId); const mv = (ev) => { const r = el.getBoundingClientRect(); fn(clamp((ev.clientX - r.left) / r.width), clamp((ev.clientY - r.top) / r.height)); emit(false); }; mv(e); el.onpointermove = mv; el.onpointerup = () => { el.onpointermove = el.onpointerup = null; emit(true); }; });
  };
  drag(sv, (x, y) => { S = x; V = 1 - y; });
  drag(hue, (x) => { H = x * 360; });
  hex.addEventListener('input', () => { const r = parse(hex.value); if (r) { [H, S, V] = rgb2hsv(...r); emit(false); } });
  hex.addEventListener('change', () => { hex.blur(); emit(true); });
  pop.querySelector('.cp-sw').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; [H, S, V] = rgb2hsv(...parse(b.dataset.c)); emit(true); });
  pop.querySelector('.cp-eye')?.addEventListener('click', async () => { try { const r = await new window.EyeDropper().open(); [H, S, V] = rgb2hsv(...parse(r.sRGBHex)); emit(true); } catch {} });
  const place = () => {
    const r = btn.getBoundingClientRect(), w = 244, h = pop.offsetHeight || 330;
    const up = innerHeight - r.bottom < h + 16 && r.top > h + 16;
    pop.style.left = Math.min(Math.max(8, r.left), innerWidth - w - 8) + 'px';
    pop.style.top = (up ? r.top - h - 8 : r.bottom + 8) + 'px';
    pop.style.transformOrigin = up ? '20px 100%' : '20px 0';
  };
  const close = (f = true) => {
    if (openCP !== api) return; openCP = null; btn.setAttribute('aria-expanded', 'false'); pop.classList.remove('open');
    setTimeout(() => { if (openCP !== api) { try { pop.hidePopover(); } catch {} } }, 150); if (f) btn.focus({ preventScroll: true });
  };
  const open = () => { if (openCP) openCP.close(false); load(); openCP = api; try { pop.showPopover(); } catch {} place(); btn.setAttribute('aria-expanded', 'true'); requestAnimationFrame(() => pop.classList.add('open')); };
  const api = { close, el: wrap, pop };
  btn.addEventListener('click', () => (openCP === api ? close() : open()));
  pop.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } });
  const lab = inp.closest('label');
  if (lab) lab.addEventListener('click', (e) => { if (e.target === lab) { e.preventDefault(); } else if (!wrap.contains(e.target)) e.preventDefault(); });
  Object.defineProperty(inp, 'value', { configurable: true, get() { return NV.get.call(this); }, set(v) { NV.set.call(this, v); load(); } });
  load();
}
const NV = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
document.addEventListener('pointerdown', (e) => { if (openCP && !openCP.el.contains(e.target) && !openCP.pop.contains(e.target)) openCP.close(false); }, true);
addEventListener('resize', () => openCP?.close(false));
document.addEventListener('scroll', (e) => { if (openCP && !openCP.pop.contains(e.target)) openCP.close(false); }, true);
const all = (root = document) => root.querySelectorAll('input[type="color"]').forEach(enhance);
all();
new MutationObserver((ms) => { for (const m of ms) m.addedNodes.forEach((n) => { if (n.nodeType === 1) { if (n.matches?.('input[type="color"]')) enhance(n); else n.querySelectorAll?.('input[type="color"]').forEach(enhance); } }); }).observe(document.body, { childList: true, subtree: true });
