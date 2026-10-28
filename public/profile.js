// Oyuncu profili, mağaza kataloğu, görevler, kulüp ve ayarlar. Veriler tarayıcıda (localStorage) saklanır.
(function (root) {
  const COLORS = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf1c40f, 0x9b59b6, 0xe67e22, 0x1abc9c, 0xec407a, 0x95a5a6, 0x34495e, 0x8d6e63, 0xc0ca33];
  const COLOR_NAMES = ['Kırmızı', 'Mavi', 'Yeşil', 'Sarı', 'Mor', 'Turuncu', 'Turkuaz', 'Pembe', 'Gri', 'Lacivert', 'Kahve', 'Limon'];
  const SKINS = [
    { name: 'Standart', head: 0xf1c27d, eye: 0x111111, pattern: null },
    { name: 'Asker', head: 0xe0b07a, eye: 0x111111, pattern: 'camo' },
    { name: 'Robot', head: 0x9aa3ad, eye: 0x35e0ff, pattern: 'panel' },
    { name: 'Zombi', head: 0x7fae5a, eye: 0xff3b30, pattern: 'rip' },
    { name: 'Ninja', head: 0x1d1d22, eye: 0xffffff, pattern: 'band' },
    { name: 'Altın', head: 0xffd23f, eye: 0x222222, pattern: 'gold' },
    { name: 'Vampir', head: 0xe8dcd6, eye: 0xd50000, pattern: 'fang' },
    { name: 'Kaplan', head: 0xf29a2e, eye: 0x1a1a1a, pattern: 'stripe' },
    { name: 'Hayalet', head: 0xdfe9f2, eye: 0x222222, pattern: 'ghost' },
    { name: 'Uzaylı', head: 0x7be07b, eye: 0x000000, pattern: 'alien' },
    { name: 'İskelet', head: 0xeeeeea, eye: 0x111111, pattern: 'skull' },
    { name: 'Mumya', head: 0xcdb98a, eye: 0x222222, pattern: 'wrap' },
    { name: 'Lav', head: 0x3a1c14, eye: 0xff8a00, pattern: 'lava' },
    { name: 'Buz', head: 0xa8e4ff, eye: 0x0a3a5a, pattern: 'ice' },
    { name: 'Şövalye', head: 0x9aa3ad, eye: 0x111111, pattern: 'visor' },
    { name: 'Kral', head: 0xf1c27d, eye: 0x111111, pattern: 'royal' },
    { name: 'Gökkuşağı', head: 0xf1c27d, eye: 0x111111, pattern: 'rainbow' },
    { name: 'Galaksi', head: 0x2b1b4d, eye: 0xffffff, pattern: 'galaxy' },
  ];
  const HATS = ['Şapkasız', 'Kep', 'Taç', 'Miğfer', 'Anten', 'Boynuz', 'Kovboy', 'Silindir', 'Halka', 'Korsan', 'Cadı', 'Aşçı', 'Noel', 'Mohawk', 'Baret', 'Şövalye Miğferi', 'Alev', 'Kral Tacı', 'Ördek', 'Kulaklık', 'Siber Vizör', 'Mantar', 'Elmas Taç'];
  const BACKS = ['Yok', 'Sırt Çantası', 'Pelerin', 'Kanatlar', 'Jetpack', 'Kılıç', 'Ok Kılıfı', 'Kalkan', 'Şeytan Kanatları', 'Dalgıç Tüpü', 'Gitar', 'Gökkuşağı Pelerin', 'Roket Çantası', 'Altın Kanatlar'];
  const GSKINS = [
    { name: 'Standart', color: null }, { name: 'Kızıl', color: 0xc0392b }, { name: 'Neon Mavi', color: 0x2aa8ff },
    { name: 'Orman', color: 0x4f7a3a }, { name: 'Altın', color: 0xffd23f }, { name: 'Mor', color: 0x8e44ad },
    { name: 'Pembe', color: 0xec407a }, { name: 'Turkuaz', color: 0x1abc9c }, { name: 'Mat Siyah', color: 0x26262b }, { name: 'Gümüş', color: 0xc5ccd4 },
    { name: 'Lav', color: 0xff6a00 }, { name: 'Zehir', color: 0x8bd400 }, { name: 'Buz', color: 0xbdefff }, { name: 'Kan', color: 0x8b0000 },
    { name: 'Okyanus', color: 0x0a5fb4 }, { name: 'Elmas', color: 0x7df9ff }, { name: 'Galaksi', color: 0x4b2a8a },
  ];
  const WEAPON_NAMES = { 0: 'Levye', 1: 'Glock', 2: 'AK-47', 3: 'MP5', 4: 'Çift Namlu', 5: 'AWP', 6: 'Arbalet', 7: 'RPG', 8: 'Magnum', 9: 'M4A1', 10: 'P90', 11: 'Pompalı', 12: 'Barrett', 13: 'Bomba Atar', 14: 'Minigun', 15: 'Bıçak', 16: 'Balta', 17: 'Katana', 18: 'Lazer Tabanca', 19: 'Desert Eagle', 20: 'SCAR-H', 21: 'Vektör', 22: 'Thompson', 23: 'Dragunov', 24: 'Plazma Tüfeği', 25: 'AA-12', 26: 'Yay', 27: 'Altın AK', 28: 'Karambit', 29: 'Kelebek Bıçağı', 30: 'Pala', 31: 'Plazma Kılıcı' };

  const px = (n) => ({ price: n, cur: 'px' }), gem = (n) => ({ price: n, cur: 'gem' }), pass = (r) => ({ price: 0, cur: 'pass', r });
  const spec = (list, prices) => list.map((o, i) => Object.assign({ id: i }, o, prices[i] || px(0)));
  const CATALOG = {
    color: COLORS.map((c, i) => Object.assign({ id: i, name: COLOR_NAMES[i], hex: c }, i < 6 ? px(0) : px(100 + (i - 6) * 30))),
    skin: spec(SKINS.map((x) => ({ name: x.name })), [px(0), px(400), px(600), px(500), gem(25), gem(60), px(700), px(650), gem(40), px(800), px(750), px(600), pass(3), pass(2), px(900), pass(3), pass(3), pass(3)]),
    hat: spec(HATS.map((n) => ({ name: n })), [px(0), px(150), gem(20), px(250), px(100), px(300), px(350), px(400), gem(15), px(300), px(350), px(200), px(250), px(300), px(200), px(500), pass(3), pass(3), px(400), px(350), pass(2), px(450), pass(3)]),
    back: spec(BACKS.map((n) => ({ name: n })), [px(0), px(200), px(350), gem(30), px(500), px(250), px(300), px(350), pass(2), px(400), px(450), pass(3), pass(2), pass(3)]),
    gskin: GSKINS.map((x, i) => Object.assign({ id: i, name: x.name, hex: x.color }, [px(0), px(300), px(300), px(400), gem(40), px(300), px(300), px(300), px(350), px(350), pass(2), px(400), gem(35), px(400), px(400), pass(3), pass(3)][i])),
    weapon: Object.keys(WEAPON_NAMES).map(Number).map((i) => Object.assign({ id: i, name: WEAPON_NAMES[i] }, { 0: px(0), 1: px(0), 2: px(0), 3: px(0), 4: px(0), 5: px(0), 15: px(150), 8: px(300), 9: px(500), 10: px(450), 11: px(400), 12: gem(25), 6: px(300), 7: gem(20), 13: gem(25), 14: gem(40), 16: px(350), 17: pass(2), 18: gem(30), 19: px(450), 20: px(550), 21: px(500), 22: px(450), 23: gem(30), 24: pass(3), 25: gem(25), 26: px(600), 27: pass(3), 28: gem(35), 29: gem(55), 30: px(500), 31: gem(80) }[i])),
    coll: (root.VColls ? root.VColls.LIST : []).map((c, i) => Object.assign({ id: i, name: c.name, r: c.r, desc: c.desc }, c.price.cur === 'pass' ? pass(c.r) : c.price.cur === 'gem' ? gem(c.price.n) : px(c.price.n))),
  };
  const MELEE_IDS = [0, 15, 16, 17, 28, 29, 30, 31], PISTOL_IDS = [1, 8, 18, 19];
  const DEFAULT_OWNED = { color: [0, 1, 2, 3, 4, 5], skin: [0], hat: [0], back: [0], gskin: [0], coll: [0], weapon: [0, 1, 2, 3, 4, 5] };

  const CLUBS = [
    { name: 'Blok Avcıları', tag: 'BLK', members: 42, level: 6 }, { name: 'Roket Takımı', tag: 'RKT', members: 28, level: 4 },
    { name: 'Gece Kuşları', tag: 'GCE', members: 35, level: 5 }, { name: 'Pixel Ordusu', tag: 'PXL', members: 51, level: 8 }, { name: 'Sessiz Okçular', tag: 'SOK', members: 19, level: 3 },
  ];
  const BOT_NAMES = ['Kaplan', 'Şahin', 'Pixel', 'Blok', 'Zıpzıp', 'Gölge', 'Cesur', 'Tilki', 'Bulut', 'Kuzgun', 'Çakıl', 'Yıldız'];

  const MISSION_DEFS = [
    { id: 'kills', name: '10 öldürme yap', goal: 10, px: 120, gem: 0 },
    { id: 'heads', name: '3 kafa vuruşu yap', goal: 3, px: 80, gem: 4 },
    { id: 'wins', name: 'Bir turu kazan', goal: 1, px: 0, gem: 8 },
  ];

  const day = () => new Date().toISOString().slice(0, 10);
  const fresh = () => ({
    px: 500, gems: 20, xp: 0, kills: 0, deaths: 0, wins: 0,
    owned: JSON.parse(JSON.stringify(DEFAULT_OWNED)),
    equip: { color: 0, skin: 0, hat: 0, back: 0, gskin: 0, coll: 0, melee: 0, pistol: 1, primary: 2 },
    club: null, mis: { day: day(), prog: {}, claimed: {} }, bonusDay: '',
    settings: { sens: 1, fov: 75, vol: 0.7 }, name: '', mode: 'kc', map: -1,
    crates: { bronze: 1, silver: 0, gold: 0 }, pass: { xp: 0, premium: false, claimed: {} }, matches: 0, wup: {},
  });

  let P = fresh();
  const merge = (raw) => Object.assign(fresh(), raw, { owned: Object.assign(fresh().owned, raw.owned), equip: Object.assign(fresh().equip, raw.equip), settings: Object.assign(fresh().settings, raw.settings) });
  let saveHook = null;
  function load() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem('va_prof2') || 'null'); } catch (e) {}
    if (raw) P = merge(raw);
    else {
      // eski sürümden taşı
      try {
        const old = JSON.parse(localStorage.getItem('va_prof') || 'null');
        if (old) { P.xp = old.xp | 0; P.px += old.px | 0; P.kills = old.kills | 0; }
        const c = +localStorage.getItem('va_color'), h = +localStorage.getItem('va_hat');
        if (c >= 0 && c < 6) P.equip.color = c;
        P.name = localStorage.getItem('va_name') || '';
      } catch (e) {}
    }
    if (!P.crates) P.crates = { bronze: 1, silver: 0, gold: 0 };
    normPass();
    if (!P.mis || P.mis.day !== day()) P.mis = { day: day(), prog: {}, claimed: {} };
    return P;
  }
  function save() { P.rev = Date.now(); try { localStorage.setItem('va_prof2', JSON.stringify(P)); } catch (e) {} if (saveHook) { try { saveHook(); } catch (e) {} } }
  // bulut: sunucudaki kayıt daha yeniyse yerel profilin yerine geçer (kanca tetiklenmez)
  function importCloud(raw, rev) {
    if (!raw || typeof raw !== 'object') return false;
    P = merge(raw); P.rev = rev || Date.now();
    if (!P.crates) P.crates = { bronze: 1, silver: 0, gold: 0 };
    normPass(); if (!P.mis || P.mis.day !== day()) P.mis = { day: day(), prog: {}, claimed: {} };
    try { localStorage.setItem('va_prof2', JSON.stringify(P)); } catch (e) {}
    return true;
  }
  const stats = () => ({ xp: P.xp | 0, kills: P.kills | 0, deaths: P.deaths | 0, wins: P.wins | 0, matches: P.matches | 0, level: Math.floor((P.xp | 0) / 200) + 1 });

  const level = () => Math.floor(P.xp / 200) + 1;
  const levelProgress = () => (P.xp % 200) / 200;
  const clubBonus = () => (P.club ? 1.1 : 1);

  function addPx(n) { P.px += Math.round(n * (n > 0 ? clubBonus() : 1)); save(); }
  function addGems(n) { P.gems += n; save(); }
  function addXp(n) {
    const before = level(); P.xp += n;
    const gained = level() - before;
    if (gained > 0) P.gems += gained * 5;
    save(); return gained;
  }
  function owns(type, id) { return P.owned[type].indexOf(id) >= 0; }
  function item(type, id) { return CATALOG[type].find((x) => x.id === id); }
  function buy(type, id) {
    const it = item(type, id);
    if (!it) return { ok: false, msg: 'Eşya bulunamadı' };
    if (owns(type, id)) return { ok: false, msg: 'Zaten sahipsin' };
    if (it.cur === 'pass') return { ok: false, msg: 'Sezon pasından kazanılır' };
    if (it.cur === 'px') { if (P.px < it.price) return { ok: false, msg: 'Yeterli PX yok' }; P.px -= it.price; }
    else { if (P.gems < it.price) return { ok: false, msg: 'Yeterli elmas yok' }; P.gems -= it.price; }
    P.owned[type].push(id); save();
    return { ok: true, msg: it.name + ' alındı' };
  }
  function equip(type, id) {
    if (!owns(type, id)) return false;
    if (type === 'weapon') {
      const slot = MELEE_IDS.indexOf(id) >= 0 ? 'melee' : PISTOL_IDS.indexOf(id) >= 0 ? 'pistol' : 'primary';
      P.equip[slot] = id;
    } else P.equip[type] = id;
    save(); return true;
  }
  function track(id, n) { n = n == null ? 1 : n; P.mis.prog[id] = (P.mis.prog[id] || 0) + n; if (typeof pqAdd === 'function') pqAdd(id, n); save(); }
  function missionState() { return MISSION_DEFS.map((m) => ({ def: m, prog: Math.min(m.goal, P.mis.prog[m.id] || 0), done: (P.mis.prog[m.id] || 0) >= m.goal, claimed: !!P.mis.claimed[m.id] })); }
  function claimMission(id) {
    const s = missionState().find((x) => x.def.id === id);
    if (!s || !s.done || s.claimed) return false;
    P.mis.claimed[id] = true; addPx(s.def.px); P.gems += s.def.gem; addXp(40); save(); return true;
  }
  function claimBonus() {
    if (P.bonusDay === day()) return false;
    P.bonusDay = day(); P.px += 200; P.gems += 3; save(); return true;
  }
  function weaponList(kind) { return CATALOG.weapon.filter((w) => (kind === 'melee' ? MELEE_IDS.indexOf(w.id) >= 0 : kind === 'pistol' ? PISTOL_IDS.indexOf(w.id) >= 0 : MELEE_IDS.concat(PISTOL_IDS).indexOf(w.id) < 0)); }
  // ---------- silah güçlendirme ----------
  const UP_MAX = 5, UP_FX = { dmg: 0.06, mag: 0.08, reload: 0.05, spread: 0.06 };
  const UP_COST = [[150, 300, 500, 800, 1200], [220, 440, 740, 1200, 1800], [320, 640, 1060, 1700, 2600], [450, 900, 1500, 2400, 3600]];
  const upLevel = (id) => { const l = P.wup && P.wup[id] | 0; return Math.max(0, Math.min(UP_MAX, l)); };
  function upCost(id) { const lv = upLevel(id); if (lv >= UP_MAX) return 0; const r = root.VWeapons && root.VWeapons.RARITY ? root.VWeapons.RARITY[id] | 0 : 0; return UP_COST[Math.max(0, Math.min(3, r))][lv]; }
  function upgrade(id) {
    if (!owns('weapon', id)) return { ok: false, msg: 'Bu silaha sahip değilsin' };
    const c = upCost(id); if (!c) return { ok: false, msg: 'Zaten azami seviyede' };
    if (P.px < c) return { ok: false, msg: 'Yeterli PX yok (' + c + ' gerekli)' };
    P.px -= c; if (!P.wup) P.wup = {}; P.wup[id] = upLevel(id) + 1; track('upgrades', 1); save();
    return { ok: true, msg: WEAPON_NAMES[id] + ' seviye ' + upLevel(id) + ' oldu', lv: upLevel(id) };
  }
  function joinInfo() {
    return { up: Object.assign({}, P.wup), name: P.name, color: P.equip.color, skin: P.equip.skin, hat: P.equip.hat, back: P.equip.back, gskin: P.equip.gskin, coll: P.equip.coll | 0, loadout: { melee: P.equip.melee, pistol: P.equip.pistol, primary: P.equip.primary } };
  }

    // ---------- nadirlik, kasalar ----------
  const RAR_NAMES = ['Sıradan', 'Nadir', 'Epik', 'Efsanevi'], RAR_COLORS = ['#9aa3ad', '#4fc3f7', '#c66bff', '#ffc400'];
  function rarityOf(type, it) {
    if (type === 'weapon' && root.VWeapons && root.VWeapons.RARITY) return root.VWeapons.RARITY[it.id] | 0;
    if (type === 'coll') return it.r | 0;
    if (it.cur === 'pass') return it.r | 0;
    if (it.cur === 'gem') return it.price >= 30 ? 3 : 2;
    return it.price >= 400 ? 2 : it.price >= 200 ? 1 : 0;
  }
  const CRATES = {
    bronze: { id: 'bronze', name: 'Bronz Kasa', price: 300, cur: 'px', odds: [62, 30, 7, 1], col: ['#c97b3d', '#8a4f1f', '#e8a566'] },
    silver: { id: 'silver', name: 'Gümüş Kasa', price: 12, cur: 'gem', odds: [25, 45, 25, 5], col: ['#c9d1d9', '#7d8793', '#eef2f6'] },
    gold: { id: 'gold', name: 'Altın Kasa', price: 30, cur: 'gem', odds: [0, 25, 50, 25], col: ['#ffc400', '#b8860b', '#fff1a8'] },
  };
  const CRATE_TYPES = ['color', 'skin', 'hat', 'back', 'gskin', 'weapon', 'coll'];
  function poolOf(r) {
    const out = [];
    for (const t of CRATE_TYPES) for (const it of CATALOG[t]) if (it.price > 0 && rarityOf(t, it) === r) out.push({ type: t, id: it.id });
    return out;
  }
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  function rollRarity(odds) { let n = Math.random() * odds.reduce((a, b) => a + b, 0); for (let i = 0; i < odds.length; i++) { n -= odds[i]; if (n < 0) return i; } return 0; }
  function randomItem(r) { let rr = r == null ? rollRarity([60, 25, 10, 5]) : r; for (let k = rr; k >= 0; k--) { const p = poolOf(k); if (p.length) return pick(p); } return { type: 'color', id: 6 }; }
  function buyCrate(t) {
    const c = CRATES[t]; if (!c) return { ok: false, msg: 'Kasa yok' };
    if (c.cur === 'px') { if (P.px < c.price) return { ok: false, msg: 'Yeterli PX yok' }; P.px -= c.price; } else { if (P.gems < c.price) return { ok: false, msg: 'Yeterli elmas yok' }; P.gems -= c.price; }
    P.crates[t]++; save(); return { ok: true, msg: c.name + ' alındı' };
  }
  // kasayı açar: sonuç animasyondan önce belirlenir
  function openCrate(t) {
    const c = CRATES[t]; if (!c || !(P.crates[t] > 0)) return null;
    P.crates[t]--;
    const r = rollRarity(c.odds), it = randomItem(r), cat = item(it.type, it.id), real = rarityOf(it.type, cat);
    const dup = owns(it.type, it.id), res = { type: it.type, id: it.id, name: cat.name, r: real, dup, px: 0, gem: 0 };
    if (dup) { if (cat.cur === 'gem') { res.gem = Math.ceil(cat.price * 0.3); P.gems += res.gem; } else { res.px = Math.max(30, Math.round(cat.price * 0.35)); P.px += res.px; } }
    else P.owned[it.type].push(it.id);
    save(); return res;
  }

  // ---------- sezon pası ----------
  const PASS_MAX = 50, PASS_XP = 150, TIER_COST = 40, PREMIUM_COST = 100;
  const DAY_MS = 864e5, EPOCH = Date.UTC(2026, 9, 1), SEASON_DAYS = 45;
  const SEASONS = [{ name: 'KRİSTAL ÇAĞI', col: '#5fd8ff', col2: '#7a5cff' }, { name: 'LAV KRALLIĞI', col: '#ff7a3d', col2: '#ff2d55' }, { name: 'GÖLGE ORMANI', col: '#7dff9a', col2: '#00a86b' }, { name: 'GÖKKUŞAĞI ADALARI', col: '#ff6ad5', col2: '#ffd23f' }];
  const seasonIdx = () => Math.max(0, Math.floor((Date.now() - EPOCH) / (SEASON_DAYS * DAY_MS)));
  const weekIdx = () => Math.floor((Date.now() - EPOCH) / (7 * DAY_MS));
  function seasonInfo() {
    const i = seasonIdx(), S = SEASONS[i % SEASONS.length], left = Math.max(0, EPOCH + (i + 1) * SEASON_DAYS * DAY_MS - Date.now());
    return { no: i + 1, name: S.name, col: S.col, col2: S.col2, days: Math.floor(left / DAY_MS), hours: Math.floor((left % DAY_MS) / 36e5) };
  }
  function normPass() {
    if (!P.pass || P.pass.v !== 2 || P.pass.season !== seasonIdx()) P.pass = { v: 2, season: seasonIdx(), xp: 0, premium: false, claimed: {} };
    const dk = day(), wk = weekIdx();
    if (!P.pq) P.pq = { d: dk, w: wk, prog: { d: {}, w: {} }, claimed: { d: {}, w: {} } };
    if (P.pq.d !== dk) { P.pq.d = dk; P.pq.prog.d = {}; P.pq.claimed.d = {}; }
    if (P.pq.w !== wk) { P.pq.w = wk; P.pq.prog.w = {}; P.pq.claimed.w = {}; }
  }
  const R = {
    px: (n) => ({ k: 'px', n }), gem: (n) => ({ k: 'gem', n }), crate: (t, n) => ({ k: 'crate', t, n: n || 1 }),
    item: (type, id) => ({ k: 'item', type, id }), multi: (...l) => ({ k: 'multi', list: l }),
  };
  const PREM_T = {
    1: R.item('gskin', 7), 2: R.crate('bronze', 2), 3: R.item('hat', 9), 4: R.gem(5), 5: R.item('skin', 7), 6: R.px(400), 7: R.item('back', 6), 8: R.crate('silver'), 9: R.item('weapon', 19), 10: R.item('skin', 12),
    11: R.item('gskin', 11), 12: R.gem(8), 13: R.item('hat', 10), 14: R.px(600), 15: R.item('weapon', 20), 16: R.crate('silver'), 17: R.item('back', 7), 18: R.gem(10), 19: R.item('hat', 13), 20: R.multi(R.item('weapon', 17), R.px(500)),
    21: R.item('skin', 6), 22: R.crate('silver', 2), 23: R.item('gskin', 14), 24: R.px(800), 25: R.item('hat', 16), 26: R.item('back', 10), 27: R.gem(12), 28: R.item('weapon', 21), 29: R.crate('gold'), 30: R.multi(R.item('skin', 13), R.item('back', 11), R.item('coll', 11)),
    31: R.item('hat', 12), 32: R.px(1000), 33: R.item('back', 9), 34: R.item('gskin', 10), 35: R.item('weapon', 23), 36: R.crate('gold'), 37: R.item('skin', 9), 38: R.gem(15), 39: R.item('hat', 20), 40: R.multi(R.item('back', 8), R.item('hat', 22)),
    41: R.item('weapon', 22), 42: R.crate('gold'), 43: R.item('gskin', 15), 44: R.gem(20), 45: R.multi(R.item('skin', 15), R.item('gskin', 16)), 46: R.item('hat', 17), 47: R.item('back', 12), 48: R.item('weapon', 24), 49: R.crate('gold', 2),
    50: R.multi(R.item('weapon', 27), R.item('skin', 17), R.item('back', 13), R.item('skin', 16), R.item('coll', 12)),
  };
  const FREE_ITEMS = { 5: ['hat', 11], 15: ['gskin', 6], 25: ['skin', 11], 35: ['hat', 14], 45: ['weapon', 16] };
  function passReward(i, premium) {
    if (premium) return PREM_T[i];
    if (FREE_ITEMS[i]) return R.item(FREE_ITEMS[i][0], FREE_ITEMS[i][1]);
    if (i === 50) return R.crate('gold');
    if (i % 10 === 0) return R.crate('silver');
    if (i % 5 === 0) return R.gem(10);
    if (i % 3 === 0) return R.crate('bronze');
    return i % 2 === 0 ? R.gem(3) : R.px(100 + i * 8);
  }
  function rewardRarity(r) {
    if (r.k === 'item') return rarityOf(r.type, item(r.type, r.id)); if (r.k === 'multi') return Math.max.apply(null, r.list.map(rewardRarity));
    if (r.k === 'crate') return { bronze: 0, silver: 1, gold: 3 }[r.t]; return r.k === 'gem' ? 1 : 0;
  }
  function describe(r) {
    if (r.k === 'px') return r.n + ' PX'; if (r.k === 'gem') return r.n + ' elmas';
    if (r.k === 'crate') return (r.n > 1 ? r.n + ' ' : '') + CRATES[r.t].name;
    if (r.k === 'multi') return r.list.map(describe).join(' + ');
    const it = item(r.type, r.id); return it ? it.name : '?';
  }
  function giveReward(r) {
    if (r.k === 'multi') { r.list.forEach(giveReward); return; }
    if (r.k === 'px') P.px += r.n; else if (r.k === 'gem') P.gems += r.n; else if (r.k === 'crate') P.crates[r.t] += r.n;
    else if (owns(r.type, r.id)) P.px += 200; else P.owned[r.type].push(r.id);
    save();
  }
  const passReached = () => Math.min(PASS_MAX, Math.floor(P.pass.xp / PASS_XP));
  function addPassXp(n) { normPass(); const b = passReached(); P.pass.xp = Math.min(PASS_MAX * PASS_XP, P.pass.xp + n); save(); return passReached() - b; }
  function claimPass(i, premium) {
    normPass(); const key = (premium ? 'p' : 'f') + i;
    if (i > passReached() || P.pass.claimed[key] || (premium && !P.pass.premium)) return false;
    P.pass.claimed[key] = 1; giveReward(passReward(i, premium)); return true;
  }
  function buyPremium() { normPass(); if (P.pass.premium) return { ok: false, msg: 'Zaten premium' }; if (P.gems < PREMIUM_COST) return { ok: false, msg: 'Yeterli elmas yok (' + PREMIUM_COST + ')' }; P.gems -= PREMIUM_COST; P.pass.premium = true; save(); return { ok: true, msg: 'Premium pas açıldı!' }; }
  function buyTier() {
    normPass(); if (passReached() >= PASS_MAX) return { ok: false, msg: 'Son kademedesin' };
    if (P.gems < TIER_COST) return { ok: false, msg: 'Yeterli elmas yok (' + TIER_COST + ')' };
    P.gems -= TIER_COST; P.pass.xp = (passReached() + 1) * PASS_XP; save(); return { ok: true, msg: 'Kademe atlandı!' };
  }
  const QUESTS = {
    d: [{ id: 'kills', name: '10 öldürme yap', goal: 10, xp: 80 }, { id: 'heads', name: '3 kafa vuruşu yap', goal: 3, xp: 60 }, { id: 'wins', name: '1 maç kazan', goal: 1, xp: 100 }, { id: 'matches', name: '3 maç oyna', goal: 3, xp: 90 }],
    w: [{ id: 'kills', name: '100 öldürme yap', goal: 100, xp: 500 }, { id: 'matches', name: '10 maç oyna', goal: 10, xp: 450 }, { id: 'wins', name: '5 maç kazan', goal: 5, xp: 600 }, { id: 'heads', name: '25 kafa vuruşu yap', goal: 25, xp: 400 }],
  };
  function pqAdd(id, n) { normPass(); for (const per of ['d', 'w']) P.pq.prog[per][id] = (P.pq.prog[per][id] || 0) + n; }
  function questState(per) { normPass(); return QUESTS[per].map((q) => { const v = P.pq.prog[per][q.id] || 0; return { def: q, prog: Math.min(q.goal, v), done: v >= q.goal, claimed: !!P.pq.claimed[per][q.id] }; }); }
  function claimQuest(per, id) { const q = questState(per).find((x) => x.def.id === id); if (!q || !q.done || q.claimed) return -1; P.pq.claimed[per][id] = 1; return addPassXp(q.def.xp); }

  // ---------- maç sonu ödülleri ----------
  function matchEnd(st) {
    const lines = [{ t: 'Katılım', px: 30, xp: 20, gem: 0 }];
    if (st.won) lines.push({ t: 'Galibiyet', px: 100, xp: 60, gem: 3 });
    if (st.place >= 1 && st.place <= 3) lines.push({ t: st.place + '. sıra', px: [60, 40, 20][st.place - 1], xp: 0, gem: 0 });
    if (st.heads > 0) lines.push({ t: 'Kafa vuruşu x' + st.heads, px: st.heads * 5, xp: 0, gem: 0 });
    let px = 0, xp = 0, gem = 0; for (const l of lines) { px += l.px; xp += l.xp; gem += l.gem; }
    P.matches++; pqAdd('matches', 1); if (st.won) { P.wins++; track('wins', 1); }
    addPx(px); P.gems += gem; const lv = addXp(xp);
    const passXp = (st.won ? 150 : 80) + st.kills * 5, passUp = addPassXp(passXp);
    let crate = null;
    if (Math.random() < (st.won ? 0.6 : 0.25) + (st.place === 1 ? 0.2 : 0)) { const r = Math.random() * 100; crate = r < 80 ? 'bronze' : r < 98 ? 'silver' : 'gold'; P.crates[crate]++; }
    save();
    return { lines, px: Math.round(px * clubBonus()), gem, xp, lv, passXp, passUp, crate };
  }

  load();
  const api = { seasonInfo, normPass, rewardRarity, QUESTS, questState, claimQuest, buyTier, TIER_COST, PREMIUM_COST, RAR_NAMES, RAR_COLORS, rarityOf, CRATES, buyCrate, openCrate, randomItem, PASS_MAX, PASS_XP, passReward, describe, passReached, claimPass, buyPremium, matchEnd, addPassXp, COLORS, COLOR_NAMES, SKINS, HATS, BACKS, GSKINS, WEAPON_NAMES, CATALOG, CLUBS, BOT_NAMES, MISSION_DEFS, get data() { return P; }, save, load, level, levelProgress, addPx, addGems, addXp, owns, item, buy, equip, track, missionState, claimMission, claimBonus, weaponList, joinInfo, UP_MAX, UP_FX, upLevel, upCost, upgrade, clubBonus, importCloud, stats, setHook(f) { saveHook = f; }, reset() { P = fresh(); save(); } };
  root.VProfile = api;
})(typeof self !== 'undefined' ? self : this);
