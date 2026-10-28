// Menü arayüzü: kayıt, ayarlar, gardırop (skin/şapka), günlük görevler, cephanelik, mod/harita seçimi.
// Oyun dışı her şey burada; oyun mantığı client.js içinde. Kayıtlar yalnızca bu tarayıcıda (localStorage) durur.
(function (root) {
  const VM = root.VMap, VW = root.VW, WP = VM.WEAPONS;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SAVE_KEY = 'va_save_v2';

  const defaults = () => ({
    coins: 0, ownC: VM.SKINS.map((s, i) => (s.price === 0 ? i : -1)).filter((i) => i >= 0), ownH: VM.HATS.map((h, i) => (h.price === 0 ? i : -1)).filter((i) => i >= 0),
    c: 0, h: 0, name: '', mode: 'kc', map: -1, bots: 7, sens: 100, vol: 80, fov: 75, mis: { day: '', p: {}, done: {} },
  });
  let SV = defaults();
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && typeof s === 'object') SV = Object.assign(defaults(), s); } catch (e) {}
  if (!SV.mis || typeof SV.mis !== 'object') SV.mis = { day: '', p: {}, done: {} };
  let saveT = 0;
  function save() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SV)); } catch (e) {} }, 150); }

  const MISSIONS = [
    { id: 'k', t: '10 öldürme yap', goal: 10, coin: 30, ev: 'kill' },
    { id: 'h', t: '3 kafadan vuruş yap', goal: 3, coin: 30, ev: 'head' },
    { id: 'r', t: 'Roketatarla 2 öldürme', goal: 2, coin: 40, ev: 'rocket' },
    { id: 'c', t: '2 tavuk vur', goal: 2, coin: 20, ev: 'chicken' },
    { id: 'w', t: '1 tur kazan', goal: 1, coin: 60, ev: 'win' },
  ];
  const dayKey = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  function missionsReset() { if (SV.mis.day !== dayKey()) SV.mis = { day: dayKey(), p: {}, done: {} }; }
  let toastFn = () => {};
  function addCoins(n) { SV.coins += n; save(); $('coins').textContent = SV.coins; renderWard(); }
  function missionEvent(ev, n) {
    missionsReset();
    for (const m of MISSIONS) {
      if (m.ev !== ev || SV.mis.done[m.id]) continue;
      SV.mis.p[m.id] = Math.min(m.goal, (SV.mis.p[m.id] || 0) + (n || 1));
      if (SV.mis.p[m.id] >= m.goal) { SV.mis.done[m.id] = 1; addCoins(m.coin); toastFn('GÖREV TAMAM +' + m.coin + ' PX'); }
    }
    save(); renderMissions();
  }
  function renderMissions() {
    missionsReset();
    $('mis').innerHTML = MISSIONS.map((m) => {
      const p = SV.mis.p[m.id] || 0, done = !!SV.mis.done[m.id];
      return `<div class="mi ${done ? 'done' : ''}"><div class="t"><span>${esc(m.t)}</span><b>${p}/${m.goal} · +${m.coin} PX</b></div><div class="bar"><i style="width:${(p / m.goal) * 100}%"></i></div></div>`;
    }).join('');
  }

  // ---------- gardırop ----------
  const hexC = (c) => '#' + c.toString(16).padStart(6, '0');
  function renderWard() {
    $('coins').textContent = SV.coins;
    const prev = $('prev'); prev.style.setProperty('--skin', hexC(VM.SKINS[SV.c].c)); prev.dataset.hat = SV.h;
    $('sws').innerHTML = VM.SKINS.map((s, i) => {
      const own = SV.ownC.includes(i);
      return `<button class="sw ${own ? 'own' : ''} ${SV.c === i ? 'on' : ''}" data-c="${i}" title="${esc(s.name)}" aria-label="${esc(s.name)}${own ? '' : ' ' + s.price + ' PX'}" style="background:${hexC(s.c)}">${own ? '' : `<span class="pr">${s.price}</span>`}</button>`;
    }).join('');
    $('hats').innerHTML = VM.HATS.map((h, i) => {
      const own = SV.ownH.includes(i);
      return `<button class="opt ${SV.h === i ? 'on' : ''}" data-h="${i}"><span>${esc(h.name)}</span><span class="pr">${own ? (SV.h === i ? 'SEÇİLİ' : 'SAHİP') : h.price + ' PX'}</span></button>`;
    }).join('');
  }
  function buy(kind, i) {
    const list = kind === 'c' ? VM.SKINS : VM.HATS, own = kind === 'c' ? SV.ownC : SV.ownH, it = list[i];
    if (!own.includes(i)) {
      if (SV.coins < it.price) { $('status').textContent = `${it.name}: ${it.price} PX gerekli, ${SV.coins} PX var. Oynayarak PX kazan.`; return; }
      SV.coins -= it.price; own.push(i);
    }
    SV[kind] = i; $('status').textContent = ''; save(); renderWard();
  }
  $('sws').addEventListener('click', (e) => { const b = e.target.closest('.sw'); if (b) buy('c', +b.dataset.c); });
  $('hats').addEventListener('click', (e) => { const b = e.target.closest('.opt'); if (b) buy('h', +b.dataset.h); });

  // ---------- mod ve harita ----------
  const modeKeys = ['kc', 'dom', 'tdm', 'ffa'].filter((k) => VM.MODES[k]);
  function renderMode() {
    $('modeGrid').innerHTML = modeKeys.map((k) => `<button class="opt ${SV.mode === k ? 'on' : ''}" data-mode="${k}"><span>${esc(VM.MODES[k].name)}</span><small>${esc(VM.MODES[k].desc)}</small></button>`).join('');
  }
  const onMapPick = { fn: null };
  function renderMap() {
    const tiles = [`<button class="opt ${SV.map < 0 ? 'on' : ''}" data-map="-1"><span>RASTGELE</span><span class="sw3"><i style="background:#59e6ff"></i><i style="background:#ffd83d"></i><i style="background:#ff5a4d"></i></span></button>`]
      .concat(VM.THEMES.map((t, i) => `<button class="opt ${SV.map === i ? 'on' : ''}" data-map="${i}"><span>${esc(t.name.toUpperCase())}</span><span class="sw3"><i style="background:${hexC(t.pal[1])}"></i><i style="background:${hexC(t.pal[3])}"></i><i style="background:${hexC(t.pal[4])}"></i></span></button>`));
    $('mapGrid').innerHTML = tiles.join('');
  }
  $('modeGrid').addEventListener('click', (e) => { const b = e.target.closest('.opt'); if (!b) return; SV.mode = b.dataset.mode; save(); renderMode(); });
  $('mapGrid').addEventListener('click', (e) => { const b = e.target.closest('.opt'); if (!b) return; SV.map = +b.dataset.map; save(); renderMap(); if (onMapPick.fn) onMapPick.fn(SV.map); });
  $('bots').value = SV.bots; $('botsv').textContent = SV.bots;
  $('bots').addEventListener('input', () => { SV.bots = +$('bots').value; $('botsv').textContent = SV.bots; save(); });

  // ---------- cephanelik ----------
  const RANGE_TXT = ['YAKIN', 'KISA', 'ORTA', 'ORTA', 'KISA', 'UZUN', 'UZUN', 'ORTA', 'ORTA'];
  let armSel = 4;
  function renderArmList() {
    $('armList').innerHTML = WP.map((w, i) => `<button class="armb ${armSel === i ? 'on' : ''}" data-i="${i}" aria-label="${esc(w.name)}"><b>${i + 1}</b></button>`).join('');
    $('armList').querySelectorAll('.armb').forEach((b, i) => { const c = document.createElement('canvas'); c.width = 46; c.height = 23; c.className = 'pix'; c.getContext('2d').drawImage(VW.icon(i, 46, 23, { grid: 23 }), 0, 0); b.appendChild(c); });
  }
  function renderArmView() {
    const i = armSel, w = WP[i], big = $('armBig'), g = big.getContext('2d');
    g.clearRect(0, 0, big.width, big.height); g.imageSmoothingEnabled = false; g.drawImage(VW.icon(i, 224, 112, { grid: 56 }), 0, 0);
    $('armName').textContent = w.name.toUpperCase(); $('armDesc').textContent = VW.DESC[i];
    const dmg = w.type === 'proj' && w.splash ? w.splash : w.dmg * (w.pellets || 1), rps = 1000 / w.rate;
    const row = (lab, v, txt) => `<div class="stat"><span>${lab}</span><div class="bar"><i style="width:${Math.max(4, Math.min(100, v * 100))}%"></i></div><b>${txt}</b></div>`;
    $('armStats').innerHTML = row('HASAR', dmg / 110, Math.round(dmg)) + row('HIZ', rps / 15.4, rps.toFixed(1) + '/s') + row('ŞARJÖR', w.mag ? w.mag / 40 : 1, w.mag ? w.mag : '∞') + row('MENZİL', VW.RANGE[i], RANGE_TXT[i]);
  }
  $('armList').addEventListener('click', (e) => { const b = e.target.closest('.armb'); if (!b) return; armSel = +b.dataset.i; renderArmList(); renderArmView(); });

  // ---------- ayarlar ----------
  function bindSlider(id, vid, key, fmt) {
    const el = $(id); el.value = SV[key]; $(vid).textContent = fmt(SV[key]);
    el.addEventListener('input', () => { SV[key] = +el.value; $(vid).textContent = fmt(SV[key]); save(); if (api.onSetting) api.onSetting(key); });
  }
  bindSlider('sSens', 'vSens', 'sens', (v) => (v / 100).toFixed(1) + 'x');
  bindSlider('sVol', 'vVol', 'vol', (v) => v + '%');
  bindSlider('sFov', 'vFov', 'fov', (v) => v + '°');

  $('name').value = SV.name || '';
  renderMode(); renderMap(); renderWard(); renderMissions(); renderArmList(); renderArmView();

  const api = {
    SV, save, addCoins, missionEvent, onMapPick, onSetting: null,
    setToast(fn) { toastFn = fn; },
    sens: () => SV.sens / 100, vol: () => SV.vol / 100, fov: () => SV.fov,
    join() {
      const name = $('name').value.trim() || 'Oyuncu' + Math.floor(Math.random() * 900 + 100);
      SV.name = name; save();
      return { name, mode: SV.mode, map: SV.map, bots: SV.bots, sk: { c: SV.c, h: SV.h } };
    },
  };
  root.VUI = api;
})(window);
