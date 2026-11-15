// Tek yerden düzen: Layout = Sidebar + Content. Menü öğeleri, logo ve alt panel yalnızca burada tanımlı.
// Yeni bir sayfa/menü eklemek için NAV'a bir satır eklemek yeterli.
import { ICONS, providerLogo } from './ui-icons.js';
import { LANG_NAMES } from './i18n.js';
export const BRAND = { name: 'Kesit', mark: 'brand/kesit-mark.svg' };

export const NAV = [
  { type: 'view', id: 'clip', icon: 'cut', label: 'Klip oluştur', on: true },
  { type: 'view', id: 'library', icon: 'library', label: 'Kütüphane', badge: 'libCount' },
  { type: 'action', id: 'btnSettings', icon: 'settings', label: 'Ayarlar' },
];

const navItem = (n) => {
  const inner = `<i class="ni">${ICONS[n.icon]}</i><span>${n.label}</span>${n.badge ? `<em id="${n.badge}"></em>` : ''}`;
  if (n.type === 'view') return `<button data-view="${n.id}"${n.on ? ' class="on"' : ''}>${inner}</button>`;
  if (n.type === 'action') return `<button id="${n.id}">${inner}</button>`;
  return `<a class="navlink" href="${n.href}" target="_blank" rel="noopener">${inner}</a>`;
};

export const Sidebar = () => `
  <a class="logo" href="#" aria-label="${BRAND.name}"><img class="mark" src="${BRAND.mark}" alt="" width="30" height="30" /><span>${BRAND.name}</span></a>
  <nav id="nav" class="nav">${NAV.map(navItem).join('')}</nav>
  <div class="rail-hidden" hidden>
    <button id="btnNewGen"></button><div id="channelList"></div><button id="btnNewChannel"></button>
  </div>
  <div class="rail-foot">
    <label>Yapay zeka
      <select id="provider"></select>
    </label>
    <div id="kesitCreditWrap" class="credit-rail-row" hidden>
      <span class="credit-pill" id="creditPill"><i class="ico" data-ico="spark"></i><b id="creditCount">5</b> Kredi</span>
      <button type="button" id="btnBuyCredits" class="btn-buy-credits" title="Kredi Paketi Satın Al">+ Kredi Al</button>
    </div>
    <label id="modelWrap">Model
      <select id="model"></select>
    </label>
    <div class="foot-rows">
      <button type="button" class="me" id="btnProfile" title="Profil ve tercihler"><span class="avatar kav" id="meAvatar"></span><span class="grow"><b id="meName">Yerel stüdyo</b><small>Profil ve tercihler</small></span></button>
      <div class="foot-ctl">
        <select id="uiLangSel" data-lang-select class="langsel" aria-label="Language">${Object.entries(LANG_NAMES).map(([c, n]) => `<option value="${c}">${n}</option>`).join('')}</select>
        <button id="btnTheme" class="iconbtn" title="Açık / koyu tema">☾</button>
      </div>
    </div>
  </div>`;

/** Düzeni sayfaya kurar: #sidebar (yan menü) ve <main> (içerik) tek şablondan gelir. */
export function mountLayout() {
  const side = document.getElementById('sidebar');
  if (side) side.innerHTML = Sidebar();
}
mountLayout();
