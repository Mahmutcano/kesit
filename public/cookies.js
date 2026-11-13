// Kesit — "Bu video giriş istiyor" penceresi: yaş sınırlı / giriş isteyen YouTube videoları için cookies.txt ister ve nasıl alınacağını çizimlerle anlatır.
import { ico } from './ui-icons.js';

const lang = () => { try { return localStorage.getItem('ms-ui-lang') === 'tr' ? 'tr' : 'en'; } catch { return 'en'; } };
const T = (en, tr) => (lang() === 'tr' ? tr : en);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
let dlg, resolveFn, file = null;

// ---- çizimler (tema renkleri değişkenlerle) ----
const FR = 'fill="var(--panel)" stroke="var(--line2)" stroke-width="1.5"';
const ART = {
  signin: `<svg viewBox="0 0 240 150" role="img" aria-hidden="true">
    <rect x="12" y="14" width="216" height="124" rx="12" ${FR}/>
    <path d="M12 26a12 12 0 0 1 12-12h192a12 12 0 0 1 12 12v12H12Z" fill="var(--panel2)"/>
    <circle cx="26" cy="26" r="3" fill="var(--line2)"/><circle cx="37" cy="26" r="3" fill="var(--line2)"/><circle cx="48" cy="26" r="3" fill="var(--line2)"/>
    <rect x="62" y="20" width="120" height="12" rx="6" fill="var(--panel)" stroke="var(--line)"/>
    <text x="72" y="29.4" font-size="8" fill="var(--muted)" font-family="var(--font)">youtube.com</text>
    <rect x="26" y="52" width="108" height="66" rx="8" fill="var(--panel2)"/>
    <circle cx="80" cy="85" r="15" fill="var(--accent)"/><path d="M75.5 77.5v15l13-7.5Z" fill="#fff"/>
    <rect x="148" y="54" width="62" height="7" rx="3.5" fill="var(--line2)"/><rect x="148" y="68" width="48" height="7" rx="3.5" fill="var(--line)"/><rect x="148" y="82" width="54" height="7" rx="3.5" fill="var(--line)"/>
    <circle cx="204" cy="28" r="0" fill="none"/>
    <g transform="translate(196 104)"><circle r="14" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/><circle cy="-3" r="4.2" fill="var(--accent)"/><path d="M-7.5 8c1-4 4-5.5 7.5-5.5S6.5 4 7.5 8" fill="var(--accent)"/><circle cx="10" cy="10" r="6" fill="var(--ok)" stroke="var(--panel)" stroke-width="1.5"/><path d="m7.2 10 2 2 3.4-3.8" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></g>
  </svg>`,
  export: `<svg viewBox="0 0 240 150" role="img" aria-hidden="true">
    <rect x="12" y="14" width="216" height="124" rx="12" ${FR}/>
    <path d="M12 26a12 12 0 0 1 12-12h192a12 12 0 0 1 12 12v12H12Z" fill="var(--panel2)"/>
    <rect x="22" y="20" width="118" height="12" rx="6" fill="var(--panel)" stroke="var(--line)"/>
    <text x="32" y="29.4" font-size="8" fill="var(--muted)" font-family="var(--font)">youtube.com</text>
    <rect x="196" y="19" width="22" height="14" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
    <path d="M204 26h6M207 23v6" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M172 48c14 0 22-4 28-10" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="3 3" stroke-linecap="round"/>
    <rect x="118" y="44" width="100" height="84" rx="9" fill="var(--panel)" stroke="var(--line2)" stroke-width="1.5"/>
    <rect x="128" y="54" width="52" height="7" rx="3.5" fill="var(--text)" opacity=".75"/>
    <rect x="128" y="68" width="78" height="5" rx="2.5" fill="var(--line)"/><rect x="128" y="78" width="64" height="5" rx="2.5" fill="var(--line)"/>
    <rect x="128" y="94" width="80" height="24" rx="7" fill="var(--accent)"/>
    <text x="168" y="109.6" font-size="10" font-weight="600" fill="#fff" text-anchor="middle" font-family="var(--font)">Export</text>
    <g transform="translate(42 90)"><rect x="-22" y="-26" width="44" height="52" rx="6" fill="var(--panel2)" stroke="var(--line2)" stroke-width="1.5"/><path d="M-8-12h16M-8-4h16M-8 4h10" stroke="var(--muted)" stroke-width="2" stroke-linecap="round"/><text x="0" y="19" font-size="7" fill="var(--muted)" text-anchor="middle" font-family="var(--font)">.txt</text></g>
  </svg>`,
  drop: `<svg viewBox="0 0 240 150" role="img" aria-hidden="true">
    <g transform="translate(46 56)"><rect x="-26" y="-34" width="52" height="68" rx="7" fill="var(--panel)" stroke="var(--line2)" stroke-width="1.5"/><rect x="-14" y="-20" width="28" height="4" rx="2" fill="var(--line2)"/><rect x="-14" y="-10" width="22" height="4" rx="2" fill="var(--line)"/><rect x="-14" y="0" width="26" height="4" rx="2" fill="var(--line)"/><text x="0" y="24" font-size="7.5" font-weight="600" fill="var(--text)" text-anchor="middle" font-family="var(--font)">cookies.txt</text></g>
    <path d="M86 56h40" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-dasharray="1 6"/><path d="m122 49 8 7-8 7" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="136" y="22" width="92" height="104" rx="12" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="5 4"/>
    <g transform="translate(182 66)" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M0 14V-10M-11 1 0-10 11 1"/></g>
    <text x="182" y="102" font-size="9" font-weight="600" fill="var(--accent-h)" text-anchor="middle" font-family="var(--font)">Kesit</text>
  </svg>`,
};

function build() {
  dlg = document.createElement('dialog');
  dlg.id = 'dlgCookies';
  dlg.className = 'ckdlg';
  dlg.setAttribute('data-no-i18n', '');
  dlg.addEventListener('click', onClick);
  dlg.addEventListener('change', (e) => { if (e.target.id === 'ckFile') pick(e.target.files[0]); });
  dlg.addEventListener('close', () => { const r = resolveFn; resolveFn = null; r?.(false); });
  dlg.addEventListener('dragover', (e) => { e.preventDefault(); dlg.querySelector('.ck-drop')?.classList.add('over'); });
  dlg.addEventListener('dragleave', () => dlg.querySelector('.ck-drop')?.classList.remove('over'));
  dlg.addEventListener('drop', (e) => { e.preventDefault(); pick(e.dataTransfer.files[0]); });
  document.body.append(dlg);
}

function steps(had) {
  return [
    [T('Sign in to YouTube', 'YouTube’a giriş yap'), had
      ? T('Your saved cookies were rejected. They may have expired. Open YouTube in Chrome and make sure you can play this video while signed in.', 'Kayıtlı çerezler kabul edilmedi, süresi dolmuş olabilir. Chrome’da YouTube’u aç ve giriş yapmışken videoyu oynatabildiğinden emin ol.')
      : T('Open YouTube in Chrome with a Google account that is allowed to watch this video (for age-restricted videos the account must be age-verified).', 'Chrome’da bu videoyu izleyebilen bir Google hesabıyla YouTube’u aç (yaş sınırlı videolarda hesabın yaşı doğrulanmış olmalı).'), ART.signin],
    [T('Export cookies.txt', 'cookies.txt dışa aktar'), T('Install the free “Get cookies.txt LOCALLY” extension, keep the youtube.com tab open, click the extension icon and press Export.', 'Ücretsiz “Get cookies.txt LOCALLY” eklentisini kur, youtube.com sekmesi açıkken eklenti simgesine tıkla ve Export’a bas.'), ART.export],
    [T('Drop the file here', 'Dosyayı buraya bırak'), T('Add the downloaded file below. Kesit saves it next to server.js and retries your video.', 'İnen dosyayı aşağıya ekle. Kesit onu server.js yanına kaydeder ve videonu yeniden dener.'), ART.drop],
  ];
}

async function render(had) {
  dlg.innerHTML = `<div class="ck-shell">
    <header class="mhead"><h2>${esc(had ? T('Sign-in didn’t work', 'Giriş çalışmadı') : T('This video needs you to sign in', 'Bu video giriş istiyor'))}</h2><button class="iconbtn" data-close aria-label="Close">${ico('x')}</button></header>
    <div class="ck-body">
      <p class="ck-lead">${esc(T('YouTube only lets signed-in accounts download age-restricted or protected videos. Give Kesit your login cookies once and it can fetch them like your browser does.', 'YouTube yaş sınırlı veya korumalı videoları sadece giriş yapmış hesaplara indirtir. Kesit’e giriş çerezlerini bir kez ver, tarayıcın gibi indirebilsin.'))}</p>
      <ol class="ck-steps">${steps(had).map(([t, d, art], i) => `<li><figure>${art}</figure><div class="ck-t"><span class="ck-n">${i + 1}</span><b>${esc(t)}</b></div><p>${esc(d)}</p></li>`).join('')}</ol>
      <label class="ck-drop" for="ckFile">
        <input id="ckFile" type="file" accept=".txt,text/plain" hidden>
        <span class="ck-ico">${ico('up')}</span>
        <span class="ck-dt" id="ckName">${esc(T('Choose cookies.txt or drop it here', 'cookies.txt seç ya da buraya bırak'))}</span>
      </label>
      <p class="ck-note">${ico('check')}<span>${esc(T('The file stays on your computer, is only used for downloading, and you can remove it any time. Never share it: it works like a login.', 'Dosya bilgisayarında kalır, sadece indirme için kullanılır ve istediğin zaman silebilirsin. Kimseyle paylaşma: giriş anahtarı gibi çalışır.'))}</span></p>
      <p class="ck-err" id="ckErr" hidden></p>
    </div>
    <footer class="mfoot"><a class="ck-alt" data-upload-hint>${esc(T('No luck? Download the video yourself and upload it instead.', 'Olmadı mı? Videoyu kendin indirip yükle.'))}</a><span class="grow"></span><button class="ghost" data-close>${esc(T('Cancel', 'Vazgeç'))}</button><button class="primary" id="ckSave" disabled>${esc(T('Save and retry', 'Kaydet ve tekrar dene'))}</button></footer>
  </div>`;
}

function pick(f) {
  if (!f) return;
  file = f;
  dlg.querySelector('.ck-drop').classList.remove('over');
  dlg.querySelector('.ck-drop').classList.add('has');
  dlg.querySelector('#ckName').textContent = f.name;
  dlg.querySelector('#ckSave').disabled = false;
  dlg.querySelector('#ckErr').hidden = true;
}

async function onClick(e) {
  if (e.target.closest('[data-close]')) return dlg.close();
  if (e.target.closest('[data-upload-hint]')) { dlg.close(); document.querySelector('#clipFile')?.click(); return; }
  if (e.target.closest('#ckSave') && file) {
    const btn = dlg.querySelector('#ckSave'), err = dlg.querySelector('#ckErr');
    btn.disabled = true; btn.textContent = T('Saving…', 'Kaydediliyor…');
    try {
      const r = await fetch('/api/cookies', { method: 'POST', body: await file.text() });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      const done = resolveFn; resolveFn = null;
      dlg.close();
      done?.(true);
    } catch (x) {
      err.textContent = x.message; err.hidden = false;
      btn.disabled = false; btn.textContent = T('Save and retry', 'Kaydet ve tekrar dene');
    }
  }
}

/** Pencereyi açar; çerez kaydedilirse true döner. */
function ask() {
  if (!dlg) build();
  file = null;
  return fetch('/api/cookies/status').then((r) => r.json()).catch(() => ({})).then(async (st) => {
    await render(!!st.saved);
    dlg.showModal();
    return new Promise((res) => { resolveFn = res; });
  });
}
window.__kesitCookies = { ask };
