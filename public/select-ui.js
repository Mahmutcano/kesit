// Tarayıcının kendi açılır listesi yerine tek tip, ikonlu, klavyeyle gezilebilir liste.
// Altta gerçek <select> kalır (app.js ona value yazar, change dinler); bu bileşen onunla eşitlenir.
import { ICONS, providerLogo } from './ui-icons.js';

const NATIVE_VALUE = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
const ICON_BY_ID = { gTpl: 'subs', gFont: 'type', gLang: 'globe', gAspect: 'frame', gLen: 'timer', gVar: 'shuffle' };
let openDD = null;

function splitName(text) {
  const t = text.replace(/^[●○]\s*/, '').trim();
  const m = t.match(/^(.*?)\s*\((.+)\)\s*$/);
  return m ? { name: m[1], sub: m[2] } : { name: t, sub: '' };
}

function enhance(sel) {
  if (sel.dataset.dd || sel.multiple || sel.hasAttribute('data-native')) return;
  sel.dataset.dd = '1';
  const isProv = sel.id === 'provider', isLang = sel.hasAttribute('data-lang-select');
  const wrap = document.createElement('div');
  wrap.className = 'dd' + (isProv ? ' dd-provider' : '') + (isLang ? ' dd-langwrap' : '');
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'dd-btn'; btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false');
  const menu = document.createElement('div');
  menu.className = 'dd-menu' + (isLang ? ' dd-lang' : ''); menu.setAttribute('role', 'listbox'); menu.setAttribute('popover', 'manual'); menu.tabIndex = -1;
  sel.after(wrap); wrap.append(btn); sel.classList.add('dd-native'); sel.tabIndex = -1; sel.setAttribute('aria-hidden', 'true');
  sel.style.display = 'none';

  const iconFor = (opt) => (isProv ? providerLogo(opt.value) : ICONS[opt.dataset.icon] || '');
  const itemHTML = (opt) => {
    const raw = opt.textContent;
    if (isProv) {
      const { name, sub } = splitName(raw);
      const ok = raw.trim().startsWith('●');
      return `<span class="dd-ic">${iconFor(opt)}</span><span class="dd-tx"><b>${name}</b>${sub ? `<small>${sub}</small>` : ''}</span><i class="dd-dot ${ok ? 'ok' : ''}" title="${ok ? 'ready' : 'not set up'}"></i>`;
    }
    if (isLang) return `<span class="dd-tx"><b>${raw}</b></span><small class="dd-code">${opt.value.toUpperCase()}</small>`;
    return `<span class="dd-tx"><b>${raw}</b></span>`;
  };
  const refresh = () => {
    const o = sel.options[sel.selectedIndex];
    btn.innerHTML = `${isProv && o ? `<span class="dd-ic">${iconFor(o)}</span>` : isLang ? `<span class="dd-ic">${ICONS.globe}</span>` : ''}<span class="dd-val">${o ? (isProv ? splitName(o.textContent).name : o.textContent) : ''}</span>${ICONS.chev}`;
    btn.disabled = sel.disabled;
  };
  const build = () => {
    menu.innerHTML = [...sel.options].map((o, i) => `<div role="option" class="dd-item${i === sel.selectedIndex ? ' on' : ''}" data-i="${i}" aria-selected="${i === sel.selectedIndex}">${itemHTML(o)}${i === sel.selectedIndex ? `<span class="dd-check">${ICONS.check}</span>` : ''}</div>`).join('');
  };
  Object.defineProperty(sel, 'value', { configurable: true, get() { return NATIVE_VALUE.get.call(this); }, set(v) { NATIVE_VALUE.set.call(this, v); refresh(); } });
  new MutationObserver(() => { refresh(); if (openDD === api) build(); }).observe(sel, { childList: true, subtree: true, characterData: true });
  sel.addEventListener('change', refresh);

  let active = -1;
  const setActive = (i) => {
    const items = [...menu.children]; if (!items.length) return;
    active = (i + items.length) % items.length;
    items.forEach((e, k) => e.classList.toggle('hot', k === active));
    items[active].scrollIntoView({ block: 'nearest' });
  };
  const place = () => {
    const r = btn.getBoundingClientRect();
    menu.style.minWidth = Math.max(r.width, isProv ? 270 : isLang ? 340 : 150) + 'px';
    menu.style.left = '0px'; menu.style.top = '0px';
    const mh = menu.offsetHeight, mw = menu.offsetWidth, vh = innerHeight, vw = innerWidth;
    const below = vh - r.bottom, up = r.top > below && below < mh + 16;
    let left = Math.min(Math.max(8, r.left), vw - mw - 8);
    const top = up ? Math.max(8, r.top - mh - 6) : r.bottom + 6;
    menu.style.maxHeight = Math.max(160, (up ? r.top : below) - 20) + 'px';
    menu.style.left = left + 'px'; menu.style.top = top + 'px';
    menu.style.transformOrigin = `${Math.max(12, r.left - left + 24)}px ${up ? '100%' : '0'}`;
  };
  const close = (focusBtn = true) => {
    if (openDD !== api) return;
    openDD = null; btn.setAttribute('aria-expanded', 'false'); menu.classList.remove('open');
    setTimeout(() => { if (openDD !== api) { try { menu.hidePopover(); } catch {} } }, 140);
    if (focusBtn) btn.focus({ preventScroll: true });
  };
  const choose = (i) => { sel.selectedIndex = i; refresh(); sel.dispatchEvent(new Event('change', { bubbles: true })); sel.dispatchEvent(new Event('input', { bubbles: true })); close(); };
  const open = () => {
    if (openDD && openDD !== api) openDD.close(false);
    build(); openDD = api; wrap.append(menu);
    try { menu.showPopover(); } catch {}
    place(); btn.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => menu.classList.add('open'));
    setActive(sel.selectedIndex); menu.focus({ preventScroll: true });
  };
  const api = { close, el: wrap, menu, btn };
  btn.addEventListener('click', () => (openDD === api ? close() : open()));
  btn.addEventListener('keydown', (e) => { if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); open(); } });
  menu.addEventListener('click', (e) => { const it = e.target.closest('.dd-item'); if (it) choose(+it.dataset.i); });
  menu.addEventListener('mousemove', (e) => { const it = e.target.closest('.dd-item'); if (it) setActive(+it.dataset.i); });
  let buf = '', t0 = 0;
  menu.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(sel.options.length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (active >= 0) choose(active); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === 'Tab') close(false);
    else if (e.key.length === 1) {
      const now = Date.now(); buf = now - t0 > 700 ? e.key : buf + e.key; t0 = now;
      const i = [...sel.options].findIndex((o) => o.textContent.replace(/^[●○]\s*/, '').toLowerCase().startsWith(buf.toLowerCase()));
      if (i >= 0) setActive(i);
    }
  });
  refresh();
  // etiketin tamamı tıklanınca da açılsın
  const lab = sel.closest('label');
  if (lab) lab.addEventListener('click', (e) => { if (!e.target.closest('.dd-menu') && !e.target.closest('.dd-btn')) { e.preventDefault(); btn.click(); } });
}

document.addEventListener('pointerdown', (e) => { if (openDD && !openDD.el.contains(e.target) && !openDD.menu.contains(e.target)) openDD.close(false); }, true);
addEventListener('resize', () => openDD?.close(false));
document.addEventListener('scroll', (e) => { if (openDD && !openDD.menu.contains(e.target)) openDD.close(false); }, true);

export function enhanceAll(root = document) { root.querySelectorAll('select').forEach(enhance); }
enhanceAll();
new MutationObserver((ms) => { for (const m of ms) m.addedNodes.forEach((n) => { if (n.nodeType === 1) { if (n.tagName === 'SELECT') enhance(n); else n.querySelectorAll?.('select').forEach(enhance); } }); }).observe(document.body, { childList: true, subtree: true });
