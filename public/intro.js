// Açılış ekranı: altın taç + yapımcı adı animasyonu, ardından oyun adı ve GİRİŞ YAP. ?nointro ile atlanır.
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id), box = $('intro'); if (!box) return;
  const PR = window.VProfile;
  const done = () => { box.classList.add('out'); setTimeout(() => box.remove(), 900); };
  if (/[?&]nointro\b/.test(location.search)) { box.remove(); return; }
  // yapımcı adı: harf harf altın animasyon
  const nm = $('iName'); 'ERDAL ALP SELÇUK'.split('').forEach((ch, i) => { const s = document.createElement('span'); s.textContent = ch === ' ' ? ' ' : ch; if (ch === ' ') s.className = 'sp'; s.style.setProperty('--i', i); nm.appendChild(s); });
  // yükselen altın kıvılcımlar
  for (let i = 0; i < 38; i++) { const s = document.createElement('i'); s.className = 'spk'; s.style.left = Math.random() * 100 + '%'; s.style.animationDuration = 5 + Math.random() * 7 + 's'; s.style.animationDelay = -Math.random() * 10 + 's'; const z = 3 + Math.random() * 6; s.style.width = s.style.height = z + 'px'; s.style.opacity = 0; box.appendChild(s); }
  let stage = 'A';
  const nick = $('iNick'); nick.value = (PR && PR.data.name) || '';
  function toB() { if (stage !== 'A') return; stage = 'B'; box.classList.add('stB'); $('iHint').style.display = 'none'; setTimeout(() => { try { (nick.value ? $('iGo') : nick).focus({ preventScroll: true }); } catch (e) {} }, 700); }
  const t = setTimeout(toB, 4200);
  box.addEventListener('click', (e) => { if (stage === 'A') { clearTimeout(t); toB(); } });
  const net = window.VNet, S = net && net.S, mode0 = (() => { try { return localStorage.getItem('va_mode'); } catch (e) { return null; } })();
  let mode = (net && net.hasServer) ? (mode0 === 'guest' ? 'guest' : (mode0 === 'reg' ? 'reg' : 'login')) : 'guest';
  const pass = $('iPass'), code = $('iCode'), err = $('iErr'), who = $('iWho'), go1 = $('iGo');
  const tabs = box.querySelectorAll('#iTabs button');
  if (!(net && net.hasServer)) $('iTabs').style.display = 'none';
  function view() {
    const logged = !!(S && S.acct);
    $('iTabs').style.display = logged || !(net && net.hasServer) ? 'none' : 'flex';
    nick.style.display = pass.style.display = logged ? 'none' : ''; if (mode === 'guest') pass.style.display = 'none';
    code.style.display = mode === 'reg' && !logged ? '' : 'none';
    tabs.forEach((b) => b.classList.toggle('on', b.dataset.m === mode));
    nick.placeholder = mode === 'guest' ? 'Takma adını yaz' : 'Kullanıcı adı';
    pass.autocomplete = mode === 'reg' ? 'new-password' : 'current-password';
    go1.textContent = logged ? 'OYNA' : mode === 'reg' ? 'KAYIT OL' : mode === 'guest' ? 'MİSAFİR GİR' : 'GİRİŞ YAP';
    who.innerHTML = logged ? 'Hesap: <b>' + S.acct.replace(/[<>&]/g, '') + '</b><a id="iOut">Çıkış / başka hesap</a>' : '';
    if (logged) { const o = $('iOut'); o.onclick = (e) => { e.stopPropagation(); net.logout(); mode = 'login'; view(); }; }
  }
  tabs.forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); mode = b.dataset.m; try { localStorage.setItem('va_mode', mode); } catch (x) {} err.textContent = ''; view(); }));
  if (net) net.sub((ev) => { if (ev === 'welcome' || ev === 'auth' || ev === 'status') view(); if (ev === 'autherr') { err.textContent = S.authErr; go1.disabled = false; } });
  view();
  function enter(v) {
    const nameEl = $('name'); if (nameEl) { nameEl.value = v; nameEl.dispatchEvent(new Event('input', { bubbles: true })); nameEl.dispatchEvent(new Event('change', { bubbles: true })); }
    if (PR && PR.data.name !== v) { PR.data.name = v; PR.save(); }
    if (window.VTouch) window.VTouch.enterFull();
    try { if (window.VA && window.VA.sfx && window.VA.sfx.ui) window.VA.sfx.ui(); } catch (e) {}
    done();
  }
  let waiting = null;
  function go() {
    err.textContent = '';
    if (S && S.acct) return enter(S.acct);
    const v = nick.value.replace(/[<>&"'`]/g, '').trim().slice(0, 16);
    if (mode === 'guest') return enter(v || ('Oyuncu' + Math.floor(100 + Math.random() * 900)));
    if (!net || !net.ready) { err.textContent = 'Sunucuya bağlanılıyor, birkaç saniye sonra tekrar dene'; return; }
    if (!v || !pass.value) { err.textContent = 'Kullanıcı adı ve parola gir'; return; }
    go1.disabled = true; clearTimeout(waiting); waiting = setTimeout(() => { go1.disabled = false; }, 6000);
    const off = (ev) => { if (ev === 'welcome' && S.acct) { clearTimeout(waiting); go1.disabled = false; enter(S.acct); } };
    net.sub(off);
    if (mode === 'reg') net.register(v, pass.value, code.value.trim()); else net.login(v, pass.value);
  }
  go1.addEventListener('click', (e) => { e.stopPropagation(); go(); });
  for (const el of [nick, pass, code]) { el.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); e.stopPropagation(); }); el.addEventListener('click', (e) => e.stopPropagation()); }
})();
