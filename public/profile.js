// Kesit — profil ve tercihler: sevimli K avatarı, ad, dil, tema, bildirimler; "Sesim" kütüphanesi.
import { LANG_NAMES, setLang, getLang } from './i18n.js';
import { ico } from './ui-icons.js';

export const avatarSVG = (_i = 0, size = 32) => `<img src="/brand/kesit-mark.svg" width="${size}" height="${size}" alt="" style="display:block;border-radius:${Math.round(size*0.3)}px">`;
const KEY = 'ms-profile';
const DEF = { name: 'Yerel stüdyo', avatar: 0, sound: true, notify: false };
export const getProfile = () => { try { return { ...DEF, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { ...DEF }; } };
const saveProfile = (p) => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {} paint(); };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function paint() {
  const p = getProfile();
  const a = document.getElementById('meAvatar'); if (a) a.innerHTML = avatarSVG(p.avatar, 30);
  const n = document.getElementById('meName'); if (n) n.textContent = p.name || DEF.name;
  const big = document.getElementById('pfBig'); if (big) big.innerHTML = avatarSVG(p.avatar, 72);
}

let dlg;
function build() {
  dlg = document.createElement('dialog');
  dlg.id = 'dlgProfile'; dlg.className = 'pfdlg';
  dlg.innerHTML = `<form method="dialog" class="pf">
    <header class="mhead"><h2>Profil ve tercihler</h2><button type="submit" class="iconbtn" aria-label="Kapat" value="x">${ico('x')}</button></header>
    <div class="pf-body">
      <div class="pf-top"><span id="pfBig" class="pf-big"></span>
        <label class="field grow">Adın<input id="pfName" maxlength="32" autocomplete="off" placeholder="Yerel stüdyo" /></label></div>
      <div class="pf-h">Tercihler</div>
      <div class="pf-rows">
        <div class="pf-row"><div><b>Arayüz dili</b><small>Menüler ve düğmeler bu dilde görünür.</small></div>
          <select id="pfLang" data-lang-select class="langsel">${Object.entries(LANG_NAMES).map(([c, n]) => `<option value="${c}">${n}</option>`).join('')}</select></div>
        <div class="pf-row"><div><b>Görünüm</b><small>Açık ya da koyu tema.</small></div><button type="button" class="ghost small" id="pfTheme">Temayı değiştir</button></div>
        <label class="pf-row"><div><b>Klipler bitince ses çal</b><small>Üretim bittiğinde kısa bir ses duyarsın.</small></div><input type="checkbox" id="pfSound" /></label>
        <label class="pf-row"><div><b>Masaüstü bildirimi göster</b><small>Başka sekmedeyken bile haber verir.</small></div><input type="checkbox" id="pfNotify" /></label>
      </div>
      <div class="pf-h">Kısayollar</div>
      <div class="pf-links"><button type="button" class="ghost small" data-go="voice">${ico('mic')}Sesim (ses kayıtların)</button><button type="button" class="ghost small" data-go="general">${ico('settings')}Tüm ayarlar</button></div>
    </div>
    <footer class="mfoot"><span class="muted grow">Bu tercihler yalnızca bu bilgisayarda saklanır.</span><button value="x" class="primary">Tamam</button></footer>
  </form>`;
  document.body.append(dlg);
  dlg.addEventListener('input', (e) => {
    const p = getProfile();
    if (e.target.id === 'pfName') { p.name = e.target.value.trim() || DEF.name; saveProfile(p); }
  });
  dlg.addEventListener('change', async (e) => {
    const p = getProfile();
    if (e.target.id === 'pfSound') { p.sound = e.target.checked; saveProfile(p); }
    if (e.target.id === 'pfNotify') {
      if (e.target.checked && 'Notification' in window && Notification.permission !== 'granted') {
        const r = await Notification.requestPermission();
        if (r !== 'granted') e.target.checked = false;
      }
      p.notify = e.target.checked && 'Notification' in window && Notification.permission === 'granted';
      saveProfile(p);
    }
  });
  dlg.addEventListener('click', (e) => {
    if (e.target.closest('#pfTheme')) document.getElementById('btnTheme')?.click();
    const go = e.target.closest('[data-go]');
    if (go) { dlg.close(); window.__openSettings?.(go.dataset.go); }
  });
}
export function openProfile() {
  if (!dlg) build();
  const p = getProfile();
  dlg.querySelector('#pfName').value = p.name === DEF.name ? '' : p.name;
  dlg.querySelector('#pfSound').checked = !!p.sound;
  dlg.querySelector('#pfNotify').checked = !!p.notify;
  dlg.querySelector('#pfLang').value = getLang();
  paint(); dlg.showModal();
}

/** İş bitince ses + bildirim */
window.__kesitDone = (msg) => {
  const p = getProfile();
  if (p.sound) try {
    const c = new (window.AudioContext || window.webkitAudioContext)(), o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(660, c.currentTime); o.frequency.setValueAtTime(880, c.currentTime + 0.12);
    g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(0.18, c.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.4);
    o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + 0.42);
  } catch {}
  if (p.notify && document.hidden && 'Notification' in window && Notification.permission === 'granted') { try { new Notification('Kesit', { body: msg || 'Klipler hazır', icon: '/icons/icon-192.png' }); } catch {} }
};

export function initProfile() {
  paint();
  document.getElementById('btnProfile')?.addEventListener('click', openProfile);
}

/* ---- Sesim: ses kütüphanesi (Ayarlar → Sesim) ---- */
const toast = (m) => { const d = Object.assign(document.createElement('div'), { className: 'toast', textContent: window.__t ? window.__t(m) : m }); document.body.append(d); setTimeout(() => d.remove(), 3800); };
async function jj(url, body) {
  const r = await fetch(url, body !== undefined ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {});
  const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || r.statusText); return d;
}
let rec = null;
export async function renderVoices() {
  const box = document.getElementById('voiceLib'); if (!box) return;
  let list = [];
  try { list = (await jj('/api/fx/list')).assets.voice || []; } catch {}
  box.innerHTML = `<div class="vl-actions"><button type="button" class="ghost small" id="vlRec">${ico('mic')}<span>Kayda başla</span></button><button type="button" class="ghost small" id="vlUp">${ico('up')}Ses dosyası yükle</button></div>`
    + (list.length ? `<div class="vl-list">${list.map((a) => `<div class="vl-item"><span class="vl-name">${esc(a.name)}</span><audio controls preload="none" src="/my-voice/${encodeURIComponent(a.id)}"></audio><button type="button" class="iconbtn" data-vdel="${esc(a.id)}" aria-label="Sil">${ico('x')}</button></div>`).join('')}</div>` : `<p class="muted">Henüz kayıt yok. Mikrofonla kaydet ya da hazır bir ses dosyası yükle.</p>`);
}
async function upload(blob, name) {
  const r = await fetch(`/api/fx/upload?kind=voice&name=${encodeURIComponent(name)}`, { method: 'POST', body: blob });
  const d = await r.json(); if (!r.ok) throw new Error(d.error); return d;
}
document.addEventListener('click', async (e) => {
  const t = e.target;
  if (t.closest('#vlUp')) {
    const inp = Object.assign(document.createElement('input'), { type: 'file', accept: 'audio/*,.mp3,.wav,.m4a,.aac,.ogg,.opus,.flac,.webm' });
    inp.onchange = async () => { const f = inp.files[0]; if (!f) return; try { await upload(f, f.name); toast('Ses yüklendi'); renderVoices(); } catch (err) { toast(err.message); } };
    inp.click(); return;
  }
  if (t.closest('#vlRec')) {
    const btn = t.closest('#vlRec'), label = btn.querySelector('span');
    if (rec) { rec.stop(); return; }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return toast('Bu tarayıcıda kayıt desteklenmiyor. Bunun yerine dosya yükle.');
    let stream; try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); } catch { return toast('Mikrofon izni verilmedi. Tarayıcı ayarlarından izin ver.'); }
    const chunks = [], mr = new MediaRecorder(stream), t0 = Date.now();
    const tick = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); label.textContent = `Durdur ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }, 250);
    btn.classList.add('live'); rec = mr;
    mr.ondataavailable = (ev) => ev.data.size && chunks.push(ev.data);
    mr.onstop = async () => {
      clearInterval(tick); stream.getTracks().forEach((x) => x.stop()); rec = null; btn.classList.remove('live');
      const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
      if (blob.size < 2000) { label.textContent = 'Kayda başla'; return toast('Kayıt alınamadı.'); }
      try { await upload(blob, 'kayit.webm'); toast('Kayıt kaydedildi'); } catch (err) { toast(err.message); }
      renderVoices();
    };
    mr.start(); return;
  }
  const del = t.closest('[data-vdel]');
  if (del && del.closest('#voiceLib')) { try { await jj('/api/fx/asset-delete', { kind: 'voice', id: del.dataset.vdel }); renderVoices(); } catch (err) { toast(err.message); } }
});
