// Kesit — "Geliştir" penceresi: efekt skill'leri, tarifler, müzik/logo yükleme, sürümler.
// Mevcut akışa dokunmaz: sonuç ayrı bir dosya olarak (fx_*.mp4) klibin yanına yazılır.
import { ico } from './ui-icons.js';

const lang = () => { try { return localStorage.getItem('ms-ui-lang') === 'tr' ? 'tr' : 'en'; } catch { return 'en'; } };
const T = (en, tr) => (lang() === 'tr' ? tr : en);
const L = (o) => (o && typeof o === 'object' ? o[lang()] || o.en : o ?? '');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const CATS = {
  sports: ['Sports', 'Spor'], timing: ['Timing', 'Zamanlama'], motion: ['Camera', 'Kamera'],
  look: ['Look', 'Renk'], audio: ['Audio and music', 'Ses ve müzik'], brand: ['Brand and text', 'Marka ve yazı'],
};
const S = { fx: null, item: null, channel: null, on: [], open: new Set(), busy: false, variants: [], rec: null };
let UID = 0;
const inst = (id, params) => ({ uid: ++UID, id, params });
let dlg;

async function j(url, body) {
  const r = await fetch(url, body !== undefined ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {});
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || r.statusText);
  return d;
}
const toast = (m) => {
  const d = Object.assign(document.createElement('div'), { className: 'toast', textContent: m });
  document.body.append(d);
  setTimeout(() => d.remove(), 4200);
};

function build() {
  dlg = document.createElement('dialog');
  dlg.id = 'dlgFx';
  dlg.className = 'fxdlg';
  dlg.setAttribute('data-no-i18n', '');
  dlg.innerHTML = `<div class="fx-shell">
    <header class="mhead"><h2 id="fxTitle"></h2><button class="iconbtn" data-close aria-label="Close">${ico('x')}</button></header>
    <div class="fx-body">
      <aside class="fx-left">
        <div class="fx-player"><video id="fxVideo" controls playsinline></video><div class="fxbusy" id="fxBusy" hidden><div class="fxspin"></div><b id="fxBusyT"></b><small id="fxBusyS"></small><div class="fxbar"><i></i></div></div></div>
        <div class="fx-vers" id="fxVers"></div>
      </aside>
      <section class="fx-right">
        <div class="fx-recipes" id="fxRecipes"></div>
        <div id="fxList"></div>
      </section>
    </div>
    <footer class="mfoot"><span class="muted grow" id="fxHint"></span><button class="ghost" data-clear></button><button class="primary" id="fxApply"></button></footer>
  </div>`;
  document.body.append(dlg);
  dlg.addEventListener('click', onClick);
  dlg.addEventListener('input', onInput);
  dlg.addEventListener('change', onInput);
  dlg.addEventListener('close', () => dlg.querySelector('#fxVideo').pause());
}

function defaults(fx) {
  const p = {};
  for (const d of fx.params || []) p[d.key] = d.default ?? (d.type === 'bool' ? false : '');
  return p;
}

function field(fx, d, val, uid) {
  const k = `data-fx="${uid}" data-k="${d.key}"`;
  const lbl = `<span>${esc(L(d.label))}</span>`;
  if (d.type === 'bool') return `<label class="fxf inl">${lbl}<input type="checkbox" ${k} ${val ? 'checked' : ''}></label>`;
  if (d.type === 'range') return `<label class="fxf">${lbl}<span class="rng"><input type="range" ${k} min="${d.min}" max="${d.max}" step="${d.step || 0.1}" value="${val}"><b>${val}</b></span></label>`;
  if (d.type === 'select') return `<label class="fxf">${lbl}<select ${k}>${d.options.map((o) => `<option value="${esc(o.v)}" ${o.v === val ? 'selected' : ''}>${esc(L(o))}</option>`).join('')}</select></label>`;
  if (d.type === 'color') return `<label class="fxf inl">${lbl}<input type="color" ${k} value="${esc(val || '#ffffff')}"></label>`;
  if (d.type === 'number' || d.type === 'time') return `<label class="fxf">${lbl}<input type="number" ${k} value="${esc(val)}" step="${d.step || 0.1}" ${d.min != null ? `min="${d.min}"` : ''} ${d.max != null ? `max="${d.max}"` : ''}></label>`;
  if (d.type === 'asset') {
    const list = S.fx.assets[d.kind] || [];
    const label = (a) => a.name.replace(/^\d+-/, '');
    return `<div class="fxf wide">${lbl}<span class="assetrow"><select ${k}><option value="">${esc(T('Choose a file', 'Dosya seç'))}</option>${list.map((a) => `<option value="${esc(a.id)}" ${a.id === val ? 'selected' : ''}>${esc(label(a))}</option>`).join('')}</select>
      <button class="ghost sm" data-upload="${d.kind}" data-for="${uid}.${d.key}">${ico('up')}${esc(T('Upload', 'Yükle'))}</button>${d.kind === 'voice' ? `<button class="ghost sm rec" data-record data-for="${uid}.${d.key}">${ico('mic')}<span>${esc(T('Record', 'Kaydet'))}</span></button>` : ''}</span></div>`;
  }
  return `<label class="fxf">${lbl}<input type="text" ${k} value="${esc(val)}"></label>`;
}

let busyTimer = null, busyT0 = 0;
function busyUI() {
  const el = dlg.querySelector('#fxBusy');
  el.hidden = !S.busy;
  if (S.busy && !busyTimer) {
    busyT0 = Date.now();
    const tick = () => {
      const s = Math.round((Date.now() - busyT0) / 1000);
      dlg.querySelector('#fxBusyT').textContent = T(`Rendering “${S.busyName || 'effects'}” into the video…`, `“${S.busyName || 'Efektler'}” videoya işleniyor…`);
      dlg.querySelector('#fxBusyS').textContent = T(`${s} s elapsed. Usually about as long as the clip itself. Keep this window open.`, `${s} sn geçti. Genelde klibin süresi kadar sürer. Bu pencereyi açık tut.`);
    };
    tick(); busyTimer = setInterval(tick, 1000);
  } else if (!S.busy && busyTimer) { clearInterval(busyTimer); busyTimer = null; }
}

function render() {
  const { effects, recipes } = S.fx;
  const sc = dlg.querySelector('.fx-right').scrollTop;
  dlg.querySelector('#fxTitle').textContent = T('Enhance clip', 'Klibi geliştir');
  dlg.querySelector('[data-clear]').textContent = T('Clear', 'Temizle');
  dlg.querySelector('#fxRecipes').innerHTML = `<div class="fx-h">${esc(T('One-click recipes · applied straight to this clip', 'Tek tık tarifler · doğrudan bu klibe uygulanır'))}</div>${S.siblings.length > 1 ? `<label class="fxall"><input type="checkbox" id="fxAll" ${S.all ? 'checked' : ''}><span>${esc(T(`Apply to all ${S.siblings.length} clips`, `Tüm ${S.siblings.length} kliple uygula`))}</span></label>` : ''}<div class="chips ${S.busy ? 'busy' : ''}">${recipes.map((r) => `<button class="rchip" data-recipe="${r.id}" title="${esc(L(r.desc))}">${ico(r.icon)}<span>${esc(L(r.name))}</span></button>`).join('')}</div>`;
  const byCat = {};
  for (const c of Object.keys(CATS)) byCat[c] = [];
  for (const e of effects) (byCat[e.category] ||= []).push(e);
  for (const c of Object.keys(byCat)) if (!byCat[c].length) delete byCat[c];
  dlg.querySelector('#fxList').innerHTML = Object.entries(byCat).map(([c, list]) => `<div class="fx-cat"><div class="fx-h">${esc((CATS[c] || [c, c])[lang() === 'tr' ? 1 : 0])}</div>${list.map((e) => {
    const list2 = S.on.filter((x) => x.id === e.id), on = list2.length > 0;
    return `<div class="fxrow ${on ? 'on' : ''}" data-row="${e.id}">
      <button class="fxhead" data-toggle="${e.id}" aria-pressed="${on}">
        <span class="fxic">${ico(e.icon)}</span>
        <span class="fxtx"><b>${esc(L(e.name))}</b><small>${esc(L(e.desc))}</small></span>
        ${list2.length > 1 ? `<span class="fxcount">×${list2.length}</span>` : ''}<span class="sw ${on ? 'on' : ''}"><i></i></span>
      </button>
      ${on ? list2.map((it, n) => `<div class="fxparams">${list2.length > 1 ? `<div class="fxinst"><b>${esc(T('Layer', 'Katman'))} ${n + 1}</b><button class="iconbtn" data-rm="${it.uid}" title="${esc(T('Remove', 'Kaldır'))}">${ico('x')}</button></div>` : ''}${(e.params || []).map((d) => field(e, d, it.params[d.key], it.uid)).join('')}</div>`).join('') + `${e.note ? `<p class="fxnote">${esc(L(e.note))}</p>` : ''}<button class="ghost sm fxadd" data-add="${e.id}">+ ${esc(T('Add another', 'Bir tane daha ekle'))}</button>` : ''}
    </div>`;
  }).join('')}</div>`).join('');
  const n = S.on.length;
  dlg.querySelector('#fxApply').textContent = S.busy ? T('Rendering…', 'İşleniyor…') : n ? T(`Apply ${n} effect${n > 1 ? 's' : ''}`, `${n} efekti uygula`) : T('Pick effects', 'Efekt seç');
  dlg.querySelector('#fxApply').disabled = S.busy || !n;
  dlg.querySelector('#fxHint').textContent = S.busy ? T(`Rendering “${S.busyName || 'effects'}” into the video. This can take a minute; your original stays untouched.`, `“${S.busyName || 'Efektler'}” videonun içine işleniyor. Bir dakika sürebilir; orijinal klibin değişmez.`) : T('Your original clip stays untouched. Results are saved as new versions.', 'Orijinal klibin değişmez. Sonuçlar yeni sürüm olarak kaydedilir.');
  renderVersions();
  busyUI();
  dlg.querySelector('.fx-right').scrollTop = sc;
}

function renderVersions() {
  const base = S.item.base;
  const rows = [{ id: '', file: S.item.video, label: T('Original', 'Orijinal'), effects: [] }, ...S.variants];
  dlg.querySelector('#fxVers').innerHTML = (S.note ? `<div class="fxnote"><p>${esc(S.note)}</p><div class="fxnote-act">${S.lastId ? `<button class="ghost sm" data-notedel>${esc(T('Delete this version', 'Bu sürümü sil'))}</button>` : ''}<button class="ghost sm" data-noteclose>${esc(T('Dismiss', 'Kapat'))}</button></div></div>` : '') + `<div class="fx-h">${esc(T('Versions', 'Sürümler'))}</div>` + rows.map((v) => `<div class="ver ${v.file === S.current ? 'on' : ''}" data-ver="${esc(v.file)}"><button class="vplay">${ico('film')}<span>${esc(v.label || (v.effects || []).join(' + ') || '')}</span></button>${v.id ? `<a class="iconbtn" href="${base}${v.file}" download="${esc(S.item.title)}-${v.id}.mp4" title="${esc(T('Download', 'İndir'))}">${ico('up')}</a><button class="iconbtn" data-vdel="${v.id}" title="${esc(T('Delete', 'Sil'))}">${ico('x')}</button>` : ''}</div>`).join('');
}

function play(file) {
  S.current = file;
  const v = dlg.querySelector('#fxVideo');
  v.src = `${S.item.base}${file}?t=${Date.now()}`;
  v.play().catch(() => {});
  renderVersions();
}

async function onClick(e) {
  const t = e.target;
  if (t.closest('[data-close]')) return dlg.close();
  if (t.closest('[data-clear]')) { S.on = []; return render(); }
  const ad = t.closest('[data-add]');
  if (ad) { S.on.push(inst(ad.dataset.add, defaults(S.fx.effects.find((x) => x.id === ad.dataset.add)))); return render(); }
  const rmv = t.closest('[data-rm]');
  if (rmv) { S.on = S.on.filter((x) => String(x.uid) !== rmv.dataset.rm); return render(); }
  const rcd = t.closest('[data-record]');
  if (rcd) return record(rcd);
  const tg = t.closest('[data-toggle]');
  if (tg) {
    const id = tg.dataset.toggle;
    if (S.on.some((x) => x.id === id)) S.on = S.on.filter((x) => x.id !== id);
    else S.on.push(inst(id, defaults(S.fx.effects.find((x) => x.id === id))));
    return render();
  }
  const rc = t.closest('[data-recipe]');
  if (rc) return runRecipe(rc.dataset.recipe);
  const up = t.closest('[data-upload]');
  if (up) {
    const kind = up.dataset.upload, [fid, key] = up.dataset.for.split('.');
    const target = () => S.on.find((x) => String(x.uid) === fid);
    const inp = Object.assign(document.createElement('input'), { type: 'file', accept: kind === 'music' || kind === 'voice' ? 'audio/*,.mp3,.wav,.m4a,.aac,.ogg,.opus,.flac,.webm' : 'image/*' });
    inp.onchange = async () => {
      const f = inp.files[0];
      if (!f) return;
      up.disabled = true;
      try {
        const r = await fetch(`/api/fx/upload?kind=${kind}&name=${encodeURIComponent(f.name)}`, { method: 'POST', body: f });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        S.fx = { ...S.fx, ...(await j('/api/fx/list')) };
        if (target()) target().params[key] = d.id;
        render();
      } catch (err) { toast(err.message); up.disabled = false; }
    };
    return inp.click();
  }
  if (t.closest('[data-noteclose]')) { S.note = ''; return renderVersions(); }
  const nd = t.closest('[data-notedel]');
  if (nd && S.lastId) {
    const id = S.lastId;
    try { await j('/api/fx/variant-delete', { channel: S.channel, vid: S.item.id, id }); } catch (err) { return toast(err.message); }
    S.variants = S.variants.filter((v) => v.id !== id); S.item.variants = S.variants;
    if (S.current === `${id}.mp4`) play(S.item.video);
    S.note = ''; S.lastId = '';
    toast(T('Version deleted.', 'Sürüm silindi.'));
    return renderVersions();
  }
  const vd = t.closest('[data-vdel]');
  if (vd) {
    if (!confirm(T('Delete this version?', 'Bu sürüm silinsin mi?'))) return;
    await j('/api/fx/variant-delete', { channel: S.channel, vid: S.item.id, id: vd.dataset.vdel });
    S.variants = S.variants.filter((v) => v.id !== vd.dataset.vdel);
    S.item.variants = S.variants;
    if (S.current === `${vd.dataset.vdel}.mp4`) play(S.item.video);
    return renderVersions();
  }
  const vr = t.closest('[data-ver]');
  if (vr && !t.closest('a,[data-vdel]')) return play(vr.dataset.ver);
  if (t.closest('#fxApply')) return apply();
}

function onInput(e) {
  if (e.target.id === 'fxAll') { S.all = e.target.checked; return; }
  const el = e.target.closest('[data-fx][data-k]');
  if (!el) return;
  const cur = S.on.find((x) => String(x.uid) === el.dataset.fx)?.params;
  if (!cur) return;
  const k = el.dataset.k;
  cur[k] = el.type === 'checkbox' ? el.checked : el.type === 'range' || el.type === 'number' ? Number(el.value) : el.value;
  if (el.type === 'range') el.nextElementSibling.textContent = el.value;
}

async function record(btn) {
  const [fid, key] = btn.dataset.for.split('.');
  const label = btn.querySelector('span');
  if (S.rec) { S.rec.rec.stop(); return; }
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return toast(T('Recording is not supported in this browser. Upload a file instead.', 'Bu tarayıcıda kayıt desteklenmiyor. Bunun yerine dosya yükle.'));
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
  catch { return toast(T('Microphone access was blocked. Allow it in your browser settings.', 'Mikrofon izni verilmedi. Tarayıcı ayarlarından izin ver.')); }
  const chunks = [], rec = new MediaRecorder(stream);
  const started = Date.now();
  const tick = setInterval(() => { const s = Math.floor((Date.now() - started) / 1000); label.textContent = `${T('Stop', 'Durdur')} ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }, 250);
  btn.classList.add('live'); label.textContent = T('Stop', 'Durdur');
  S.rec = { rec };
  rec.ondataavailable = (ev) => ev.data.size && chunks.push(ev.data);
  rec.onstop = async () => {
    clearInterval(tick); stream.getTracks().forEach((x) => x.stop()); S.rec = null;
    btn.classList.remove('live'); label.textContent = T('Record', 'Kaydet');
    const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
    if (blob.size < 2000) return toast(T('Nothing was recorded.', 'Kayıt alınamadı.'));
    try {
      const r = await fetch(`/api/fx/upload?kind=voice&name=${encodeURIComponent('kayit.webm')}`, { method: 'POST', body: blob });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      S.fx = { ...S.fx, ...(await j('/api/fx/list')) };
      const it = S.on.find((x) => String(x.uid) === fid);
      if (it) it.params[key] = d.id;
      toast(T('Recording saved.', 'Kayıt kaydedildi.'));
      render();
    } catch (err) { toast(err.message); }
  };
  rec.start();
}

function summarize(v) {
  const r = v.report || {}, out = [];
  if (r.visual) out.push(T('Picture changed: effects are now burned into the video.', 'Görüntü değişti: efektler videonun içine işlendi.'));
  else out.push(T('The picture itself did not change. This recipe only works on sound and timing.', 'Görüntünün kendisi değişmedi. Bu tarif yalnızca ses ve zamanlamaya dokunur.'));
  if (r.loudBefore != null && Math.abs(r.loudAfter - r.loudBefore) >= 0.5) out.push(T(`Sound level ${r.loudAfter > r.loudBefore ? 'raised' : 'lowered'} by ${Math.abs(r.loudAfter - r.loudBefore).toFixed(1)} dB.`, `Ses seviyesi ${Math.abs(r.loudAfter - r.loudBefore).toFixed(1)} dB ${r.loudAfter > r.loudBefore ? 'yükseltildi' : 'düşürüldü'}.`));
  if (r.silenceChecked) out.push(r.silenceRemoved > 0.3 ? T(`${r.silenceRemoved.toFixed(1)} s of silence cut.`, `${r.silenceRemoved.toFixed(1)} sn sessizlik kesildi.`) : T('No silences long enough to cut were found.', 'Kesilecek uzunlukta sessizlik bulunamadı.'));
  if (r.durBefore != null && Math.abs(r.durAfter - r.durBefore) >= 0.3) out.push(T(`Length ${r.durBefore}s → ${r.durAfter}s.`, `Süre ${r.durBefore} sn → ${r.durAfter} sn.`));
  return out.join(' ');
}

async function runRecipe(id) {
  if (S.busy) return;
  const r = S.fx.recipes.find((x) => x.id === id);
  const ids = S.all && S.siblings.length > 1 ? S.siblings.map((x) => x.id) : [S.item.id];
  S.busy = true; S.busyName = L(r.name); render();
  try {
    const out = await j('/api/fx/recipe', { channel: S.channel, vid: S.item.id, vids: ids, recipe: id });
    for (const res of out.results) {
      if (res.vid === S.item.id) { S.variants = [...S.variants, res]; S.item.variants = S.variants; S.note = summarize(res); S.lastId = res.id; play(res.file); }
      else { const sib = S.siblings.find((x) => x.id === res.vid); if (sib) sib.variants = [...(sib.variants || []), res]; }
    }
    toast(ids.length > 1 ? T(`Done. Added to ${ids.length} clips.`, `Hazır. ${ids.length} kliple eklendi.`) : T('Done. New version added.', 'Hazır. Yeni sürüm eklendi.'));
  } catch (err) { toast(err.message); }
  S.busy = false; S.busyName = ''; render();
}

async function apply() {
  if (S.busy || !S.on.length) return;
  const effects = S.on.map(({ id, params }) => ({ id, params }));
  const need = { music: T('Pick or upload a music file first.', 'Önce bir müzik dosyası seç ya da yükle.'), logo: T('Pick or upload a logo first.', 'Önce bir logo seç ya da yükle.'), voiceover: T('Pick, upload or record your voice first.', 'Önce sesini seç, yükle ya da kaydet.') };
  for (const id of Object.keys(need)) { const x = effects.find((e) => e.id === id && !e.params.file); if (x) return toast(need[id]); }
  S.busy = true; S.busyName = T('your effects', 'seçtiğin efektler'); render();
  try {
    const v = await j('/api/fx/apply', { channel: S.channel, vid: S.item.id, effects });
    S.variants = [...S.variants, v];
    S.item.variants = S.variants;
    play(v.file); S.note = summarize(v); S.lastId = v.id;
    toast(T('Done. New version added.', 'Hazır. Yeni sürüm eklendi.'));
  } catch (err) { toast(err.message); }
  S.busy = false; render();
}

export async function openFx(item, channel, siblings = []) {
  if (!dlg) build();
  S.item = item; S.channel = channel; S.siblings = siblings; S.all = false; S.note = ''; S.lastId = ''; S.variants = item.variants || []; S.on = [];
  try { S.fx = await j('/api/fx/list'); } catch (err) { return toast(err.message); }
  render();
  play(item.video);
  dlg.showModal();
}
window.__kesitFx = { open: openFx };
