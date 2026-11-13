// Çekim tahtası: gönderince tahta "klak" yapar; bağlantı yazılınca gönder düğmesi tam görünür.
const url = document.getElementById('clipUrl');
const send = document.getElementById('btnGen');
const box = document.getElementById('clipComposer');
if (box && !box.querySelector('.slate-arm')) { const a = document.createElement('div'); a.className = 'slate-arm'; a.setAttribute('aria-hidden', 'true'); box.prepend(a); }
const arm = box?.querySelector('.slate-arm');
const sync = () => send?.classList.toggle('ready', !!url?.value.trim());
url?.addEventListener('input', sync);
setInterval(sync, 600); sync();


// Kompozer hücrelerine ikon: etiket metni ikonla birlikte tek satırda
import { ICONS } from './ui-icons.js';
const CELL_ICON = { gTpl: 'subs', gFont: 'type', gLang: 'globe', gAspect: 'frame', gCount: 'film', gLen: 'timer', gColor: 'swatch', gVar: 'shuffle', gHook: 'hook' };
document.querySelectorAll('#clipComposer .pillin').forEach((lab) => {
  const ctl = lab.querySelector('select, input'); const ic = ICONS[CELL_ICON[ctl?.id]];
  if (!ic || lab.querySelector('.lbl')) return;
  const span = document.createElement('span'); span.className = 'lbl';
  span.insertAdjacentHTML('afterbegin', ic);
  [...lab.childNodes].forEach((n) => { if (n.nodeType === 3 && n.nodeValue.trim()) span.append(n); });
  lab.prepend(span);
});

// Tema düğmesi: yazı yerine ikon
const tb = document.getElementById('btnTheme');
const paintTheme = () => { if (tb) tb.innerHTML = document.documentElement.classList.contains('dark') ? ICONS.sun : ICONS.moon; };
paintTheme(); tb?.addEventListener('click', () => setTimeout(paintTheme, 0));

// Ayarlar penceresi: sekmeler, ikonlar, logolar
import { providerLogo } from './ui-icons.js';
document.querySelectorAll('.mdlg [data-ico]').forEach((el) => { el.innerHTML = ICONS[el.dataset.ico] || ''; });
const dlg = document.getElementById('settings');
if (dlg) {
  dlg.querySelectorAll('[data-ico]').forEach((el) => { el.innerHTML = ICONS[el.dataset.ico] || ''; });
  dlg.querySelectorAll('[data-logo]').forEach((el) => { el.innerHTML = providerLogo(el.dataset.logo); });
  const title = dlg.querySelector('#sTitle');
  const tabs = [...dlg.querySelectorAll('.snav [data-tab]')];
  const show = (id) => {
    tabs.forEach((t) => { const on = t.dataset.tab === id; t.classList.toggle('on', on); t.setAttribute('aria-selected', on); });
    dlg.querySelectorAll('[data-pane]').forEach((p) => { p.hidden = p.dataset.pane !== id; });
    title.textContent = tabs.find((t) => t.dataset.tab === id).querySelector('span').textContent;
    dlg.querySelector('.sbody').scrollTop = 0;
  };
  tabs.forEach((t) => t.addEventListener('click', () => show(t.dataset.tab)));
  dlg.addEventListener('close', () => show('general'));
  document.getElementById('btnThemeS')?.addEventListener('click', () => document.getElementById('btnTheme').click());
  new MutationObserver(() => { const a = tabs.find((t) => t.classList.contains('on')); if (a) title.textContent = a.querySelector('span').textContent; }).observe(dlg.querySelector('.snav'), { subtree: true, characterData: true });
}

// Ana sayfa: hızlı başlangıç ayarları
document.querySelectorAll('#presets [data-ico]').forEach((b) => b.insertAdjacentHTML('afterbegin', ICONS[b.dataset.ico] || ''));
const PRESETS = {
  podcast: { gTpl: 'podcast', gLen: '60', gAspect: '9:16', gCount: '6' },
  shorts: { gTpl: 'default', gLen: '30', gAspect: '9:16', gCount: '8' },
  lecture: { gTpl: 'minimal', gLen: '90', gAspect: '1:1', gCount: '4' },
  hype: { gTpl: 'neon', gLen: '20', gAspect: '9:16', gCount: '10' },
};
document.getElementById('presets')?.addEventListener('click', (e) => {
  const b = e.target.closest('[data-p]'); if (!b) return;
  const p = PRESETS[b.dataset.p];
  for (const [id, v] of Object.entries(p)) {
    const el = document.getElementById(id); if (!el) continue;
    el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); el.dispatchEvent(new Event('input', { bubbles: true }));
  }
  document.querySelectorAll('#presets button').forEach((x) => x.classList.toggle('on', x === b));
  document.getElementById('clipUrl')?.focus();
});
