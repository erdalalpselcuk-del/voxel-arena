// Ortak modül: sunucu (Node) ve istemci (tarayıcı) aynı haritayı ve silah tablosunu kullanır.
(function (root) {
  const SIZE = 48; // x ve z boyutu
  const H = 18; // yükseklik

  // kind: bullet | melee | rocket ; slot tuşu = dizi sırası + 1
  const WEAPONS = [
    { id: 'crowbar', name: 'Levye', kind: 'melee', dmg: 48, rate: 430, mag: 0, reload: 0, spread: 0, pellets: 1, auto: false, zoom: 0, range: 2.6 },
    { id: 'glock', name: 'Glock', kind: 'bullet', dmg: 22, rate: 240, mag: 15, reload: 1100, spread: 0.016, pellets: 1, auto: false, zoom: 0 },
    { id: 'ak47', name: 'AK-47', kind: 'bullet', dmg: 20, rate: 105, mag: 30, reload: 1600, spread: 0.013, pellets: 1, auto: true, zoom: 0 },
    { id: 'mp5', name: 'MP5', kind: 'bullet', dmg: 11, rate: 62, mag: 40, reload: 1400, spread: 0.028, pellets: 1, auto: true, zoom: 0 },
    { id: 'shotgun', name: 'Çift Namlu', kind: 'bullet', dmg: 10, rate: 780, mag: 2, reload: 1900, spread: 0.075, pellets: 10, auto: false, zoom: 0 },
    { id: 'awp', name: 'AWP', kind: 'bullet', dmg: 105, rate: 1450, mag: 5, reload: 2400, spread: 0, pellets: 1, auto: false, zoom: 20 },
    { id: 'crossbow', name: 'Arbalet', kind: 'bullet', dmg: 72, rate: 1150, mag: 1, reload: 1400, spread: 0.002, pellets: 1, auto: false, zoom: 55 },
    { id: 'rpg', name: 'RPG', kind: 'rocket', dmg: 115, rate: 1350, mag: 1, reload: 1900, spread: 0.004, pellets: 1, auto: false, zoom: 0 },
    { id: 'magnum', name: 'Magnum', kind: 'bullet', dmg: 56, rate: 520, mag: 6, reload: 1900, spread: 0.005, pellets: 1, auto: false, zoom: 0 },
    { id: 'm4a1', name: 'M4A1', kind: 'bullet', dmg: 22, rate: 88, mag: 30, reload: 1500, spread: 0.011, pellets: 1, auto: true, zoom: 0 },
    { id: 'p90', name: 'P90', kind: 'bullet', dmg: 12, rate: 52, mag: 50, reload: 1750, spread: 0.032, pellets: 1, auto: true, zoom: 0 },
    { id: 'pump', name: 'Pompalı', kind: 'bullet', dmg: 11, rate: 900, mag: 6, reload: 2300, spread: 0.06, pellets: 8, auto: false, zoom: 0 },
    { id: 'barrett', name: 'Barrett', kind: 'bullet', dmg: 150, rate: 1900, mag: 4, reload: 2900, spread: 0, pellets: 1, auto: false, zoom: 14 },
    { id: 'launcher', name: 'Bomba Atar', kind: 'launcher', dmg: 95, rate: 1000, mag: 4, reload: 2600, spread: 0.01, pellets: 1, auto: false, zoom: 0 },
    { id: 'minigun', name: 'Minigun', kind: 'bullet', dmg: 9, rate: 36, mag: 120, reload: 3300, spread: 0.05, pellets: 1, auto: true, zoom: 0, spin: true },
    { id: 'knife', name: 'Bıçak', kind: 'melee', dmg: 36, rate: 300, mag: 0, reload: 0, spread: 0, pellets: 1, auto: false, zoom: 0, range: 2.3 },
    { id: 'axe', name: 'Balta', kind: 'melee', dmg: 62, rate: 620, mag: 0, reload: 0, spread: 0, pellets: 1, auto: false, zoom: 0, range: 2.7 },
    { id: 'katana', name: 'Katana', kind: 'melee', dmg: 44, rate: 260, mag: 0, reload: 0, spread: 0, pellets: 1, auto: false, zoom: 0, range: 2.9 },
    { id: 'laserpistol', name: 'Lazer Tabanca', kind: 'bullet', dmg: 18, rate: 150, mag: 20, reload: 1100, spread: 0.01, pellets: 1, auto: false, zoom: 0 },
    { id: 'deagle', name: 'Desert Eagle', kind: 'bullet', dmg: 68, rate: 640, mag: 7, reload: 1800, spread: 0.006, pellets: 1, auto: false, zoom: 0 },
    { id: 'scar', name: 'SCAR-H', kind: 'bullet', dmg: 30, rate: 125, mag: 20, reload: 1900, spread: 0.01, pellets: 1, auto: true, zoom: 0 },
    { id: 'vector', name: 'Vektör', kind: 'bullet', dmg: 10, rate: 45, mag: 33, reload: 1500, spread: 0.03, pellets: 1, auto: true, zoom: 0 },
    { id: 'thompson', name: 'Thompson', kind: 'bullet', dmg: 14, rate: 75, mag: 50, reload: 2000, spread: 0.026, pellets: 1, auto: true, zoom: 0 },
    { id: 'dragunov', name: 'Dragunov', kind: 'bullet', dmg: 80, rate: 520, mag: 10, reload: 2200, spread: 0.001, pellets: 1, auto: false, zoom: 28 },
    { id: 'plasma', name: 'Plazma Tüfeği', kind: 'bullet', dmg: 24, rate: 95, mag: 40, reload: 1700, spread: 0.008, pellets: 1, auto: true, zoom: 0 },
    { id: 'aa12', name: 'AA-12', kind: 'bullet', dmg: 9, rate: 190, mag: 8, reload: 2600, spread: 0.07, pellets: 7, auto: true, zoom: 0 },
    { id: 'bow', name: 'Yay', kind: 'bullet', dmg: 66, rate: 800, mag: 1, reload: 900, spread: 0.002, pellets: 1, auto: false, zoom: 50 },
    { id: 'goldak', name: 'Altın AK', kind: 'bullet', dmg: 26, rate: 100, mag: 30, reload: 1450, spread: 0.011, pellets: 1, auto: true, zoom: 0 },
    { id: 'karambit', name: 'Karambit', kind: 'melee', dmg: 46, rate: 250, mag: 0, reload: 0, spread: 0, pellets: 1, auto: false, zoom: 0, range: 2.5 },
    { id: 'butterfly', name: 'Kelebek Bıçağı', kind: 'melee', dmg: 50, rate: 300, mag: 0, reload: 0, spread: 0, pellets: 1, auto: false, zoom: 0, range: 2.5 },
    { id: 'kukri', name: 'Pala', kind: 'melee', dmg: 58, rate: 480, mag: 0, reload: 0, spread: 0, pellets: 1, auto: false, zoom: 0, range: 2.7 },
    { id: 'plasmablade', name: 'Plazma Kılıcı', kind: 'melee', dmg: 54, rate: 340, mag: 0, reload: 0, spread: 0, pellets: 1, auto: false, zoom: 0, range: 3.0 },
  ];
  // tuş grupları: 1-7 ile gruptaki sahip olunan silahlar arasında dolaşılır
  const SLOTS = [[0, 15, 16, 17, 28, 29, 30, 31], [1, 8, 18, 19], [2, 9, 20, 27, 24], [3, 10, 21, 22], [4, 11, 25], [5, 12, 6, 23, 26], [7, 13, 14]];
  const THEMES = [{ name: 'Yeşil Vadi' }, { name: 'Çatılar' }, { name: 'Labirent' }];

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Blok kimlikleri: 1 çimen/zemin, 2 sınır, 3 taş/beton, 4 tahta/sandık, 5 toprak/zemin2, 6 yaprak, 7 asfalt, 8 çatı, 9 tuğla
  function generate(seed, theme) {
    theme = ((theme | 0) % THEMES.length + THEMES.length) % THEMES.length;
    const rnd = mulberry32(seed >>> 0);
    const g = new Uint8Array(SIZE * H * SIZE);
    const idx = (x, y, z) => (y * SIZE + z) * SIZE + x;
    const inb = (x, y, z) => x >= 0 && x < SIZE && z >= 0 && z < SIZE && y >= 0 && y < H;
    const set = (x, y, z, id) => { if (inb(x, y, z)) g[idx(x, y, z)] = id; };
    const rint = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const c = SIZE >> 1;

    function get(x, y, z) {
      x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
      if (y < 0) return 1;
      if (x < 0 || x >= SIZE || z < 0 || z >= SIZE) return 2;
      if (y >= H) return 0;
      return g[idx(x, y, z)];
    }
    const column = (x, z, y0, y1, id) => { for (let y = y0; y <= y1; y++) set(x, y, z, id); };
    const topY = (x, z) => { for (let y = H - 1; y >= 0; y--) if (get(x, y, z)) return y; return 0; };

    if (theme === 0) {
      // ---- Yeşil Vadi: tepeler, ağaçlar, kayalar, ortada harabe kule ----
      const L = 9, lat = [];
      for (let i = 0; i <= L; i++) { lat.push([]); for (let j = 0; j <= L; j++) lat[i].push(rnd()); }
      const hm = (x, z) => {
        const fx = (x / SIZE) * (L - 1), fz = (z / SIZE) * (L - 1), ix = Math.floor(fx), iz = Math.floor(fz);
        const tx = fx - ix, tz = fz - iz, sx = tx * tx * (3 - 2 * tx), sz = tz * tz * (3 - 2 * tz);
        const a = lat[ix][iz] * (1 - sx) + lat[ix + 1][iz] * sx, b = lat[ix][iz + 1] * (1 - sx) + lat[ix + 1][iz + 1] * sx;
        return Math.round((a * (1 - sz) + b * sz) * 3.4);
      };
      for (let x = 0; x < SIZE; x++) for (let z = 0; z < SIZE; z++) {
        const h = hm(x, z);
        set(x, 0, z, 1);
        for (let y = 1; y <= h; y++) set(x, y, z, y === h ? 1 : 5);
      }
      // ağaçlar
      for (let n = 0; n < 16; n++) {
        const x = rint(4, SIZE - 5), z = rint(4, SIZE - 5);
        if (Math.abs(x - c) < 7 && Math.abs(z - c) < 7) continue;
        const base = topY(x, z), th = rint(3, 4);
        column(x, z, base + 1, base + th, 4);
        for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let dy = 0; dy <= 2; dy++) {
          if (Math.abs(dx) + Math.abs(dz) + dy > 3 || (dx === 0 && dz === 0 && dy < 1)) continue;
          if (!get(x + dx, base + th - 1 + dy, z + dz)) set(x + dx, base + th - 1 + dy, z + dz, 6);
        }
      }
      // kayalar
      for (let n = 0; n < 14; n++) {
        const w = rint(1, 3), d = rint(1, 3), h = rint(1, 2), x0 = rint(3, SIZE - 6), z0 = rint(3, SIZE - 6);
        if (Math.abs(x0 - c) < 8 && Math.abs(z0 - c) < 8) continue;
        for (let x = x0; x < x0 + w; x++) for (let z = z0; z < z0 + d; z++) column(x, z, topY(x, z) + 1, topY(x, z) + h, 3);
      }
      // ortada harabe: halka duvar + kule + merdiven
      let base = 0;
      for (let x = c - 5; x <= c + 5; x++) for (let z = c - 5; z <= c + 5; z++) base = Math.max(base, topY(x, z));
      for (let x = c - 5; x <= c + 5; x++) for (let z = c - 5; z <= c + 5; z++) column(x, z, 1, base, 5);
      for (let x = c - 5; x <= c + 5; x++) for (let z = c - 5; z <= c + 5; z++) {
        const edge = Math.max(Math.abs(x - c), Math.abs(z - c)) === 5;
        const gap = (Math.abs(x - c) <= 1 && edge) || (Math.abs(z - c) <= 1 && edge);
        if (edge && !gap && rnd() < 0.85) column(x, z, base + 1, base + rint(2, 3), 3);
      }
      for (let x = c - 2; x <= c + 2; x++) for (let z = c - 2; z <= c + 2; z++) column(x, z, base + 1, base + 5, 3);
      for (let s = 1; s <= 5; s++) for (let x = c - 2; x <= c + 2; x++) column(x, c + 2 + s, base + 1, base + 6 - s, 3);
      for (let x = c - 2; x <= c + 2; x++) for (let z = c - 2; z <= c + 2; z++) if (Math.max(Math.abs(x - c), Math.abs(z - c)) === 2) set(x, base + 6, z, 3);
    } else if (theme === 1) {
      // ---- Çatılar: sokaklarla ayrılmış basamaklı binalar ----
      for (let x = 0; x < SIZE; x++) for (let z = 0; z < SIZE; z++) set(x, 0, z, 7);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        const x0 = 2 + 12 * i, z0 = 2 + 12 * j, wall = rnd() < 0.5 ? 3 : 9;
        const axis = rnd() < 0.5, dir = rnd() < 0.5, lo = rint(1, 3), peak = rint(5, 9);
        for (let a = 0; a < 8; a++) {
          const k = dir ? a : 7 - a;
          const h = Math.min(peak, lo + k);
          for (let b = 0; b < 8; b++) {
            const x = axis ? x0 + a : x0 + b, z = axis ? z0 + b : z0 + a;
            column(x, z, 1, h - 1, wall);
            set(x, h, z, 8);
          }
        }
        // çatı sandıkları ve korkuluk
        for (let n = 0; n < 3; n++) {
          const x = x0 + rint(0, 7), z = z0 + rint(0, 7), t = topY(x, z);
          if (t >= peak - 1) column(x, z, t + 1, t + rint(1, 2), 4);
        }
      }
      // sokak sandıkları
      for (let n = 0; n < 22; n++) {
        const x = rint(1, SIZE - 2), z = rint(1, SIZE - 2);
        if (get(x, 1, z) || get(x, 0, z) !== 7) continue;
        const inLot = ((x - 2) % 12 + 12) % 12 < 8 && ((z - 2) % 12 + 12) % 12 < 8;
        if (inLot) continue;
        column(x, z, 1, rint(1, 2), 4);
      }
    } else {
      // ---- Labirent: dar koridorlar, ortada açık arena ----
      for (let x = 0; x < SIZE; x++) for (let z = 0; z < SIZE; z++) set(x, 0, z, 5);
      const N = 11, ox = 1, oz = 1, WH = 4;
      const wallsH = [], wallsV = []; // wallsH[i][j]: (i,j) hücresi ile (i,j+1) arası, wallsV[i][j]: (i,j) ile (i+1,j) arası
      for (let i = 0; i < N; i++) { wallsH.push(new Array(N).fill(true)); wallsV.push(new Array(N).fill(true)); }
      const seen = Array.from({ length: N }, () => new Array(N).fill(false));
      const stack = [[0, 0]]; seen[0][0] = true;
      while (stack.length) {
        const [ci, cj] = stack[stack.length - 1];
        const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([di, dj]) => [ci + di, cj + dj, di, dj]).filter(([i, j]) => i >= 0 && j >= 0 && i < N && j < N && !seen[i][j]);
        if (!nb.length) { stack.pop(); continue; }
        const [ni, nj, di, dj] = nb[Math.floor(rnd() * nb.length)];
        seen[ni][nj] = true;
        if (di === 1) wallsV[ci][cj] = false; else if (di === -1) wallsV[ni][nj] = false;
        else if (dj === 1) wallsH[ci][cj] = false; else wallsH[ni][nj] = false;
        stack.push([ni, nj]);
      }
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { if (rnd() < 0.18) wallsV[i][j] = false; if (rnd() < 0.18) wallsH[i][j] = false; }
      const mid = (N - 1) >> 1;
      for (let i = mid - 1; i <= mid + 1; i++) for (let j = mid - 1; j <= mid + 1; j++) { if (i < mid + 1) wallsV[i][j] = false; if (j < mid + 1) wallsH[i][j] = false; }
      const wid = rnd() < 0.5 ? 3 : 9;
      // sütunlar (kesişimler) her zaman dolu
      for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) column(ox + 4 * i, oz + 4 * j, 1, WH, wid);
      // dış çerçeve
      for (let k = 0; k < 4 * N; k++) {
        column(ox + k, oz, 1, WH, wid); column(ox + k, oz + 4 * N, 1, WH, wid);
        column(ox, oz + k, 1, WH, wid); column(ox + 4 * N, oz + k, 1, WH, wid);
      }
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        if (i < N - 1 && wallsV[i][j]) for (let k = 1; k <= 3; k++) column(ox + 4 * (i + 1), oz + 4 * j + k, 1, WH, wid);
        if (j < N - 1 && wallsH[i][j]) for (let k = 1; k <= 3; k++) column(ox + 4 * i + k, oz + 4 * (j + 1), 1, WH, wid);
      }
      // merkez platformu ve rastgele alçak siperler
      for (let x = c - 2; x <= c + 2; x++) for (let z = c - 2; z <= c + 2; z++) column(x, z, 1, Math.max(Math.abs(x - c), Math.abs(z - c)) === 2 ? 1 : 2, 4);
      for (let n = 0; n < 28; n++) {
        const x = rint(3, SIZE - 4), z = rint(3, SIZE - 4);
        if (get(x, 1, z) || Math.abs(x - c) < 4 && Math.abs(z - c) < 4) continue;
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => get(x + a, 1, z + b))) continue;
        column(x, z, 1, rint(1, 2), 4);
      }
    }

    // çevre duvarı (tüm haritalar)
    for (let i = 0; i < SIZE; i++) for (let y = 1; y <= 11; y++) { set(i, y, 0, 2); set(i, y, SIZE - 1, 2); set(0, y, i, 2); set(SIZE - 1, y, i, 2); }

    function solidBox(x, y, z, rad, h) {
      rad = rad || 0.3; h = h || 1.8;
      for (let ix = Math.floor(x - rad); ix <= Math.floor(x + rad); ix++)
        for (let iy = Math.floor(y); iy <= Math.floor(y + h - 0.001); iy++)
          for (let iz = Math.floor(z - rad); iz <= Math.floor(z + rad); iz++) if (get(ix, iy, iz)) return true;
      return false;
    }

    // DDA ışın izleme: ilk dolu bloğa mesafe, yoksa Infinity
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

    // doğma noktaları: altı dolu, üstü boş, dört komşusu boş
    const spawns = [];
    for (let x = 3; x < SIZE - 3; x++) for (let z = 3; z < SIZE - 3; z++) {
      for (let y = 1; y < H - 4; y++) {
        if (!get(x, y - 1, z) || get(x, y, z) || get(x, y + 1, z) || get(x, y + 2, z)) continue;
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => get(x + a, y, z + b) || get(x + a, y + 1, z + b))) continue;
        spawns.push([x + 0.5, y, z + 0.5]);
        break;
      }
    }

    // yalnızca yürüyerek ulaşılabilen noktaları tut (merkeze en yakın doğma noktasından yayılma)
    (function () {
      const free = (x, y, z) => !solidBox(x + 0.5, y, z + 0.5, 0.3, 1.8);
      let st = spawns[0];
      for (const s of spawns) if (Math.hypot(s[0] - c, s[2] - c) < Math.hypot(st[0] - c, st[2] - c)) st = s;
      const key = (x, y, z) => (y * SIZE + z) * SIZE + x;
      const q = [[Math.floor(st[0]), st[1], Math.floor(st[2])]], seen = new Set([key(q[0][0], q[0][1], q[0][2])]);
      while (q.length) {
        const [x, y, z] = q.pop();
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, nz = z + dz;
          for (const dy of [1, 0, -1, -2, -3]) {
            const ny = y + dy;
            if (ny < 1 || ny >= H - 3) continue;
            if (free(nx, ny, nz) && get(nx, ny - 1, nz) && free(x, y + (dy > 0 ? dy : 0), z)) {
              const k = key(nx, ny, nz);
              if (!seen.has(k)) { seen.add(k); q.push([nx, ny, nz]); }
              break;
            }
          }
        }
      }
      const keep = spawns.filter((s) => seen.has(key(Math.floor(s[0]), s[1], Math.floor(s[2]))));
      spawns.length = 0; for (const s of keep) spawns.push(s);
    })();

    // toplanabilir eşyalar (sağlık, zırh, silah, bomba)
    const kinds = ['hp', 'hp', 'hp', 'hp', 'armor', 'armor', 'armor', 'w3', 'w4', 'w5', 'w6', 'w7', 'gren', 'gren', 'w9', 'w13', 'w14', 'w12'];
    const pickups = [];
    const pool = spawns.slice();
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    for (const s of pool) {
      if (pickups.length >= kinds.length) break;
      if (pickups.some((p) => Math.hypot(p.x - s[0], p.z - s[2]) < 7)) continue;
      pickups.push({ x: s[0], y: s[1], z: s[2], kind: kinds[pickups.length] });
    }

    return { SIZE, H, theme, name: THEMES[theme].name, get, raycast, solidBox, spawns, pickups, grid: g, topY };
  }

  const api = { SIZE, H, WEAPONS, SLOTS, THEMES, generate, mulberry32 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.VMap = api;
})(typeof self !== 'undefined' ? self : this);
