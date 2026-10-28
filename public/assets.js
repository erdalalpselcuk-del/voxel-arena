// Görsel üretim: blok dokuları, harita ağı (AO'lu), silah modelleri, karakter ve şapkalar. Üç boyutlu nesneler için THREE gerekir.
(function (root) {
  'use strict';
  const VM = root.VMap;

  // ---------------- doku atlası (16x16 piksel, 8x8 karo) ----------------
  const TILE = 16, COLS = 8;
  const BLOCK_TILES = { 1: [0, 1, 2], 2: [2, 2, 2], 3: [3, 3, 3], 4: [4, 4, 4], 5: [5, 5, 5], 6: [7, 6, 7], 7: [8, 8, 8], 8: [9, 9, 9], 9: [19, 10, 10], 10: [11, 12, 2], 11: [13, 13, 13], 12: [14, 14, 14], 13: [15, 15, 15], 14: [16, 16, 16], 15: [17, 17, 17], 16: [18, 18, 18] };
  const BLOCK_COLOR = { 1: [82, 168, 58], 2: [134, 96, 67], 3: [125, 128, 134], 4: [172, 76, 58], 5: [178, 138, 82], 6: [104, 78, 46], 7: [70, 150, 52], 8: [222, 205, 150], 9: [214, 190, 130], 10: [240, 246, 252], 11: [150, 205, 240], 12: [140, 142, 148], 13: [120, 132, 150], 14: [188, 140, 76], 15: [170, 70, 50], 16: [34, 98, 60] };
  const sh = (c, f) => [c[0] * f, c[1] * f, c[2] * f];
  const PAINT = [
    (x, y, r) => sh([82, 168, 58], 0.85 + r() * 0.3),
    (x, y, r) => (y < 3 + ((x * 7 + 3) % 3) ? sh([82, 168, 58], 0.8 + r() * 0.3) : sh([134, 96, 67], 0.8 + r() * 0.35)),
    (x, y, r) => (r() < 0.06 ? [90, 64, 44] : sh([134, 96, 67], 0.78 + r() * 0.35)),
    (x, y, r) => { let c = sh([125, 128, 134], 0.8 + r() * 0.3); if ((x * 3 + y * 5) % 17 === 0) c = sh(c, 0.78); return c; },
    (x, y, r) => { const off = ((y >> 2) & 1) ? 4 : 0; return (y % 4 === 3) || ((x + off) % 8 === 7) ? sh([170, 165, 155], 0.9 + r() * 0.15) : sh([172, 76, 58], 0.85 + r() * 0.3); },
    (x, y, r) => sh([178, 138, 82], y % 4 === 3 ? 0.6 : 0.88 + r() * 0.22),
    (x, y, r) => sh([104, 78, 46], (x % 4 === 0 ? 0.8 : 1) * (0.85 + r() * 0.25)),
    (x, y, r) => { const d = Math.hypot(x - 7.5, y - 7.5); return d > 7.4 ? sh([104, 78, 46], 0.9) : sh([186, 148, 92], (Math.floor(d) % 2 ? 0.82 : 1) * (0.92 + r() * 0.12)); },
    (x, y, r) => (r() < 0.18 ? [30, 92, 28] : sh([70, 150, 52], 0.8 + r() * 0.35)),
    (x, y, r) => sh([222, 205, 150], 0.9 + r() * 0.18),
    (x, y, r) => sh([214, 190, 130], (y % 5 === 4 ? 0.85 : 1) * (0.92 + r() * 0.14)),
    (x, y, r) => sh([240, 246, 252], 0.94 + r() * 0.08),
    (x, y, r) => (y < 4 + ((x * 5) % 3) ? sh([240, 246, 252], 0.94 + r() * 0.08) : sh([134, 96, 67], 0.8 + r() * 0.35)),
    (x, y, r) => sh([150, 205, 240], ((x + y) % 9 === 0 ? 1.1 : 1) * (0.92 + r() * 0.1)),
    (x, y, r) => sh([140, 142, 148], (x === 0 || y === 0 ? 0.8 : 1) * (0.9 + r() * 0.12)),
    (x, y, r) => sh([120, 132, 150], (((x === 2 || x === 13) && (y === 2 || y === 13)) ? 1.3 : 1) * ((y === 7 || y === 8) ? 0.85 : 1) * (0.92 + r() * 0.1)),
    (x, y, r) => { const edge = x < 2 || y < 2 || x > 13 || y > 13, diag = Math.abs(x - y) < 1 || Math.abs(x + y - 15) < 1; return sh(edge || diag ? [110, 72, 34] : [188, 140, 76], 0.9 + r() * 0.18); },
    (x, y, r) => { const off = ((y >> 2) & 1) ? 4 : 0; return sh((y % 4 === 3) || ((x + off) % 8 === 7) ? [110, 40, 30] : [170, 70, 50], 0.88 + r() * 0.2); },
    (x, y, r) => (r() < 0.2 ? [16, 52, 32] : sh([34, 98, 60], 0.8 + r() * 0.3)),
    (x, y, r) => sh([222, 200, 140], 0.92 + r() * 0.12),
  ];
  function makeAtlas(THREE) {
    const cv = document.createElement('canvas'); cv.width = cv.height = TILE * COLS;
    const ctx = cv.getContext('2d');
    for (let t = 0; t < PAINT.length; t++) {
      const r = VM.mulberry32(t * 977 + 13), img = ctx.createImageData(TILE, TILE);
      for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
        const c = PAINT[t](x, y, r), i = (y * TILE + x) * 4;
        img.data[i] = Math.max(0, Math.min(255, c[0])); img.data[i + 1] = Math.max(0, Math.min(255, c[1])); img.data[i + 2] = Math.max(0, Math.min(255, c[2])); img.data[i + 3] = 255;
      }
      ctx.putImageData(img, (t % COLS) * TILE, ((t / COLS) | 0) * TILE);
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
    return tex;
  }

  // ---------------- harita ağı: yüzey yüzleri + AO ----------------
  const FACES = [
    { n: [1, 0, 0], c: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], kind: 1, sh: 0.82 },
    { n: [-1, 0, 0], c: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]], kind: 1, sh: 0.82 },
    { n: [0, 1, 0], c: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]], kind: 0, sh: 1 },
    { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], kind: 2, sh: 0.5 },
    { n: [0, 0, 1], c: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]], kind: 1, sh: 0.7 },
    { n: [0, 0, -1], c: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]], kind: 1, sh: 0.7 },
  ];
  const AOB = [0.5, 0.68, 0.85, 1];
  function buildMapMesh(THREE, M, atlas) {
    const pos = [], uv = [], col = [], ind = [];
    let vc = 0;
    const get = M.get;
    for (let y = 0; y < M.H; y++) for (let z = 0; z < M.SIZE; z++) for (let x = 0; x < M.SIZE; x++) {
      const id = get(x, y, z);
      if (!id) continue;
      for (const f of FACES) {
        const nx = x + f.n[0], ny = y + f.n[1], nz = z + f.n[2];
        if (get(nx, ny, nz)) continue;
        const tile = BLOCK_TILES[id][f.kind], tc = tile % COLS, tr = (tile / COLS) | 0;
        const axes = [0, 1, 2].filter((a) => f.n[a] === 0);
        const aos = [];
        for (let k = 0; k < 4; k++) {
          const c = f.c[k];
          const t1 = [0, 0, 0], t2 = [0, 0, 0];
          t1[axes[0]] = c[axes[0]] ? 1 : -1; t2[axes[1]] = c[axes[1]] ? 1 : -1;
          const s1 = get(nx + t1[0], ny + t1[1], nz + t1[2]) ? 1 : 0, s2 = get(nx + t2[0], ny + t2[1], nz + t2[2]) ? 1 : 0;
          const cr = get(nx + t1[0] + t2[0], ny + t1[1] + t2[1], nz + t1[2] + t2[2]) ? 1 : 0;
          aos.push(s1 && s2 ? 0 : 3 - (s1 + s2 + cr));
        }
        const tint = 0.94 + ((((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) >>> 0) % 13) / 100;
        for (let k = 0; k < 4; k++) {
          const c = f.c[k];
          pos.push(x + c[0], y + c[1], z + c[2]);
          const cu = f.n[0] ? c[2] : f.n[2] ? c[0] : c[0], cv = f.n[1] ? c[2] : c[1];
          uv.push((tc + 0.004 + cu * 0.992) / COLS, 1 - (tr + 1 - (0.004 + cv * 0.992)) / COLS);
          const v = f.sh * AOB[aos[k]] * tint;
          col.push(v, v, v);
        }
        if (aos[0] + aos[2] >= aos[1] + aos[3]) ind.push(vc, vc + 1, vc + 2, vc, vc + 2, vc + 3);
        else ind.push(vc + 1, vc + 2, vc + 3, vc + 1, vc + 3, vc);
        vc += 4;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
    geo.setIndex(new THREE.BufferAttribute(new Uint32Array(ind), 1));
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true }));
    return mesh;
  }

  // küçük harita (üstten bakış): her blok = 1 piksel
  function buildMinimap(M) {
    const cv = document.createElement('canvas'); cv.width = cv.height = M.SIZE;
    const ctx = cv.getContext('2d'), img = ctx.createImageData(M.SIZE, M.SIZE);
    for (let z = 0; z < M.SIZE; z++) for (let x = 0; x < M.SIZE; x++) {
      let y = M.H - 1; while (y >= 0 && !M.get(x, y, z)) y--;
      const id = y >= 0 ? M.get(x, y, z) : 3, c = BLOCK_COLOR[id] || [100, 100, 100], k = 0.55 + Math.min(1, y / 12) * 0.5, i = (z * M.SIZE + x) * 4;
      img.data[i] = Math.min(255, c[0] * k); img.data[i + 1] = Math.min(255, c[1] * k); img.data[i + 2] = Math.min(255, c[2] * k); img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return cv;
  }

  // ---------------- silah modelleri (1 birim = 0.05 dünya birimi; namlu -z yönünde) ----------------
  const D = 0x2f3136, Mm = 0x555a63, L = 0x9aa1ac, W = 0x8b5a2b, G = 0x4f6140, R = 0xc0392b, K = 0x1b1c1f;
  const GUNS = {
    crowbar: { parts: [[1.5, 1.5, 22, 0, 0, -7, R], [1.5, 5, 1.5, 0, 2.2, -17.5, R], [1.5, 1.5, 3.5, 0, 4.4, -16.4, R], [1.5, 3.5, 1.5, 0, -1.4, 3.6, R]] },
    pistol: { parts: [[2.4, 3, 10, 0, 1.5, -3, Mm], [1.5, 1.5, 2.5, 0, 2, -9.2, D], [2.2, 6.5, 3, 0, -3.5, 1.5, D], [0.8, 1.2, 3.5, 0, -0.9, -1.2, D], [0.9, 0.9, 0.9, 0, 3.4, -7.6, L], [0.9, 0.9, 0.9, 0, 3.4, 0.8, L]] },
    smg: { parts: [[3, 4, 12, 0, 0, -2, D], [1.6, 1.6, 6, 0, 0.6, -10.5, K], [2, 7, 3, 0, -5.3, -3.5, Mm], [2.2, 5, 3, 0, -4, 3.2, D], [2, 2.5, 7, 0, -0.2, 8.5, Mm], [1, 1, 5, 0, 2.5, -3, L], [2.6, 2.6, 4, 0, -1.6, -8.5, Mm]] },
    rifle: { parts: [[3, 4, 14, 0, 0, -1, D], [3.4, 3.2, 8, 0, -0.3, -11, W], [1.4, 1.4, 6, 0, 0.6, -17, K], [0.9, 2.2, 0.9, 0, 2.3, -19.5, L], [2.4, 7, 3.5, 0, -5, -4.5, Mm], [2.6, 5, 9, 0, -1, 10.5, W], [2.2, 5, 3, 0, -4, 3.2, W], [2.6, 1, 10, 0, 2.4, -2, Mm]] },
    shotgun: { parts: [[2, 2, 19, 0, 1, -9.5, Mm], [3.4, 2.8, 7, 0, -1.2, -8, W], [3, 4.5, 9, 0, 0, 2, D], [2.6, 5, 9, 0, -0.5, 11.5, W], [1.6, 1.6, 14, 0, -1.8, -9, D], [2.2, 4.5, 2.6, 0, -4, 3, D]] },
    crossbow: { parts: [[2.6, 3, 16, 0, 0, 0, W], [22, 1.5, 2, 0, 1, -12, W], [1.4, 1.4, 6, 10.5, 1, -9.5, W], [1.4, 1.4, 6, -10.5, 1, -9.5, W], [20, 0.5, 0.5, 0, 1, -7, L], [0.9, 0.9, 12, 0, 2.4, -6, L], [2, 2, 7, 0, 3.9, -1, D], [2.2, 4, 2.6, 0, -3, 4, D]] },
    sniper: { parts: [[3, 4, 16, 0, 0, 0, G], [1.8, 1.8, 13, 0, 0.5, -14.5, K], [2.4, 2.4, 10, 0, 4.2, -1, K], [2.7, 2.7, 0.8, 0, 4.2, -6.4, 0x66ccff], [1.2, 1.6, 2, 0, 2.6, -3.5, L], [2, 3, 4, 0, -3.5, -1, D], [2.8, 6, 10, 0, -1.2, 12.5, G]] },
    rpg: { parts: [[5, 5, 24, 0, 0, -4, G], [7, 7, 3, 0, 0, -17.5, K], [6.4, 6.4, 3, 0, 0, 9, K], [2.2, 5, 3, 0, -5, 0.5, D], [3.4, 3.4, 3, 0, 0, -19.5, R], [1, 2, 1, 0, 3.5, -8, L], [2, 5, 3, 0, -5, -8, D]] },
    grenade: { parts: [[3.8, 4.4, 3.8, 0, 0, 0, G], [1.8, 1, 1.8, 0, 2.7, 0, L], [0.8, 3, 0.6, 1, 1.5, 0, L]] },
  };
  for (const k in GUNS) {
    let minZ = 99, y = 0, n = 0;
    for (const p of GUNS[k].parts) { if (p[5] - p[2] / 2 < minZ) { minZ = p[5] - p[2] / 2; y = p[4]; } n++; }
    GUNS[k].muzzle = [0, y, minZ];
  }
  function buildGun(THREE, id, scale, basic) {
    const g = new THREE.Group(), G0 = GUNS[id] || GUNS.pistol;
    for (const p of G0.parts) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(p[0], p[1], p[2]), basic ? new THREE.MeshBasicMaterial({ color: p[6] }) : new THREE.MeshLambertMaterial({ color: p[6] }));
      m.position.set(p[3], p[4], p[5]); g.add(m);
    }
    g.scale.setScalar(scale || 0.05);
    g.userData.muzzle = G0.muzzle.map((v) => v * (scale || 0.05));
    return g;
  }
  const iconCache = {};
  function gunIcon(id) {
    if (iconCache[id]) return iconCache[id];
    const parts = (GUNS[id] || GUNS.pistol).parts;
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const p of parts) { x0 = Math.min(x0, -p[5] - p[2] / 2); x1 = Math.max(x1, -p[5] + p[2] / 2); y0 = Math.min(y0, p[4] - p[1] / 2); y1 = Math.max(y1, p[4] + p[1] / 2); }
    const s = 2, w = Math.ceil((x1 - x0) * s) + 4, h = Math.ceil((y1 - y0) * s) + 4;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    const hex = (c) => '#' + c.toString(16).padStart(6, '0');
    for (const p of parts) {
      const x = (-p[5] - p[2] / 2 - x0) * s + 2, y = (y1 - (p[4] + p[1] / 2)) * s + 2;
      ctx.fillStyle = '#05070d'; ctx.fillRect(Math.floor(x) - 1, Math.floor(y) - 1, Math.ceil(p[2] * s) + 2, Math.ceil(p[1] * s) + 2);
    }
    for (const p of parts) {
      const x = (-p[5] - p[2] / 2 - x0) * s + 2, y = (y1 - (p[4] + p[1] / 2)) * s + 2;
      ctx.fillStyle = hex(p[6]); ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(p[2] * s), Math.ceil(p[1] * s));
    }
    return (iconCache[id] = cv.toDataURL());
  }

  // ---------------- karakter ----------------
  const SKINS = [0xe8564a, 0x3f8cff, 0x59c46b, 0xf2c230, 0xa064e8, 0xf08a3a, 0x30c4c4, 0x666d7a];
  const HATS = [{ name: 'Yok', price: 0 }, { name: 'Kep', price: 0 }, { name: 'Taç', price: 400 }, { name: 'Miğfer', price: 150 }, { name: 'Boynuz', price: 250 }, { name: 'Kovboy', price: 200 }];
  let faceTex = null;
  function getFace(THREE) {
    if (faceTex) return faceTex;
    const cv = document.createElement('canvas'); cv.width = cv.height = 8;
    const c = cv.getContext('2d');
    c.fillStyle = '#e9bb86'; c.fillRect(0, 0, 8, 8);
    c.fillStyle = '#fff'; c.fillRect(1, 3, 2, 1); c.fillRect(5, 3, 2, 1);
    c.fillStyle = '#2a3b6b'; c.fillRect(2, 3, 1, 1); c.fillRect(5, 3, 1, 1);
    c.fillStyle = '#9a5a3c'; c.fillRect(2, 5, 4, 1);
    faceTex = new THREE.CanvasTexture(cv); faceTex.magFilter = THREE.NearestFilter; faceTex.minFilter = THREE.NearestFilter; faceTex.generateMipmaps = false;
    return faceTex;
  }
  const box = (THREE, w, h, d, color, basic) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), basic ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshLambertMaterial({ color }));
  function buildHat(THREE, id) {
    const g = new THREE.Group();
    const add = (m, x, y, z, rz) => { m.position.set(x, y, z); if (rz) m.rotation.z = rz; g.add(m); return m; };
    if (id === 1) { add(box(THREE, 0.46, 0.14, 0.46, 0xd9382c), 0, 0.26, 0); add(box(THREE, 0.4, 0.04, 0.2, 0xb02a20), 0, 0.2, -0.3); }
    else if (id === 2) { add(box(THREE, 0.44, 0.1, 0.44, 0xffcf3f), 0, 0.25, 0); for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18], [0, -0.18], [0, 0.18]]) add(box(THREE, 0.08, 0.14, 0.08, 0xffe27a), x, 0.35, z); }
    else if (id === 3) { add(box(THREE, 0.5, 0.26, 0.5, 0x7b838f), 0, 0.28, 0); add(box(THREE, 0.1, 0.05, 0.52, 0x2a2f38), 0, 0.42, 0); }
    else if (id === 4) { add(box(THREE, 0.1, 0.3, 0.1, 0xf1ead2), 0.26, 0.22, 0, -0.45); add(box(THREE, 0.1, 0.3, 0.1, 0xf1ead2), -0.26, 0.22, 0, 0.45); add(box(THREE, 0.08, 0.14, 0.08, 0xd0c8a8), 0.37, 0.42, 0, -0.45); add(box(THREE, 0.08, 0.14, 0.08, 0xd0c8a8), -0.37, 0.42, 0, 0.45); }
    else if (id === 5) { add(box(THREE, 0.82, 0.04, 0.82, 0x6b4423), 0, 0.22, 0); add(box(THREE, 0.42, 0.2, 0.42, 0x7d522b), 0, 0.33, 0); add(box(THREE, 0.44, 0.05, 0.44, 0x2a1d10), 0, 0.26, 0); }
    return g;
  }
  function labelTexture(THREE, canvas, name, teamCol, hpFrac, showBar) {
    const c = canvas.getContext('2d');
    c.clearRect(0, 0, 256, 72);
    c.font = '700 30px "Pixelify Sans", monospace'; c.textAlign = 'center';
    c.lineWidth = 6; c.strokeStyle = '#000'; c.strokeText(name, 128, 30); c.fillStyle = teamCol; c.fillText(name, 128, 30);
    if (showBar) {
      c.fillStyle = '#000'; c.fillRect(48, 40, 160, 14);
      c.fillStyle = hpFrac > 0.5 ? '#5fe08a' : hpFrac > 0.25 ? '#ff9d3f' : '#ff5a4f'; c.fillRect(50, 42, Math.max(0, 156 * hpFrac), 10);
    }
  }
  function buildAvatar(THREE, o) {
    const root = new THREE.Group(), body = new THREE.Group();
    root.add(body);
    const shirt = o.shirt, skin = 0xe9bb86, pants = 0x2b3550;
    const torso = box(THREE, 0.52, 0.72, 0.28, shirt); torso.position.y = 1.06; body.add(torso);
    const faceMat = new THREE.MeshLambertMaterial({ color: 0xffffff, map: getFace(THREE) }), skinMat = new THREE.MeshLambertMaterial({ color: skin });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), [skinMat, skinMat, skinMat, skinMat, skinMat, faceMat]);
    // BoxGeometry yüz sırası: +x,-x,+y,-y,+z,-z ; ön yüz (-z) son malzeme
    head.position.y = 1.62; body.add(head);
    const hat = buildHat(THREE, o.hat || 0); hat.position.y = 1.62; body.add(hat);
    const legL = new THREE.Group(), legR = new THREE.Group();
    for (const [lg, x] of [[legL, -0.13], [legR, 0.13]]) { const m = box(THREE, 0.23, 0.7, 0.25, pants); m.position.y = -0.35; lg.add(m); lg.position.set(x, 0.7, 0); body.add(lg); }
    const armL = new THREE.Group(), armR = new THREE.Group();
    for (const [ar, x] of [[armL, -0.35], [armR, 0.35]]) { const m = box(THREE, 0.16, 0.62, 0.16, shirt); m.position.y = -0.28; const hand = box(THREE, 0.16, 0.14, 0.16, skin); hand.position.y = -0.62; ar.add(m, hand); ar.position.set(x, 1.38, 0); body.add(ar); }
    const gunHolder = new THREE.Group(); gunHolder.position.set(0.3, 1.18, -0.2); body.add(gunHolder);
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 72;
    const tex = new THREE.CanvasTexture(cv);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    label.scale.set(1.9, 0.53, 1); label.position.y = 2.3; root.add(label);
    return { root, body, torso, head, legL, legR, armL, armR, gunHolder, gun: null, gunId: null, label, labelCv: cv, labelTex: tex, labelKey: '', hat, shirtMats: [torso.material, armL.children[0].material, armR.children[0].material] };
  }

  root.VAssets = { makeAtlas, buildMapMesh, buildMinimap, GUNS, buildGun, gunIcon, SKINS, HATS, buildAvatar, buildHat, labelTexture, BLOCK_COLOR };
})(typeof self !== 'undefined' ? self : this);
