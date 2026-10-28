// Ortak modül: sunucu (Node) ve istemci (tarayıcı) aynı kodu kullanır.
// İçerik: silah tablosu, harita temaları, deterministik harita üretimi, ışın izleme, erişilebilirlik (BFS).
(function (root) {
  const SIZE = 56; // x ve z boyutu
  const H = 18; // yükseklik

  // ---------- Silahlar (Half-Life ve Poxel.io'dan esinli, özgün adlarla) ----------
  // type: melee | hit | proj ; alt: ikincil atış, ana değerlerin üstüne yazılır
  const WEAPONS = [
    { id: 'crowbar', name: 'Levye', slot: 1, type: 'melee', dmg: 38, rate: 430, range: 2.7, auto: false, ammo: null, mag: 0, reserve: 0, spread: 0 },
    { id: 'pistol', name: '9mm Tabanca', slot: 2, type: 'hit', dmg: 15, rate: 270, mag: 17, reserve: 85, reload: 1300, spread: 0.010, auto: false, ammo: '9mm', alt: { rate: 105, spread: 0.055, auto: true } },
    { id: 'magnum', name: '.357 Magnum', slot: 2, type: 'hit', dmg: 54, rate: 760, mag: 6, reserve: 30, reload: 2100, spread: 0.003, auto: false, ammo: '357', alt: { zoom: 38 } },
    { id: 'smg', name: 'SMG + Bomba', slot: 3, type: 'hit', dmg: 11, rate: 72, mag: 40, reserve: 160, reload: 1700, spread: 0.028, auto: true, ammo: '9mm', alt: { type: 'proj', proj: 'glaunch', dmg: 80, rate: 950, spread: 0, auto: false, ammo: 'gl', cost: 1, mag: 0 } },
    { id: 'ak', name: 'AK-47', slot: 3, type: 'hit', dmg: 21, rate: 105, mag: 30, reserve: 120, reload: 1600, spread: 0.014, auto: true, ammo: '762' },
    { id: 'shotgun', name: 'Çift Namlu', slot: 4, type: 'hit', dmg: 9, pellets: 8, rate: 820, mag: 8, reserve: 32, reload: 2300, spread: 0.060, auto: false, ammo: 'shell', alt: { pellets: 16, rate: 1250, cost: 2 } },
    { id: 'crossbow', name: 'Arbalet', slot: 5, type: 'hit', dmg: 75, rate: 1050, mag: 5, reserve: 25, reload: 2300, spread: 0, auto: false, ammo: 'bolt', zoom: 0, tracer: 'bolt', alt: { zoom: 24 } },
    { id: 'sniper', name: 'Keskin Nişancı', slot: 5, type: 'hit', dmg: 95, rate: 1350, mag: 5, reserve: 20, reload: 2500, spread: 0, auto: false, ammo: 'sniper', alt: { zoom: 20 } },
    { id: 'rpg', name: 'Roketatar', slot: 6, type: 'proj', proj: 'rocket', dmg: 100, rate: 1400, mag: 1, reserve: 6, reload: 1900, spread: 0, auto: false, ammo: 'rocket' },
    { id: 'plasma', name: 'Plazma Topu', slot: 6, type: 'hit', dmg: 17, rate: 85, mag: 0, reserve: 120, spread: 0.008, auto: true, ammo: 'cell', tracer: 'plasma', alt: { dmg: 90, cost: 25, rate: 1100, auto: false, spread: 0, kick: 11 } },
    { id: 'grenade', name: 'El Bombası', slot: 7, type: 'proj', proj: 'gren', dmg: 100, rate: 900, mag: 0, reserve: 8, spread: 0, auto: false, ammo: 'gren' },
  ];
  const WIDX = {}; WEAPONS.forEach((w, i) => { WIDX[w.id] = i; });

  const PROJ = {
    rocket: { speed: 27, grav: 0, bounce: 0, fuse: 0, radius: 4.2, self: 0.6, kb: 13 },
    gren: { speed: 15, grav: 22, bounce: 0.45, fuse: 2.4, radius: 4.6, self: 0.7, kb: 10 },
    glaunch: { speed: 24, grav: 14, bounce: 0.35, fuse: 1.9, radius: 3.6, self: 0.7, kb: 9, contact: true },
  };

  function fireMode(wi, alt) {
    const w = WEAPONS[wi];
    return alt && w.alt ? Object.assign({}, w, w.alt) : w;
  }

  // ---------- Temalar ----------
  // blok kimlikleri: 1 zemin, 2 dış duvar, 3 yapı A, 4 yapı B (tahta/kasa), 5 zemin yaması, 6 vurgu, 7 sütun/çatı,
  // 8 kütük, 9 yaprak, 10 kaktüs, 11 çam
  const COMMON_BLOCKS = { 8: { t: 17, s: 18, b: 17 }, 9: { t: 16, s: 16, b: 16 }, 10: { t: 19, s: 19, b: 19 }, 11: { t: 20, s: 20, b: 20 } };
  const b3 = (t, s, b) => ({ t, s, b: b === undefined ? s : b });
  const THEMES = [
    { name: 'Çimen Vadisi', sky: ['#4c9bf0', '#cfe8ff'], fog: '#cfe8ff', near: 34, far: 100, sun: '#fff3c4', tint: [1, 1, 1], decor: 'tree', clouds: true,
      blocks: Object.assign({ 1: b3(0, 1, 2), 2: b3(3, 3), 3: b3(4, 4), 4: b3(5, 5), 5: b3(2, 2), 6: b3(10, 10), 7: b3(3, 3) }, COMMON_BLOCKS) },
    { name: 'Çöl Kalesi', sky: ['#3d86d8', '#f6dcaa'], fog: '#f1d9ad', near: 30, far: 95, sun: '#fff0b8', tint: [1.05, 1, 0.93], decor: 'cactus', clouds: true,
      blocks: Object.assign({ 1: b3(6, 6), 2: b3(14, 14), 3: b3(14, 14), 4: b3(5, 5), 5: b3(14, 14), 6: b3(10, 10), 7: b3(4, 4) }, COMMON_BLOCKS) },
    { name: 'Kar Üssü', sky: ['#7e9fc4', '#e8eff8'], fog: '#e1eaf4', near: 26, far: 85, sun: '#e8f1ff', tint: [0.96, 1, 1.06], decor: 'pine', clouds: true,
      blocks: Object.assign({ 1: b3(7, 8, 2), 2: b3(11, 11), 3: b3(9, 9), 4: b3(10, 10), 5: b3(13, 13), 6: b3(12, 12), 7: b3(11, 11) }, COMMON_BLOCKS) },
    { name: 'Siyah Tesis', sky: ['#171a24', '#4a3a2c'], fog: '#2f2a28', near: 18, far: 72, sun: '#ffb266', tint: [1.08, 0.96, 0.85], decor: 'pylon', clouds: false,
      blocks: Object.assign({ 1: b3(11, 11), 2: b3(9, 9), 3: b3(11, 11), 4: b3(10, 10), 5: b3(15, 15), 6: b3(12, 12), 7: b3(9, 9) }, COMMON_BLOCKS) },
  ];

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- Harita üretimi (seed'e göre deterministik) ----------
  function generate(seed) {
    seed = seed >>> 0;
    const T = THEMES[seed % THEMES.length];
    const rnd = mulberry32(seed >>> 2);
    const g = new Uint8Array(SIZE * H * SIZE);
    const idx = (x, y, z) => (y * SIZE + z) * SIZE + x;
    const inb = (x, y, z) => x >= 0 && x < SIZE && z >= 0 && z < SIZE && y >= 0 && y < H;
    const set = (x, y, z, id) => { if (inb(x, y, z)) g[idx(x, y, z)] = id; };
    function get(x, y, z) {
      x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
      if (y < 0) return 1;
      if (x < 0 || x >= SIZE || z < 0 || z >= SIZE) return 2;
      if (y >= H) return 0;
      return g[idx(x, y, z)];
    }
    const fill = (x0, y0, z0, w, h, d, id) => { for (let x = x0; x < x0 + w; x++) for (let y = y0; y < y0 + h; y++) for (let z = z0; z < z0 + d; z++) set(x, y, z, id); };

    // zemin
    for (let x = 0; x < SIZE; x++) for (let z = 0; z < SIZE; z++) set(x, 0, z, rnd() < 0.12 ? 5 : 1);

    // dış duvar + mazgal
    for (let i = 0; i < SIZE; i++) {
      for (let y = 1; y <= 6; y++) { set(i, y, 0, 2); set(i, y, SIZE - 1, 2); set(0, y, i, 2); set(SIZE - 1, y, i, 2); }
      if (i % 2 === 0) { set(i, 7, 0, 2); set(i, 7, SIZE - 1, 2); set(0, 7, i, 2); set(SIZE - 1, 7, i, 2); }
    }

    const rects = []; // dolu alanlar [x0,z0,x1,z1]
    const overlaps = (x0, z0, x1, z1, m) => rects.some((r) => x0 - m < r[2] && x1 + m > r[0] && z0 - m < r[3] && z1 + m > r[1]);
    const reserve = (x0, z0, w, d) => rects.push([x0, z0, x0 + w, z0 + d]);

    // içi boş yapı: duvarlar, kapılar, pencereler, çatı; (stairSide: 0 +z,1 -z,2 +x,3 -x)
    function building(x0, z0, w, d, h, wallId, roofId, stairSide) {
      fill(x0, 1, z0, w, h, d, wallId);
      fill(x0 + 1, 1, z0 + 1, w - 2, h, d - 2, 0);
      fill(x0, h + 1, z0, w, 1, d, roofId);
      fill(x0 + 1, 0, z0 + 1, w - 2, 1, d - 2, 6); // iç zemin vurgusu
      const cx = x0 + (w >> 1), cz = z0 + (d >> 1);
      for (let y = 1; y <= 3; y++) {
        for (let k = 0; k < 2; k++) {
          set(cx + k - 0, y, z0, 0); set(cx + k, y, z0 + d - 1, 0);
          set(x0, y, cz + k, 0); set(x0 + w - 1, y, cz + k, 0);
        }
      }
      for (let i = 1; i < w - 1; i += 3) { if (Math.abs(i - (cx - x0)) > 2) { set(x0 + i, 3, z0, 0); set(x0 + i, 3, z0 + d - 1, 0); } }
      for (let i = 1; i < d - 1; i += 3) { if (Math.abs(i - (cz - z0)) > 2) { set(x0, 3, z0 + i, 0); set(x0 + w - 1, 3, z0 + i, 0); } }
      // çatı korkuluğu
      for (let x = x0; x < x0 + w; x++) for (let z = z0; z < z0 + d; z++) {
        if (x === x0 || x === x0 + w - 1 || z === z0 || z === z0 + d - 1) set(x, h + 2, z, wallId);
      }
      // merdiven
      const steps = h + 1;
      for (let s = 1; s <= steps; s++) {
        const o = steps - s + 1; // çatıdan uzaklaştıkça alçalır
        for (let k = -1; k <= 1; k++) {
          let sx, sz;
          if (stairSide === 0) { sx = cx + k; sz = z0 + d - 1 + o; }
          else if (stairSide === 1) { sx = cx + k; sz = z0 - o; }
          else if (stairSide === 2) { sx = x0 + w - 1 + o; sz = cz + k; }
          else { sx = x0 - o; sz = cz + k; }
          for (let y = 1; y <= s; y++) set(sx, y, sz, roofId);
          // çatı korkuluğunda giriş boşluğu
          if (s === steps) {
            if (stairSide === 0) set(cx + k, h + 2, z0 + d - 1, 0);
            else if (stairSide === 1) set(cx + k, h + 2, z0, 0);
            else if (stairSide === 2) set(x0 + w - 1, h + 2, cz + k, 0);
            else set(x0, h + 2, cz + k, 0);
          }
        }
      }
      const ex = stairSide >= 2 ? steps + 1 : 0, ez = stairSide < 2 ? steps + 1 : 0;
      const rx0 = stairSide === 3 ? x0 - ex : x0, rz0 = stairSide === 1 ? z0 - ez : z0;
      reserve(rx0, rz0, w + ex, d + ez);
    }

    const c = SIZE >> 1;
    // merkez kule (ana işaret noktası)
    building(c - 4, c - 4, 9, 9, 6, 3, 7, 0);
    fill(c, 8, c, 1, 3, 1, 6); // çatıdaki işaret direği
    // diğer yapılar
    for (let n = 0, tries = 0; n < 5 && tries < 200; tries++) {
      const w = 7 + Math.floor(rnd() * 3), d = 7 + Math.floor(rnd() * 3), h = 3 + Math.floor(rnd() * 2);
      const x0 = 8 + Math.floor(rnd() * (SIZE - 16 - w)), z0 = 8 + Math.floor(rnd() * (SIZE - 16 - d));
      const side = Math.floor(rnd() * 4);
      const ex = side >= 2 ? h + 2 : 0, ez = side < 2 ? h + 2 : 0;
      const rx0 = side === 3 ? x0 - ex : x0, rz0 = side === 1 ? z0 - ez : z0;
      if (overlaps(rx0, rz0, x0 + w + ex, z0 + d + ez, 3)) continue;
      const wallId = rnd() < 0.55 ? 3 : 4;
      building(x0, z0, w, d, h, wallId, wallId === 3 ? 7 : 4, side);
      n++;
    }
    // kasa yığınları (basamaklı) ve alçak siperler
    for (let n = 0, tries = 0; n < 14 && tries < 200; tries++) {
      const w = 2 + Math.floor(rnd() * 3), d = 2 + Math.floor(rnd() * 3), h = 1 + Math.floor(rnd() * 2);
      const x0 = 5 + Math.floor(rnd() * (SIZE - 10 - w)), z0 = 5 + Math.floor(rnd() * (SIZE - 10 - d));
      if (overlaps(x0, z0, x0 + w, z0 + d, 2)) continue;
      const id = rnd() < 0.6 ? 4 : 6;
      fill(x0, 1, z0, w, h, d, id);
      if (h === 2) fill(x0 - 1, 1, z0, 1, 1, d, id); // basamak
      reserve(x0 - 1, z0, w + 1, d); n++;
    }
    for (let n = 0, tries = 0; n < 7 && tries < 200; tries++) {
      const alongX = rnd() < 0.5, len = 5 + Math.floor(rnd() * 4);
      const x0 = 5 + Math.floor(rnd() * (SIZE - 10 - len)), z0 = 5 + Math.floor(rnd() * (SIZE - 10 - len));
      const w = alongX ? len : 1, d = alongX ? 1 : len;
      if (overlaps(x0, z0, x0 + w, z0 + d, 2)) continue;
      fill(x0, 1, z0, w, 2, d, 3);
      for (let k = 2; k < len - 2; k += 4) { if (alongX) set(x0 + k, 1, z0, 0); else set(x0, 1, z0 + k, 0); }
      reserve(x0, z0, w, d); n++;
    }
    // tema süsleri
    const nDecor = T.decor === 'pylon' ? 14 : 22;
    for (let n = 0, tries = 0; n < nDecor && tries < 400; tries++) {
      const x0 = 4 + Math.floor(rnd() * (SIZE - 8)), z0 = 4 + Math.floor(rnd() * (SIZE - 8));
      if (overlaps(x0, z0, x0 + 1, z0 + 1, 2)) continue;
      reserve(x0, z0, 1, 1); n++;
      if (T.decor === 'tree') {
        const th = 3 + Math.floor(rnd() * 2);
        fill(x0, 1, z0, 1, th, 1, 8);
        for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let dy = 0; dy < 3; dy++) {
          if (Math.abs(dx) + Math.abs(dz) + dy * 1.2 <= 3.2 && !(dx === 0 && dz === 0 && dy < 1)) { if (!get(x0 + dx, th - 1 + dy, z0 + dz)) set(x0 + dx, th - 1 + dy, z0 + dz, 9); }
        }
      } else if (T.decor === 'cactus') {
        const th = 2 + Math.floor(rnd() * 3);
        fill(x0, 1, z0, 1, th, 1, 10);
        if (th >= 3) { set(x0 + 1, 2, z0, 10); set(x0 + 1, 3, z0, 10); }
      } else if (T.decor === 'pine') {
        const th = 2 + Math.floor(rnd() * 2);
        fill(x0, 1, z0, 1, th, 1, 8);
        for (let k = 0; k < 4; k++) { const r = 2 - (k >> 1); for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) { if (Math.abs(dx) + Math.abs(dz) <= r + 1 && !get(x0 + dx, th + k, z0 + dz)) set(x0 + dx, th + k, z0 + dz, 11); } }
      } else {
        fill(x0, 1, z0, 1, 4, 1, 7); fill(x0, 5, z0, 1, 1, 1, 6);
        set(x0 + 1, 1, z0, 6); set(x0 - 1, 1, z0, 6);
      }
    }

    // ---------- erişilebilirlik (BFS) ----------
    const stand = (x, y, z) => y >= 1 && y < H - 2 && get(x, y - 1, z) !== 0 && !get(x, y, z) && !get(x, y + 1, z);
    const key = (x, y, z) => (y * SIZE + z) * SIZE + x;
    const seen = new Set();
    const queue = [];
    const startX = 3, startZ = 3;
    if (stand(startX, 1, startZ)) { seen.add(key(startX, 1, startZ)); queue.push([startX, 1, startZ]); }
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let qi = 0; qi < queue.length; qi++) {
      const [x, y, z] = queue[qi];
      for (const [dx, dz] of dirs) {
        const x2 = x + dx, z2 = z + dz;
        if (x2 < 1 || x2 >= SIZE - 1 || z2 < 1 || z2 >= SIZE - 1) continue;
        for (let dy = 1; dy >= -3; dy--) {
          const y2 = y + dy;
          if (!stand(x2, y2, z2)) continue;
          if (dy === 1 && get(x, y + 2, z)) continue;
          if (dy <= 0 && (get(x2, y, z2) || get(x2, y + 1, z2))) continue;
          const k = key(x2, y2, z2);
          if (!seen.has(k)) { seen.add(k); queue.push([x2, y2, z2]); }
        }
      }
    }
    const reach = queue; // [x,y,z] hücre listesi
    const open = (x, y, z) => { for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (get(x + dx, y, z + dz) || get(x + dx, y + 1, z + dz)) return false; return true; };
    const spawns = reach.filter((p) => p[1] === 1 && open(p[0], 1, p[2])).map((p) => [p[0] + 0.5, 1, p[2] + 0.5]);
    const high = reach.filter((p) => p[1] >= 4 && get(p[0], p[1] - 1, p[2]) && open(p[0], p[1], p[2]));

    // ---------- eşya yerleri ----------
    const ir = mulberry32((seed >>> 2) ^ 0x9e3779b9);
    const items = [];
    const farEnough = (p) => items.every((it) => Math.hypot(it.p[0] - p[0], it.p[2] - p[2]) + Math.abs(it.p[1] - p[1]) * 2 > 7);
    function placeAt(list, kind, w) {
      for (let t = 0; t < 120; t++) {
        const c0 = list[Math.floor(ir() * list.length)];
        if (!c0) return false;
        const p = [c0[0] + 0.5, c0[1], c0[2] + 0.5];
        if (!farEnough(p)) continue;
        items.push({ k: kind, w: w === undefined ? -1 : w, p });
        return true;
      }
      return false;
    }
    const inner = reach.filter((p) => open(p[0], p[1], p[2]));
    const list = inner.length ? inner : reach;
    ['rpg', 'plasma', 'sniper'].forEach((id) => placeAt(high.length ? high : list, 'weapon', WIDX[id]));
    ['magnum', 'smg', 'ak', 'shotgun', 'crossbow', 'grenade', 'grenade'].forEach((id) => placeAt(list, 'weapon', WIDX[id]));
    for (let i = 0; i < 5; i++) placeAt(list, 'health');
    for (let i = 0; i < 4; i++) placeAt(list, 'armor');
    for (let i = 0; i < 4; i++) placeAt(list, 'ammo');
    items.forEach((it, i) => { it.id = i; });

    // ---------- ışın izleme (DDA) ----------
    function raycast(o, d, maxDist) {
      let x = Math.floor(o[0]), y = Math.floor(o[1]), z = Math.floor(o[2]);
      const sx = Math.sign(d[0]), sy = Math.sign(d[1]), sz = Math.sign(d[2]);
      const tdx = d[0] !== 0 ? Math.abs(1 / d[0]) : Infinity;
      const tdy = d[1] !== 0 ? Math.abs(1 / d[1]) : Infinity;
      const tdz = d[2] !== 0 ? Math.abs(1 / d[2]) : Infinity;
      let tx = d[0] !== 0 ? ((sx > 0 ? x + 1 - o[0] : o[0] - x) * tdx) : Infinity;
      let ty = d[1] !== 0 ? ((sy > 0 ? y + 1 - o[1] : o[1] - y) * tdy) : Infinity;
      let tz = d[2] !== 0 ? ((sz > 0 ? z + 1 - o[2] : o[2] - z) * tdz) : Infinity;
      let t = 0;
      for (let i = 0; i < 500 && t <= maxDist; i++) {
        if (get(x, y, z)) return t;
        if (tx < ty && tx < tz) { x += sx; t = tx; tx += tdx; }
        else if (ty < tz) { y += sy; t = ty; ty += tdy; }
        else { z += sz; t = tz; tz += tdz; }
      }
      return Infinity;
    }

    return { SIZE, H, seed, theme: T, themeIndex: seed % THEMES.length, get, raycast, spawns, reach, items, grid: g };
  }

  const api = { SIZE, H, WEAPONS, WIDX, PROJ, THEMES, fireMode, generate, mulberry32 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.VCommon = api;
})(typeof self !== 'undefined' ? self : this);
