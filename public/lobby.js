// Ana menü (lobi): mağaza, dolap, cephanelik, görevler, sıralama, kulüp, sunucular, sohbet, ayarlar.
// Sohbet, kulüp, sıralama ve sunucu listesi ÖRNEK verilerdir; gerçek ağ bağlantısı yoktur.
(function () {
  const PR = window.VProfile, VA = window.VA, VM = window.VMap;
  const LOCAL = !!window.LOCAL_BUILD;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const D = () => PR.data;
  const rnd = (a) => a[Math.floor(Math.random() * a.length)];
  const hex = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0');

  const MODES = [['kc', 'Kill Confirmed'], ['ffa', 'Herkes Tek'], ['rocket', 'Roket Arenası'], ['tdm', 'Takım Savaşı'], ['ctf', 'Bayrak Kapmaca'], ['zom', 'Zombi Dalgası'], ['rnd', 'Rastgele']];
  const MAPS = [[-1, 'Rastgele']].concat((VM.THEMES || []).map((t, i) => [i, t.name || ('Harita ' + (i + 1))]));
  const CATS = [['color', 'Renk'], ['skin', 'Karakter'], ['hat', 'Şapka'], ['back', 'Sırt'], ['gskin', 'Silah Kaplama'], ['coll', 'Koleksiyon'], ['weapon', 'Silah']];
  const NAV = [['shop', '\u{1F6D2}', 'Mağaza'], ['crates', '\u{1F4E6}', 'Kasalar'], ['locker', '\u{1F9E5}', 'Dolap'], ['arsenal', '\u{1F52B}', 'Cephanelik'], ['missions', '\u{1F3AF}', 'Görevler'], ['pass', '\u{1F3AB}', 'Sezon Pası'], ['rank', '\u{1F3C6}', 'Sıralama'], ['club', '\u{1F6E1}', 'Kulüp'], ['servers', '\u{1F310}', 'Sunucular'], ['chat', '\u{1F4AC}', 'Sohbet'], ['settings', '⚙', 'Ayarlar']];
  const SAMPLE = { rank: 1, club: 1, servers: 1, chat: 1 };

  let tab = 'chat', cat = 'color', selItem = null, chatTab = 'global', clubTab = 'info', unread = false, tt = 0;
  const chatLog = { global: [], friends: [], club: [] };
  const NET = window.VNet || null;
  const live = () => !!(NET && NET.on);
  const wantNet = () => !!(NET && NET.hasServer);
  const chatArr = (room) => (live() ? (room === 'club' ? NET.S.cchat : NET.S.chat) : chatLog[room]);
  const sampleOn = () => (tab === 'servers' ? !(!LOCAL || D().online) : !!SAMPLE[tab] && !live());
  const asked = {};
  const ask = (k) => { const n = Date.now(); if (n - (asked[k] || 0) < 4000) return; asked[k] = n; NET[k](); };
  const netWait = () => (wantNet() && !live() ? '<div class="phint">' + (NET.S.status === 'kicked' ? 'Hesabın başka bir yerde açık. Üstteki durum etiketine tıklayıp yeniden bağlan.' : 'Lobi sunucusuna bağlanılıyor… Bağlanınca burası gerçek verilerle dolar.') + '</div>' : '');
  const FRIENDS = [['Kaplan', 1], ['Şahin', 1], ['Gölge', 0], ['Tilki', 1], ['Bulut', 0]];
  const LINES = ['Kimse AWP ile çatıda mı?', 'Roket arenası çok eğlenceli', 'künye toplamayı unutmayın', 'yeni kaplama aldım, altın!', 'bir tur daha?', 'labirent haritası zor', 'Pompalı en iyisi bence', 'gg', 'bu bot çok iyi oynuyor :D', 'günlük bonusu aldınız mı?', 'minigun gerçekten pahalı', 'kulüp arıyorum', 'roketle zıpladım!'];
  const REPLIES = ['haha evet', 'katılıyorum', 'bir tur oynayalım', 'iyi fikir', 'ben hazırım', 'olur!', 'bence de', 'şaka mı bu :D'];

  const VW = window.VWeapons;
  const rar = (type, id) => (type === 'weapon' && VW && VW.RARITY ? VW.RARITY[id] | 0 : type === 'coll' ? ((PR.item('coll', id) || {}).r | 0) : 0);
  const rarCol = (r) => hex(VW.RARITY_INFO[r].color);
  const rarStyle = (type, id) => { const r = rar(type, id); return r ? ` style="border-color:${rarCol(r)};box-shadow:0 0 ${4 + r * 3}px ${rarCol(r)}55"` : ''; };
  const rarBadge = (type, id) => { const r = rar(type, id); return r ? `<span style="display:block;font-size:11px;font-weight:700;letter-spacing:.06em;color:${rarCol(r)}">${VW.RARITY_INFO[r].name.toLocaleUpperCase('tr')}</span>` : ''; };
  function toast(msg, bad) { const t = $('toast'); t.textContent = msg; t.className = bad ? 'bad' : ''; t.style.display = 'block'; clearTimeout(tt); tt = setTimeout(() => { t.style.display = 'none'; }, 2200); }

  // ---- karakter önizleme ----
  function eqWith(over) {
    const e = Object.assign({}, D().equip, over || {});
    return { name: D().name, c: e.color, sk: e.skin, hat: e.hat, bk: e.back, w: e.primary, gs: e.gskin, cl: e.coll | 0 };
  }
  function previewItem(type, id) {
    let over = {};
    if (type === 'weapon') over = { primary: id };
    else over[type] = id;
    if (type === 'weapon' && [0, 15, 1, 8].indexOf(id) >= 0) over = { primary: D().equip.primary };
    VA.preview.set(eqWith(over));
    const it = PR.item(type, id);
    $('pvinfo').textContent = it ? 'Önizleme: ' + it.name : '';
  }
  function resetPreview() { VA.preview.set(eqWith()); $('pvinfo').textContent = ''; }

  // ---- üst çubuk ----
  function top() {
    const d = D();
    $('ppx').textContent = d.px; $('pgem').textContent = d.gems;
    $('lvl').textContent = 'SEV ' + PR.level(); $('xpbar').firstChild.style.width = Math.round(PR.levelProgress() * 100) + '%';
    if ($('name') !== document.activeElement) $('name').value = d.name;
  }
  function passClaimable() { const ps = D().pass, g = PR.passReached(); for (let i = 1; i <= g; i++) { if (!ps.claimed['f' + i] || (ps.premium && !ps.claimed['p' + i])) return true; } return false; }
  function buildNav() {
    $('nav').innerHTML = NAV.map(([id, ic, nm]) => `<button data-nav="${id}" class="${id === tab ? 'sel' : ''}"><i>${ic}</i>${nm}<span class="dot ${(id === 'chat' && unread) || (id === 'pass' && passClaimable()) ? 'on' : ''}"></span></button>`).join('');
  }
  const MODE_INFO = {
    kc: ['Öldürdüklerinin künyesini topla, kendi künyeni alıp iptal et. 15 künyede biter.', ['TEK', '15 KÜNYE']],
    ffa: ['Herkes herkese karşı. 20 öldürmeye ilk ulaşan kazanır.', ['TEK', '20 ÖLDÜRME']],
    rocket: ['Herkesin elinde RPG. Roketle zıpla, havadan vur.', ['TEK', 'RPG']],
    tdm: ['Mavi ve Kırmızı takım. Dost ateşi yok, 30 takım öldürmesi.', ['TAKIM', '30 ÖLDÜRME']],
    ctf: ['Düşman bayrağını kapıp kendi üssüne getir. İlk 3 sayı kazanır.', ['TAKIM', '3 BAYRAK']],
    zom: ['Takım olarak 6 dalga zombiye karşı hayatta kal.', ['CO-OP', '6 DALGA']],
    rnd: ['Her maçta sürpriz bir mod seçilir.', ['SÜRPRİZ']],
  };
  const MAP_INFO = ['Tepeler, ağaçlar, ortada harabe kule', 'Basamaklı binalar ve sokaklar', 'Dar koridorlar, ortada arena'];
  function drawModeIcon(cv, id) {
    const c = cv.getContext('2d'); c.clearRect(0, 0, 16, 16);
    const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    if (id === 'kc') { R(4, 1, 8, 14, '#ffd23f'); R(4, 1, 8, 1, '#fff1a8'); R(7, 2, 2, 2, '#3b2d00'); R(5, 7, 6, 1, '#b8860b'); R(5, 9, 6, 1, '#b8860b'); R(5, 11, 4, 1, '#b8860b'); R(11, 13, 2, 2, '#b8860b'); }
    else if (id === 'ffa') { R(7, 0, 2, 5, '#ff5a4d'); R(7, 11, 2, 5, '#ff5a4d'); R(0, 7, 5, 2, '#ff5a4d'); R(11, 7, 5, 2, '#ff5a4d'); R(7, 7, 2, 2, '#fff'); R(3, 3, 1, 1, '#ff5a4d'); R(12, 3, 1, 1, '#ff5a4d'); R(3, 12, 1, 1, '#ff5a4d'); R(12, 12, 1, 1, '#ff5a4d'); }
    else if (id === 'rocket') { R(6, 3, 4, 8, '#e8e8e8'); R(7, 1, 2, 2, '#e74c3c'); R(6, 3, 4, 1, '#e74c3c'); R(7, 5, 2, 2, '#4fc3f7'); R(4, 8, 2, 4, '#e74c3c'); R(10, 8, 2, 4, '#e74c3c'); R(7, 11, 2, 2, '#ffb000'); R(7, 13, 2, 2, '#ff6a00'); }
    else if (id === 'tdm') { R(2, 2, 6, 10, '#3a7bd5'); R(8, 2, 6, 10, '#e74c3c'); R(2, 1, 12, 1, '#fff'); R(4, 12, 8, 1, '#8aa'); R(6, 13, 4, 1, '#8aa'); R(7, 14, 2, 1, '#8aa'); R(7, 4, 2, 6, '#fff'); }
    else if (id === 'ctf') { R(3, 1, 1, 14, '#ddd'); R(4, 2, 9, 6, '#e74c3c'); R(4, 2, 9, 1, '#fff'); R(4, 7, 9, 1, '#b02a1e'); R(2, 14, 4, 1, '#888'); }
    else if (id === 'zom') { R(3, 3, 10, 10, '#7fae5a'); R(3, 3, 4, 2, '#5d8a3f'); R(5, 6, 2, 2, '#ff3b30'); R(9, 6, 2, 2, '#ff3b30'); R(5, 10, 6, 1, '#2a3b1c'); R(6, 10, 1, 2, '#e8e8d0'); R(9, 10, 1, 2, '#e8e8d0'); R(2, 6, 1, 3, '#5d8a3f'); }
    else { R(2, 2, 12, 12, '#f5f5f5'); R(2, 2, 12, 1, '#fff'); R(2, 13, 12, 1, '#bbb'); for (const [x, y] of [[4, 4], [11, 4], [7, 7], [4, 10], [11, 10]]) R(x, y, 2, 2, '#222'); }
  }
  const thumbs = {};
  function mapThumb(i) {
    if (thumbs[i] != null) return thumbs[i];
    let url = '';
    try {
      const mk = (th) => { // gerçek harita üretiminden yukarıdan görünüm (tepe gölgelemeli)
        const T = VA.themePal(th), m = VM.generate(1000 + th * 77, th), S = m.SIZE, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d');
        for (let x = 0; x < S; x++) for (let z = 0; z < S; z++) {
          const ty = m.topY(x, z), id = m.get(x, ty, z), base = T.pal[id] || 0x888888, nb = ty - m.topY(Math.min(S - 1, x + 1), Math.max(0, z - 1));
          const f = Math.max(0.45, Math.min(1.35, 0.7 + Math.min(ty, 10) * 0.04 + nb * 0.1));
          g.fillStyle = `rgb(${Math.min(255, (base >> 16 & 255) * f) | 0},${Math.min(255, (base >> 8 & 255) * f) | 0},${Math.min(255, (base & 255) * f) | 0})`; g.fillRect(x, z, 1, 1);
        }
        return cv;
      };
      if (i < 0) { // rastgele: üç haritadan şeritler + soru işareti
        const cv = document.createElement('canvas'); cv.width = 96; cv.height = 60; const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
        const n = (VM.THEMES || []).length || 3; for (let k = 0; k < n; k++) g.drawImage(mk(k), 0, 0, 48, 48, k * (96 / n), 0, 96 / n + 1, 60);
        g.fillStyle = 'rgba(8,12,22,.55)'; g.fillRect(0, 0, 96, 60); g.fillStyle = '#ffd23f'; g.font = '700 34px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 48, 32);
        url = cv.toDataURL();
      } else url = mk(i).toDataURL();
    } catch (e) { url = ''; }
    thumbs[i] = url; return url;
  }
  function buildSel() {
    const d = D(), mi = MODES.find((m) => m[0] === d.mode) || MODES[0], mp = MAPS.find((m) => m[0] === d.map) || MAPS[0], mapOn = LOCAL && !d.online;
    drawModeIcon($('scModeIco'), mi[0]); $('scMode').textContent = mi[1];
    $('scMapImg').src = mapThumb(mp[0]); $('scMap').textContent = mp[1];
    $('modeBox').style.display = ''; $('mapBox').style.display = mapOn ? '' : 'none';
    if ($('picker').classList.contains('on')) renderPicker();
  }
  function renderPicker() {
    const d = D(), mapOn = LOCAL && !d.online;
    $('pkModes').innerHTML = MODES.map(([id, nm]) => `<button class="pk-mode ${d.mode === id ? 'sel' : ''}" data-pmode="${id}"><canvas width="16" height="16" data-ic="${id}"></canvas><div><b>${esc(nm)}</b><span>${esc(MODE_INFO[id][0])}</span><div class="pk-tags">${MODE_INFO[id][1].map((t) => `<em>${t}</em>`).join('')}</div></div></button>`).join('');
    $('pkModes').querySelectorAll('canvas[data-ic]').forEach((cv) => drawModeIcon(cv, cv.dataset.ic));
    $('pkMaps').className = 'pk-maps' + (mapOn ? '' : ' off');
    $('pkMaps').innerHTML = MAPS.map(([id, nm]) => `<button class="pk-map ${d.map === id ? 'sel' : ''}" data-pmap="${id}"><img alt="" src="${mapThumb(id)}"><b>${esc(nm)}</b><small>${id < 0 ? 'Her maçta farklı bir harita' : esc(MAP_INFO[id] || '')}</small></button>`).join('');
    $('pkNote').textContent = mapOn ? '' : 'Çevrimiçi sunucuda harita sunucu tarafından seçilir; burada yalnızca mod seçimi geçerlidir.';
    const mi = MODES.find((m) => m[0] === d.mode) || MODES[0], mp = MAPS.find((m) => m[0] === d.map) || MAPS[0];
    $('pkSum').innerHTML = `${esc(mi[1])}${mapOn ? `<small>${esc(mp[1])}</small>` : ''}`;
  }
  function openPicker(focus) { renderPicker(); $('picker').classList.add('on'); VA.ui(); if (focus === 'map' && LOCAL && !D().online) { const s = $('pkMaps').querySelector('.sel'); if (s) s.scrollIntoView({ block: 'nearest' }); } }
  function closePicker() { $('picker').classList.remove('on'); buildSel(); }

  // ---- paneller ----
  function setBody(html, foot) { $('sidebody').innerHTML = html; $('sidefoot').className = foot ? 'on' : ''; paintIcons($('sidebody')); }
  // ---- piksel ikonlar ----
  const icoHex = (n) => hex(n);
  function figure(c, o) {
    const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    const sk = PR.SKINS[o.skin] || PR.SKINS[0], shirt = icoHex(PR.COLORS[o.color] != null ? PR.COLORS[o.color] : 0xe74c3c), head = icoHex(sk.head);
    // sırt eşyası (karakterin arkasında)
    if (o.back === 1) { R(5, 13, 14, 10, '#6d4c2a'); R(7, 18, 10, 4, '#8d6a3a'); R(5, 13, 14, 1, '#4e3519'); }
    if (o.back === 2) { R(5, 12, 14, 10, '#b71c1c'); R(4, 21, 16, 5, '#8e1515'); R(7, 22, 1, 4, '#b71c1c'); R(12, 22, 1, 4, '#b71c1c'); R(16, 22, 1, 4, '#b71c1c'); }
    if (o.back === 3) { for (let i = 0; i < 5; i++) { R(6 - i - 1, 10 + i * 2, 2 + i, 2, '#f4f6fa'); R(18 + 0, 10 + i * 2, 2 + i, 2, '#f4f6fa'); } R(1, 20, 5, 2, '#cfd5df'); R(18, 20, 5, 2, '#cfd5df'); R(2, 12, 3, 1, '#cfd5df'); R(19, 12, 3, 1, '#cfd5df'); }
    if (o.back === 4) { R(4, 12, 4, 10, '#8a9099'); R(16, 12, 4, 10, '#8a9099'); R(4, 12, 4, 2, '#c4c9d1'); R(16, 12, 4, 2, '#c4c9d1'); R(5, 22, 2, 3, '#ff9800'); R(17, 22, 2, 3, '#ff9800'); R(5, 22, 2, 1, '#ffeb3b'); R(17, 22, 2, 1, '#ffeb3b'); }
    if (o.back === 5) { for (let i = 0; i < 18; i++) R(17 - i * 0.75 | 0, 22 - i, 2, 1, i < 3 ? '#6d4c2a' : '#dfe6ee'); R(15, 20, 5, 1, '#c9a227'); R(5, 4, 2, 2, '#ffffff'); }
    if (o.back === 6) { R(14, 10, 4, 12, '#6d4c2a'); R(14, 10, 4, 1, '#4e3519'); R(14, 6, 1, 5, '#e0e0e0'); R(16, 5, 1, 6, '#e0e0e0'); R(18, 7, 1, 4, '#e0e0e0'); R(14, 5, 1, 1, '#d32f2f'); R(16, 4, 1, 1, '#d32f2f'); }
    if (o.back === 7) { R(5, 12, 14, 12, '#4a4f55'); R(6, 13, 12, 10, '#7a8088'); R(8, 15, 8, 6, '#c62828'); R(11, 17, 2, 2, '#ffd23f'); }
    if (o.back === 8) { for (let i = 0; i < 5; i++) { R(6 - i - 1, 9 + i * 2, 3 + i, 2, '#8e1515'); R(18, 9 + i * 2, 3 + i, 2, '#8e1515'); } R(0, 8, 2, 4, '#d32f2f'); R(22, 8, 2, 4, '#d32f2f'); }
    if (o.back === 9) { R(5, 12, 4, 10, '#2a6f97'); R(15, 12, 4, 10, '#2a6f97'); R(6, 11, 2, 1, '#ddd'); R(16, 11, 2, 1, '#ddd'); R(9, 15, 6, 1, '#222'); R(4, 14, 1, 3, '#9fd8ff'); }
    if (o.back === 10) { for (let i = 0; i < 12; i++) R(5 + i, 22 - i, 1, 1, '#6d4c2a'); R(12, 14, 8, 8, '#c58a2c'); R(14, 16, 4, 4, '#222'); R(4, 8, 1, 1, '#6d4c2a'); }
    if (o.back === 11) { ['#ff1744', '#ff9100', '#ffea00', '#00e676', '#2979ff', '#d500f9'].forEach((c, i) => R(5, 12 + i * 2, 14, 2, c)); R(4, 24, 16, 2, '#d500f9'); }
    if (o.back === 12) { R(5, 12, 14, 11, '#4a4f55'); R(6, 13, 5, 6, '#7a8088'); R(13, 13, 5, 6, '#7a8088'); R(6, 12, 5, 1, '#d32f2f'); R(13, 12, 5, 1, '#d32f2f'); R(7, 22, 3, 3, '#ff9800'); R(14, 22, 3, 3, '#ff9800'); }
    if (o.back === 13) { for (let i = 0; i < 5; i++) { R(6 - i - 1, 9 + i * 2, 3 + i, 2, '#ffd23f'); R(18, 9 + i * 2, 3 + i, 2, '#ffd23f'); } R(1, 12, 4, 1, '#fff3b0'); R(19, 12, 4, 1, '#fff3b0'); R(2, 16, 3, 1, '#fff3b0'); R(19, 16, 3, 1, '#fff3b0'); }
    // gövde
    R(8, 21, 4, 6, '#2c3e50'); R(12, 21, 4, 6, '#2c3e50'); R(8, 26, 4, 1, '#1b2733'); R(12, 26, 4, 1, '#1b2733');
    R(7, 13, 10, 8, shirt); R(5, 13, 2, 7, shirt); R(17, 13, 2, 7, shirt); R(5, 19, 2, 2, head); R(17, 19, 2, 2, head);
    R(7, 20, 10, 1, 'rgba(0,0,0,.25)');
    R(8, 5, 8, 8, head);
    // kafa desenleri
    if (sk.pattern === 'camo') { R(9, 5, 2, 2, '#4b6b2f'); R(13, 6, 2, 2, '#6b4f2a'); R(8, 10, 2, 2, '#4b6b2f'); R(8, 14, 3, 3, '#4b6b2f'); R(13, 16, 3, 2, '#6b4f2a'); R(10, 18, 2, 2, '#34501f'); }
    if (sk.pattern === 'panel') { R(8, 11, 8, 1, '#6c757d'); R(11, 5, 2, 3, '#6c757d'); R(8, 15, 8, 1, '#6c757d'); R(11, 14, 2, 3, '#35e0ff'); }
    if (sk.pattern === 'rip') { R(9, 6, 1, 3, '#7a1f17'); R(14, 9, 1, 3, '#7a1f17'); R(8, 16, 3, 1, '#4a3a2a'); R(13, 18, 3, 1, '#4a3a2a'); R(7, 15, 2, 2, head); }
    if (sk.pattern === 'band') { R(8, 7, 8, 2, '#d32f2f'); R(15, 8, 3, 1, '#d32f2f'); R(7, 13, 10, 1, '#e53935'); }
    if (sk.pattern === 'gold') { R(7, 17, 10, 1, '#fff3b0'); R(9, 6, 1, 1, '#fff'); R(14, 10, 1, 1, '#fff'); R(6, 14, 1, 1, '#fff'); }
    if (sk.pattern === 'fang') { R(7, 13, 10, 1, '#5a0f1a'); R(10, 11, 1, 2, '#fff'); R(13, 11, 1, 2, '#fff'); }
    if (sk.pattern === 'stripe') { R(10, 5, 1, 3, '#1a1a1a'); R(13, 5, 1, 3, '#1a1a1a'); R(7, 15, 10, 1, '#1a1a1a'); R(7, 18, 10, 1, '#1a1a1a'); }
    if (sk.pattern === 'ghost') { R(7, 13, 10, 8, '#f4f8fb'); R(8, 5, 8, 8, '#dfe9f2'); R(11, 11, 2, 2, '#111'); }
    if (sk.pattern === 'alien') { R(9, 3, 1, 3, '#7be07b'); R(14, 3, 1, 3, '#7be07b'); R(8, 2, 3, 1, '#b6ff6b'); R(13, 2, 3, 1, '#b6ff6b'); R(9, 8, 2, 2, '#000'); R(13, 8, 2, 2, '#000'); }
    if (sk.pattern === 'skull') { R(10, 11, 4, 1, '#111'); R(11, 12, 1, 1, '#111'); R(13, 12, 1, 1, '#111'); R(9, 8, 2, 3, '#111'); R(13, 8, 2, 3, '#111'); R(9, 15, 6, 1, '#ddd'); R(9, 17, 6, 1, '#ddd'); R(9, 19, 6, 1, '#ddd'); }
    if (sk.pattern === 'wrap') { R(8, 7, 8, 1, '#e9dcb8'); R(8, 10, 8, 1, '#e9dcb8'); R(7, 15, 10, 1, '#e9dcb8'); R(7, 18, 10, 1, '#e9dcb8'); }
    if (sk.pattern === 'lava') { R(12, 6, 1, 5, '#ff6a00'); R(11, 8, 1, 2, '#ffd23f'); R(10, 16, 4, 1, '#ff6a00'); R(12, 17, 1, 3, '#ff6a00'); }
    if (sk.pattern === 'ice') { R(9, 3, 1, 3, '#e8f9ff'); R(12, 2, 1, 4, '#e8f9ff'); R(15, 3, 1, 3, '#e8f9ff'); R(7, 13, 10, 1, '#e8f9ff'); }
    if (sk.pattern === 'visor') { R(8, 5, 8, 8, '#9aa3ad'); R(9, 8, 6, 1, '#111'); R(7, 13, 10, 2, '#7d868f'); }
    if (sk.pattern === 'royal') { R(7, 13, 10, 2, '#d32f2f'); R(7, 15, 10, 1, '#fff'); }
    if (sk.pattern === 'rainbow') ['#ff1744', '#ff9100', '#ffea00', '#00e676', '#2979ff'].forEach((c, i) => R(7, 13 + i * 2, 10, 2, c));
    if (sk.pattern === 'galaxy') { R(9, 14, 1, 1, '#fff'); R(14, 16, 1, 1, '#fff'); R(11, 18, 1, 1, '#b388ff'); R(15, 19, 1, 1, '#fff'); R(13, 6, 1, 1, '#b388ff'); }
    // yüz
    const eye = icoHex(sk.eye); R(10, 8, 1, 2, eye); R(13, 8, 1, 2, eye); R(11, 11, 2, 1, 'rgba(0,0,0,.35)');
    // şapka
    switch (o.hat) {
      case 1: R(7, 3, 10, 3, '#d33'); R(7, 5, 11, 1, '#a11'); R(14, 5, 6, 1, '#800'); R(11, 2, 2, 1, '#d33'); break;
      case 2: R(8, 3, 8, 3, '#ffd23f'); R(8, 1, 2, 2, '#ffd23f'); R(11, 0, 2, 3, '#ffd23f'); R(14, 1, 2, 2, '#ffd23f'); R(11, 4, 2, 1, '#e53935'); R(8, 5, 8, 1, '#c9a227'); break;
      case 3: R(7, 2, 10, 6, '#6b7a4a'); R(7, 8, 2, 4, '#55623a'); R(15, 8, 2, 4, '#55623a'); R(9, 2, 6, 1, '#8a9a62'); R(7, 7, 10, 1, '#3e4a2a'); break;
      case 4: R(11, 2, 2, 3, '#9aa3ad'); R(10, 0, 4, 2, '#f44336'); R(11, 0, 1, 1, '#ffcdd2'); R(8, 4, 8, 1, '#6c757d'); break;
      case 5: R(6, 3, 2, 3, '#f1e4c3'); R(5, 1, 2, 2, '#f1e4c3'); R(16, 3, 2, 3, '#f1e4c3'); R(17, 1, 2, 2, '#f1e4c3'); R(8, 4, 8, 1, '#5c4a32'); break;
      case 6: R(3, 4, 18, 2, '#8d5a2b'); R(8, 0, 8, 5, '#a36a35'); R(8, 3, 8, 1, '#5c3a1c'); R(3, 3, 2, 1, '#8d5a2b'); R(19, 3, 2, 1, '#8d5a2b'); break;
      case 7: R(6, 4, 12, 2, '#1c1c20'); R(8, 0, 8, 5, '#26262b'); R(8, 3, 8, 1, '#d32f2f'); break;
      case 9: R(5, 4, 14, 2, '#15151a'); R(8, 2, 8, 3, '#15151a'); R(11, 3, 2, 1, '#fff'); R(4, 3, 2, 2, '#15151a'); R(18, 3, 2, 2, '#15151a'); break;
      case 10: R(4, 4, 16, 2, '#4a2a7a'); R(8, 2, 8, 3, '#4a2a7a'); R(10, 0, 5, 2, '#4a2a7a'); R(13, -1, 2, 1, '#4a2a7a'); R(8, 4, 8, 1, '#f1c40f'); break;
      case 11: R(8, 4, 8, 2, '#fff'); R(7, 0, 10, 4, '#f5f5f5'); R(6, 1, 2, 2, '#fff'); R(16, 1, 2, 2, '#fff'); break;
      case 12: R(7, 4, 10, 2, '#fff'); R(8, 2, 8, 2, '#d32f2f'); R(10, 0, 6, 2, '#d32f2f'); R(15, 0, 2, 2, '#fff'); R(14, 2, 3, 2, '#d32f2f'); break;
      case 13: for (let i = 0; i < 5; i++) R(8 + i * 2 - (i === 4 ? 0 : 0), i % 2 ? 0 : 1, 2, i % 2 ? 5 : 4, '#ff2d95'); break;
      case 14: R(7, 2, 10, 3, '#ffc107'); R(6, 4, 12, 1, '#ffc107'); R(11, 1, 2, 1, '#ffa000'); R(11, 3, 2, 1, '#fff'); break;
      case 15: R(7, 4, 10, 9, '#9aa3ad'); R(8, 8, 8, 1, '#111'); R(11, 0, 2, 4, '#d32f2f'); R(7, 4, 10, 1, '#6c757d'); break;
      case 16: R(9, 3, 6, 2, '#ff4a00'); R(10, 1, 4, 2, '#ff8a00'); R(11, -1, 2, 2, '#ffd23f'); break;
      case 17: R(8, 3, 8, 3, '#ffd23f'); R(8, 0, 2, 3, '#ffd23f'); R(11, -1, 2, 4, '#ffd23f'); R(14, 0, 2, 3, '#ffd23f'); R(11, 4, 2, 1, '#e53935'); R(9, 1, 1, 1, '#e53935'); R(14, 1, 1, 1, '#e53935'); break;
      case 18: R(9, 2, 6, 3, '#ffd23f'); R(10, 0, 4, 3, '#ffd23f'); R(14, 1, 3, 1, '#ff8a00'); R(11, 1, 1, 1, '#111'); break;
      case 19: R(8, 4, 8, 1, '#2b2b30'); R(6, 7, 2, 4, '#2b2b30'); R(16, 7, 2, 4, '#2b2b30'); R(5, 8, 1, 2, '#e53935'); R(18, 8, 1, 2, '#e53935'); break;
      case 20: R(8, 4, 8, 1, '#2b2b30'); R(8, 7, 8, 2, '#35e0ff'); R(7, 7, 1, 2, '#2b2b30'); R(16, 7, 1, 2, '#2b2b30'); break;
      case 21: R(11, 4, 2, 1, '#f5ecd8'); R(6, 1, 12, 3, '#d32f2f'); R(8, -1, 8, 2, '#d32f2f'); R(8, 2, 2, 1, '#fff'); R(14, 1, 2, 1, '#fff'); break;
      case 22: R(8, 4, 8, 2, '#bdefff'); for (const x of [8, 10, 13, 15]) R(x, 1, 1, 3, '#7df9ff'); R(11, 0, 2, 4, '#7df9ff'); break;
      case 8: R(9, 0, 6, 1, '#ffd23f'); R(8, 1, 1, 1, '#ffd23f'); R(15, 1, 1, 1, '#ffd23f'); R(9, 2, 6, 1, '#ffd23f'); R(9, 1, 6, 1, 'rgba(255,230,120,.25)'); break;
    }
  }
  function gunIcon(c, w, h, id, tint, coll) {
    const d = VW.DEFS[id], P = VW.partsFor(id, coll | 0), CD = coll > 0 && window.VColls.LIST[coll]; if (CD && CD.main != null) tint = CD.main;
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const p of P) { x0 = Math.min(x0, -p[6] - p[2] / 2); x1 = Math.max(x1, -p[6] + p[2] / 2); y0 = Math.min(y0, -p[5] - p[1] / 2); y1 = Math.max(y1, -p[5] + p[1] / 2); }
    const sc = Math.min((w - 8) / (x1 - x0), (h - 8) / (y1 - y0)), ox = (w - (x1 - x0) * sc) / 2 - x0 * sc, oy = (h - (y1 - y0) * sc) / 2 - y0 * sc;
    const rect = (p, grow, col) => {
      const rw = Math.max(2, Math.round(p[2] * sc)), rh = Math.max(2, Math.round(p[1] * sc));
      c.fillStyle = col; c.fillRect(Math.round(-p[6] * sc + ox - rw / 2) - grow, Math.round(-p[5] * sc + oy - rh / 2) - grow, rw + grow * 2, rh + grow * 2);
    };
    for (const p of P) rect(p, 1, '#0b0d12');
    for (const p of P) rect(p, 0, icoHex(VW.partColor(p, tint, coll | 0)));
    if (CD) for (const p of P) if (p[9]) { c.globalAlpha = 0.35; rect(p, 1, icoHex(p[3])); c.globalAlpha = 1; }
    for (const p of P) { // üst kenar aydınlığı
      const rw = Math.max(2, Math.round(p[2] * sc)), rh = Math.max(2, Math.round(p[1] * sc));
      c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(Math.round(-p[6] * sc + ox - rw / 2), Math.round(-p[5] * sc + oy - rh / 2), rw, 1);
    }
    const r = VW.RARITY[id] | 0;
    if (r) { const b = P[0], col = icoHex(VW.RARITY_INFO[r].color); const rw = Math.max(3, Math.round(b[2] * 0.82 * sc)); c.fillStyle = col; c.fillRect(Math.round(-b[6] * sc + ox - rw / 2), Math.round(-b[5] * sc + oy - b[1] * sc / 2) - 2, rw, 2); if (r >= 2 && d.flash) { c.fillRect(Math.round(-d.flash[2] * sc + ox) - 3, Math.round(-d.flash[1] * sc + oy) - 2, 3, 3); } }
  }
  function paintIcons(root) {
    for (const cv of (root || document).querySelectorAll('canvas.ico')) {
      const t = cv.dataset.t, id = +cv.dataset.i, c = cv.getContext('2d'), e = D().equip;
      c.imageSmoothingEnabled = false;
      if (t === 'coin' || t === 'gem') { cv.width = 12; cv.height = 12; cv.style.width = cv.style.height = (cv.dataset.w || 40) + 'px'; (t === 'coin' ? coinIcon : gemIcon)(c); }
      else if (t === 'crate') { cv.width = 20; cv.height = 18; cv.style.width = (cv.dataset.w || 100) + 'px'; cv.style.height = (cv.dataset.w || 100) * 0.9 + 'px'; chestIcon(c, cv.dataset.i); }
      else if (t === 'coll') {
        const W = 72, H = 44; cv.width = W; cv.height = H; cv.style.width = (cv.dataset.w || 104) + 'px'; cv.style.height = (cv.dataset.w || 104) * H / W + 'px';
        const ci = id;
        c.save(); c.translate(0, 0); gunIcon(c, 72, 24, 2, null, ci); c.restore();
        c.save(); c.translate(0, 22); gunIcon(c, 36, 22, 1, null, ci); c.restore();
        c.save(); c.translate(36, 22); gunIcon(c, 36, 22, 28, null, ci); c.restore();
      } else if (t === 'weapon' || t === 'gskin') {
        const W = 64, H = 32; cv.width = W; cv.height = H; cv.style.width = (cv.dataset.w || 104) + 'px'; cv.style.height = (cv.dataset.w || 104) / 2 + 'px';
        if (t === 'weapon') gunIcon(c, W, H, id, null); else gunIcon(c, W, H, 2, (PR.GSKINS[id] || {}).color);
      } else {
        cv.width = 24; cv.height = 28; const sc = +(cv.dataset.s || 1); cv.style.width = Math.round(60 * sc) + 'px'; cv.style.height = Math.round(70 * sc) + 'px';
        const o = { color: e.color, skin: e.skin, hat: 0, back: 0 };
        if (t === 'color') o.color = id; else if (t === 'skin') o.skin = id; else if (t === 'hat') o.hat = id; else if (t === 'back') o.back = id;
        if ((t === 'hat' || t === 'back') && id === 0) { c.strokeStyle = '#6b7482'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(6, 8); c.lineTo(18, 20); c.moveTo(18, 8); c.lineTo(6, 20); c.stroke(); c.beginPath(); c.arc(12, 14, 8, 0, 6.3); c.stroke(); }
        else figure(c, o);
      }
    }
  }
  function itemIcon(type, it) { return `<canvas class="ico" data-t="${type}" data-i="${it.id}"></canvas>`; }
  function isEquipped(type, id) {
    const e = D().equip;
    if (type === 'weapon') return e.melee === id || e.pistol === id || e.primary === id;
    return e[type] === id;
  }
  function priceTag(type, it) {
    if (PR.owns(type, it.id)) return `<span class="pr own">${isEquipped(type, it.id) ? 'Kuşanıldı' : 'Sahipsin'}</span>`;
    if (it.cur === 'pass') return '<span class="pr" style="color:#ff9bd5">&#9733; SEZON PASI</span>';
    if (it.cur === 'gem') return `<span class="pr gem">${it.price} &#9670;</span>`;
    return `<span class="pr">${it.price ? it.price + ' PX' : 'Ücretsiz'}</span>`;
  }
  function renderShop(locker) {
    const tabs = CATS.map(([id, nm]) => `<button class="tab ${cat === id ? 'sel' : ''}" data-cat="${id}">${nm}</button>`).join('');
    let items = PR.CATALOG[cat];
    if (locker) items = items.filter((it) => PR.owns(cat, it.id));
    const grid = items.map((it) => `<button class="card2 ${isEquipped(cat, it.id) ? 'eq' : ''} ${selItem === it.id ? 'sel' : ''}" data-item="${it.id}"${selItem === it.id || isEquipped(cat, it.id) ? '' : rarStyle(cat, it.id)}>${itemIcon(cat, it)}<span class="nm">${esc(it.name)}</span>${rarBadge(cat, it.id)}${locker ? (isEquipped(cat, it.id) ? '<span class="pr own">Kuşanıldı</span>' : '<span class="pr no">Giy</span>') : priceTag(cat, it)}</button>`).join('');
    let detail = '';
    const it = selItem != null ? PR.item(cat, selItem) : null;
    if (it) {
      const own = PR.owns(cat, it.id), eq = isEquipped(cat, it.id);
      let btn;
      if (!own) {
        const can = it.cur === 'px' ? D().px >= it.price : it.cur === 'gem' ? D().gems >= it.price : false;
        if (it.cur === 'pass') btn = '<button class="btn" data-nav2="pass">SEZON PASINDAN KAZANILIR &rarr;</button>'; else
        btn = `<button class="btn go" data-buy="1" ${can ? '' : 'disabled'}>SATIN AL &middot; ${it.price} ${it.cur === 'px' ? 'PX' : '&#9670;'}</button>${can ? '' : '<div class="phint">Yeterli bakiye yok</div>'}`;
      } else btn = `<button class="btn go" data-equip="1" ${eq ? 'disabled' : ''}>${eq ? 'KUŞANILDI' : 'KUŞAN'}</button>`;
      detail = `<div id="detail"><canvas class="ico" data-t="${cat}" data-i="${it.id}" data-w="150" style="float:right;margin:0 0 4px 8px"></canvas><h3>${esc(it.name)}</h3>${rarBadge(cat, it.id)}<p>${it.desc ? esc(it.desc) + '. ' : ''}${own ? 'Envanterinde' : 'Satın alınca envanterine eklenir'}. ${cat === 'coll' ? 'Tüm silahlara uygulanır.' : 'Karakterde önizleniyor.'}</p>${btn}</div>`;
    }
    const crate = locker ? '' : '<div class="phint">Kasalar için soldaki <b>Kasalar</b> sekmesine bak.</div>';
    setBody(`<div class="tabs">${tabs}</div>${items.length ? `<div class="grid">${grid}</div>` : '<div class="phint">Bu kategoride eşyan yok.</div>'}${detail}${crate}`);
  }
  function statBar(label, v, max) { return `<div class="stat"><span>${label}</span><div class="bar"><i style="width:${Math.min(100, Math.round(v / max * 100))}%"></i></div></div>`; }
  function upRow(id, s) {
    const lv = PR.upLevel(id), F = PR.UP_FX, pc = (k) => Math.round(F[k] * lv * 100);
    const fx = lv ? `Hasar +${pc('dmg')}%` + (s.kind !== 'melee' ? ` &middot; Şarjör +${pc('mag')}% &middot; Doldurma -${pc('reload')}% &middot; Sapma -${pc('spread')}%` : '') : 'Güçlendirilmedi';
    return `<div class="uprow"><span class="pips">${[0, 1, 2, 3, 4].map((i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</span><small>Seviye ${lv}/${PR.UP_MAX} &middot; ${fx}</small></div>`;
  }
  function upBtn(id) { const c = PR.upCost(id); return `<button class="mini up" data-wup="${id}" ${!c || D().px < c ? 'disabled' : ''}>${c ? 'Geliştir &middot; ' + c + ' PX' : 'MAKS'}</button>`; }
  function renderArsenal() {
    const groups = [['melee', 'YAKIN DÖVÜŞ'], ['pistol', 'TABANCA'], ['primary', 'ANA SİLAH']];
    setBody(groups.map(([k, nm]) => `<span class="lab">${nm}</span><div class="list">${PR.weaponList(k).map((w) => {
      const s = VM.WEAPONS[w.id], own = PR.owns('weapon', w.id), eq = D().equip[k] === w.id;
      const dmg = s.dmg * (s.pellets || 1), dps = dmg * 1000 / s.rate;
      return `<div class="${own ? '' : 'off'}"><canvas class="ico" data-t="weapon" data-i="${w.id}" data-w="84" style="flex:none"></canvas><div class="grow">${esc(w.name)}${rarBadge('weapon', w.id)}<small>${own ? '' : 'Kilitli &middot; Mağaza\'dan al'}</small>${own && s.kind !== 'melee' ? statBar('Hasar', dmg, 120) + statBar('Hız', dps, 250) + statBar('Şarjör', s.mag, 100) : ''}${own ? upRow(w.id, s) : ''}</div>${own ? `<div class="col"><button class="mini ${eq ? '' : 'alt'}" data-wep="${w.id}" ${eq ? 'disabled' : ''}>${eq ? 'Seçili' : 'Seç'}</button>${upBtn(w.id)}</div>` : ''}</div>`;
    }).join('')}</div>`).join(''));
  }
  function renderMissions() {
    const bonus = D().bonusDay === new Date().toISOString().slice(0, 10);
    setBody(`<button class="btn go" data-bonus="1" ${bonus ? 'disabled' : ''}>${bonus ? 'GÜNLÜK BONUS ALINDI' : 'GÜNLÜK BONUS: 200 PX + 3 &#9670;'}</button><span class="lab">BUGÜNÜN GÖREVLERİ</span><div class="list">${PR.missionState().map((m) => `<div><div class="grow">${esc(m.def.name)}<small>${m.prog}/${m.def.goal} &middot; ödül: ${m.def.px ? m.def.px + ' PX ' : ''}${m.def.gem ? m.def.gem + ' &#9670;' : ''}</small><div class="bar"><i style="width:${m.prog / m.def.goal * 100}%"></i></div></div><button class="mini" data-claim="${m.def.id}" ${m.done && !m.claimed ? '' : 'disabled'}>${m.claimed ? 'Alındı' : 'Al'}</button></div>`).join('')}</div><div class="phint">Görevler her gün sıfırlanır. Oyunda öldürme, kafa vuruşu ve tur zaferi sayılır.</div>`);
  }
  function renderRank() {
    if (live()) {
      ask('lb'); const L = NET.S.lb;
      if (!L) { setBody('<div class="phint">Sıralama yükleniyor…</div>'); return; }
      const me = L.me ? `<div class="phint">Senin sıran: <b>${L.me.r}.</b> (${L.me.s} puan) &middot; toplam ${L.total} oyuncu</div>` : '<div class="phint">Henüz sıralamada değilsin: bir tur oyna!</div>';
      setBody(`<div class="list">${L.rows.map((r) => `<div class="rank ${r.me ? 'you' : ''}"><b>${r.r}</b><span>${r.tag ? '[' + esc(r.tag) + '] ' : ''}${esc(r.n)}${r.me ? ' (sen)' : ''}<small> SEV ${r.lv}</small></span><span>${r.s} puan</span></div>`).join('') || '<div class="phint">Henüz kimse yok. İlk sen ol!</div>'}</div>${me}<div class="phint">Gerçek oyuncular. Puan = XP x2 + öldürme x10 + galibiyet x50.</div>`);
      return;
    }
    const d = D(), names = PR.BOT_NAMES;
    const rows = names.map((n, i) => ({ n, s: 4200 - i * 290 + (i * 37) % 90 }));
    rows.push({ n: d.name || 'Sen', s: d.xp * 2 + d.kills * 10, me: 1 });
    rows.sort((a, b) => b.s - a.s);
    setBody(`${netWait()}<div class="list">${rows.map((r, i) => `<div class="rank ${r.me ? 'you' : ''}"><b>${i + 1}</b><span>${esc(r.n)}${r.me ? ' (sen)' : ''}</span><span>${r.s} puan</span></div>`).join('')}</div><div class="phint">Puan = seviye XP'si x2 + öldürme x10. Diğer oyuncular örnektir.</div>`);
  }
  function renderClub() {
    const c = D().club;
    const INP = 'padding:8px;background:rgba(0,0,0,.45);color:#fff;border:2px solid rgba(255,255,255,.2);font:600 15px var(--hud);user-select:text';
    if (live()) {
      const S = NET.S;
      if (!S.club) {
        if (!S.clubs) ask('clubs');
        const list = S.clubs || [];
        setBody(`<div class="list">${list.map((k) => `<div><div class="grow">[${esc(k.tag)}] ${esc(k.name)}<small>${k.n}/${k.max} üye &middot; seviye ${k.level}</small></div><button class="mini" data-jointag="${esc(k.tag)}" ${k.n >= k.max ? 'disabled' : ''}>Katıl</button></div>`).join('') || '<div class="phint">Henüz kulüp yok. İlk kulübü sen kur!</div>'}</div><span class="lab">KENDİ KULÜBÜNÜ KUR</span><div class="row"><input id="cn" maxlength="20" placeholder="Kulüp adı" style="flex:1;min-width:120px;${INP}"><input id="ct" maxlength="4" placeholder="ETİKET" style="width:84px;${INP};text-transform:uppercase"></div><button class="btn" data-create="1">KUR</button><div class="phint">Kulüp üyeleri her kazançta %10 fazla PX alır. Gerçek oyuncularla ortak kulüp sohbeti.</div>`);
        return;
      }
      const tabs = `<div class="tabs"><button class="tab ${clubTab === 'info' ? 'sel' : ''}" data-ctab="info">Bilgi</button><button class="tab ${clubTab === 'chat' ? 'sel' : ''}" data-ctab="chat">Kulüp sohbeti</button></div>`;
      if (clubTab === 'chat') { setBody(tabs + msgsHtml(S.cchat), true); $('sidebody').scrollTop = 1e6; return; }
      const k = S.club;
      setBody(`${tabs}<h3 style="margin:0">[${esc(k.tag)}] ${esc(k.name)}</h3><p style="margin:2px 0 8px;opacity:.8">Seviye ${k.level} &middot; ${k.n}/${k.max} üye &middot; PX bonusu: +%10 aktif</p><span class="lab">ÜYELER</span><div class="list">${S.members.map((m) => `<div><span class="grow">${esc(m.n)}${m.owner ? ' &#9733;' : ''}<small>SEV ${m.lv}</small></span><span class="${m.on ? 'on' : 'off'}">${m.on ? 'çevrimiçi' : 'çevrimdışı'}</span></div>`).join('')}</div><button class="btn warn" data-leaveclub="1">KULÜPTEN AYRIL</button>`);
      return;
    }
    if (!c) {
      setBody(`${netWait()}<div class="list">${PR.CLUBS.map((k, i) => `<div><div class="grow">[${k.tag}] ${esc(k.name)}<small>${k.members} üye &middot; seviye ${k.level}</small></div><button class="mini" data-join="${i}">Katıl</button></div>`).join('')}</div><span class="lab">KENDİ KULÜBÜNÜ KUR</span><div class="row"><input id="cn" maxlength="16" placeholder="Kulüp adı" style="flex:1;min-width:120px;${INP}"><input id="ct" maxlength="3" placeholder="ETİKET" style="width:78px;${INP};text-transform:uppercase"></div><button class="btn" data-create="1">KUR</button><div class="phint">Kulüp üyeleri her kazançta %10 fazla PX alır.</div>`);
      return;
    }
    const tabs = `<div class="tabs"><button class="tab ${clubTab === 'info' ? 'sel' : ''}" data-ctab="info">Bilgi</button><button class="tab ${clubTab === 'chat' ? 'sel' : ''}" data-ctab="chat">Kulüp sohbeti</button></div>`;
    if (clubTab === 'chat') { setBody(tabs + msgsHtml(chatLog.club), true); $('sidebody').scrollTop = 1e6; return; }
    const mem = PR.BOT_NAMES.slice(0, 6);
    setBody(`${tabs}<h3 style="margin:0">[${esc(c.tag)}] ${esc(c.name)}</h3><p style="margin:2px 0 8px;opacity:.8">PX bonusu: +%10 aktif</p><span class="lab">ÜYELER (ÖRNEK)</span><div class="list">${mem.map((n, i) => `<div><span class="grow">${n}</span><span class="${i % 3 ? 'on' : 'off'}">${i % 3 ? 'çevrimiçi' : 'çevrimdışı'}</span></div>`).join('')}<div class="you"><span class="grow">${esc(D().name || 'Sen')}</span><span class="on">sen</span></div></div><button class="btn warn" data-leaveclub="1">KULÜPTEN AYRIL</button>`);
  }
  const SERVERS = [
    ['TR İstanbul #1', 'kc', -1, 11, 24], ['TR Ankara #2', 'ffa', 0, 7, 31], ['Roket Gecesi', 'rocket', 1, 14, 38], ['Labirent Arena', 'kc', 2, 9, 45], ['Avrupa #4', 'ffa', -1, 5, 62], ['Çatı Savaşı', 'kc', 1, 12, 29],
  ];
  function renderServers() {
    const mn = (id) => (MODES.find((m) => m[0] === id) || [0, id])[1], mp = (id) => (MAPS.find((m) => m[0] === id) || [0, '?'])[1];
    const on = !!D().online, addr = D().server || 'ws://localhost:3000';
    const conn = LOCAL ? `<div class="tabs"><button class="tab ${on ? '' : 'sel'}" data-conn="0">Yerel (botlar)</button><button class="tab ${on ? 'sel' : ''}" data-conn="1">Çevrimiçi sunucu</button></div>${on ? `<div class="row"><input id="srvAddr" value="${esc(addr)}" maxlength="80" aria-label="Sunucu adresi" style="flex:1;min-width:150px;padding:8px;background:rgba(0,0,0,.45);color:#fff;border:2px solid rgba(255,255,255,.2);font:600 15px var(--hud);user-select:text"><button class="mini" data-saveaddr="1">Kaydet</button></div><div class="phint" style="text-align:left">Kendi bilgisayarında <b>npm start</b> çalıştır, adres <b>ws://localhost:3000</b> olsun. Başkasının sunucusu için ws://IP:3000 ya da wss://alanadi yaz. OYNA'ya basınca bağlanır.</div>` : '<div class="phint" style="text-align:left">Tarayıcı içinde botlara karşı oynarsın. İnternet gerekmez.</div>'}` : '';
    const isOn = !LOCAL || on, inp = 'padding:8px;background:rgba(0,0,0,.45);color:#fff;border:2px solid rgba(255,255,255,.2);font:600 15px var(--hud);user-select:text';
    const sel = (id, opts) => `<select id="${id}" style="${inp};flex:1;min-width:110px">${opts}</select>`;
    const rooms = isOn ? `<span class="lab">ODALAR</span><button class="btn go" data-quick="1">HIZLI OYUN</button><button class="btn" data-real="1">GERÇEK OYUNCU ARA (botsuz)</button><div class="phint" style="text-align:left">Sunucu seni uygun bir odaya koyar; yoksa yeni oda açar. Seçili mod: <b>${esc(mn(D().mode))}</b></div>
      <span class="lab">ODA KUR</span><div class="row">${sel('rmMode', '<option value="">Karışık (her tur değişir)</option>' + MODES.filter((m) => m[0] !== 'rnd').map((m) => `<option value="${m[0]}" ${D().mode === m[0] ? 'selected' : ''}>${esc(m[1])}</option>`).join(''))}${sel('rmBots', [0, 4, 8, 12].map((n) => `<option value="${n}" ${n === 4 ? 'selected' : ''}>${n ? 'Bot dolgusu: ' + n : 'Botsuz'}</option>`).join(''))}</div>
      <label class="row" style="gap:8px;margin:6px 0;font:600 14px var(--hud)"><input type="checkbox" id="rmPriv" checked> Özel oda (yalnızca kodla girilir)</label><button class="btn" data-mkroom="1">ODA KUR</button>
      <span class="lab">KODLA KATIL</span><div class="row"><input id="rmCode" maxlength="4" placeholder="ABCD" style="${inp};width:96px;text-transform:uppercase;letter-spacing:.2em;text-align:center"><button class="mini" data-joincode="1">Katıl</button></div>
      <span class="lab">AÇIK ODALAR <button class="mini alt" data-refrooms="1" style="margin-left:6px">Yenile</button></span><div class="list" id="roomList"><div class="phint">Yükleniyor…</div></div>` : '';
    const cnt = isOn && live() ? `<div class="phint" style="text-align:left">Şu an <b>${NET.S.lobby}</b> kişi lobide, <b>${NET.S.game}</b> kişi oyunda.</div>` : '';
    setBody(`${conn}${cnt}${rooms}${isOn ? '' : `<span class="lab">ÖRNEK SUNUCU LİSTESİ</span><div class="list">${SERVERS.map((s, i) => `<div><div class="grow">${s[0]}<small>${mn(s[1])} &middot; ${esc(mp(s[2]))} &middot; ${s[3]}/16 &middot; ${s[4]} ms</small></div><button class="mini" data-srv="${i}">Katıl</button></div>`).join('')}</div><div class="phint">${LOCAL ? 'Tarayıcı sürümünde "katıl", seçilen mod ve haritayla botlara karşı yerel bir oyun başlatır.' : 'Bu adresteki gerçek sunucuya OYNA ile bağlanırsın; liste örnektir.'}</div>`}`);
    if (isOn) loadRooms();
  }
  function httpBase() {
    if (!LOCAL) return '';
    const a = (D().server || 'ws://localhost:3000').trim();
    return a.replace(/^ws/, 'http').replace(/\/+$/, '');
  }
  function loadRooms() {
    const box = $('roomList'); if (!box) return;
    fetch(httpBase() + '/api/rooms', { cache: 'no-store' }).then((r) => r.json()).then((j) => {
      const b = $('roomList'); if (!b) return;
      b.innerHTML = j.rooms.length ? j.rooms.map((r) => `<div><div class="grow">${esc(r.code)} &middot; ${esc(r.modeName)}${r.fixed ? '' : ' (karışık)'}<small>${r.n}/${r.max} oyuncu &middot; ${r.bots} bot</small></div><button class="mini" data-joinroom="${esc(r.code)}" ${r.n >= r.max ? 'disabled' : ''}>Katıl</button></div>`).join('') : '<div class="phint">Açık oda yok. HIZLI OYUN yeni oda açar.</div>';
    }).catch(() => { const b = $('roomList'); if (b) b.innerHTML = '<div class="phint">Sunucuya ulaşılamadı. Adresi kontrol et.</div>'; });
  }
  function msgsHtml(arr) { return `<div class="msgs">${arr.map((m) => m.sys ? `<div class="sys">${esc(m.text)}</div>` : `<div><b class="${m.me ? 'me' : ''}">${m.tag ? '[' + esc(m.tag) + '] ' : ''}${esc(m.n)}:</b> ${esc(m.text)}</div>`).join('')}</div>`; }
  function renderChat() {
    const L = live();
    const tabs = `<div class="tabs"><button class="tab ${chatTab === 'global' ? 'sel' : ''}" data-chtab="global">Genel</button><button class="tab ${chatTab === 'friends' ? 'sel' : ''}" data-chtab="friends">${L ? 'Çevrimiçi' : 'Arkadaşlar'}</button></div>`;
    if (chatTab === 'friends') {
      if (L) {
        ask('who'); const W = NET.S.who;
        setBody(tabs + (W ? `<div class="phint" style="text-align:left">${W.lobby} kişi lobide &middot; ${W.game} kişi oyunda</div><div class="list">${W.list.map((p) => `<div><span class="grow">${p.tag ? '[' + esc(p.tag) + '] ' : ''}${esc(p.n)}<small>SEV ${p.lv}</small></span><span class="on">çevrimiçi</span></div>`).join('')}</div>` : '<div class="phint">Yükleniyor…</div>'), false);
        return;
      }
      setBody(tabs + netWait() + `<div class="list">${FRIENDS.map((f) => `<div><span class="grow">${f[0]}<small>${f[1] ? 'çevrimiçi' : 'çevrimdışı'}</small></span><button class="mini alt" data-invite="${f[0]}" ${f[1] ? '' : 'disabled'}>Davet</button></div>`).join('')}</div>`, false);
      return;
    }
    setBody(tabs + (L ? '' : netWait()) + msgsHtml(chatArr('global')), true); $('sidebody').scrollTop = 1e6;
  }
  let showKey = false;
  function acctHtml() {
    if (!NET || !NET.hasServer) return '';
    const inp = 'padding:8px;background:rgba(0,0,0,.45);color:#fff;border:2px solid rgba(255,255,255,.2);font:600 13px var(--hud);user-select:text';
    return `<span class="lab">HESAP</span><div class="phint" style="text-align:left">Durum: <b>${live() ? 'bağlı (' + NET.S.lobby + ' kişi lobide)' : NET.S.status === 'kicked' ? 'başka yerde açık' : 'bağlanıyor…'}</b>. Hesabın bu tarayıcıdaki gizli anahtarla tanınır; başka cihazda oynamak için anahtarı kopyala. <b>Kimseyle paylaşma.</b></div>
      <div class="row"><input id="acctKey" readonly value="${showKey ? esc(NET.key) : '••••••••••••••••••••••••'}" style="flex:1;min-width:150px;${inp}"><button class="mini" data-showkey="1">${showKey ? 'Gizle' : 'Göster'}</button></div>
      <div class="row"><input id="impKey" maxlength="80" placeholder="Başka cihazdaki anahtarı yapıştır" style="flex:1;min-width:150px;${inp}"><button class="mini alt" data-impkey="1">İçe aktar</button></div>`;
  }
  function renderSettings() {
    const s = D().settings;
    setBody(`<span class="lab">TAKMA AD</span><div class="phint" style="text-align:left;margin:0">Üst çubuktaki kutudan değiştirebilirsin.</div><span class="lab">OYUN AYARLARI</span>
      <div class="srow"><label for="sSens">Hassasiyet</label><input type="range" id="sSens" min="0.3" max="2.5" step="0.05" value="${s.sens}"><output id="sSensV">${(+s.sens).toFixed(2)}</output></div>
      <div class="srow"><label for="sFov">Görüş (FOV)</label><input type="range" id="sFov" min="60" max="100" step="1" value="${s.fov}"><output id="sFovV">${s.fov}</output></div>
      <div class="srow"><label for="sVol">Ses</label><input type="range" id="sVol" min="0" max="1" step="0.05" value="${s.vol}"><output id="sVolV">${Math.round(s.vol * 100)}</output></div>
      <span class="lab">İLERLEME</span><button class="btn warn" data-reset="1">PROFİLİ SIFIRLA</button><div class="phint">${live() ? 'Profil sunucuda yedeklenir (hesap anahtarınla her cihazdan açılır).' : 'Profil bu tarayıcıda saklanır.'}</div>${acctHtml()}
      <span class="lab">KONTROLLER</span><div class="phint" style="text-align:left;line-height:1.6">WASD hareket &middot; Boşluk zıpla &middot; Shift koş &middot; Ctrl/C eğil &middot; Q/X atılma<br>Sol tık ateş &middot; Sağ tık nişan &middot; R şarjör &middot; G bomba &middot; 1-7 silah &middot; Enter sohbet &middot; Tab skor &middot; Esc menü</div>`);
  }
  function render() {
    const nm = (NAV.find((n) => n[0] === tab) || [0, 0, ''])[2];
    $('sidetitle').textContent = nm.toLocaleUpperCase('tr'); $('sample').style.display = sampleOn() ? '' : 'none';
    ({ crates: renderCrates, pass: renderPass, shop: () => renderShop(false), locker: () => renderShop(true), arsenal: renderArsenal, missions: renderMissions, rank: renderRank, club: renderClub, servers: renderServers, chat: renderChat, settings: renderSettings }[tab])();
    $('sideIn').placeholder = tab === 'club' ? 'Kulübe yaz...' : 'Mesaj yaz ve Enter\'a bas';
    document.body.classList.toggle('passwide', tab === 'pass');
    buildNav(); top();
  }
  function go(t) {
    tab = t; asked.lb = asked.who = 0; if (t === 'club') asked.clubs = 0; selItem = null; if (t === 'chat') unread = false; if (t === 'pass') passFirst = true;
    if ((t === 'shop' || t === 'locker') && cat === 'weapon' && false) cat = 'color';
    resetPreview(); render();
  }

  // ---- sohbet (örnek) ----
  function addMsg(room, n, text, me) { const a = chatLog[room]; a.push({ n, text, me }); if (a.length > 60) a.shift(); }
  function botSay(room) {
    const n = room === 'club' ? rnd(PR.BOT_NAMES.slice(0, 6)) : rnd(PR.BOT_NAMES);
    addMsg(room, n, rnd(LINES));
    const visible = (tab === 'chat' && chatTab === 'global' && room === 'global') || (tab === 'club' && clubTab === 'chat' && room === 'club');
    if (visible) { const keep = $('sideIn').value; render(); $('sideIn').value = keep; } else if (room === 'global') { unread = true; buildNav(); }
  }
  function seedChat() {
    addMsg('global', '', 'Örnek sohbet: gerçek oyuncular yok, mesajlar tarayıcıda üretilir.', 0); chatLog.global[0].sys = true;
    for (let i = 0; i < 4; i++) addMsg('global', rnd(PR.BOT_NAMES), rnd(LINES));
    addMsg('club', '', 'Kulüp sohbeti (örnek)', 0); chatLog.club[0].sys = true;
    addMsg('club', 'Kaplan', 'Hoş geldin!');
  }
  function sendChat() {
    const v = $('sideIn').value.trim(); if (!v) return;
    const room = tab === 'club' ? 'club' : 'global';
    if (live()) { if (room === 'club' && !NET.S.club) return toast('Önce bir kulübe katıl', true); NET.chat(room, v); $('sideIn').value = ''; return; }
    if (wantNet()) return toast('Lobi sunucusuna bağlanılıyor, birazdan tekrar dene', true);
    $('sideIn').value = '';
    addMsg(room, D().name || 'Sen', v, 1); render();
    setTimeout(() => { addMsg(room, rnd(PR.BOT_NAMES), rnd(REPLIES)); if ((tab === 'chat' && chatTab === 'global') || (tab === 'club' && clubTab === 'chat')) { const k = $('sideIn').value; render(); $('sideIn').value = k; } }, 900 + Math.random() * 1200);
  }
  // ---- gerçek lobi olayları ----
  if (NET) NET.sub((ev, x) => {
    const keep = () => { const k = $('sideIn').value; render(); $('sideIn').value = k; };
    const inChat = tab === 'chat' && chatTab === 'global', inClubChat = tab === 'club' && clubTab === 'chat';
    if (ev === 'chat') {
      if ((x.room === 'club' && inClubChat) || (x.room !== 'club' && inChat)) keep();
      else if (x.room !== 'club' && !x.me) { unread = true; buildNav(); }
    } else if (ev === 'profile') { resetPreview(); buildSel(); render(); }
    else if (ev === 'err') toast(x, true);
    else if (ev === 'welcome' || ev === 'status') { if (tab === 'rank' || tab === 'club' || tab === 'chat' || tab === 'settings' || tab === 'servers') { const ae = document.activeElement; if (ae && ae !== $('sideIn') && ae.closest && ae.closest('#sidebody') && /^(INPUT|SELECT)$/.test(ae.tagName)) return; keep(); } }
    else if (ev === 'lb' && tab === 'rank') render();
    else if (ev === 'who' && tab === 'chat' && chatTab === 'friends') render();
    else if (ev === 'clubs' && tab === 'club' && !D().club) { const a = $('cn') ? $('cn').value : '', b = $('ct') ? $('ct').value : ''; render(); if ($('cn')) { $('cn').value = a; $('ct').value = b; } }
    else if (ev === 'club' && tab === 'club') keep();
  });

  // ---- olaylar ----
  $('nav').addEventListener('click', (e) => { const b = e.target.closest('[data-nav]'); if (b) { VA.ui(); go(b.dataset.nav); } });
  $('modeBox').addEventListener('click', () => openPicker('mode'));
  $('mapBox').addEventListener('click', () => openPicker('map'));
  $('picker').addEventListener('click', (e) => {
    const t = e.target; if (t === $('picker') || t.closest('#pkClose')) return closePicker();
    const m = t.closest('[data-pmode]'), p = t.closest('[data-pmap]');
    if (m) { D().mode = m.dataset.pmode; PR.save(); VA.ui(); renderPicker(); buildSel(); }
    else if (p) { D().map = +p.dataset.pmap; PR.save(); VA.ui(); renderPicker(); buildSel(); }
    else if (t.closest('#pkPlay')) { closePicker(); play(); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('picker').classList.contains('on')) closePicker(); });
  $('name').addEventListener('input', () => { D().name = $('name').value.slice(0, 16); PR.save(); resetPreview(); });
  $('sideIn').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); sendChat(); } });
  $('name').addEventListener('keydown', (e) => e.stopPropagation());

  function buy() {
    const r = PR.buy(cat, selItem); toast(r.msg, !r.ok);
    if (r.ok) { PR.equip(cat, selItem); resetPreview(); }
    render();
  }
  $('sidebody').addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t) return;
    const d = t.dataset; VA.ui();
    if (d.cat) { cat = d.cat; selItem = null; resetPreview(); render(); }
    else if (d.item != null) { selItem = +d.item; previewItem(cat, selItem); render(); }
    else if (d.nav2) go(d.nav2);
    else if (d.buy) buy();
    else if (d.equip) { PR.equip(cat, selItem); resetPreview(); render(); }
    else if (d.buycrate) { const r = PR.buyCrate(d.buycrate); toast(r.msg, !r.ok); render(); }
    else if (d.opencrate) openCrateAnim(d.opencrate);
    else if (d.pclaim) { const [tr_, i] = d.pclaim.split(':'); if (PR.claimPass(+i, tr_ === 'p')) { const rr = PR.passReward(+i, tr_ === 'p'); toast('Ödül alındı: ' + PR.describe(rr)); if (PR.rewardRarity(rr) >= 2) { document.body.classList.add('flash'); setTimeout(() => document.body.classList.remove('flash'), 900); } } render(); }
    else if (d.pclaimall) { let n = 0; for (let i = 1; i <= PR.passReached(); i++) { if (PR.claimPass(i, false)) n++; if (D().pass.premium && PR.claimPass(i, true)) n++; } toast(n ? n + ' ödül alındı' : 'Alınacak ödül yok', !n); render(); }
    else if (d.ptab) { passTab = d.ptab; render(); }
    else if (d.pgoto) passGoto(+d.pgoto);
    else if (d.ptier) { const r = PR.buyTier(); toast(r.msg, !r.ok); render(); }
    else if (d.pq) { const [pp, qid] = d.pq.split(':'); const n = PR.claimQuest(pp, qid); if (n >= 0) toast('Görev tamamlandı' + (n ? ' · ' + n + ' kademe!' : '')); render(); }
    else if (d.pbuy) { const r = PR.buyPremium(); toast(r.msg, !r.ok); render(); }
    else if (d.wup != null) { const r = PR.upgrade(+d.wup); toast(r.msg, !r.ok); render(); }
    else if (d.wep != null) { PR.equip('weapon', +d.wep); resetPreview(); render(); }
    else if (d.bonus) { if (PR.claimBonus()) toast('+200 PX ve 3 elmas!'); render(); }
    else if (d.claim) { if (PR.claimMission(d.claim)) toast('Görev ödülü alındı'); render(); }
    else if (d.jointag) { NET.join(d.jointag); clubTab = 'info'; }
    else if (d.showkey) { showKey = !showKey; render(); }
    else if (d.impkey) { const k = $('impKey').value.trim(); if (!NET.importKey(k)) toast('Geçersiz anahtar', true); else { toast('Anahtar alındı, hesap yükleniyor…'); render(); } }
    else if (d.join != null) { const k = PR.CLUBS[+d.join]; D().club = { name: k.name, tag: k.tag }; PR.save(); clubTab = 'info'; toast(k.name + ' kulübüne katıldın (+%10 PX)'); render(); }
    else if (d.create) {
      const n = $('cn').value.trim().replace(/[<>&"']/g, ''), tg = $('ct').value.trim().toUpperCase().replace(/[^A-Z0-9ĞÜŞİÖÇ]/g, '');
      if (n.length < 3 || tg.length < 2) return toast('Ad en az 3, etiket en az 2 harf olmalı', true);
      if (live()) { NET.create(n, tg.replace(/[^A-Z0-9]/g, '')); clubTab = 'info'; return; }
      D().club = { name: n, tag: tg }; PR.save(); clubTab = 'info'; toast('Kulüp kuruldu'); render();
    }
    else if (d.leaveclub) { if (live()) { NET.leave(); NET.S.clubs = null; asked.clubs = 0; } else { D().club = null; PR.save(); render(); } }
    else if (d.ctab) { clubTab = d.ctab; render(); }
    else if (d.chtab) { chatTab = d.chtab; render(); }
    else if (d.invite) toast(d.invite + ' kişisine davet gönderildi (örnek)');
    else if (d.conn != null) { D().online = d.conn === '1'; PR.save(); if (NET) NET.refresh(); buildSel(); render(); }
    else if (d.saveaddr) { D().server = $('srvAddr').value.trim(); PR.save(); if (NET) NET.refresh(); toast('Adres kaydedildi'); }
    else if (d.srv != null) { const s = SERVERS[+d.srv]; D().online = false; D().mode = s[1]; D().map = s[2]; PR.save(); buildSel(); play(); }
    else if (d.real) { roomReq = { kind: 'quick', real: true, mode: D().mode === 'rnd' ? '' : D().mode }; play(); }
    else if (d.quick) { roomReq = { kind: 'quick', mode: D().mode === 'rnd' ? '' : D().mode }; play(); }
    else if (d.mkroom) { roomReq = { kind: 'create', mode: $('rmMode').value, bots: +$('rmBots').value, priv: $('rmPriv').checked }; play(); }
    else if (d.joincode) { const c = $('rmCode').value.trim().toUpperCase(); if (c.length !== 4) return toast('Oda kodu 4 karakter olmalı', true); roomReq = { kind: 'code', code: c }; play(); }
    else if (d.joinroom) { roomReq = { kind: 'code', code: d.joinroom }; play(); }
    else if (d.refrooms) loadRooms();
    else if (d.reset) { if (confirm('Tüm ilerleme silinsin mi?')) { PR.reset(); resetPreview(); render(); buildSel(); } }
  });
  $('sidebody').addEventListener('input', (e) => {
    const id = e.target.id, v = +e.target.value, s = D().settings;
    if (id === 'sSens') { s.sens = v; $('sSensV').textContent = v.toFixed(2); } else if (id === 'sFov') { s.fov = v; $('sFovV').textContent = v; } else if (id === 'sVol') { s.vol = v; $('sVolV').textContent = Math.round(v * 100); VA.setVolume(v); } else return;
    PR.save();
  });

  // ---- kasalar ----
  function chestIcon(c, type) {
    const col = PR.CRATES[type].col, R = (x, y, w, h, k) => { c.fillStyle = k; c.fillRect(x, y, w, h); };
    R(2, 7, 16, 10, '#0b0d12'); R(2, 2, 16, 6, '#0b0d12');
    R(3, 8, 14, 8, col[1]); R(3, 3, 14, 5, col[0]); R(3, 3, 14, 1, col[2]);
    R(3, 8, 14, 1, '#0b0d12'); R(9, 3, 2, 14, '#0b0d12'); R(9, 3, 2, 14, col[2]); R(9, 9, 2, 3, '#0b0d12');
    R(3, 14, 14, 1, 'rgba(0,0,0,.35)'); R(3, 4, 1, 12, col[2]); R(16, 4, 1, 12, col[1]);
  }
  function renderCrates() {
    const rn = PR.RAR_NAMES, rc = PR.RAR_COLORS;
    setBody(Object.values(PR.CRATES).map((cr) => {
      const n = D().crates[cr.id] | 0, can = cr.cur === 'px' ? D().px >= cr.price : D().gems >= cr.price;
      return `<div id="detail" style="display:flex;gap:10px;align-items:center;margin-top:0;margin-bottom:8px"><canvas class="ico" data-t="crate" data-i="${cr.id}" data-w="84" style="flex:none"></canvas><div style="flex:1;min-width:0"><h3>${cr.name}</h3><p style="margin:0 0 4px">Envanterde: <b>${n}</b></p><div style="font-size:12px;line-height:1.5">${cr.odds.map((o, i) => o ? `<span style="color:${rc[i]}">${rn[i]} %${o}</span>` : '').filter(Boolean).join(' &middot; ')}</div>
        <div class="row" style="margin-top:6px"><button class="mini" data-opencrate="${cr.id}" ${n ? '' : 'disabled'}>AÇ</button><button class="mini alt" data-buycrate="${cr.id}" ${can ? '' : 'disabled'}>Al &middot; ${cr.price} ${cr.cur === 'px' ? 'PX' : '&#9670;'}</button></div></div></div>`;
    }).join('') + '<div class="phint">Maç sonunda kasa düşebilir. Aynı eşya çıkarsa PX/elmas olarak geri döner.</div>');
  }
  let crateBusy = false;
  function openCrateAnim(type) {
    if (crateBusy) return;
    const res = PR.openCrate(type); if (!res) return toast('Bu kasadan yok', true);
    crateBusy = true; top();
    const ov = $('crateov'), CARD = 128, N = 46, WINI = 38, rc = PR.RAR_COLORS;
    const items = []; for (let i = 0; i < N; i++) items.push(i === WINI ? { type: res.type, id: res.id } : PR.randomItem());
    const card = (it, i) => { const c = PR.item(it.type, it.id), r = PR.rarityOf(it.type, c); return `<div class="rcard" style="border-color:${rc[r]};box-shadow:inset 0 -26px 22px -18px ${rc[r]}66"><canvas class="ico" data-t="${it.type}" data-i="${it.id}" data-w="86"></canvas><span>${esc(c.name)}</span></div>`; };
    ov.innerHTML = `<div class="cbox"><h2>${PR.CRATES[type].name.toLocaleUpperCase('tr')}</h2><div class="reelwrap"><div class="reel" id="reel">${items.map(card).join('')}</div><div class="marker"></div></div><div id="cres"></div><div class="row" style="justify-content:center;margin-top:10px"><button class="btn" id="cskip" style="width:auto;padding:8px 22px">ATLA</button></div></div>`;
    ov.style.display = 'flex'; paintIcons(ov);
    const reel = $('reel'), w = ov.querySelector('.reelwrap').clientWidth;
    const target = WINI * CARD + CARD / 2 + (Math.random() - 0.5) * 60 - w / 2, dur = 5200, t0 = performance.now(); let last = -1, done = false, skip = false, raf = 0;
    const finish = () => {
      if (done) return; done = true; cancelAnimationFrame(raf); reel.style.transform = `translateX(${-target}px)`;
      const c = PR.item(res.type, res.id), col = rc[res.r];
      $('cres').innerHTML = `<div class="reveal" style="border-color:${col};box-shadow:0 0 30px ${col}88"><canvas class="ico" data-t="${res.type}" data-i="${res.id}" data-w="130"></canvas><div class="rn" style="color:${col}">${PR.RAR_NAMES[res.r].toLocaleUpperCase('tr')}</div><h3>${esc(c.name)}</h3>${res.dup ? `<p>Zaten vardı: +${res.px ? res.px + ' PX' : res.gem + ' &#9670;'} geri verildi</p>` : '<p>Envanterine eklendi!</p>'}<button class="btn go" id="cok">TAMAM</button></div>`;
      paintIcons($('cres')); VA.ui(); setTimeout(() => VA.ui(), 120);
      if (res.r >= 2) document.body.classList.add('flash'), setTimeout(() => document.body.classList.remove('flash'), 900);
      $('cskip').style.display = 'none';
      $('cok').onclick = () => { ov.style.display = 'none'; ov.innerHTML = ''; crateBusy = false; if (!res.dup && (res.type === 'weapon' || true)) { cat = res.type; } top(); render(); };
    };
    $('cskip').onclick = () => { skip = true; finish(); };
    const loop = (now) => {
      if (done) return;
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 4), x = target * e;
      reel.style.transform = `translateX(${-x}px)`;
      const idx = Math.floor((x + w / 2) / CARD); if (idx !== last) { last = idx; VA.ui(); }
      if (k >= 1) finish(); else raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  // ---- sezon pası ----
  let passTab = 'rewards', passFirst = true;
  const coinIcon = (c) => { const R = (x, y, w, h, k) => { c.fillStyle = k; c.fillRect(x, y, w, h); }; R(3, 0, 6, 12, '#7a5a00'); R(1, 2, 10, 8, '#7a5a00'); R(4, 1, 4, 10, '#ffd23f'); R(2, 3, 8, 6, '#ffd23f'); R(5, 3, 2, 6, '#e0a800'); R(3, 3, 1, 2, '#fff3b0'); };
  const gemIcon = (c) => { const R = (x, y, w, h, k) => { c.fillStyle = k; c.fillRect(x, y, w, h); }; R(4, 0, 4, 1, '#0b3c52'); R(2, 1, 8, 2, '#0b3c52'); R(0, 3, 12, 3, '#0b3c52'); R(2, 6, 8, 2, '#0b3c52'); R(4, 8, 4, 3, '#0b3c52'); R(4, 1, 4, 1, '#bff6ff'); R(2, 2, 8, 1, '#5fd8ff'); R(1, 3, 10, 2, '#5fd8ff'); R(3, 5, 6, 2, '#2aa8d4'); R(5, 7, 2, 2, '#2aa8d4'); R(3, 3, 2, 1, '#fff'); };
  const iconOf = (r, sz) => {
    const L = sz === 'l', X = sz === 'xs';
    if (r.k === 'px' || r.k === 'gem') return `<canvas class="ico" data-t="${r.k === 'px' ? 'coin' : 'gem'}" data-w="${L ? 56 : X ? 26 : 40}"></canvas>`;
    if (r.k === 'crate') return `<canvas class="ico" data-t="crate" data-i="${r.t}" data-w="${L ? 84 : X ? 44 : 62}"></canvas>`;
    if (r.k === 'multi') return `<div class="pmulti">${r.list.slice(0, 4).map((x) => iconOf(x, X || r.list.length > 2 ? 'xs' : 's')).join('')}</div>`;
    return `<canvas class="ico" data-t="${r.type}" data-i="${r.id}" data-w="${L ? 110 : X ? 60 : 84}" data-s="${L ? 1 : X ? 0.5 : 0.8}"></canvas>`;
  };
  function passCell(i, prem, got, ps) {
    const r = PR.passReward(i, prem), key = (prem ? 'p' : 'f') + i, claimed = !!ps.claimed[key], reached = i <= got;
    const can = reached && !claimed && (!prem || ps.premium), rc = PR.rewardRarity(r), col = PR.RAR_COLORS[rc];
    const st = claimed ? 'claimed' : can ? 'can' : reached && prem ? 'lockedp' : 'locked';
    const big = i % 10 === 0 || i === 45 || i === 50;
    const nm = r.k === 'multi' ? 'PAKET &middot; ' + r.list.length + ' ÖDÜL' : esc(PR.describe(r));
    return `<div class="pcell ${prem ? 'prem' : 'free'} ${st} ${big ? 'big' : ''}" style="--rc:${col}" title="${esc(PR.describe(r))}">
      ${big ? '<div class="pstar">&#9733;</div>' : ''}<div class="pic">${iconOf(r, big ? 'l' : 's')}</div><div class="pn">${nm}</div>
      ${claimed ? '<div class="pdone">&#10003;</div>' : can ? `<button class="pbtn" data-pclaim="${prem ? 'p' : 'f'}:${i}">AL</button>` : prem && !ps.premium ? '<div class="plock">&#128274;</div>' : ''}</div>`;
  }
  function renderPass() {
    PR.normPass();
    const ps = D().pass, got = PR.passReached(), si = PR.seasonInfo(), max = PR.PASS_MAX, per = PR.PASS_XP;
    const into = got >= max ? per : ps.xp % per, pct = got >= max ? 100 : Math.round(into / per * 100);
    let claimable = 0; for (let i = 1; i <= got; i++) { if (!ps.claimed['f' + i]) claimable++; if (ps.premium && !ps.claimed['p' + i]) claimable++; }
    const old = $('ptrack'), keep = old ? old.scrollLeft : null;
    const show = [20, 30, 40, 45, 50].map((t) => { const r = PR.passReward(t, true), rc = PR.RAR_COLORS[PR.rewardRarity(r)]; return `<button class="pshow ${t <= got ? 'got' : ''}" style="--rc:${rc}" data-pgoto="${t}"><div class="pic">${iconOf(r, 'xs')}</div><b>KADEME ${t}</b><span>${r.k === 'multi' ? r.list.length + ' ödül' : esc(PR.describe(r))}</span></button>`; }).join('');
    const hero = `<div class="ph" style="--c1:${si.col};--c2:${si.col2}"><div class="ph-l"><div class="ph-s">SEZON ${si.no}</div><div class="ph-t">${si.name}</div><div class="ph-time">&#9203; Bitmesine <b>${si.days} gün ${si.hours} sa</b></div>
        <div class="ph-btns">${ps.premium ? '<span class="ph-prem">&#9733; PREMIUM AKTİF</span>' : `<button class="pgold" data-pbuy="1">&#9733; PREMIUM'U AÇ &middot; ${PR.PREMIUM_COST} &#9670;</button>`}<button class="mini" data-pclaimall="1" ${claimable ? '' : 'disabled'}>Hepsini al${claimable ? ' (' + claimable + ')' : ''}</button><button class="mini alt" data-ptier="1" ${got >= max ? 'disabled' : ''}>Kademe atla &middot; ${PR.TIER_COST} &#9670;</button></div></div>
      <div class="ph-ring" style="--p:${pct}"><div><b>${got}</b><small>/ ${max}</small></div></div>
      <div class="ph-xp"><div class="ph-xpt">${got >= max ? 'TÜM KADEMELER TAMAM!' : 'Sonraki kademeye <b>' + (per - into) + ' XP</b>'}</div><div class="pxbar"><i style="width:${pct}%"></i></div><div class="ph-xps">Toplam ${ps.xp} / ${max * per} XP &middot; Maç sonu + görevlerle kazan</div></div>
      <div class="ph-show">${show}</div></div>`;
    const tabs = `<div class="tabs" style="margin:10px 0 8px"><button class="tab ${passTab === 'rewards' ? 'sel' : ''}" data-ptab="rewards">Ödüller</button><button class="tab ${passTab === 'quests' ? 'sel' : ''}" data-ptab="quests">Pas Görevleri</button></div>`;
    let body;
    if (passTab === 'rewards') {
      let cols = '';
      for (let i = 1; i <= max; i++) cols += `<div class="pcol ${i === got + 1 ? 'next' : ''} ${i <= got ? 'reached' : ''}" id="pt${i}">${passCell(i, true, got, ps)}<div class="pnode"><i></i><b>${i}</b></div>${passCell(i, false, got, ps)}</div>`;
      body = `<div class="ptrackwrap"><div class="plabs"><div class="pl prem">PREMIUM<br>&#9733;</div><div class="pl mid">KADEME</div><div class="pl free">ÜCRETSİZ</div></div><div class="ptrack" id="ptrack"><div class="pcols">${cols}</div></div></div>`;
    } else {
      const qrows = (per_, title, sub) => `<div class="pq"><div class="pqh">${title}<small>${sub}</small></div>${PR.questState(per_).map((q) => `<div class="pqr"><div class="grow"><b>${esc(q.def.name)}</b><div class="bar"><i style="width:${q.prog / q.def.goal * 100}%"></i></div><small>${q.prog}/${q.def.goal}</small></div><div class="pqx">+${q.def.xp} XP</div><button class="mini" data-pq="${per_}:${q.def.id}" ${q.done && !q.claimed ? '' : 'disabled'}>${q.claimed ? '✓' : 'Al'}</button></div>`).join('')}</div>`;
      const tom = new Date(); tom.setHours(24, 0, 0, 0); const hl = Math.max(0, Math.round((tom - Date.now()) / 36e5));
      body = `<div class="pqwrap">${qrows('d', 'GÜNLÜK GÖREVLER', 'Yenilenmesine ' + hl + ' sa')}${qrows('w', 'HAFTALIK GÖREVLER', 'Her hafta yenilenir')}</div><div class="phint">Görev XP'si doğrudan sezon pasına eklenir. Öldürme, kafa vuruşu, maç ve galibiyetler otomatik sayılır.</div>`;
    }
    setBody(hero + tabs + body);
    const tr = $('ptrack');
    if (tr) {
      if (passFirst || keep == null) { tr.scrollLeft = Math.max(0, (Math.max(1, got) - 2) * 122); passFirst = false; } else tr.scrollLeft = keep;
    }
  }
  function passGoto(t) { const tr = $('ptrack'); if (tr) tr.scrollTo({ left: Math.max(0, (t - 3) * 122), behavior: 'smooth' }); }

  // ---- eşleştirme ----
  let mmTimers = [];
  function mmClear() { mmTimers.forEach(clearTimeout); mmTimers = []; }
  const later = (fn, ms) => { mmTimers.push(setTimeout(fn, ms)); };
  function startMatchmaking(skipAnim) {
    const d = D(), modeIds = MODES.filter((m) => m[0] !== 'rnd').map((m) => m[0]), mapIds = MAPS.filter((m) => m[0] >= 0).map((m) => m[0]);
    const mode = d.mode === 'rnd' ? rnd(modeIds) : d.mode, map = d.map < 0 ? rnd(mapIds) : d.map, tdm = mode === 'tdm' || mode === 'ctf', myTeam = Math.random() < 0.5 ? 0 : 1;
    const mn = (id) => MODES.find((m) => m[0] === id)[1], mp = (id) => MAPS.find((m) => m[0] === id)[1];
    const names = [d.name || 'Sen'].concat(PR.BOT_NAMES.slice().sort(() => Math.random() - 0.5).slice(0, 7));
    const ov = $('mm'); ov.style.display = 'flex';
    const slots = []; // {n, t}
    const draw = (status, mapTxt, modeTxt, big) => {
      const col = (t) => slots.filter((q) => q.t === t).map((q) => `<div class="mmp ${q.me ? 'me' : ''}">${esc(q.n)}</div>`).join('');
      ov.innerHTML = `<div class="cbox"><h2>EŞLEŞTİRME</h2><div class="mmst">${status}</div>
        ${tdm ? `<div class="mmteams"><div><div class="tb" style="color:#4d9bff">MAVİ TAKIM</div>${col(0)}</div><div class="vs">VS</div><div><div class="tb" style="color:#ff5a4d">KIRMIZI TAKIM</div>${col(1)}</div></div>` : `<div class="mmlist">${slots.map((q) => `<div class="mmp ${q.me ? 'me' : ''}">${esc(q.n)}</div>`).join('')}</div>`}
        <div class="mminfo"><div><span>MOD</span><b>${modeTxt}</b></div><div><span>HARİTA</span><b>${mapTxt}</b></div></div>${big ? `<div class="mmbig">${big}</div>` : ''}
        <div class="row" style="justify-content:center;margin-top:10px"><button class="btn" id="mmCancel" style="width:auto;padding:8px 22px">İPTAL</button> <button class="btn go" id="mmSkip" style="width:auto;padding:8px 22px">HEMEN BAŞLA</button></div></div>`;
      $('mmCancel').onclick = cancel; $('mmSkip').onclick = launch;
    };
    const cancel = () => { mmClear(); ov.style.display = 'none'; ov.innerHTML = ''; };
    const launch = () => {
      mmClear(); ov.style.display = 'none'; ov.innerHTML = '';
      const info = PR.joinInfo(); info.mode = mode; info.theme = map; if (tdm) info.team = myTeam;
      VA.start(info);
    };
    const mcycle = d.map < 0, dcycle = d.mode === 'rnd';
    draw('Sunucu aranıyor<span class="dots"></span>', '?', dcycle ? '?' : mn(mode));
    let n = 0;
    const addNext = () => {
      if (n >= 8) return cycle();
      const t = tdm ? (n === 0 ? myTeam : (slots.filter((q) => q.t === 0).length <= slots.filter((q) => q.t === 1).length ? 0 : 1)) : 0;
      slots.push({ n: names[n], t, me: n === 0 }); n++;
      draw(`Oyuncular bulundu: ${n}/8`, '?', dcycle ? '?' : mn(mode)); later(addNext, 260 + Math.random() * 220);
    };
    const cycle = () => {
      let i = 0; const steps = 14;
      const tick = () => {
        i++;
        const last = i >= steps;
        const m = last ? map : rnd(mapIds), md = last ? mode : rnd(modeIds);
        draw(last ? 'Maç hazır!' : 'Harita ve mod seçiliyor…', mcycle || last ? mp(m) : mp(map), dcycle ? mn(md) : mn(mode));
        if (last) return countdown(); later(tick, 70 + i * 14);
      };
      tick();
    };
    const countdown = () => {
      let c = 3; const step = () => { draw('Maç başlıyor', mp(map), mn(mode), c > 0 ? c : 'GO!'); VA.ui(); if (c <= 0) return later(launch, 350); c--; later(step, 800); }; step();
    };
    later(addNext, 900);
  }

  let roomReq = null;
  function play() {
    if (!D().name.trim()) { D().name = 'Oyuncu' + (100 + Math.floor(Math.random() * 900)); $('name').value = D().name; }
    PR.save();
    const info = PR.joinInfo();
    if (LOCAL && D().online) {
      let a = ($('srvAddr') ? $('srvAddr').value : D().server || 'ws://localhost:3000').trim();
      if (!/^wss?:\/\//.test(a)) a = (location.protocol === 'https:' && !/^localhost|^127\./.test(a) ? 'wss://' : 'ws://') + a;
      D().server = a; PR.save(); info.server = a; VA.hooks.status('Bağlanılıyor: ' + a);
    } else if (LOCAL) { roomReq = null; startMatchmaking(); return; }
    info.room = roomReq || { kind: 'quick', mode: D().mode === 'rnd' ? '' : D().mode }; roomReq = null;
    VA.hooks.status('Oda aranıyor…');
    VA.start(info);
  }
  $('play').addEventListener('click', play);

  VA.hooks.toast = (t) => toast(t, true);
  VA.hooks.status = (t) => { $('status').textContent = t || ''; };
  VA.hooks.menuShown = () => { resetPreview(); buildSel(); render(); };

  seedChat(); buildSel(); buildNav(); render(); resetPreview();
  setInterval(() => { if (!live() && !wantNet() && !document.body.classList.contains('playing') && !document.hidden) botSay(Math.random() < 0.25 && D().club ? 'club' : 'global'); }, 7000);
  window.VLobby = { go, render };
})();
