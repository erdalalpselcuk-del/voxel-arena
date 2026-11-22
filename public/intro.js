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
  function go() {
    const v = nick.value.replace(/[<>&"'`]/g, '').trim().slice(0, 16) || ('Oyuncu' + Math.floor(100 + Math.random() * 900));
    const nameEl = $('name'); if (nameEl) { nameEl.value = v; nameEl.dispatchEvent(new Event('input', { bubbles: true })); nameEl.dispatchEvent(new Event('change', { bubbles: true })); }
    if (PR && PR.data.name !== v) { PR.data.name = v; PR.save(); }
    if (window.VTouch) window.VTouch.enterFull();
    try { if (window.VA && window.VA.sfx && window.VA.sfx.ui) window.VA.sfx.ui(); } catch (e) {}
    done();
  }
  $('iGo').addEventListener('click', (e) => { e.stopPropagation(); go(); });
  nick.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); e.stopPropagation(); });
  nick.addEventListener('click', (e) => e.stopPropagation());
})();
