// Voxel Arena istemcisi: render, girdi, fizik, HUD, ağ.
(() => {
'use strict';
const THREE = window.THREE, C = window.VCommon, A = window.VAssets;
const { WEAPONS: WP, WIDX, THEMES, fireMode } = C;
const $ = (id) => document.getElementById(id);
const EYE = 1.6, EYE_C = 1.15, HGT = 1.8, HGT_C = 1.3, RAD = 0.3;
const LOCAL = !!window.VA_LOCAL || location.protocol === 'file:';
const RANK = { crowbar: 0, pistol: 1, grenade: 2, magnum: 3, crossbow: 4, smg: 4, ak: 5, shotgun: 5, sniper: 5, plasma: 6, rpg: 7 };
const AMMO_TYPES = ['9mm', '357', '762', 'shell', 'bolt', 'sniper', 'rocket', 'cell', 'gren', 'gl'];
const TILE_COL = ['#5fa83c', '#8a5a35', '#8a5a35', '#8d9096', '#a8453a', '#b98a4e', '#e3d08c', '#f2f6fb', '#8a5a35', '#7a828c', '#b07a3a', '#9a9a96', '#f0a020', '#b6e0f2', '#d8b878', '#3d424b', '#3f8f35', '#c9a26a', '#6b4a2b', '#3f8a4a', '#2f6b45'];
// silah başına görsel geri tepme: [geri, yukarı, kamera]
const KICK = { crowbar: [0, 0, 0], pistol: [0.05, 0.06, 0.004], magnum: [0.1, 0.16, 0.014], smg: [0.04, 0.05, 0.003], ak: [0.06, 0.07, 0.006], shotgun: [0.14, 0.2, 0.02], crossbow: [0.07, 0.1, 0.006], sniper: [0.14, 0.18, 0.02], rpg: [0.16, 0.12, 0.016], plasma: [0.03, 0.04, 0.0], grenade: [0.06, 0.1, 0] };

// ---------- ayarlar ----------
const S = { sens: 1, fov: 75, vol: 0.7, name: '', col: 0, hat: 0 };
try { Object.assign(S, JSON.parse(localStorage.getItem('va_s') || '{}')); } catch (e) { /* kayıt yok */ }
const saveS = () => { try { localStorage.setItem('va_s', JSON.stringify(S)); } catch (e) { /* yoksay */ } };

// ---------- three.js kurulumu ----------
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: $('game'), antialias: false }); }
catch (e) { $('status').textContent = 'Tarayıcın WebGL desteklemiyor.'; $('play').disabled = true; return; }
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(S.fov, 1, 0.05, 300);
camera.rotation.order = 'YXZ';
scene.add(camera);
const ambient = new THREE.AmbientLight(0xffffff, 0.8); scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffffff, 0.65); sun.position.set(30, 60, 20); scene.add(sun);
const camLight = new THREE.PointLight(0xffffff, 0.5, 6); camera.add(camLight);
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

// ---------- dünya ----------
const worldGroup = new THREE.Group(); scene.add(worldGroup);
const atlas = A.makeAtlas();
const terrainMat = new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true, side: THREE.DoubleSide });
let M = null, T = null, terrain = null, sky = null, clouds = null, radarBg = null;
let itemMeshes = [];
const itemOn = [];

const FACES = [
  { n: [1, 0, 0], c: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], sh: 0.82, k: 's', ax: [1, 2], uv: (c) => [c[2], c[1]] },
  { n: [-1, 0, 0], c: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]], sh: 0.74, k: 's', ax: [1, 2], uv: (c) => [1 - c[2], c[1]] },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], sh: 1, k: 't', ax: [0, 2], uv: (c) => [c[0], c[2]] },
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], sh: 0.55, k: 'b', ax: [0, 2], uv: (c) => [c[0], c[2]] },
  { n: [0, 0, 1], c: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]], sh: 0.9, k: 's', ax: [0, 1], uv: (c) => [1 - c[0], c[1]] },
  { n: [0, 0, -1], c: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]], sh: 0.66, k: 's', ax: [0, 1], uv: (c) => [c[0], c[1]] },
];
const AO = [0.5, 0.68, 0.84, 1];
function buildTerrain() {
  const pos = [], col = [], uvs = [], idx = [];
  const get = M.get, tint = T.tint;
  for (let y = 0; y < M.H; y++) for (let z = 0; z < M.SIZE; z++) for (let x = 0; x < M.SIZE; x++) {
    const id = get(x, y, z); if (!id) continue;
    const look = T.blocks[id]; if (!look) continue;
    const jit = 0.94 + (((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) >>> 0) % 13 / 100;
    for (const F of FACES) {
      if (get(x + F.n[0], y + F.n[1], z + F.n[2])) continue;
      const tile = look[F.k], tc = tile % 8, tr = tile >> 3;
      const u0 = tc / 8 + 0.002, u1 = (tc + 1) / 8 - 0.002, v1 = 1 - tr / 4 - 0.002, v0 = 1 - (tr + 1) / 4 + 0.002;
      const base = pos.length / 3;
      for (const c of F.c) {
        pos.push(x + c[0], y + c[1], z + c[2]);
        const s0 = c[F.ax[0]] ? 1 : -1, s1 = c[F.ax[1]] ? 1 : -1;
        const b = [x + F.n[0], y + F.n[1], z + F.n[2]];
        const a1 = [...b]; a1[F.ax[0]] += s0;
        const a2 = [...b]; a2[F.ax[1]] += s1;
        const a3 = [...b]; a3[F.ax[0]] += s0; a3[F.ax[1]] += s1;
        const o1 = get(a1[0], a1[1], a1[2]) ? 1 : 0, o2 = get(a2[0], a2[1], a2[2]) ? 1 : 0, o3 = get(a3[0], a3[1], a3[2]) ? 1 : 0;
        const ao = o1 && o2 ? 0 : 3 - (o1 + o2 + o3);
        const f = F.sh * AO[ao] * jit;
        col.push(Math.min(1.3, f * tint[0]), Math.min(1.3, f * tint[1]), Math.min(1.3, f * tint[2]));
        const uv = F.uv(c);
        uvs.push(u0 + (u1 - u0) * uv[0], v0 + (v1 - v0) * uv[1]);
      }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  return new THREE.Mesh(geo, terrainMat);
}
function buildRadarBg() {
  const c = document.createElement('canvas'); c.width = M.SIZE; c.height = M.SIZE;
  const g = c.getContext('2d'), img = g.createImageData(M.SIZE, M.SIZE);
  for (let z = 0; z < M.SIZE; z++) for (let x = 0; x < M.SIZE; x++) {
    let h = 0; for (let y = M.H - 1; y >= 0; y--) if (M.get(x, y, z)) { h = y; break; }
    const o = (z * M.SIZE + x) * 4, k = Math.min(1, h / 8);
    img.data[o] = 28 + k * 150; img.data[o + 1] = 38 + k * 130; img.data[o + 2] = 26 + k * 90; img.data[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}
function makeItemMesh(it) {
  const g = new THREE.Group();
  let beam = '#6ef0ff';
  if (it.k === 'weapon') { const gun = A.makeGun(WP[it.w].id); gun.scale.setScalar(1.5); gun.position.y = 0.55; gun.rotation.y = 0.0; g.add(gun); g.userData.spin = gun; beam = '#c7f938'; }
  else if (it.k === 'health') { const b = new THREE.Group(); b.add(A.box(0, 0, 0, 0.4, 0.4, 0.4, '#f2f2f2'), A.box(0, 0, 0, 0.44, 0.12, 0.12, '#d92b2b'), A.box(0, 0, 0, 0.12, 0.44, 0.12, '#d92b2b'), A.box(0, 0, 0, 0.12, 0.12, 0.44, '#d92b2b')); b.position.y = 0.6; g.add(b); g.userData.spin = b; beam = '#ff5a4d'; }
  else if (it.k === 'armor') { const b = new THREE.Group(); b.add(A.box(0, 0, 0, 0.34, 0.44, 0.22, '#e0a410'), A.box(0, 0.05, 0, 0.36, 0.1, 0.24, '#222'), A.box(0, 0.26, 0, 0.12, 0.06, 0.08, '#999')); b.position.y = 0.6; g.add(b); g.userData.spin = b; beam = '#ffb020'; }
  else { const b = new THREE.Group(); b.add(A.box(0, 0, 0, 0.46, 0.28, 0.32, '#5b6b3a'), A.box(0, 0.15, 0, 0.3, 0.02, 0.2, '#f2d24a'), A.box(0.1, 0, 0.17, 0.12, 0.12, 0.02, '#f2d24a')); b.position.y = 0.5; g.add(b); g.userData.spin = b; beam = '#ffe14d'; }
  g.add(A.box(0, 0.04, 0, 0.6, 0.08, 0.6, '#1c1f1a'));
  const bm = new THREE.Mesh(new THREE.BoxGeometry(0.36, 2.2, 0.36), new THREE.MeshBasicMaterial({ color: beam, transparent: true, opacity: 0.16, depthWrite: false, fog: false }));
  bm.position.y = 1.2; g.add(bm);
  g.position.set(it.p[0], it.p[1], it.p[2]);
  return g;
}
function buildWorld(seed, itemStates) {
  while (worldGroup.children.length) worldGroup.remove(worldGroup.children[0]);
  if (terrain) terrain.geometry.dispose();
  if (sky) sky.geometry.dispose();
  M = C.generate(seed); T = M.theme;
  scene.fog = new THREE.Fog(T.fog, T.near, T.far);
  renderer.setClearColor(new THREE.Color(T.fog));
  ambient.color.set(T.sun).lerp(new THREE.Color(0xffffff), 0.6); ambient.intensity = M.themeIndex === 3 ? 0.55 : 0.85;
  sun.color.set(T.sun); sun.intensity = M.themeIndex === 3 ? 0.5 : 0.65;
  terrain = buildTerrain(); worldGroup.add(terrain);
  sky = A.makeSky(T); worldGroup.add(sky);
  clouds = T.clouds ? A.makeClouds(seed) : null; if (clouds) worldGroup.add(clouds);
  worldGroup.add(A.makeHills(T, seed));
  itemMeshes = M.items.map((it, i) => { const m = makeItemMesh(it); worldGroup.add(m); m.visible = itemStates ? !!itemStates[i] : true; return m; });
  radarBg = buildRadarBg();
  $('mapname').textContent = T.name;
}

// ---------- oyuncular ----------
const players = new Map();
const avatars = new Map();
let myId = 0, WIN = 15, connected = false, roundOver = false;
const me = {
  pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0, pitch: 0, onGround: false, alive: false, hp: 100, armor: 0,
  w: WIDX.pistol, lastW: WIDX.crowbar, has: [], mag: [], pool: {}, cr: false, crT: 0, reloadEnd: 0, reloadW: -1, nextFire: 0,
  zoom: false, swapT: 0, stepOff: 0, bobT: 0, adsT: 0, rec: 0, swing: 0, shake: 0, dip: 0, stepDist: 0, kills: 0, streak: 0,
};
const shotAt = new Map();
function resetLoadout() {
  me.has = WP.map(() => false); me.has[WIDX.crowbar] = true; me.has[WIDX.pistol] = true;
  me.mag = WP.map((w) => w.mag);
  me.pool = {}; AMMO_TYPES.forEach((a) => { me.pool[a] = 0; }); me.pool['9mm'] = 68;
  me.hp = 100; me.armor = 0; me.reloadEnd = 0; me.swapT = 0;
  me.w = WIDX.pistol; me.lastW = WIDX.crowbar; setZoom(false); setVM(me.w);
}
function unpack(a) {
  const p = players.get(a[0]); if (!p) return null;
  p.pos = [a[1], a[2], a[3]]; p.yaw = a[4]; p.pitch = a[5]; p.hp = a[6]; p.armor = a[7]; p.alive = !!a[8]; p.w = a[9]; p.cr = a[10]; p.score = a[11]; p.kills = a[12]; p.deaths = a[13]; p.streak = a[14];
  return p;
}
function addPlayer(pp) {
  const p = { id: pp.id, name: pp.name, sk: pp.sk, bot: pp.bot };
  players.set(pp.id, p); unpack(pp.a);
  if (p.id !== myId) ensureAvatar(p);
  return p;
}
function ensureAvatar(p) {
  let a = avatars.get(p.id);
  if (!a) {
    a = A.makeAvatar(p.sk, p.name, true);
    a.target = new THREE.Vector3(...p.pos); a.yawT = p.yaw; a.phase = 0; a.flashT = 0; a.last = a.target.clone();
    a.group.position.copy(a.target); scene.add(a.group); avatars.set(p.id, a);
  }
  return a;
}
function removeAvatar(id) { const a = avatars.get(id); if (a) { scene.remove(a.group); avatars.delete(id); } }
function setAvatarGun(a, wi) {
  if (a.gunId === wi) return;
  if (a.gun) a.gunHold.remove(a.gun);
  a.gun = A.makeGun(WP[wi].id); a.gun.scale.setScalar(0.85); a.gunId = wi;
  a.flash = A.box(a.gun.userData.muzzle.x, a.gun.userData.muzzle.y, a.gun.userData.muzzle.z - 0.04, 0.12, 0.12, 0.12, '#ffd060', true);
  a.flash.visible = false; a.gun.add(a.flash); a.gunHold.add(a.gun);
}

// ---------- görünüm modeli ----------
const vm = new THREE.Group(); camera.add(vm);
let vmGun = null, vmFlash = null, vmFlashT = 0;
function setVM(wi) {
  if (vmGun) vm.remove(vmGun);
  const col = A.SKIN_COLORS[S.col % 12];
  vmGun = A.makeGun(WP[wi].id, { hands: true, skin: '#f1c27d', sleeve: '#' + new THREE.Color(col).multiplyScalar(0.7).getHexString() });
  const mz = vmGun.userData.muzzle;
  vmFlash = A.box(mz.x, mz.y, mz.z - 0.05, 0.16, 0.16, 0.12, '#ffd060', true); vmFlash.visible = false; vmGun.add(vmFlash);
  vm.add(vmGun);
}

// ---------- parçacıklar ve efektler ----------
const pBox = new THREE.BoxGeometry(1, 1, 1);
const parts = [], freeParts = [];
for (let i = 0; i < 260; i++) {
  const m = new THREE.Mesh(pBox, new THREE.MeshBasicMaterial({ color: 0xffffff })); m.visible = false; scene.add(m);
  parts.push({ m, vel: new THREE.Vector3(), life: 0, max: 1, grav: 10, size: 0.1, on: false, bounce: 0.3 }); freeParts.push(parts[i]);
}
function spawnP(pos, vel, color, size, life, grav, bounce) {
  const p = freeParts.pop(); if (!p) return;
  p.on = true; p.life = p.max = life; p.grav = grav; p.size = size; p.bounce = bounce === undefined ? 0.3 : bounce;
  p.m.position.copy(pos); p.vel.copy(vel); p.m.material.color.set(color); p.m.visible = true; p.m.scale.setScalar(size);
}
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3();
function rv(s) { return _v.set((Math.random() - 0.5) * s, (Math.random() - 0.2) * s, (Math.random() - 0.5) * s); }
function updateParts(dt) {
  for (const p of parts) {
    if (!p.on) continue;
    p.life -= dt;
    if (p.life <= 0) { p.on = false; p.m.visible = false; freeParts.push(p); continue; }
    p.vel.y -= p.grav * dt;
    const m = p.m.position;
    _v2.copy(m).addScaledVector(p.vel, dt);
    if (M && M.get(_v2.x, _v2.y, _v2.z)) { if (M.get(m.x, _v2.y, m.z)) p.vel.y *= -p.bounce; else p.vel.x *= -p.bounce; p.vel.multiplyScalar(0.6); } else m.copy(_v2);
    p.m.scale.setScalar(p.size * Math.min(1, p.life / (p.max * 0.5)));
  }
}
function debrisAt(x, y, z, dx, dy, dz, n) {
  let id = M.get(x + dx * 0.05, y + dy * 0.05, z + dz * 0.05) || M.get(x, y, z);
  const look = id && T.blocks[id]; const col = look ? TILE_COL[look.s] : '#aaaaaa';
  for (let i = 0; i < n; i++) spawnP(_v2.set(x, y, z), rv(3.5).add(new THREE.Vector3(-dx * 1.5, 1.5, -dz * 1.5)), col, 0.07 + Math.random() * 0.06, 0.6 + Math.random() * 0.4, 14);
}
const booms = [];
const boomLight = new THREE.PointLight(0xffa040, 0, 18); scene.add(boomLight); let boomLightT = 0;
const boomGeo = new THREE.SphereGeometry(1, 10, 8);
function explosionFx(pos, r) {
  for (let i = 0; i < 26; i++) {
    const a = rv(1).normalize().multiplyScalar(2 + Math.random() * 9);
    const col = ['#ffcf4a', '#ff8a1f', '#e8541a', '#5a5a5a', '#2a2a2a'][i % 5];
    spawnP(_v2.copy(pos), a, col, 0.25 + Math.random() * 0.3, 0.5 + Math.random() * 0.6, 3, 0.3);
  }
  const m = new THREE.Mesh(boomGeo, new THREE.MeshBasicMaterial({ color: 0xffb040, transparent: true, opacity: 0.8, depthWrite: false }));
  m.position.copy(pos); scene.add(m); booms.push({ m, t: 0, r });
  boomLight.position.copy(pos); boomLight.intensity = 3; boomLightT = 0.35;
}
const tracers = [], bolts = [];
const TR_COL = { plasma: '#58e6ff', bolt: '#d9b27a' };
function tracerFx(o, e, wi, alt) {
  const W = WP[wi]; if (W.type === 'melee') return;
  const a = new THREE.Vector3(...o), b = new THREE.Vector3(...e), len = a.distanceTo(b); if (len < 0.3) return;
  const col = W.tracer ? (alt && W.id === 'plasma' ? '#c77dff' : TR_COL[W.tracer]) : '#fff2b0';
  const th = W.id === 'plasma' ? (alt ? 0.22 : 0.07) : W.id === 'crossbow' ? 0.05 : W.id === 'sniper' ? 0.04 : 0.025;
  const m = new THREE.Mesh(pBox, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.95, fog: false }));
  m.position.copy(a).lerp(b, 0.5); m.scale.set(th, th, len); m.lookAt(b); scene.add(m);
  tracers.push({ m, t: 0, life: alt && W.id === 'plasma' ? 0.28 : 0.09, th });
  if (W.id === 'crossbow') {
    const s = new THREE.Mesh(pBox, new THREE.MeshBasicMaterial({ color: '#8a6a40' })); s.scale.set(0.04, 0.04, 0.5);
    s.position.copy(b).addScaledVector(b.clone().sub(a).normalize(), -0.2); s.lookAt(b); scene.add(s); bolts.push({ m: s, t: 5 });
  }
}
function updateFx(dt) {
  for (let i = tracers.length - 1; i >= 0; i--) {
    const t = tracers[i]; t.t += dt;
    if (t.t >= t.life) { scene.remove(t.m); t.m.material.dispose(); tracers.splice(i, 1); }
    else { t.m.material.opacity = 0.95 * (1 - t.t / t.life); const k = 1 - t.t / t.life; t.m.scale.x = t.m.scale.y = t.th * (0.4 + 0.6 * k); }
  }
  for (let i = bolts.length - 1; i >= 0; i--) { bolts[i].t -= dt; if (bolts[i].t <= 0) { scene.remove(bolts[i].m); bolts[i].m.material.dispose(); bolts.splice(i, 1); } }
  for (let i = booms.length - 1; i >= 0; i--) {
    const b = booms[i]; b.t += dt; const k = b.t / 0.4;
    if (k >= 1) { scene.remove(b.m); b.m.material.dispose(); booms.splice(i, 1); continue; }
    b.m.scale.setScalar(0.5 + b.r * 0.55 * Math.sqrt(k)); b.m.material.opacity = 0.8 * (1 - k);
  }
  if (boomLightT > 0) { boomLightT -= dt; boomLight.intensity = Math.max(0, boomLightT / 0.35) * 3; }
}

// ---------- mermiler ----------
const projMeshes = new Map();
const PROJ_LOOK = [{ c: '#d8d8d8', s: [0.14, 0.14, 0.5] }, { c: '#3d6b3c', s: [0.18, 0.22, 0.18] }, { c: '#33363d', s: [0.14, 0.14, 0.22] }];
function updateProjs(list, dt) {
  const seen = new Set();
  for (const q of list) {
    seen.add(q[0]);
    let e = projMeshes.get(q[0]);
    if (!e) {
      const L = PROJ_LOOK[q[1]]; const m = new THREE.Mesh(pBox, new THREE.MeshLambertMaterial({ color: L.c })); m.scale.set(...L.s);
      m.position.set(q[2], q[3], q[4]); scene.add(m); e = { m, tgt: new THREE.Vector3(q[2], q[3], q[4]), kind: q[1], prev: m.position.clone() }; projMeshes.set(q[0], e);
    }
    e.tgt.set(q[2], q[3], q[4]);
  }
  for (const [id, e] of projMeshes) {
    if (!seen.has(id)) { scene.remove(e.m); e.m.material.dispose(); projMeshes.delete(id); continue; }
    const before = e.m.position.clone();
    e.m.position.lerp(e.tgt, Math.min(1, dt * 22));
    const d = _v2.copy(e.tgt).sub(before);
    if (d.lengthSq() > 1e-6) e.m.lookAt(e.m.position.clone().add(d));
    if (e.kind === 0) spawnP(e.m.position, rv(0.8), Math.random() < 0.5 ? '#9a9a9a' : '#ffb040', 0.14, 0.45, -0.5, 0);
    else e.m.rotation.x += dt * 8;
  }
}

// ---------- ağ ----------
let ws = null;
class LocalNet {
  constructor() {
    this.readyState = 0;
    setTimeout(() => {
      this.game = window.VGame.createGame({ send: (id, o) => this._d(o), broadcast: (o) => this._d(o) }, { minPlayers: 7, maxPlayers: 16 });
      this.id = this.game.allocId(); this.readyState = 1; if (this.onopen) this.onopen();
      this.timer = setInterval(() => this.game.tick(0.05), 50);
    }, 20);
  }
  _d(o) { const s = JSON.stringify(o); setTimeout(() => { if (this.onmessage && this.readyState === 1) this.onmessage({ data: s }); }, 0); }
  send(s) { const m = JSON.parse(s); if (!this.game) return; if (m.t === 'join') this.game.join(this.id, m.name, m.sk || m.skin); else this.game.message(this.id, m); }
  close() { clearInterval(this.timer); this.readyState = 3; }
}
function connect(name) {
  $('status').textContent = 'Bağlanılıyor…';
  ws = LOCAL ? new LocalNet() : new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
  ws.onopen = () => ws.send(JSON.stringify({ t: 'join', name, skin: [S.col, S.hat] }));
  ws.onclose = () => { if (!connected) return; connected = false; showMsg('Bağlantı koptu<small>Sayfayı yenile</small>'); if (document.exitPointerLock) document.exitPointerLock(); };
  ws.onerror = () => { $('status').textContent = 'Sunucuya bağlanılamadı.'; };
  ws.onmessage = (e) => onMsg(JSON.parse(e.data));
}
const send = (o) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tagMeshes = new Map();
const tagGeo = new THREE.BoxGeometry(0.34, 0.48, 0.08);
function addTag(t) {
  const m = new THREE.Mesh(tagGeo, new THREE.MeshBasicMaterial({ color: t.owner === myId ? 0xff3b30 : 0xffd60a }));
  m.position.set(...t.p); scene.add(m); tagMeshes.set(t.id, { m, p: t.p });
}
function removeTag(id) { const t = tagMeshes.get(id); if (t) { scene.remove(t.m); t.m.material.dispose(); tagMeshes.delete(id); } }
function panFor(pos) {
  const dx = pos[0] - camera.position.x, dz = pos[2] - camera.position.z;
  const rx = Math.cos(me.yaw), rz = -Math.sin(me.yaw);
  const d = Math.hypot(dx, dz) || 1;
  return (dx * rx + dz * rz) / d * 0.8;
}
function volFor(pos, range) { const d = Math.hypot(pos[0] - camera.position.x, pos[1] - camera.position.y, pos[2] - camera.position.z); return Math.max(0, 1 - d / range); }
function onMsg(m) {
  switch (m.t) {
    case 'full': $('status').textContent = 'Sunucu dolu.'; break;
    case 'init': {
      myId = m.id; WIN = m.win; connected = true; roundOver = !!m.roundOver;
      buildWorld(m.seed, m.items);
      players.clear(); for (const id of [...avatars.keys()]) removeAvatar(id);
      for (const t of [...tagMeshes.keys()]) removeTag(t);
      m.players.forEach(addPlayer);
      m.tags.forEach(addTag);
      me.pos.set(...m.p); me.vel.set(0, 0, 0); me.alive = true; me.yaw = 0; me.pitch = 0;
      resetLoadout();
      $('menu').style.display = 'none'; $('hud').style.display = 'block';
      requestLock(); updateHud(true); showWsel();
      break;
    }
    case 'join': if (m.player.id !== myId) { addPlayer(m.player); feed(`<b>${esc(m.player.name)}</b> katıldı`); } break;
    case 'leave': { const p = players.get(m.id); if (p) feed(`<b>${esc(p.name)}</b> ayrıldı`); players.delete(m.id); removeAvatar(m.id); break; }
    case 'snap': {
      for (const a of m.ps) {
        const p = unpack(a); if (!p) continue;
        if (p.id === myId) {
          if (me.alive && !p.alive) { me.alive = false; setZoom(false); }
          me.hp = p.hp; me.armor = p.armor; me.kills = p.kills; me.streak = p.streak;
        } else {
          const av = ensureAvatar(p); av.target.set(...p.pos); av.yawT = p.yaw; av.pitchT = p.pitch; av.alive = p.alive; av.cr = p.cr;
          setAvatarGun(av, Math.max(0, Math.min(WP.length - 1, p.w)));
        }
      }
      updateProjs(m.pr || [], 0.05);
      break;
    }
    case 'shot': onShot(m); break;
    case 'hit': hitMark(m.head, m.kill); break;
    case 'dmg': onDamage(m); break;
    case 'kill': onKill(m); break;
    case 'tag': addTag(m); break;
    case 'tagGone': {
      const t = tagMeshes.get(m.id);
      if (t && m.kind === 'confirm') for (let i = 0; i < 8; i++) spawnP(_v2.set(...t.p), rv(4).add(new THREE.Vector3(0, 2, 0)), '#ffd60a', 0.1, 0.6, 8);
      removeTag(m.id);
      if (m.by === myId) { if (m.kind === 'confirm') { A.audio.play('confirm'); banner('KÜNYE ONAYLANDI', '+1'); } else if (m.kind === 'deny') { A.audio.play('deny'); banner('KÜNYE REDDEDİLDİ', ''); } }
      break;
    }
    case 'item': { const mesh = itemMeshes[m.id]; if (mesh) mesh.visible = !!m.on; break; }
    case 'got': onGot(m); break;
    case 'kick': me.vel.x += m.v[0]; me.vel.y += m.v[1]; me.vel.z += m.v[2]; me.onGround = false; break;
    case 'correct': me.pos.set(...m.p); me.vel.set(0, 0, 0); break;
    case 'boom': {
      explosionFx(new THREE.Vector3(...m.p), m.r);
      const v = volFor(m.p, 60);
      A.audio.play('boom', Math.min(1, v + 0.15), panFor(m.p));
      me.shake = Math.max(me.shake, Math.max(0, 1 - Math.hypot(m.p[0] - me.pos.x, m.p[1] - me.pos.y, m.p[2] - me.pos.z) / 22) * 0.7);
      break;
    }
    case 'respawn':
      me.pos.set(...m.p); me.vel.set(0, 0, 0); me.alive = true; me.cr = false; resetLoadout(); showMsg(''); updateHud(true); showWsel();
      break;
    case 'win': {
      roundOver = true;
      const rank = [...players.values()].sort((a, b) => b.score - a.score).slice(0, 3).map((p, i) => `${i + 1}. ${esc(p.name)} (${p.score})`).join(' &nbsp; ');
      showMsg(`${esc(m.name)} turu kazandı!<small>${rank}</small><small>Yeni tur birazdan başlıyor…</small>`);
      break;
    }
    case 'newround': {
      roundOver = false; buildWorld(m.seed, m.items);
      for (const t of [...tagMeshes.keys()]) removeTag(t);
      for (const [, e] of projMeshes) scene.remove(e.m); projMeshes.clear();
      for (const pp of m.players) { const p = players.get(pp.id) || addPlayer(pp); unpack(pp.a); if (pp.id === myId) { me.pos.set(...p.pos); me.vel.set(0, 0, 0); me.alive = true; resetLoadout(); } else { const av = ensureAvatar(p); av.target.set(...p.pos); av.group.position.copy(av.target); } }
      showMsg(''); banner(THEMES[m.seed % THEMES.length].name.toUpperCase(), 'Yeni tur'); updateHud(true);
      break;
    }
  }
}
function onShot(m) {
  const mine = m.id === myId, W = WP[m.w]; if (!W) return;
  if (!mine) {
    const a = avatars.get(m.id); if (a) a.flashT = 0.05;
    shotAt.set(m.id, performance.now());
    const v = volFor(m.o, 55);
    if (v > 0.02) A.audio.play(soundFor(m.w, m.alt), v, panFor(m.o));
  }
  if (m.e) {
    const o = m.o.slice();
    if (mine) { _v2.set(0.22, -0.2, -0.5).applyQuaternion(camera.quaternion); o[0] += _v2.x; o[1] += _v2.y; o[2] += _v2.z; }
    tracerFx(o, m.e, m.w, m.alt);
    if (m.hit) { for (let i = 0; i < 5; i++) spawnP(_v2.set(...m.e), rv(3.2), '#c0392b', 0.07, 0.5, 12); }
    else if (!m.m) { const dx = m.e[0] - m.o[0], dy = m.e[1] - m.o[1], dz = m.e[2] - m.o[2], l = Math.hypot(dx, dy, dz) || 1; debrisAt(m.e[0], m.e[1], m.e[2], dx / l, dy / l, dz / l, 4); }
    else debrisAt(m.e[0], m.e[1], m.e[2], 0, 0, 0, 3);
  }
}
function soundFor(wi, alt) {
  const id = WP[wi].id;
  if (id === 'plasma') return alt ? 'plasma2' : 'plasma';
  if (id === 'smg' && alt) return 'glaunch';
  return id;
}
function hitMark(head, kill) {
  const h = $('hit'); h.classList.toggle('head', !!head); h.classList.remove('on'); void h.offsetWidth; h.classList.add('on');
  setTimeout(() => h.classList.remove('on'), 90);
  A.audio.play(kill ? 'kill' : head ? 'hs' : 'hit');
}
function onDamage(m) {
  A.audio.play('hurt');
  $('vig').style.boxShadow = 'inset 0 0 170px 40px rgba(220,0,0,.65)';
  setTimeout(() => ($('vig').style.boxShadow = 'inset 0 0 170px 30px rgba(220,0,0,0)'), 200);
  me.shake = Math.max(me.shake, Math.min(0.5, m.dmg / 90));
  if (m.from) {
    const dx = m.from[0] - me.pos.x, dz = m.from[2] - me.pos.z;
    if (Math.hypot(dx, dz) > 0.5) {
      const rel = Math.atan2(-dx, -dz) - me.yaw;
      const d = document.createElement('div'); d.className = 'di'; d.style.transform = `rotate(${-rel}rad)`; $('dmgind').appendChild(d);
      setTimeout(() => d.remove(), 1100);
    }
  }
}
const STREAK = { 2: 'ÇİFT ÖLDÜRME', 3: 'ÜÇLÜ ÖLDÜRME', 4: 'DÖRTLÜ', 5: 'DURDURULAMAZ', 7: 'EFSANE', 10: 'TANRI GİBİ' };
function onKill(m) {
  const k = players.get(m.killer), v = players.get(m.victim), W = WP[m.w];
  feed(`<b>${esc(k ? k.name : 'Dünya')}</b> [${W ? esc(W.name) : ''}]${m.head ? ' <i>★</i>' : ''} <em>${esc(v ? v.name : '?')}</em>`);
  const a = avatars.get(m.victim);
  if (a) { for (let i = 0; i < 14; i++) spawnP(_v2.set(a.group.position.x, a.group.position.y + 1, a.group.position.z), rv(5).add(new THREE.Vector3(0, 2, 0)), A.SKIN_COLORS[(v ? v.sk[0] : 0) % 12], 0.14, 0.9, 12); }
  if (m.victim === myId) { showMsg(`SENİ ${esc(k ? k.name : 'DÜNYA').toUpperCase()} ÖLDÜRDÜ<small>${W ? esc(W.name) : ''} · 3 saniye içinde yeniden doğacaksın</small>`); }
  if (m.killer === myId && m.victim !== myId) { banner(m.head ? 'KAFADAN ÖLDÜRME' : 'ÖLDÜRME', 'Künyesini topla'); if (STREAK[m.streak]) setTimeout(() => banner(STREAK[m.streak], m.streak + ' öldürme serisi'), 900); }
}
function onGot(m) {
  A.audio.play('pickup');
  if (m.k === 'weapon') {
    const W = WP[m.w], first = !me.has[m.w]; me.has[m.w] = true;
    if (W.mag > 0) { if (first) me.mag[m.w] = W.mag; me.pool[W.ammo] = Math.min(W.reserve * 2, (me.pool[W.ammo] || 0) + Math.ceil(W.reserve * 0.5)); }
    else if (W.ammo) me.pool[W.ammo] = Math.min(W.reserve * 2, (me.pool[W.ammo] || 0) + Math.ceil(W.reserve * (W.id === 'grenade' ? 0.5 : 1)));
    if (W.alt && W.alt.ammo) me.pool[W.alt.ammo] = Math.min(8, (me.pool[W.alt.ammo] || 0) + 2);
    pickup('+ ' + W.name);
    if (first && RANK[W.id] > RANK[WP[me.w].id]) selectWeapon(m.w);
  } else if (m.k === 'ammo') {
    WP.forEach((W, i) => { if (me.has[i] && W.ammo && W.mag >= 0) me.pool[W.ammo] = Math.min(W.reserve * 2, (me.pool[W.ammo] || 0) + Math.ceil(W.reserve * 0.35)); });
    me.pool.gl = Math.min(8, (me.pool.gl || 0) + (me.has[WIDX.smg] ? 1 : 0));
    pickup('+ Cephane');
  } else if (m.k === 'health') pickup('+ Sağlık');
  else if (m.k === 'armor') pickup('+ Zırh');
  updateHud(true);
}

// ---------- HUD ----------
function feed(html) {
  const d = document.createElement('div'); d.innerHTML = html; $('feed').appendChild(d);
  while ($('feed').children.length > 6) $('feed').removeChild($('feed').firstChild);
  setTimeout(() => d.remove(), 6000);
}
function pickup(t) { const d = document.createElement('div'); d.textContent = t; $('pickups').appendChild(d); while ($('pickups').children.length > 4) $('pickups').removeChild($('pickups').firstChild); setTimeout(() => d.remove(), 3200); }
let bannerT = 0;
function banner(t, sub) { const b = $('banner'); b.innerHTML = esc(t) + (sub ? `<small>${esc(sub)}</small>` : ''); b.classList.remove('on'); void b.offsetWidth; b.classList.add('on'); clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove('on'), 1700); }
function showMsg(html) { const el = $('msg'); el.innerHTML = html; el.style.display = html ? 'block' : 'none'; }
let wselT = 0;
function showWsel() {
  const cur = WP[me.w];
  let h = '';
  for (let s = 1; s <= 7; s++) {
    const list = WP.map((w, i) => ({ w, i })).filter((o) => o.w.slot === s);
    const isCur = cur.slot === s;
    h += `<div class="slot${isCur ? ' cur' : ''}"><div class="n">${s}</div>` + (isCur ? list.map((o) => `<div class="it${o.i === me.w ? ' sel' : ''}${me.has[o.i] ? '' : ' no'}">${esc(o.w.name)}</div>`).join('') : '') + '</div>';
  }
  const el = $('wsel'); el.innerHTML = h; el.classList.add('on');
  clearTimeout(wselT); wselT = setTimeout(() => el.classList.remove('on'), 2200);
}
function ammoText() {
  const W = WP[me.w]; if (W.type === 'melee') return ['—', ''];
  if (W.mag === 0) return [me.pool[W.ammo] || 0, ''];
  return [me.reloadEnd > performance.now() ? '…' : me.mag[me.w], '| ' + (me.pool[W.ammo] || 0)];
}
let lastHud = '';
function updateHud(force) {
  const W = WP[me.w];
  const [am, rs] = ammoText();
  const key = [Math.ceil(me.hp), Math.ceil(me.armor), am, rs, me.w, me.pool.gl, (players.get(myId) || {}).score].join();
  if (!force && key === lastHud) return; lastHud = key;
  $('hp').textContent = Math.max(0, Math.ceil(me.hp)); $('ar').textContent = Math.max(0, Math.ceil(me.armor));
  $('hpbox').classList.toggle('low', me.hp <= 25);
  $('lowhp').classList.toggle('on', me.hp <= 25 && me.alive);
  $('wname').textContent = W.name.toUpperCase(); $('am').textContent = am; $('rs').textContent = rs;
  $('gl').textContent = W.alt && W.alt.ammo === 'gl' ? 'BOMBA ' + (me.pool.gl || 0) : '';
  const p = players.get(myId);
  $('score').textContent = `KÜNYE ${p ? p.score : 0} / ${WIN}`;
  const all = [...players.values()].sort((a, b) => b.score - a.score || b.kills - a.kills);
  if (all[0]) $('leader').textContent = `Lider: ${all[0].name} (${all[0].score})`;
}
function updateBoard() {
  const all = [...players.values()].sort((a, b) => b.score - a.score || b.kills - a.kills);
  $('bt').innerHTML = '<tr><th>OYUNCU</th><th>KÜNYE</th><th>ÖLDÜRME</th><th>ÖLÜM</th></tr>' + all.map((q) => `<tr class="${q.id === myId ? 'me' : ''}"><td><i style="background:${A.SKIN_COLORS[q.sk[0] % 12]}"></i>${esc(q.name)}${q.bot ? ' <span style="opacity:.5;font-size:12px">BOT</span>' : ''}</td><td>${q.score}</td><td>${q.kills}</td><td>${q.deaths}</td></tr>`).join('');
}
const radar = $('radar'), rctx = radar.getContext('2d');
function drawRadar() {
  if (!radarBg) return;
  const R = 160, ppb = R / 26, now = performance.now();
  rctx.clearRect(0, 0, 320, 320); rctx.save();
  rctx.beginPath(); rctx.arc(R, R, R - 1, 0, Math.PI * 2); rctx.clip();
  rctx.translate(R, R); rctx.rotate(me.yaw);
  rctx.imageSmoothingEnabled = false;
  rctx.drawImage(radarBg, -me.pos.x * ppb, -me.pos.z * ppb, M.SIZE * ppb, M.SIZE * ppb);
  for (const t of tagMeshes.values()) { const x = (t.p[0] - me.pos.x) * ppb, z = (t.p[2] - me.pos.z) * ppb; rctx.fillStyle = '#ffd60a'; rctx.fillRect(x - 4, z - 4, 8, 8); }
  M.items.forEach((it, i) => { if (it.k !== 'weapon' || !itemMeshes[i].visible) return; const x = (it.p[0] - me.pos.x) * ppb, z = (it.p[2] - me.pos.z) * ppb; rctx.fillStyle = 'rgba(255,255,255,.8)'; rctx.fillRect(x - 3, z - 3, 6, 6); });
  for (const p of players.values()) {
    if (p.id === myId || !p.alive) continue;
    const dx = p.pos[0] - me.pos.x, dz = p.pos[2] - me.pos.z, d = Math.hypot(dx, dz);
    const loud = now - (shotAt.get(p.id) || -1e9) < 1500;
    if (d > 13 && !loud) continue;
    rctx.fillStyle = loud ? '#ff3b30' : '#ff8a3b'; rctx.beginPath(); rctx.arc(dx * ppb, dz * ppb, 6, 0, Math.PI * 2); rctx.fill();
  }
  rctx.restore();
  rctx.fillStyle = '#c7f938'; rctx.beginPath(); rctx.moveTo(R, R - 10); rctx.lineTo(R + 7, R + 8); rctx.lineTo(R - 7, R + 8); rctx.closePath(); rctx.fill();
}

// ---------- girdi ----------
const keys = {};
let locked = false, fakeLock = false, mouseL = false, mouseR = false;
const lockedAny = () => locked || fakeLock;
function requestLock() {
  const c = $('game');
  try { const r = c.requestPointerLock(); if (r && r.catch) r.catch(() => { fakeLock = true; }); } catch (e) { fakeLock = true; }
}
document.addEventListener('pointerlockerror', () => { fakeLock = true; });
document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === $('game'); if (locked) fakeLock = false; syncPause(); });
function syncPause() { $('pause').style.display = connected && !lockedAny() && !roundOver && me.alive !== undefined ? 'flex' : 'none'; }
$('pause').addEventListener('click', () => { fakeLock = false; requestLock(); setTimeout(() => { if (!locked) fakeLock = true; syncPause(); }, 250); });
addEventListener('keydown', (e) => {
  if (!connected) return;
  if (e.code === 'Tab') { e.preventDefault(); $('board').style.display = 'block'; updateBoard(); return; }
  if (e.repeat) { keys[e.code] = true; return; }
  keys[e.code] = true;
  if (e.code === 'KeyR') reload();
  else if (e.code === 'KeyQ') { if (me.has[me.lastW]) selectWeapon(me.lastW); }
  else if (e.code.startsWith('Digit')) { const n = +e.code.slice(5); if (n >= 1 && n <= 7) selectSlot(n); }
  if (['Space', 'ControlLeft'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', (e) => { keys[e.code] = false; if (e.code === 'Tab') $('board').style.display = 'none'; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouseL = mouseR = false; });
addEventListener('mousemove', (e) => {
  if (!connected || !lockedAny() || !me.alive) return;
  const k = 0.0022 * S.sens * (me.zoom ? camera.fov / S.fov : 1);
  me.yaw -= e.movementX * k; me.pitch = Math.max(-1.55, Math.min(1.55, me.pitch - e.movementY * k));
});
addEventListener('mousedown', (e) => {
  if (!connected || !lockedAny()) return;
  if (e.button === 0) { mouseL = true; tryFire(false); }
  if (e.button === 2) { mouseR = true; const W = WP[me.w]; if (W.alt && W.alt.zoom) setZoom(true); else tryFire(true); }
});
addEventListener('mouseup', (e) => { if (e.button === 0) mouseL = false; if (e.button === 2) { mouseR = false; if (me.zoom) setZoom(false); } });
addEventListener('contextmenu', (e) => e.preventDefault());
addEventListener('wheel', (e) => { if (!connected || !lockedAny()) return; cycleWeapon(e.deltaY > 0 ? 1 : -1); });

function owned() { return WP.map((w, i) => i).filter((i) => me.has[i]); }
function cycleWeapon(dir) {
  const o = owned().sort((a, b) => WP[a].slot - WP[b].slot || a - b), i = o.indexOf(me.w);
  selectWeapon(o[(i + dir + o.length) % o.length]);
}
function selectSlot(n) {
  const list = WP.map((w, i) => i).filter((i) => WP[i].slot === n && me.has[i]);
  if (!list.length) { showWsel(); return; }
  const cur = list.indexOf(me.w);
  selectWeapon(list[(cur + 1) % list.length]);
}
function selectWeapon(wi) {
  if (!me.has[wi]) return;
  if (wi === me.w) { showWsel(); return; }
  me.lastW = me.w; me.w = wi; me.reloadEnd = 0; me.swapT = 0.3; setZoom(false); setVM(wi); A.audio.play('swap'); showWsel(); updateHud(true);
}
function setZoom(on) {
  const W = WP[me.w]; me.zoom = !!(on && W.alt && W.alt.zoom);
  const scoped = me.zoom && (W.id === 'sniper' || W.id === 'crossbow');
  $('scope').style.display = scoped ? 'block' : 'none';
}
function reload() {
  const W = WP[me.w], now = performance.now();
  if (!me.alive || W.mag <= 0 || me.reloadEnd > now || me.mag[me.w] >= W.mag) return;
  if ((me.pool[W.ammo] || 0) <= 0) { A.audio.play('empty'); return; }
  me.reloadEnd = now + W.reload; me.reloadW = me.w; setZoom(false);
  A.audio.play('reload');
  const w = me.w; setTimeout(() => { if (me.w === w && me.reloadEnd) A.audio.play('reload2'); }, W.reload * 0.8);
  updateHud(true);
}
function finishReload() {
  const W = WP[me.reloadW]; me.reloadEnd = 0;
  if (!W || me.reloadW !== me.w) return;
  const take = Math.min(W.mag - me.mag[me.reloadW], me.pool[W.ammo] || 0);
  me.mag[me.reloadW] += take; me.pool[W.ammo] -= take; updateHud(true);
}
function hasAmmo(i) { const W = WP[i]; if (W.type === 'melee') return true; if (W.mag === 0) return (me.pool[W.ammo] || 0) > 0; return me.mag[i] > 0 || (me.pool[W.ammo] || 0) > 0; }
function autoSwitch() {
  let best = -1, br = -1;
  WP.forEach((W, i) => { if (me.has[i] && hasAmmo(i) && RANK[W.id] > br && i !== me.w) { br = RANK[W.id]; best = i; } });
  if (best >= 0) selectWeapon(best);
}
const _f = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3(), _o = new THREE.Vector3();
function tryFire(alt) {
  if (!connected || !me.alive || roundOver || !lockedAny() || me.swapT > 0) return;
  const now = performance.now(), wi = me.w, W = WP[wi];
  if (me.reloadEnd > now || now < me.nextFire) return;
  const Mo = fireMode(wi, alt);
  if (alt && W.alt && W.alt.zoom) return;
  const need = Mo.cost || 1;
  if (W.type !== 'melee') {
    if (Mo.mag === 0) {
      if ((me.pool[Mo.ammo] || 0) < need) { A.audio.play('empty'); me.nextFire = now + 250; if (!hasAmmo(wi)) autoSwitch(); return; }
    } else if (me.mag[wi] < need) {
      me.nextFire = now + 250;
      if ((me.pool[W.ammo] || 0) > 0) reload(); else { A.audio.play('empty'); autoSwitch(); }
      return;
    }
    if (Mo.mag === 0) me.pool[Mo.ammo] -= need; else me.mag[wi] -= need;
  }
  me.nextFire = now + Mo.rate;
  camera.updateMatrixWorld(true);
  _o.copy(camera.position);
  _f.set(0, 0, -1).applyQuaternion(camera.quaternion); _r.set(1, 0, 0).applyQuaternion(camera.quaternion); _u.set(0, 1, 0).applyQuaternion(camera.quaternion);
  const moving = Math.hypot(me.vel.x, me.vel.z) > 0.5, scoped = me.zoom && (W.id === 'sniper' || W.id === 'crossbow');
  const sp = scoped ? 0 : (Mo.spread || 0) * (me.zoom ? 0.4 : 1) * (!me.onGround ? 2.2 : moving ? 1.7 : me.cr ? 0.6 : 1);
  const ds = [], n = Mo.pellets || 1;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * sp;
    const d = _v2.copy(_f).addScaledVector(_r, Math.cos(a) * r).addScaledVector(_u, Math.sin(a) * r).normalize();
    ds.push([+d.x.toFixed(4), +d.y.toFixed(4), +d.z.toFixed(4)]);
  }
  send({ t: 'shoot', w: wi, alt: !!alt, o: [+_o.x.toFixed(3), +_o.y.toFixed(3), +_o.z.toFixed(3)], ds });
  const K = KICK[W.id] || [0, 0, 0];
  me.rec = 1; me.recK = K;
  if (W.type === 'melee') me.swing = 0.32;
  else {
    vmFlashT = 0.045; me.pitch += K[2] * (0.6 + Math.random() * 0.8);
    if (['pistol', 'magnum', 'smg', 'ak'].includes(W.id)) { _v2.set(0.2, -0.12, -0.35).applyQuaternion(camera.quaternion).add(camera.position); spawnP(_v2, new THREE.Vector3().copy(_r).multiplyScalar(2 + Math.random()).addScaledVector(_u, 1.5), '#d9a93a', 0.04, 0.9, 16, 0.4); }
    for (let i = 0; i < 2; i++) { _v2.set(0.1, -0.1, -0.7).applyQuaternion(camera.quaternion).add(camera.position); spawnP(_v2, rv(0.7).add(new THREE.Vector3(0, 0.5, 0)), '#bbbbbb', 0.08, 0.6, -0.3, 0); }
  }
  A.audio.play(soundFor(wi, alt));
  if (Mo.kick) me.shake = Math.max(me.shake, 0.4);
  if (W.type !== 'melee' && ((Mo.mag === 0 && (me.pool[Mo.ammo] || 0) < need) || (Mo.mag !== 0 && me.mag[wi] <= 0))) {
    if (Mo.mag !== 0 && (me.pool[W.ammo] || 0) > 0) reload(); else if (!hasAmmo(wi)) setTimeout(autoSwitch, 300);
  }
  updateHud(true);
}

// ---------- fizik ----------
function solidBox(x, y, z, h) {
  for (let ix = Math.floor(x - RAD); ix <= Math.floor(x + RAD); ix++)
    for (let iy = Math.floor(y); iy <= Math.floor(y + h - 0.001); iy++)
      for (let iz = Math.floor(z - RAD); iz <= Math.floor(z + RAD); iz++) if (M.get(ix, iy, iz)) return true;
  return false;
}
function moveAxis(ax, d, h) {
  if (!d) return;
  const p = me.pos, nx = ax === 0 ? p.x + d : p.x, nz = ax === 2 ? p.z + d : p.z;
  if (!solidBox(nx, p.y, nz, h)) { p.x = nx; p.z = nz; return; }
  if (me.onGround && !solidBox(nx, p.y + 1, nz, h) && !solidBox(p.x, p.y + 1, p.z, h)) { p.x = nx; p.z = nz; p.y += 1; me.stepOff -= 1; return; }
  if (ax === 0) me.vel.x = 0; else me.vel.z = 0;
}
function physics(dt) {
  const live = me.alive && lockedAny() && !roundOver;
  const wantCr = live && (keys.KeyC || keys.ControlLeft);
  if (wantCr) me.cr = true; else if (me.cr && !solidBox(me.pos.x, me.pos.y, me.pos.z, HGT)) me.cr = false;
  const h = me.cr ? HGT_C : HGT;
  let f = 0, r = 0;
  if (live) { f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0); r = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0); }
  const dx = -Math.sin(me.yaw) * f + Math.cos(me.yaw) * r, dz = -Math.cos(me.yaw) * f - Math.sin(me.yaw) * r;
  const l = Math.hypot(dx, dz) || 1;
  const sprint = keys.ShiftLeft && f > 0 && !me.cr && !me.zoom;
  const speed = (me.cr ? 2.6 : sprint ? 7.6 : 5.3) * (me.zoom ? 0.55 : 1) * (WP[me.w].id === 'rpg' ? 0.92 : 1);
  const wx = f || r ? (dx / l) * speed : 0, wz = f || r ? (dz / l) * speed : 0;
  if (me.onGround) { me.vel.x = wx; me.vel.z = wz; }
  else { const a = Math.min(1, dt * 3.2); me.vel.x += (wx - me.vel.x) * a; me.vel.z += (wz - me.vel.z) * a; }
  if (live && keys.Space && me.onGround) { me.vel.y = 8.2; me.onGround = false; }
  me.vel.y = Math.max(-40, me.vel.y - 24 * dt);
  moveAxis(0, me.vel.x * dt, h); moveAxis(2, me.vel.z * dt, h);
  const ny = me.pos.y + me.vel.y * dt;
  if (!solidBox(me.pos.x, ny, me.pos.z, h)) { me.pos.y = ny; me.onGround = false; }
  else {
    if (me.vel.y < 0) { if (!me.onGround && me.vel.y < -9) { me.dip = Math.min(0.35, -me.vel.y * 0.018); A.audio.play('step', 1.4); } me.pos.y = Math.floor(ny) + 1; me.onGround = true; }
    me.vel.y = 0;
  }
  if (me.pos.y < -25) { me.pos.y = 12; me.vel.set(0, 0, 0); }
  const hv = Math.hypot(me.vel.x, me.vel.z);
  if (me.onGround && hv > 1 && live) { me.stepDist += hv * dt; if (me.stepDist > (sprint ? 2.2 : 2.9) && !me.cr) { me.stepDist = 0; A.audio.play('step', 0.7); } }
  return hv;
}

// ---------- ana döngü ----------
let last = performance.now(), sendAcc = 0, hudAcc = 0, hbT = 0, menuT = 0;
const bobV = new THREE.Vector3();
function updateViewmodel(dt, hv) {
  const W = WP[me.w], now = performance.now();
  const scoped = me.zoom && (W.id === 'sniper' || W.id === 'crossbow');
  me.adsT += ((me.zoom ? 1 : 0) - me.adsT) * Math.min(1, dt * 12);
  me.swapT = Math.max(0, me.swapT - dt); me.rec = Math.max(0, me.rec - dt * 7); me.swing = Math.max(0, me.swing - dt);
  if (me.onGround && hv > 0.5 && me.alive) me.bobT += dt * (hv > 6 ? 12.5 : 9.5);
  const bobAmp = me.onGround ? Math.min(1, hv / 5.3) : 0.2, t = now / 1000;
  const K = me.recK || [0, 0, 0];
  let px = 0.26 + Math.sin(me.bobT) * 0.012 * bobAmp + Math.sin(t * 1.3) * 0.0025, py = -0.24 + Math.abs(Math.cos(me.bobT)) * 0.014 * bobAmp - 0.014 * bobAmp + Math.sin(t * 1.7) * 0.002;
  let pz = -0.5 + K[0] * me.rec, rx = K[1] * me.rec, rz = 0, ry = 0;
  px += (0 - px) * me.adsT * 0.95; py += (-0.19 - py) * me.adsT;
  if (hv > 6.5 && me.onGround && me.adsT < 0.2) { ry = -0.18; rz = 0.1; px -= 0.04; py -= 0.02; }
  if (me.swapT > 0) { const k = me.swapT / 0.3; py -= 0.4 * k; rx -= 0.5 * k; }
  if (me.reloadEnd > now) { const d = WP[me.reloadW] ? WP[me.reloadW].reload : 1500, p = 1 - (me.reloadEnd - now) / d, s = Math.sin(Math.PI * Math.max(0, Math.min(1, p))); py -= 0.26 * s; rx -= 0.8 * s; rz += 0.35 * s; px -= 0.05 * s; }
  if (me.swing > 0) { const p = 1 - me.swing / 0.32, s = Math.sin(Math.PI * p); rx += 0.9 * s - 0.2; rz -= 1.0 * s; px -= 0.22 * s; pz -= 0.1 * s; }
  vm.position.set(px, py + me.dip * -0.2, pz); vm.rotation.set(rx, ry, rz);
  vm.visible = me.alive && !(scoped && me.adsT > 0.55);
  if (vmFlash) { vmFlashT -= dt; vmFlash.visible = vmFlashT > 0; }
}
function updateAvatars(dt) {
  for (const [id, a] of avatars) {
    const p = players.get(id); if (!p) continue;
    const g = a.group;
    g.position.lerp(a.target, Math.min(1, dt * 14));
    const sp = Math.hypot(g.position.x - a.last.x, g.position.z - a.last.z) / Math.max(dt, 0.001); a.last.copy(g.position);
    let dy = a.yawT - g.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); g.rotation.y += dy * Math.min(1, dt * 14);
    a.phase += dt * Math.min(sp, 8) * 1.7;
    const sw = Math.min(1, sp / 4) * 0.9;
    a.legL.rotation.x = Math.sin(a.phase) * sw; a.legR.rotation.x = -Math.sin(a.phase) * sw;
    a.armR.rotation.x = -1.35 + (a.pitchT || 0) * 0.6; a.armL.rotation.x = -1.05 + (a.pitchT || 0) * 0.6; a.armL.rotation.z = -0.3;
    a.gunHold.rotation.x = (a.pitchT || 0) * 0.6; a.head.rotation.x = -(a.pitchT || 0) * 0.7;
    g.scale.y = a.cr ? 0.8 : 1;
    if (a.alive === false) { g.rotation.x = Math.min(Math.PI / 2, g.rotation.x + dt * 6); g.position.y = a.target.y + 0.25; if (a.label) a.label.visible = false; }
    else { g.rotation.x = Math.max(0, g.rotation.x - dt * 8); if (a.label) a.label.visible = true; }
    a.flashT -= dt; if (a.flash) a.flash.visible = a.flashT > 0;
  }
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (connected && M) {
    const hv = physics(dt);
    if (me.reloadEnd && now >= me.reloadEnd) finishReload();
    if (lockedAny() && me.alive && !roundOver) {
      const Wf = fireMode(me.w, false);
      if (mouseL && Wf.auto) tryFire(false);
      else if (mouseR && !(WP[me.w].alt && WP[me.w].alt.zoom) && fireMode(me.w, true).auto) tryFire(true);
    }
    sendAcc += dt;
    if (sendAcc >= 0.05) { sendAcc = 0; send({ t: 'state', p: [+me.pos.x.toFixed(3), +me.pos.y.toFixed(3), +me.pos.z.toFixed(3)], yaw: +me.yaw.toFixed(4), pitch: +me.pitch.toFixed(4), w: me.w, cr: me.cr ? 1 : 0 }); }
    me.crT += ((me.cr ? 1 : 0) - me.crT) * Math.min(1, dt * 12);
    me.stepOff += (0 - me.stepOff) * Math.min(1, dt * 10); me.dip = Math.max(0, me.dip - dt * 1.5); me.shake = Math.max(0, me.shake - dt * 1.8);
    const eyeH = EYE + (EYE_C - EYE) * me.crT;
    let cy = me.pos.y + eyeH + me.stepOff - me.dip, roll = 0;
    if (!me.alive) { cy = me.pos.y + 0.45; roll = 0.7; }
    camera.position.set(me.pos.x + (Math.random() - 0.5) * me.shake * 0.15, cy + (Math.random() - 0.5) * me.shake * 0.15, me.pos.z + (Math.random() - 0.5) * me.shake * 0.15);
    camera.rotation.set(me.pitch + (Math.random() - 0.5) * me.shake * 0.04, me.yaw, roll);
    const W = WP[me.w], tf = me.zoom ? W.alt.zoom : S.fov + (hv > 6.5 && me.onGround ? 4 : 0);
    camera.fov += (tf - camera.fov) * Math.min(1, dt * 14); camera.updateProjectionMatrix();
    updateViewmodel(dt, hv);
    updateAvatars(dt);
    const tt = now / 1000;
    itemMeshes.forEach((g) => { if (g.visible && g.userData.spin) { g.userData.spin.rotation.y = tt * 1.6; g.userData.spin.position.y = (g.userData.spin.position.y > 0.5 ? 0.55 : 0.6) + 0.0; } });
    itemMeshes.forEach((g, i) => { if (g.visible && g.userData.spin) g.userData.spin.position.y = (M.items[i].k === 'weapon' ? 0.55 : 0.6) + Math.sin(tt * 2 + i) * 0.08; });
    for (const t of tagMeshes.values()) { t.m.rotation.y += dt * 3; t.m.position.y = t.p[1] + Math.sin(tt * 3) * 0.06; }
    if (sky) sky.position.copy(camera.position);
    if (clouds) { clouds.position.x += dt * 1.3; if (clouds.position.x > 120) clouds.position.x = -120; }
    updateParts(dt); updateFx(dt);
    // sınıf: hedef kesiti ve nişangâh
    hudAcc += dt;
    if (hudAcc > 0.08) {
      hudAcc = 0; updateHud(false); drawRadar();
      const Mo = fireMode(me.w, false), moving = hv > 0.5;
      const gap = 4 + (Mo.spread || 0) * 260 * (!me.onGround ? 2 : moving ? 1.6 : 1) + me.rec * 5;
      const cr = $('cross'); cr.style.setProperty('--g', gap.toFixed(1) + 'px');
      cr.className = (W.id === 'shotgun' ? 'ring' : W.type === 'melee' ? 'melee' : '') + (me.zoom && (W.id === 'sniper' || W.id === 'crossbow') ? ' hidden' : '');
      cr.style.display = me.zoom && (W.id === 'sniper' || W.id === 'crossbow') ? 'none' : 'block';
      if ($('board').style.display === 'block') updateBoard();
      syncPause();
    }
    if (me.alive && me.hp <= 25) { hbT -= dt; if (hbT <= 0) { hbT = 0.95; A.audio.play('beep', 0.7); } }
  } else if (M) {
    menuT += dt * 0.12;
    const cx = M.SIZE / 2, r = 40;
    camera.position.set(cx + Math.cos(menuT) * r, 20 + Math.sin(menuT * 1.7) * 3, cx + Math.sin(menuT) * r);
    camera.lookAt(cx, 4, cx); camera.fov = 70; camera.updateProjectionMatrix();
    vm.visible = false;
    if (sky) sky.position.copy(camera.position);
    if (clouds) { clouds.position.x += dt * 1.3; if (clouds.position.x > 120) clouds.position.x = -120; }
    itemMeshes.forEach((g) => { if (g.userData.spin) g.userData.spin.rotation.y = now / 600; });
  }
  renderer.render(scene, camera);
  drawPreview(now);
}

// ---------- menü: karakter önizlemesi ve ayarlar ----------
let prevR = null, prevScene = null, prevCam = null, prevAv = null;
function initPreview() {
  try { prevR = new THREE.WebGLRenderer({ canvas: $('prev'), antialias: true, alpha: true }); } catch (e) { prevR = null; return; }
  prevR.setSize(200, 230, false); prevR.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  prevScene = new THREE.Scene(); prevCam = new THREE.PerspectiveCamera(32, 200 / 230, 0.1, 50); prevCam.position.set(0, 1.25, 4.4); prevCam.lookAt(0, 1.0, 0);
  prevScene.add(new THREE.AmbientLight(0xffffff, 0.8)); const d = new THREE.DirectionalLight(0xffffff, 0.8); d.position.set(2, 4, 3); prevScene.add(d);
  rebuildPreview();
}
function rebuildPreview() {
  if (!prevScene) return;
  if (prevAv) prevScene.remove(prevAv.group);
  prevAv = A.makeAvatar([S.col, S.hat], '', false); setAvatarGun(prevAv, WIDX.ak);
  prevAv.armR.rotation.x = -1.35; prevAv.armL.rotation.x = -1.05; prevAv.armL.rotation.z = -0.3;
  prevScene.add(prevAv.group);
}
function drawPreview(now) {
  if (!prevR || $('menu').style.display === 'none') return;
  prevAv.group.rotation.y = now / 1400; prevAv.head.rotation.y = Math.sin(now / 700) * 0.25;
  prevR.render(prevScene, prevCam);
}
function buildMenu() {
  $('name').value = S.name || '';
  const sw = $('swatches');
  A.SKIN_COLORS.forEach((c, i) => { const b = document.createElement('button'); b.className = 'sw' + (i === S.col ? ' on' : ''); b.style.background = c; b.setAttribute('aria-label', 'Renk ' + (i + 1)); b.onclick = () => { S.col = i; [...sw.children].forEach((x, k) => x.classList.toggle('on', k === i)); saveS(); rebuildPreview(); }; sw.appendChild(b); });
  const setHat = (d) => { S.hat = (S.hat + d + A.HAT_NAMES.length) % A.HAT_NAMES.length; $('hatName').textContent = A.HAT_NAMES[S.hat]; saveS(); rebuildPreview(); };
  $('hatPrev').onclick = () => setHat(-1); $('hatNext').onclick = () => setHat(1); $('hatName').textContent = A.HAT_NAMES[S.hat];
  const defs = [['sens', 'Duyarlılık', 0.3, 2.5, 0.05, (v) => v.toFixed(2)], ['fov', 'Görüş açısı', 60, 100, 1, (v) => v + '°'], ['vol', 'Ses', 0, 1, 0.05, (v) => Math.round(v * 100) + '%']];
  defs.forEach(([k, label, lo, hi, st, fmt]) => {
    const row = document.createElement('div'); row.className = 'set';
    row.innerHTML = `<label for="s_${k}">${label}</label><input id="s_${k}" type="range" min="${lo}" max="${hi}" step="${st}" value="${S[k]}"><output id="o_${k}">${fmt(+S[k])}</output>`;
    $('settings').appendChild(row);
    row.querySelector('input').oninput = (e) => { S[k] = +e.target.value; $('o_' + k).textContent = fmt(S[k]); if (k === 'vol') A.audio.setVol(S.vol); saveS(); };
  });
  $('wgrid').innerHTML = WP.map((w) => `<span>${w.slot} · ${esc(w.name)}</span>`).join('');
  $('modeinfo').innerHTML = LOCAL ? 'Bu sürümde sunucu tarayıcıda çalışır: 6 botla maç.' : 'Çok oyunculu sunucu. Boş yerleri botlar doldurur.';
}
function start() {
  S.name = ($('name').value.trim() || 'Oyuncu' + Math.floor(Math.random() * 900 + 100)).slice(0, 16); saveS();
  A.audio.init(); A.audio.setVol(S.vol);
  $('play').disabled = true; connect(S.name);
  setTimeout(() => { if (!connected) { $('play').disabled = false; } }, 4000);
}
$('play').addEventListener('click', start);
$('name').addEventListener('keydown', (e) => { if (e.key === 'Enter') start(); });
buildMenu(); initPreview();
buildWorld(((Math.random() * 0x3fffff | 0) + 1) << 2 | (Math.random() * 4 | 0));
setVM(me.w);
requestAnimationFrame(frame);
window.__va = { me, players, get M() { return M; }, WP, S };
})();
