(() => {
'use strict';
const VM = window.VMap, WP = VM.WEAPONS, SLOTS = VM.SLOTS, PR = window.VProfile, VW = window.VWeapons, LOCAL = !!window.LOCAL_BUILD;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const COLORS = PR.COLORS, SKINS = PR.SKINS;
const EYE = 1.6, EYE_C = 1.15, RAD = 0.3;
const S = () => PR.data.settings;

// ---------- sahne ----------
const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 1, 0.05, 220);
camera.rotation.order = 'YXZ';
scene.add(camera);
const amb = new THREE.AmbientLight(0xffffff, 0.7); scene.add(amb);
const sun = new THREE.DirectionalLight(0xffffff, 0.75); sun.position.set(30, 60, 20); scene.add(sun);
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

const THEME_VIS = [
  { sky: 0x8ecbff, fog: [0x8ecbff, 32, 100], amb: 0xffffff, ambI: 0.72, sun: 0xfff3d6, sunI: 0.75, sunPos: [30, 60, 20], clouds: true,
    pal: { 1: 0x5db04a, 2: 0x8d9299, 3: 0xa8aab0, 4: 0xa8743a, 5: 0x8a5a36, 6: 0x2f8f3a } },
  { sky: 0xf0a56c, fog: [0xf0b48a, 26, 90], amb: 0xffdcc0, ambI: 0.68, sun: 0xffc48a, sunI: 0.85, sunPos: [-45, 35, 20], clouds: true,
    pal: { 1: 0x777777, 2: 0x6b6f7a, 3: 0xb7a79a, 4: 0xb5803d, 7: 0x3a3d45, 8: 0xd8d2c8, 9: 0x9c4a3a } },
  { sky: 0x1b2335, fog: [0x1b2335, 10, 58], amb: 0xa7b8d8, ambI: 0.6, sun: 0xbcd0ff, sunI: 0.45, sunPos: [10, 60, -10], clouds: false,
    pal: { 2: 0x555a66, 3: 0x7a7f8c, 4: 0x9a7040, 5: 0x343844, 9: 0x6e4b3a } },
];
function applyVis(tv, withFog) {
  scene.background = new THREE.Color(tv.sky); scene.fog = withFog ? new THREE.Fog(tv.fog[0], tv.fog[1], tv.fog[2]) : null;
  amb.color.setHex(tv.amb); amb.intensity = tv.ambI; sun.color.setHex(tv.sun); sun.intensity = tv.sunI; sun.position.set(...tv.sunPos);
  clouds.visible = tv.clouds;
}

function pixelTex() {
  const c = document.createElement('canvas'); c.width = c.height = 16;
  const g = c.getContext('2d');
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const v = 205 + Math.floor(Math.random() * 50); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, 1, 1); }
  g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 15, 16, 1); g.fillRect(0, 0, 1, 16); g.fillRect(15, 0, 1, 16);
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapLinearFilter;
  return t;
}
const blockTex = pixelTex();
const blockGeo = new THREE.BoxGeometry(1, 1, 1);

const clouds = new THREE.Group(); scene.add(clouds);
{ const cm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 });
  for (let i = 0; i < 9; i++) { const g = new THREE.Group(); const n = 3 + (i % 3);
    for (let k = 0; k < n; k++) { const b = new THREE.Mesh(blockGeo, cm); b.scale.set(4 + (k * 7 % 5), 1.5, 3 + (k * 3 % 4)); b.position.set(k * 4.5, (k % 2) * 0.4, (k * 5 % 3)); g.add(b); }
    g.position.set(-60 + i * 22 % 160, 26 + (i * 3 % 7), -70 + (i * 37 % 150)); clouds.add(g); } }

// ---------- harita ----------
let M = null, mapMesh = null, mini = null, themeIdx = 0;
function buildMap(seed, theme) {
  themeIdx = theme;
  const tv = THEME_VIS[theme];
  applyVis(tv, true);
  if (mapMesh) { scene.remove(mapMesh); mapMesh.material.dispose(); mapMesh = null; }
  M = VM.generate(seed, theme);
  const list = [];
  for (let y = 0; y < M.H; y++) for (let z = 0; z < M.SIZE; z++) for (let x = 0; x < M.SIZE; x++) {
    const id = M.get(x, y, z); if (!id) continue;
    if (M.get(x + 1, y, z) && M.get(x - 1, y, z) && M.get(x, y + 1, z) && M.get(x, y - 1, z) && M.get(x, y, z + 1) && M.get(x, y, z - 1)) continue;
    list.push([x, y, z, id]);
  }
  const mesh = new THREE.InstancedMesh(blockGeo, new THREE.MeshLambertMaterial({ map: blockTex }), list.length);
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  list.forEach(([x, y, z, id], i) => {
    m4.makeTranslation(x + 0.5, y + 0.5, z + 0.5); mesh.setMatrixAt(i, m4);
    const j = 0.92 + ((((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) >>> 0) % 17) / 100;
    col.setHex(tv.pal[id] || 0xff00ff).multiplyScalar(j); mesh.setColorAt(i, col);
  });
  mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
  scene.add(mesh); mapMesh = mesh;
  const c = document.createElement('canvas'); c.width = c.height = M.SIZE; const g = c.getContext('2d');
  for (let x = 0; x < M.SIZE; x++) for (let z = 0; z < M.SIZE; z++) {
    const ty = M.topY(x, z), id = M.get(x, ty, z), base = new THREE.Color(tv.pal[id] || 0x888888).multiplyScalar(0.55 + Math.min(ty, 9) * 0.06);
    g.fillStyle = '#' + base.getHexString(); g.fillRect(x, z, 1, 1);
  }
  mini = c;
  buildPickups();
}

// ---------- model üretici ----------
const matCache = {};
const mat = (c) => matCache[c] || (matCache[c] = new THREE.MeshLambertMaterial({ color: c }));
const basicMat = (c) => matCache['b' + c] || (matCache['b' + c] = new THREE.MeshBasicMaterial({ color: c }));
function box(sx, sy, sz, c, x, y, z) { const m = new THREE.Mesh(blockGeo, mat(c)); m.scale.set(sx, sy, sz); m.position.set(x, y, z); return m; }
const gskinTint = (i) => { const g = PR.GSKINS[i == null ? PR.data.equip.gskin : i]; return g ? g.color : null; };
const makeGun = (wi, tint, cl) => VW.makeGun(wi, tint == null ? null : tint, cl | 0);
const collOf = () => PR.data.equip.coll | 0;

// ---------- eşyalar ----------
const pickupMeshes = [];
let pickupState = [];
function buildPickups() {
  for (const m of pickupMeshes) scene.remove(m.g);
  pickupMeshes.length = 0;
  M.pickups.forEach((p, i) => {
    const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
    let beam = 0xffffff;
    if (p.kind === 'hp') { inner.add(box(0.5, 0.5, 0.5, 0xf4f4f4, 0, 0, 0), box(0.52, 0.14, 0.2, 0xe53935, 0, 0, 0), box(0.14, 0.52, 0.2, 0xe53935, 0, 0, 0)); beam = 0xff5a4f; }
    else if (p.kind === 'armor') { inner.add(box(0.46, 0.56, 0.22, 0xffb000, 0, 0, 0), box(0.3, 0.38, 0.26, 0x7a4f00, 0, 0, 0)); beam = 0xffc34a; }
    else if (p.kind === 'gren') { inner.add(box(0.28, 0.34, 0.28, 0x3f5a2a, 0, 0, 0), box(0.1, 0.1, 0.1, 0xbbbbbb, 0, 0.22, 0)); beam = 0x8fd45a; }
    else { const wi = +p.kind.slice(1), gm = makeGun(wi); gm.rotation.y = Math.PI / 2; gm.scale.setScalar(1.15); inner.add(gm); beam = 0x66b2ff; }
    inner.position.y = 0.9;
    const b = new THREE.Mesh(blockGeo, new THREE.MeshBasicMaterial({ color: beam, transparent: true, opacity: 0.18, depthWrite: false })); b.scale.set(0.9, 2.6, 0.9); b.position.y = 1.3; g.add(b);
    g.position.set(p.x, p.y, p.z); scene.add(g);
    pickupMeshes.push({ g, inner, i });
  });
  pickupState = M.pickups.map(() => true);
}
function setPickups(flags) { flags.forEach((f, i) => { pickupState[i] = !!f; if (pickupMeshes[i]) pickupMeshes[i].g.visible = !!f; }); }

// ---------- oyuncu modelleri ----------
const players = new Map(), avatars = new Map();
const TEAMCOL = [0x3a7bd5, 0xe74c3c], TEAMHEX = ['#4d9bff', '#ff5a4d'], TEAMTXT = ['MAVİ', 'KIRMIZI'];
let TS = [0, 0];
const myTeam = () => { const q = players.get(myId); return q ? q.tm | 0 : 0; };
const TEAMMODE = () => MODE === 'tdm' || MODE === 'ctf';
let UPL = {}; // silah güçlendirme seviyeleri
const upv = (wi, k) => 1 + (k === 'dmg' || k === 'mag' ? 1 : -1) * PR.UP_FX[k] * ((UPL[wi] | 0));
const magOf = (wi) => (WP[wi].mag ? Math.round(WP[wi].mag * upv(wi, 'mag')) : 0);
const reloadOf = (wi) => WP[wi].reload * upv(wi, 'reload');
const spreadOf = (wi) => WP[wi].spread * upv(wi, 'spread');
let ZW = 0; // zombi dalgası: [dalga, kalan zombi, ara sayacı]
function makeLabel(text, color) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
  g.font = '700 34px Rajdhani, sans-serif'; g.textAlign = 'center'; g.lineWidth = 7; g.strokeStyle = '#000'; g.strokeText(text, 128, 44); g.fillStyle = color || '#fff'; g.fillText(text, 128, 44);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  s.scale.set(1.7, 0.42, 1); s.position.y = 2.3; return s;
}
function addHat(head, kind) {
  if (kind === 1) head.add(box(0.44, 0.1, 0.44, 0xd32f2f, 0, 0.24, 0), box(0.4, 0.04, 0.22, 0xb71c1c, 0, 0.2, -0.3));
  else if (kind === 2) { head.add(box(0.42, 0.12, 0.42, 0xffd23f, 0, 0.26, 0)); for (const [x, z] of [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]]) head.add(box(0.07, 0.12, 0.07, 0xffd23f, x, 0.36, z)); }
  else if (kind === 3) head.add(box(0.47, 0.22, 0.47, 0x5a6b34, 0, 0.17, 0), box(0.1, 0.06, 0.2, 0x3e4a24, 0, 0.3, 0));
  else if (kind === 4) head.add(box(0.04, 0.34, 0.04, 0x888888, 0, 0.36, 0), box(0.12, 0.12, 0.12, 0xff3b30, 0, 0.58, 0));
  else if (kind === 5) { for (const s of [-1, 1]) { const h = box(0.08, 0.26, 0.08, 0xf5f0e0, s * 0.2, 0.3, 0); h.rotation.z = -s * 0.5; head.add(h); } }
  else if (kind === 6) head.add(box(0.74, 0.04, 0.6, 0x8d5a2b, 0, 0.22, 0), box(0.36, 0.2, 0.36, 0x7a4a22, 0, 0.33, 0), box(0.38, 0.05, 0.38, 0x3e2a14, 0, 0.26, 0));
  else if (kind === 7) head.add(box(0.5, 0.04, 0.5, 0x1b1b1f, 0, 0.21, 0), box(0.34, 0.36, 0.34, 0x1b1b1f, 0, 0.4, 0), box(0.36, 0.06, 0.36, 0xc62828, 0, 0.27, 0));
  else if (kind === 8) { const gm = basicMat(0xffe066); for (const [sx, sz, x, z] of [[0.5, 0.06, 0, -0.22], [0.5, 0.06, 0, 0.22], [0.06, 0.5, -0.22, 0], [0.06, 0.5, 0.22, 0]]) { const m = new THREE.Mesh(blockGeo, gm); m.scale.set(sx, 0.05, sz); m.position.set(x, 0.6, z); head.add(m); } }
  else if (kind === 9) { head.add(box(0.56, 0.06, 0.5, 0x15151a, 0, 0.22, 0), box(0.4, 0.14, 0.4, 0x15151a, 0, 0.3, 0), box(0.1, 0.1, 0.02, 0xffffff, 0, 0.3, -0.21), box(0.08, 0.12, 0.5, 0x15151a, -0.27, 0.27, 0), box(0.08, 0.12, 0.5, 0x15151a, 0.27, 0.27, 0)); }
  else if (kind === 10) { head.add(box(0.72, 0.04, 0.72, 0x4a2a7a, 0, 0.22, 0), box(0.42, 0.16, 0.42, 0x4a2a7a, 0, 0.32, 0), box(0.28, 0.18, 0.28, 0x4a2a7a, 0, 0.48, 0), box(0.16, 0.16, 0.16, 0x4a2a7a, 0.05, 0.64, 0), box(0.44, 0.05, 0.44, 0xf1c40f, 0, 0.26, 0)); }
  else if (kind === 11) { head.add(box(0.42, 0.1, 0.42, 0xffffff, 0, 0.25, 0), box(0.52, 0.26, 0.52, 0xf5f5f5, 0, 0.43, 0), box(0.2, 0.12, 0.2, 0xffffff, -0.15, 0.62, 0), box(0.2, 0.12, 0.2, 0xffffff, 0.15, 0.62, 0.08)); }
  else if (kind === 12) { head.add(box(0.46, 0.07, 0.46, 0xffffff, 0, 0.22, 0), box(0.44, 0.14, 0.44, 0xd32f2f, 0, 0.3, 0), box(0.32, 0.14, 0.32, 0xd32f2f, 0, 0.43, 0.05), box(0.2, 0.12, 0.2, 0xd32f2f, 0, 0.55, 0.1), box(0.1, 0.1, 0.1, 0xffffff, 0, 0.64, 0.16)); }
  else if (kind === 13) { [0, 1, 2, 3, 4].forEach((i) => head.add(box(0.07, 0.16 + (i % 2) * 0.08, 0.07, 0xff2d95, 0, 0.26 + (i % 2) * 0.04, -0.16 + i * 0.08))); }
  else if (kind === 14) { head.add(box(0.46, 0.14, 0.46, 0xffc107, 0, 0.27, 0), box(0.5, 0.04, 0.56, 0xffc107, 0, 0.21, -0.04), box(0.08, 0.06, 0.4, 0xffa000, 0, 0.36, 0)); const l = new THREE.Mesh(blockGeo, basicMat(0xffffff)); l.scale.set(0.12, 0.08, 0.04); l.position.set(0, 0.28, -0.24); head.add(l); }
  else if (kind === 15) { head.add(box(0.47, 0.47, 0.47, 0x9aa3ad, 0, 0.02, 0), box(0.3, 0.05, 0.02, 0x111111, 0, 0.04, -0.24), box(0.06, 0.2, 0.3, 0xd32f2f, 0, 0.36, 0), box(0.49, 0.05, 0.49, 0x6c757d, 0, 0.2, 0)); }
  else if (kind === 16) { const cols = [0xff4a00, 0xff8a00, 0xffd23f]; cols.forEach((c, i) => { const m = new THREE.Mesh(blockGeo, basicMat(c)); m.scale.set(0.34 - i * 0.09, 0.2, 0.34 - i * 0.09); m.position.set(0, 0.3 + i * 0.16, 0); head.add(m); }); }
  else if (kind === 17) { const g = basicMat(0xffe066); head.add(box(0.44, 0.14, 0.44, 0xffd23f, 0, 0.27, 0)); for (const [x, z] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17], [0, -0.19], [0, 0.19]]) head.add(box(0.08, 0.2, 0.08, 0xffd23f, x, 0.42, z)); for (const [x, z] of [[-0.17, -0.17], [0.17, 0.17], [0, -0.19]]) { const m = new THREE.Mesh(blockGeo, basicMat(0xff3b30)); m.scale.set(0.06, 0.06, 0.06); m.position.set(x, 0.55, z); head.add(m); } }
  else if (kind === 18) { head.add(box(0.3, 0.16, 0.34, 0xffd23f, 0, 0.28, 0), box(0.2, 0.18, 0.2, 0xffd23f, 0, 0.42, 0.04), box(0.16, 0.06, 0.1, 0xff8a00, 0, 0.4, -0.12), box(0.05, 0.05, 0.02, 0x111111, 0.07, 0.46, -0.07), box(0.05, 0.05, 0.02, 0x111111, -0.07, 0.46, -0.07)); }
  else if (kind === 19) { head.add(box(0.46, 0.06, 0.1, 0x2b2b30, 0, 0.23, 0), box(0.12, 0.2, 0.14, 0x2b2b30, -0.26, 0.04, 0), box(0.12, 0.2, 0.14, 0x2b2b30, 0.26, 0.04, 0), box(0.04, 0.12, 0.1, 0xe53935, -0.33, 0.04, 0), box(0.04, 0.12, 0.1, 0xe53935, 0.33, 0.04, 0)); }
  else if (kind === 20) { const m = new THREE.Mesh(blockGeo, basicMat(0x35e0ff)); m.scale.set(0.44, 0.09, 0.06); m.position.set(0, 0.06, -0.22); head.add(m, box(0.46, 0.04, 0.46, 0x2b2b30, 0, 0.12, 0)); }
  else if (kind === 21) { head.add(box(0.08, 0.14, 0.08, 0xf5ecd8, 0, 0.27, 0), box(0.46, 0.1, 0.46, 0xd32f2f, 0, 0.38, 0), box(0.34, 0.08, 0.34, 0xd32f2f, 0, 0.46, 0), box(0.08, 0.04, 0.02, 0xffffff, -0.12, 0.4, -0.24), box(0.08, 0.04, 0.02, 0xffffff, 0.1, 0.4, -0.24)); }
  else if (kind === 22) { head.add(box(0.44, 0.1, 0.44, 0xbdefff, 0, 0.26, 0)); for (const [x, z] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17], [0, 0]]) { const m = new THREE.Mesh(blockGeo, basicMat(0x7df9ff)); m.scale.set(0.1, 0.22, 0.1); m.position.set(x, 0.42, z); m.rotation.y = 0.8; head.add(m); } }
}
function addBack(body, kind) {
  if (kind === 1) body.add(box(0.4, 0.5, 0.2, 0x6d4c41, 0, 1.05, 0.25), box(0.3, 0.2, 0.06, 0x4e342e, 0, 0.9, 0.37));
  else if (kind === 2) { const c = box(0.5, 0.85, 0.04, 0xb71c1c, 0, 0.92, 0.2); c.rotation.x = 0.12; body.add(c, box(0.56, 0.06, 0.08, 0xffd23f, 0, 1.38, 0.18)); }
  else if (kind === 3) for (const s of [-1, 1]) { const w = box(0.5, 0.75, 0.04, 0xf5f5f5, s * 0.42, 1.25, 0.2); w.rotation.z = s * 0.45; body.add(w); const w2 = box(0.3, 0.5, 0.04, 0xdadada, s * 0.62, 1.1, 0.2); w2.rotation.z = s * 0.7; body.add(w2); }
  else if (kind === 4) { for (const s of [-1, 1]) { body.add(box(0.14, 0.5, 0.14, 0x9aa3ad, s * 0.15, 1.05, 0.22), box(0.1, 0.12, 0.1, 0xff9800, s * 0.15, 0.72, 0.22)); } }
  else if (kind === 5) { const sw = box(0.06, 0.95, 0.04, 0xcfd8dc, 0.12, 1.15, 0.2); sw.rotation.z = 0.55; const hl = box(0.2, 0.05, 0.05, 0xffd23f, -0.12, 0.76, 0.2); hl.rotation.z = 0.55; body.add(sw, hl); }
  else if (kind === 6) { body.add(box(0.2, 0.55, 0.14, 0x6d4c2a, 0.12, 1.15, 0.22)); for (const x of [0.06, 0.12, 0.18]) body.add(box(0.03, 0.2, 0.03, 0xe0e0e0, x, 1.5, 0.22), box(0.05, 0.05, 0.05, 0xd32f2f, x, 1.62, 0.22)); }
  else if (kind === 7) { body.add(box(0.5, 0.6, 0.06, 0x7a8088, 0, 1.05, 0.22), box(0.34, 0.4, 0.07, 0xc62828, 0, 1.05, 0.25), box(0.1, 0.1, 0.08, 0xffd23f, 0, 1.05, 0.27)); }
  else if (kind === 8) for (const s_ of [-1, 1]) { const w = box(0.5, 0.7, 0.04, 0x7a1010, s_ * 0.42, 1.25, 0.2); w.rotation.z = s_ * 0.5; body.add(w, box(0.14, 0.2, 0.05, 0xd32f2f, s_ * 0.7, 1.55, 0.2)); }
  else if (kind === 9) { for (const s_ of [-1, 1]) body.add(box(0.14, 0.5, 0.14, 0x2a6f97, s_ * 0.15, 1.05, 0.22), box(0.08, 0.08, 0.08, 0xdddddd, s_ * 0.15, 1.34, 0.22)); body.add(box(0.36, 0.05, 0.05, 0x222222, 0, 1.2, 0.18)); }
  else if (kind === 10) { const g = box(0.3, 0.4, 0.06, 0xc58a2c, 0, 0.95, 0.22); g.rotation.z = 0.35; const n = box(0.06, 0.4, 0.04, 0x6d4c2a, -0.1, 1.25, 0.22); n.rotation.z = 0.35; body.add(g, n, box(0.12, 0.12, 0.07, 0x222222, 0.02, 0.92, 0.25)); }
  else if (kind === 11) { const cols = [0xff1744, 0xff9100, 0xffea00, 0x00e676, 0x2979ff, 0xd500f9]; cols.forEach((c, i) => { const m = new THREE.Mesh(blockGeo, basicMat(c)); m.scale.set(0.5, 0.14, 0.04); m.position.set(0, 1.38 - i * 0.15, 0.2); m.rotation.x = 0.12; body.add(m); }); }
  else if (kind === 12) { body.add(box(0.46, 0.6, 0.22, 0x4a4f55, 0, 1.05, 0.26), box(0.2, 0.2, 0.3, 0x7a7d82, -0.1, 1.15, 0.3), box(0.2, 0.2, 0.3, 0x7a7d82, 0.1, 1.15, 0.3), box(0.2, 0.06, 0.1, 0xd32f2f, -0.1, 1.28, 0.44), box(0.2, 0.06, 0.1, 0xd32f2f, 0.1, 1.28, 0.44)); }
  else if (kind === 13) for (const s_ of [-1, 1]) { const w = new THREE.Mesh(blockGeo, basicMat(0xffd23f)); w.scale.set(0.55, 0.8, 0.04); w.position.set(s_ * 0.45, 1.28, 0.2); w.rotation.z = s_ * 0.5; const w2 = new THREE.Mesh(blockGeo, basicMat(0xfff3b0)); w2.scale.set(0.4, 0.5, 0.05); w2.position.set(s_ * 0.5, 1.3, 0.21); w2.rotation.z = s_ * 0.5; body.add(w, w2); }
}
function makeAvatar(p) {
  const group = new THREE.Group(), body = new THREE.Group(); group.add(body);
  const sk = SKINS[p.sk | 0] || SKINS[0], gold = sk.pattern === 'gold';
  const teamOn = TEAMMODE() && p.id !== 0, col = teamOn ? TEAMCOL[p.tm | 0] : gold ? 0xffd23f : COLORS[p.c % COLORS.length], dark = new THREE.Color(col).multiplyScalar(0.55).getHex();
  const torso = box(0.55, 0.8, 0.3, col, 0, 1.0, 0), head = new THREE.Group(); head.position.set(0, 1.6, 0);
  head.add(box(0.4, 0.4, 0.4, sk.head, 0, 0, 0), box(0.07, 0.07, 0.02, sk.eye, -0.1, 0.03, -0.205), box(0.07, 0.07, 0.02, sk.eye, 0.1, 0.03, -0.205));
  if (sk.pattern === 'band') head.add(box(0.43, 0.08, 0.43, 0xd32f2f, 0, 0.1, 0), box(0.06, 0.12, 0.1, 0xd32f2f, 0.1, 0.05, 0.26));
  if (sk.pattern === 'rip') head.add(box(0.12, 0.05, 0.02, 0x4a1010, 0.1, -0.1, -0.205));
  addHat(head, p.hat | 0);
  const l1 = new THREE.Group(), l2 = new THREE.Group(); l1.position.set(-0.14, 0.6, 0); l2.position.set(0.14, 0.6, 0);
  l1.add(box(0.24, 0.6, 0.26, dark, 0, -0.3, 0)); l2.add(box(0.24, 0.6, 0.26, dark, 0, -0.3, 0));
  const arm = box(0.14, 0.14, 0.45, sk.head, 0.32, 1.15, -0.2);
  const gun = new THREE.Group(); gun.position.set(0.32, 1.12, -0.35); gun.scale.setScalar(0.8);
  body.add(torso, head, l1, l2, arm, gun);
  if (sk.pattern === 'camo') body.add(box(0.18, 0.16, 0.02, 0x3e5230, -0.12, 1.2, -0.16), box(0.16, 0.14, 0.02, 0x6b5436, 0.12, 0.95, -0.16), box(0.14, 0.12, 0.02, 0x4a5d3a, -0.1, 0.8, -0.16));
  if (sk.pattern === 'panel') body.add(box(0.3, 0.22, 0.02, 0x35e0ff, 0, 1.12, -0.16), box(0.12, 0.08, 0.02, 0x222222, 0, 0.9, -0.16));
  if (sk.pattern === 'rip') body.add(box(0.22, 0.2, 0.02, sk.head, 0.1, 1.2, -0.16));
  if (sk.pattern === 'band') body.add(box(0.57, 0.1, 0.32, 0xd32f2f, 0, 0.62, 0));
  const bx = (sx, sy, sz, c, x, y, z, par) => (par || body).add(box(sx, sy, sz, c, x, y, z));
  switch (sk.pattern) {
    case 'fang': head.add(box(0.04, 0.07, 0.02, 0xffffff, -0.07, -0.12, -0.205), box(0.04, 0.07, 0.02, 0xffffff, 0.07, -0.12, -0.205)); bx(0.57, 0.1, 0.32, 0x5a0f1a, 0, 0.62, 0); break;
    case 'stripe': for (const x of [-0.12, 0, 0.12]) head.add(box(0.05, 0.2, 0.02, 0x1a1a1a, x, 0.1, -0.205)); for (const y of [1.2, 1.0, 0.8]) bx(0.57, 0.06, 0.32, 0x1a1a1a, 0, y, 0); break;
    case 'ghost': bx(0.58, 0.82, 0.32, 0xf4f8fb, 0, 1.0, 0); head.add(box(0.1, 0.12, 0.02, 0x111111, 0, -0.1, -0.205)); break;
    case 'alien': head.add(box(0.12, 0.08, 0.02, 0x000000, -0.1, 0.03, -0.21), box(0.12, 0.08, 0.02, 0x000000, 0.1, 0.03, -0.21), box(0.03, 0.2, 0.03, 0x7be07b, -0.1, 0.3, 0), box(0.03, 0.2, 0.03, 0x7be07b, 0.1, 0.3, 0), box(0.07, 0.07, 0.07, 0xb6ff6b, -0.1, 0.42, 0), box(0.07, 0.07, 0.07, 0xb6ff6b, 0.1, 0.42, 0)); break;
    case 'skull': head.add(box(0.1, 0.12, 0.02, 0x111111, -0.09, 0.03, -0.205), box(0.1, 0.12, 0.02, 0x111111, 0.09, 0.03, -0.205), box(0.06, 0.06, 0.02, 0x111111, 0, -0.06, -0.205)); for (const y of [1.25, 1.1, 0.95]) bx(0.4, 0.04, 0.32, 0xeeeeea, 0, y, -0.01); break;
    case 'wrap': for (const y of [0.1, -0.02, -0.14]) head.add(box(0.43, 0.04, 0.43, 0xe9dcb8, 0, y, 0)); for (const y of [1.3, 1.1, 0.9]) bx(0.57, 0.05, 0.32, 0xe9dcb8, 0, y, 0); break;
    case 'lava': { const o = new THREE.Mesh(blockGeo, basicMat(0xff6a00)); o.scale.set(0.08, 0.2, 0.02); o.position.set(0.05, -0.02, -0.205); head.add(o); const o2 = new THREE.Mesh(blockGeo, basicMat(0xff6a00)); o2.scale.set(0.3, 0.05, 0.02); o2.position.set(0, 1.1, -0.16); body.add(o2); break; }
    case 'ice': head.add(box(0.06, 0.16, 0.06, 0xe8f9ff, -0.12, 0.3, 0), box(0.06, 0.22, 0.06, 0xe8f9ff, 0, 0.32, 0), box(0.06, 0.16, 0.06, 0xe8f9ff, 0.12, 0.3, 0)); bx(0.57, 0.08, 0.32, 0xe8f9ff, 0, 1.38, 0); break;
    case 'visor': head.add(box(0.45, 0.46, 0.45, 0x9aa3ad, 0, 0, 0), box(0.32, 0.05, 0.02, 0x111111, 0, 0.03, -0.235)); bx(0.57, 0.3, 0.33, 0x7d868f, 0, 1.15, 0); break;
    case 'royal': bx(0.57, 0.1, 0.32, 0xd32f2f, 0, 1.38, 0); bx(0.57, 0.06, 0.33, 0xffffff, 0, 1.3, 0); break;
    case 'rainbow': [0xff1744, 0xff9100, 0xffea00, 0x00e676, 0x2979ff].forEach((c, i) => { const m = new THREE.Mesh(blockGeo, basicMat(c)); m.scale.set(0.57, 0.16, 0.32); m.position.set(0, 1.35 - i * 0.16, 0); body.add(m); }); break;
    case 'galaxy': for (const [x, y] of [[-0.15, 1.3], [0.1, 1.15], [-0.05, 0.95], [0.18, 0.85], [-0.2, 0.8]]) { const m = new THREE.Mesh(blockGeo, basicMat(0xffffff)); m.scale.set(0.05, 0.05, 0.02); m.position.set(x, y, -0.16); body.add(m); } head.add(box(0.05, 0.05, 0.02, 0xb388ff, 0.12, 0.12, -0.205)); break;
  }
  addBack(body, p.bk | 0);
  if (p.z) { body.scale.setScalar(p.z === 2 ? 1.35 : 1); }
  const label = makeLabel(p.name || '', p.z ? '#9be36a' : teamOn ? ((p.tm | 0) === myTeam() ? '#7fc0ff' : '#ff8a7e') : null); group.add(label);
  scene.add(group);
  const a = { group, body, head, l1, l2, gun, gunIdx: -1, target: new THREE.Vector3(...(p.p || [0, 0, 0])), yaw: p.yaw || 0, label, walk: 0, moved: 0, last: new THREE.Vector3(...(p.p || [0, 0, 0])) };
  group.position.copy(a.target);
  return a;
}
function ensureAvatar(p) { let a = avatars.get(p.id); if (!a) { a = makeAvatar(p); avatars.set(p.id, a); } return a; }
function removeAvatar(id) { const a = avatars.get(id); if (a) { scene.remove(a.group); avatars.delete(id); } }
function clearAvatars() { for (const id of [...avatars.keys()]) removeAvatar(id); }

// ---------- görünüm silahları ----------
const gunRoot = new THREE.Group(); camera.add(gunRoot);
let vms = [], vmCur = -1, vmTint = '#';
function buildViewmodels() {
  const tint = gskinTint(); const key = String(tint) + '|' + collOf();
  if (vmTint === key && vms.length) return;
  for (const v of vms) gunRoot.remove(v);
  vms = WP.map((w, i) => {
    const m = makeGun(i, tint, collOf()); m.visible = false; gunRoot.add(m);
    const d = VW.DEFS[i];
    if (d.flash && VW.hasFlash(i)) { const f = new THREE.Mesh(blockGeo, basicMat(0xffd060)); f.scale.set(0.12, 0.12, 0.1); f.position.set(...d.flash); f.visible = false; m.add(f); m.userData.flashMesh = f; }
    return m;
  });
  vmTint = key; vmCur = -1;
}

// ---------- parçacıklar ve efektler ----------
const parts = [];
const pgeo = new THREE.BoxGeometry(1, 1, 1);
function burst(pos, color, n, speed, size, life, grav) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(pgeo, basicMat(color)); m.scale.setScalar(size * (0.6 + Math.random() * 0.8)); m.position.copy(pos); scene.add(m);
    parts.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * speed, Math.random() * speed * 0.8, (Math.random() - 0.5) * speed), life: life * (0.6 + Math.random() * 0.6), grav: grav == null ? 14 : grav });
  }
}
const tracers = [];
function tracer(a, b, color) {
  const g = new THREE.BufferGeometry().setFromPoints([a, b]);
  const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: color || 0xfff1a8, transparent: true, opacity: 0.9 })); scene.add(l); tracers.push({ l, born: performance.now() });
}
const booms = [];
let shake = 0;
function explosion(pos, r) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff9a2e, transparent: true, opacity: 0.85, depthWrite: false })); m.position.copy(pos); scene.add(m);
  booms.push({ m, born: performance.now(), r });
  burst(pos, 0xffc04a, 14, 9, 0.28, 0.7, 6); burst(pos, 0x555555, 10, 6, 0.4, 1.0, 2); burst(pos, 0xff5a1f, 8, 8, 0.25, 0.6, 8);
  const d = pos.distanceTo(camera.position); if (d < 18) shake = Math.max(shake, (1 - d / 18) * 0.9);
  sfx.boom(Math.max(0.15, 1 - d / 45));
}
function clearEffects() {
  for (const p of parts) scene.remove(p.m); parts.length = 0;
  for (const t of tracers) scene.remove(t.l); tracers.length = 0;
  for (const b of booms) scene.remove(b.m); booms.length = 0;
}

// ---------- ses ----------
let actx = null, noiseBuf = null, master = null;
function ac() { try { if (!actx) { actx = new (window.AudioContext || window.webkitAudioContext)(); master = actx.createGain(); master.gain.value = S().vol; master.connect(actx.destination); const n = actx.sampleRate; noiseBuf = actx.createBuffer(1, n, n); const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; } if (actx.state === 'suspended') actx.resume(); return actx; } catch (e) { return null; } }
function setVolume(v) { if (master) master.gain.value = v; }
function tone(f, dur, type, vol, slide) { const c = ac(); if (!c) return; const o = c.createOscillator(), g = c.createGain(); o.type = type || 'square'; o.frequency.setValueAtTime(f, c.currentTime); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), c.currentTime + dur); g.gain.setValueAtTime(vol, c.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur); o.connect(g); g.connect(master); o.start(); o.stop(c.currentTime + dur); }
function noise(dur, vol, ftype, freq, q) { const c = ac(); if (!c) return; const s = c.createBufferSource(); s.buffer = noiseBuf; const f = c.createBiquadFilter(); f.type = ftype; f.frequency.value = freq; if (q) f.Q.value = q; const g = c.createGain(); g.gain.setValueAtTime(vol, c.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur); s.connect(f); f.connect(g); g.connect(master); s.start(c.currentTime, Math.random() * 0.5, dur); }
const sfx = {
  shot(wi, v) { v = v == null ? 1 : v; if (v <= 0.02) return;
    switch (wi) {
      case 0: case 15: noise(0.14, 0.12 * v, 'highpass', 1800); break;
      case 1: noise(0.09, 0.22 * v, 'bandpass', 1600, 0.8); tone(240, 0.06, 'square', 0.06 * v, 90); break;
      case 2: noise(0.11, 0.3 * v, 'bandpass', 900, 0.7); tone(130, 0.09, 'sawtooth', 0.1 * v, 60); break;
      case 9: noise(0.09, 0.28 * v, 'bandpass', 1300, 0.7); tone(150, 0.07, 'sawtooth', 0.08 * v, 70); break;
      case 3: case 10: noise(0.07, 0.24 * v, 'bandpass', 2200, 0.8); tone(170, 0.05, 'square', 0.05 * v, 90); break;
      case 4: case 11: noise(0.28, 0.5 * v, 'lowpass', 1500); tone(80, 0.22, 'sawtooth', 0.18 * v, 35); break;
      case 5: case 12: noise(0.45, 0.55 * v, 'lowpass', 2400); tone(70, 0.4, 'sawtooth', 0.2 * v, 28); break;
      case 6: tone(520, 0.16, 'sawtooth', 0.12 * v, 150); noise(0.08, 0.1 * v, 'highpass', 3000); break;
      case 7: noise(0.5, 0.35 * v, 'lowpass', 900); tone(110, 0.35, 'sawtooth', 0.12 * v, 45); break;
      case 13: noise(0.25, 0.3 * v, 'lowpass', 700); tone(90, 0.2, 'square', 0.12 * v, 50); break;
      case 8: noise(0.2, 0.45 * v, 'bandpass', 700, 0.6); tone(95, 0.18, 'sawtooth', 0.18 * v, 45); break;
      case 14: noise(0.05, 0.2 * v, 'bandpass', 1000, 0.7); break;
    } },
  boom(v) { noise(0.8, 0.8 * v, 'lowpass', 500); tone(65, 0.6, 'sine', 0.5 * v, 28); },
  hit(kill, head) { tone(kill ? 1300 : head ? 1000 : 760, 0.07, 'sine', 0.12); if (kill) setTimeout(() => tone(1700, 0.08, 'sine', 0.1), 70); },
  hurt() { tone(120, 0.14, 'sawtooth', 0.14, 60); },
  pick(kind) { tone(kind === 'hp' ? 660 : 880, 0.09, 'sine', 0.12); setTimeout(() => tone(kind === 'hp' ? 990 : 1320, 0.12, 'sine', 0.1), 85); },
  tag() { tone(1000, 0.06, 'square', 0.07); setTimeout(() => tone(1500, 0.08, 'square', 0.07), 60); },
  empty() { tone(300, 0.03, 'square', 0.05); },
  draw() { noise(0.06, 0.1, 'highpass', 2000); },
  mag(out) { noise(0.05, 0.12, 'bandpass', out ? 1400 : 2200, 1); tone(out ? 200 : 320, 0.04, 'square', 0.04); },
  bolt() { noise(0.05, 0.12, 'highpass', 2600); tone(420, 0.04, 'square', 0.04, 300); },
  pump() { noise(0.06, 0.16, 'bandpass', 900, 1); setTimeout(() => noise(0.06, 0.16, 'bandpass', 1300, 1), 130); },
  bok() { tone(520, 0.08, 'square', 0.08, 380); setTimeout(() => tone(420, 0.1, 'square', 0.08, 300), 90); },
  dash() { noise(0.18, 0.16, 'bandpass', 1200, 0.5); },
  chat() { tone(880, 0.04, 'sine', 0.05); },
  ui() { tone(700, 0.04, 'square', 0.04); },
};
// doldurma sesleri: silaha özel zamanlama
const RELOAD_SFX = {
  def: [[0.3, () => sfx.mag(true)], [0.62, () => sfx.mag(false)], [0.86, () => sfx.bolt()]],
  4: [[0.3, () => sfx.mag(true)], [0.72, () => sfx.mag(false)]], 11: [[0.1, () => sfx.mag(false)], [0.28, () => sfx.mag(false)], [0.46, () => sfx.mag(false)], [0.8, () => sfx.pump()]],
  7: [[0.35, () => sfx.mag(false)]], 13: [[0.3, () => sfx.mag(true)], [0.7, () => sfx.mag(false)]], 8: [[0.2, () => sfx.mag(true)], [0.75, () => sfx.mag(false)]], 6: [[0.55, () => sfx.bolt()]],
};

// ---------- durum ----------
let ws = null, myId = 0, connected = false, roundOver = false, WIN = 15, LABEL = 'Künye', MODE = 'kc', locked = false, paused = false, mouseDown = false, chatOpen = false, leaving = false;
const me = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), kb: new THREE.Vector3(), yaw: 0, pitch: 0, onGround: false, alive: true, hp: 100, armor: 0, w: 2, owned: [0, 1, 2], gren: 2, ammo: WP.map((w) => w.mag), reloadEnd: 0, reloadStart: 0, nextFire: 0, zoom: false, adsT: 0, sprintT: 0, crouch: false, eye: EYE, dashT: 0, dashCd: 0, dashDir: new THREE.Vector3(), bob: 0, recoil: 0, drawT: 1, fireT: 1, spin: 0, spinV: 0, swayX: 0, swayY: 0, reloadFx: 0 };
const keys = {}, tagMeshes = new Map(), projMeshes = new Map(), chickenMeshes = new Map();
const lastShot = new Map();
let killerInfo = null;
let MS = { kills: 0, deaths: 0, heads: 0 };

function reward(px, xp, txt) {
  if (typeof MS !== 'undefined') { MS.px = (MS.px || 0) + px; MS.xp = (MS.xp || 0) + xp; }
  PR.addPx(px); const lv = PR.addXp(xp);
  pop(`+${px} PX ${txt || ''}`);
  if (lv > 0) setTimeout(() => pop(`SEVİYE ${PR.level()}! +${lv * 5} elmas`), 1200);
}

// ---------- arayüz ----------
const cache = {};
function setTxt(id, v) { if (cache[id] !== v) { cache[id] = v; $(id).textContent = v; } }
function feed(html, mine) { const d = document.createElement('div'); if (mine) d.className = 'me'; d.innerHTML = html; $('feed').appendChild(d); while ($('feed').children.length > 6) $('feed').firstChild.remove(); setTimeout(() => d.remove(), 6500); }
let msgTimer = 0;
function showMsg(html, ms) { const el = $('msg'); el.innerHTML = html; el.style.display = html ? 'block' : 'none'; clearTimeout(msgTimer); if (ms) msgTimer = setTimeout(() => (el.style.display = 'none'), ms); }
let popTimer = 0;
function pop(t) { $('pops').textContent = t; clearTimeout(popTimer); popTimer = setTimeout(() => ($('pops').textContent = ''), 1400); }
function hitMark(head, kill) { const h = $('hit'); h.classList.toggle('head', !!head); h.classList.add('on'); setTimeout(() => h.classList.remove('on'), kill ? 160 : 90); sfx.hit(kill, head); }
function weaponName(w) { return w === -1 ? 'El Bombası' : WP[w] ? WP[w].name : ''; }
const tr = (s) => s.toLocaleUpperCase('tr');
function buildWbar() {
  let html = '';
  SLOTS.forEach((s, i) => {
    const own = s.filter((w) => me.owned.indexOf(w) >= 0); if (!own.length) return;
    const cur = own.indexOf(me.w) >= 0 ? me.w : own[0];
    html += `<div class="ws${cur === me.w ? ' sel' : ''}"><b>${i + 1}</b>${esc(WP[cur].name)}</div>`;
  });
  $('wbar').innerHTML = html;
}
function refreshHud() {
  setTxt('hp', String(Math.max(0, Math.round(me.hp)))); setTxt('ar', String(Math.round(me.armor)));
  $('stat').classList.toggle('low', me.hp <= 25);
  const w = WP[me.w], reloading = me.reloadEnd > performance.now();
  if (w.kind === 'melee') { setTxt('am', '—'); setTxt('mag', ''); } else { setTxt('am', reloading ? '…' : String(me.ammo[me.w])); setTxt('mag', '/ ' + magOf(me.w)); }
  setTxt('gr', String(me.gren)); setTxt('wname', tr(w.name));
  const p = players.get(myId);
  const all = [...players.values()].sort((a, b) => b.score - a.score || b.kills - a.kills);
  if (TEAMMODE()) { const t = myTeam(); setTxt('score', `MAVİ ${TS[0]} — ${TS[1]} KIRMIZI`); setTxt('leader', MODE === 'ctf' ? ctfStatus(t) : `Takımın: ${TEAMTXT[t]} · hedef ${WIN}`); $('score').style.color = TEAMHEX[t]; }
  else if (MODE === 'zom') { $('score').style.color = '#9be36a'; const z = ZW || [0, 0, 0]; setTxt('score', `DALGA ${Math.max(1, z[0])} / ${WIN}`); setTxt('leader', z[2] > 0 ? `Sonraki dalga ${z[2]} sn · hazırlan` : `Kalan zombi: ${z[1]}`); }
  else { $('score').style.color = ''; setTxt('score', `${tr(LABEL)} ${p ? p.score : 0} / ${WIN}`); setTxt('leader', all[0] ? `Lider: ${all[0].name} (${all[0].score})` : ''); }
  const key = me.owned.join(',') + '|' + me.w; if (cache.wbar !== key) { cache.wbar = key; buildWbar(); }
}
function refreshBoard() {
  const all = [...players.values()].filter((q) => !q.z).sort((a, b) => b.score - a.score || b.kills - a.kills);
  const row = (q) => `<tr class="${q.id === myId ? 'me' : ''}"><td>${esc(q.name)}</td><td>${q.score}</td><td>${q.kills}</td><td>${q.deaths}</td></tr>`;
  if (TEAMMODE()) {
    const sec = (t) => `<tr><td colspan="4" style="color:${TEAMHEX[t]};font-family:var(--pix);font-size:11px;padding-top:8px">${TEAMTXT[t]} TAKIM &middot; ${TS[t]}</td></tr>` + all.filter((q) => (q.tm | 0) === t).map(row).join('');
    $('bt').innerHTML = `<tr><th>OYUNCU</th><th>SKOR</th><th>ÖLDÜRME</th><th>ÖLÜM</th></tr>` + sec(0) + sec(1);
  } else $('bt').innerHTML = `<tr><th>OYUNCU</th><th>${esc(tr(LABEL))}</th><th>ÖLDÜRME</th><th>ÖLÜM</th></tr>` + all.map(row).join('');
}
const mctx = $('mini').getContext('2d');
function drawMini() {
  if (!mini) return;
  const S3 = 3, c = 75;
  mctx.save(); mctx.clearRect(0, 0, 150, 150); mctx.fillStyle = '#10151f'; mctx.fillRect(0, 0, 150, 150);
  mctx.translate(c, c); mctx.rotate(me.yaw); mctx.imageSmoothingEnabled = false;
  mctx.drawImage(mini, -me.pos.x * S3, -me.pos.z * S3, M.SIZE * S3, M.SIZE * S3);
  const dot = (x, z, color, s) => { mctx.fillStyle = color; mctx.fillRect((x - me.pos.x) * S3 - s / 2, (z - me.pos.z) * S3 - s / 2, s, s); };
  M.pickups.forEach((p, i) => { if (!pickupState[i]) return; dot(p.x, p.z, p.kind === 'hp' ? '#ff5a4f' : p.kind === 'armor' ? '#ffb000' : p.kind === 'gren' ? '#8fd45a' : '#66b2ff', 4); });
  for (const t of tagMeshes.values()) dot(t.position.x, t.position.z, '#ffd23f', 4);
  for (const l of lootMeshes.values()) dot(l.position.x, l.position.z, '#' + VW.RARITY_INFO[l.userData.r].color.toString(16).padStart(6, '0'), 5);
  if (TEAMMODE()) for (const [id, a] of avatars) { const q = players.get(id); if (q && a.group.visible && q.alive && (q.tm | 0) === myTeam()) dot(a.group.position.x, a.group.position.z, '#4d9bff', 5); }
  if (MODE === 'zom') for (const [id, a] of avatars) { const q = players.get(id); if (q && q.z && q.alive) dot(a.group.position.x, a.group.position.z, '#9be36a', 4); }
  if (FL) FL.forEach((f, i) => { const x = flagPos(i); if (x) dot(x.x, x.z, TEAMHEX[i], 8); });
  const now = performance.now();
  for (const [id, a] of avatars) { const t = lastShot.get(id); if (a.group.visible && t && now - t < 1800) dot(a.group.position.x, a.group.position.z, '#ff3b30', 5); }
  mctx.restore();
  mctx.fillStyle = '#fff'; mctx.beginPath(); mctx.moveTo(c, c - 6); mctx.lineTo(c + 5, c + 5); mctx.lineTo(c - 5, c + 5); mctx.closePath(); mctx.fill();
}

// ---------- sohbet ----------
function chatLine(name, text, mine) {
  const d = document.createElement('div'); d.innerHTML = `<b${mine ? ' class="me"' : ''}>${esc(name)}:</b> ${esc(text)}`; $('chatlog').appendChild(d);
  while ($('chatlog').children.length > 7) $('chatlog').firstChild.remove();
  setTimeout(() => { if (!chatOpen) d.classList.add('old'); }, 9000);
  sfx.chat();
}
function openChat() { if (chatOpen || !connected) return; chatOpen = true; for (const k in keys) keys[k] = false; mouseDown = false; $('chatwrap').classList.add('open'); $('chatin').value = ''; $('chatin').focus(); [...$('chatlog').children].forEach((c) => c.classList.remove('old')); }
function closeChat(sendIt) {
  if (!chatOpen) return; chatOpen = false; $('chatwrap').classList.remove('open');
  const v = $('chatin').value.trim(); if (sendIt && v) send({ t: 'chat', text: v });
  $('chatin').blur(); [...$('chatlog').children].forEach((c) => setTimeout(() => c.classList.add('old'), 4000));
}
$('chatin').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); closeChat(true); } else if (e.key === 'Escape') closeChat(false); e.stopPropagation(); });

// ---------- ağ ----------
let ROOM = null, rejected = false;
function send(o) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); }
function connect(info) {
  leaving = false; rejected = false; UPL = Object.assign({}, info.up || {});
  ws = info.server ? new WebSocket(info.server) : LOCAL ? new window.FakeWS() : new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
  ws.onopen = () => send(Object.assign({ t: 'join' }, info));
  ws.onclose = () => { if (rejected) return; if (!leaving && !connected && VA.hooks.status) VA.hooks.status('Sunucuya bağlanılamadı.'); if (!leaving && connected) { connected = false; showMsg('Bağlantı koptu.<small>Esc ile ana menüye dön</small>', 0); } };
  ws.onerror = () => { if (VA.hooks.status) VA.hooks.status('Sunucuya bağlanılamadı.'); };
  ws.onmessage = (e) => onMsg(JSON.parse(e.data));
}
function resetLoadout(m) { me.owned = m.owned || [0, 1, 2]; me.gren = m.gren == null ? 2 : m.gren; me.w = m.w == null ? 2 : m.w; me.ammo = WP.map((w, i) => magOf(i)); me.reloadEnd = 0; me.armor = 0; me.hp = 100; setZoom(false); vmCur = -1; me.drawT = 0; me.fireT = 1; cache.wbar = ''; sfx.draw(); }
function applyRound(m) {
  roundOver = false; MODE = m.mode; WIN = m.win; LABEL = m.label;
  buildMap(m.seed, m.theme); clearTags(); clearProjs();
  TS = m.ts || [0, 0]; $('mode').textContent = (MODE === 'kc' ? 'KILL CONFIRMED' : MODE === 'ffa' ? 'HERKES TEK' : MODE === 'tdm' ? 'TAKIM SAVAŞI' : MODE === 'ctf' ? 'BAYRAK KAPMACA' : MODE === 'zom' ? 'ZOMBİ DALGASI' : 'ROKET ARENASI'); $('mapname').textContent = tr(M.name);
  if (m.pk) setPickups(m.pk);
  setFlags(m.fl); ZW = m.zw || 0;
}
function clearTags() { for (const m of tagMeshes.values()) scene.remove(m); tagMeshes.clear(); clearLoot(); }
function clearProjs() { for (const m of projMeshes.values()) scene.remove(m); projMeshes.clear(); }
const now2 = () => performance.now(); let waitAt = 0, waitDiv = null;
function waitEl() { if (!waitDiv) { waitDiv = document.createElement('div'); waitDiv.style.cssText = 'position:fixed;top:17%;left:50%;transform:translateX(-50%);z-index:5;padding:8px 18px;background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.25);font:700 15px var(--hud,sans-serif);letter-spacing:.08em;color:#ffd23f;pointer-events:none;display:none'; waitDiv.textContent = 'GERÇEK OYUNCULAR BEKLENİYOR… (davet için oda kodunu paylaş)'; document.body.appendChild(waitDiv); } return waitDiv; }
// künye: çerçeveli plaka, zincir, ışık sütunu ve yer halkası (kendi künyen kırmızı, düşmanınki altın)
function makeTag(own) {
  const g = new THREE.Group(), c = own ? 0xff3b30 : 0xffd23f, d = own ? 0x5a0f0b : 0x6b5200;
  const plate = new THREE.Group(); g.add(plate);
  plate.add(box(0.36, 0.52, 0.05, c, 0, 0, 0), box(0.28, 0.44, 0.07, d, 0, 0, 0), box(0.2, 0.06, 0.09, 0xffffff, 0, 0.08, 0), box(0.14, 0.05, 0.09, 0xffffff, 0, -0.04, 0), box(0.07, 0.07, 0.09, c, 0, 0.27, 0));
  for (let k = 0; k < 4; k++) plate.add(box(0.05, 0.05, 0.04, c, 0.07 * (k % 2 ? 1 : -1), 0.34 + k * 0.05, 0));
  plate.position.y = 0.9; g.userData.plate = plate;
  const beam = new THREE.Mesh(blockGeo, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.22, depthWrite: false })); beam.scale.set(0.25, 2.2, 0.25); beam.position.y = 1.1; g.add(beam); g.userData.beam = beam;
  const ring = new THREE.Mesh(blockGeo, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.55, depthWrite: false })); ring.scale.set(0.9, 0.03, 0.9); ring.position.y = 0.04; g.add(ring); g.userData.ring = ring;
  return g;
}
function addTag(t) { const m = makeTag(t.owner === myId); m.position.set(t.p[0], t.p[1] - 0.6, t.p[2]); m.userData.ph = Math.random() * 6; scene.add(m); tagMeshes.set(t.id, m); }
// düşen silah: dönen büyük model, nadirliğe göre renkli ışık sütunu, yer halkası ve isim etiketi
const lootMeshes = new Map();
function nameSprite(txt, col) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const x = cv.getContext('2d');
  x.font = 'bold 30px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 6; x.strokeStyle = 'rgba(0,0,0,.85)'; x.strokeText(txt, 128, 34); x.fillStyle = '#' + col.toString(16).padStart(6, '0'); x.fillText(txt, 128, 34);
  const tx = new THREE.CanvasTexture(cv), sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false })); sp.scale.set(2.0, 0.5, 1); return sp;
}
function lootLabel(title, sub, col) {
  const cv = document.createElement('canvas'); cv.width = 320; cv.height = 96; const x = cv.getContext('2d'), hx = '#' + col.toString(16).padStart(6, '0');
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  x.font = 'bold 36px sans-serif'; x.lineWidth = 7; x.strokeStyle = 'rgba(0,0,0,.9)'; x.strokeText(title, 160, 34); x.fillStyle = hx; x.fillText(title, 160, 34);
  if (sub) { x.font = '600 24px sans-serif'; x.lineWidth = 5; x.strokeText(sub, 160, 74); x.fillStyle = '#e8eef6'; x.fillText(sub, 160, 74); }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false })); sp.scale.set(2.5, 0.75, 1); return sp;
}
function addLoot(l) {
  if (lootMeshes.has(l.id) || !WP[l.w]) return;
  const r = VW.RARITY[l.w] | 0, col = VW.RARITY_INFO[r].color, g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
  const gm = makeGun(l.w, undefined, l.cl | 0); gm.rotation.y = Math.PI / 2; gm.scale.setScalar(1.5); inner.add(gm); inner.position.y = 0.95;
  const bw = 0.55 + r * 0.12, beam = new THREE.Mesh(blockGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.2, depthWrite: false })); beam.scale.set(bw, 3.2 + r * 0.8, bw); beam.position.y = 1.6 + r * 0.4; g.add(beam);
  const core = new THREE.Mesh(blockGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, depthWrite: false })); core.scale.set(0.16, 3.2 + r * 0.8, 0.16); core.position.y = beam.position.y; g.add(core);
  const ring = new THREE.Mesh(blockGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.6, depthWrite: false })); const rs = 1.1 + r * 0.15; ring.scale.set(rs, 0.04, rs); ring.position.y = 0.05; g.add(ring);
  const shadow = new THREE.Mesh(blockGeo, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false })); shadow.scale.set(0.9, 0.02, 0.9); shadow.position.y = 0.03; g.add(shadow);
  let lab = null; try { lab = lootLabel(WP[l.w].name, (l.cl ? (VColls.LIST[l.cl] || {}).name + ' · ' : '') + (l.n ? String(l.n).slice(0, 14) + (l.h ? '' : ' (bot)') : ''), col); lab.position.y = 2.3 + r * 0.2; g.add(lab); } catch (e) {}
  g.position.set(l.p[0], l.p[1], l.p[2]); g.userData = { inner, beam, core, ring, shadow, lab, rs, ph: Math.random() * 6, w: l.w, r, born: performance.now(), life: 30000, spin: (Math.random() < 0.5 ? -1 : 1), spark: 0 };
  scene.add(g); lootMeshes.set(l.id, g);
  burst(g.position.clone().setY(g.position.y + 0.8), col, 8 + r * 6, 4 + r, 0.18, 0.6, 6);
  if (r >= 2) burst(g.position.clone().setY(g.position.y + 1), 0xffffff, 6, 3, 0.12, 0.5, 2);
}
function removeLoot(id) { const m = lootMeshes.get(id); if (m) { scene.remove(m); lootMeshes.delete(id); } return m; }
function clearLoot() { for (const m of lootMeshes.values()) scene.remove(m); lootMeshes.clear(); }
function removeTag(id) { const m = tagMeshes.get(id); if (m) { scene.remove(m); tagMeshes.delete(id); } }

// ---------- bayrak kapmaca ----------
let FL = 0; const flagG = [], baseG = [];
function clearFlags() { for (const g of flagG.concat(baseG)) if (g) scene.remove(g); flagG.length = 0; baseG.length = 0; FL = 0; }
function setFlags(fl) {
  clearFlags(); if (!fl || MODE !== 'ctf') return; FL = fl;
  for (let t = 0; t < 2; t++) {
    const col = TEAMCOL[t], g = new THREE.Group();
    g.add(box(0.12, 2.5, 0.12, 0xe8e8e8, 0, 1.25, 0), box(0.95, 0.6, 0.05, col, 0.52, 2.1, 0), box(0.95, 0.12, 0.06, 0xffffff, 0.52, 2.45, 0), box(0.3, 0.3, 0.3, col, 0, 0.15, 0));
    const beam = new THREE.Mesh(blockGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.22, depthWrite: false })); beam.scale.set(0.5, 14, 0.5); beam.position.y = 7; g.add(beam);
    scene.add(g); flagG.push(g);
    const b = new THREE.Group(); b.add(box(2.6, 0.08, 2.6, col, 0, 0.04, 0), box(2.0, 0.1, 2.0, 0x222831, 0, 0.05, 0)); scene.add(b); baseG.push(b);
    b.position.set(fl[t][1], fl[t][2], fl[t][3]);
    b.userData.home = new THREE.Vector3(fl[t][1], fl[t][2], fl[t][3]);
  }
  // üs konumları ilk durumdan alınır (bayrak evdeyken pos = home)
  for (let t = 0; t < 2; t++) if (fl[t][0] === 0) baseG[t].userData.home.set(fl[t][1], fl[t][2], fl[t][3]);
}
function flagPos(i) { return FL && FL[i] ? { x: FL[i][1], y: FL[i][2], z: FL[i][3] } : null; }
function updateFlags(t) {
  if (!FL || !flagG.length) return;
  for (let i = 0; i < 2; i++) {
    const f = FL[i], g = flagG[i]; if (!f || !g) continue;
    const mine = f[0] === myId && f[0] !== 0;
    g.visible = !mine;
    const k = 0.25; g.position.x += (f[1] - g.position.x) * k; g.position.y += (f[2] - g.position.y) * k; g.position.z += (f[3] - g.position.z) * k;
    if (f[0]) { g.rotation.y = 0; g.scale.setScalar(0.55); g.position.y += 0.55; } else g.scale.setScalar(1);
    g.children[1].rotation.y = Math.sin(t * 3 + i) * 0.18; // dalgalanma
    if (!f[0]) g.rotation.y += 0.01;
  }
}
function ctfStatus(t) {
  if (!FL) return '';
  const me_ = FL[1 - t][0] === myId, ownCarrier = FL[t][0], enemyCarrier = FL[1 - t][0];
  if (me_) return 'BAYRAĞI TAŞIYORSUN! Kendi üssüne götür' + (FL[t][0] || (FL[t][1] !== baseG[t].userData.home.x || FL[t][3] !== baseG[t].userData.home.z) ? ' (önce kendi bayrağın evde olmalı)' : '');
  if (ownCarrier) return 'Bayrağın çalındı! Taşıyıcıyı vur';
  if (enemyCarrier) return 'Takımın düşman bayrağını taşıyor, onu koru';
  return `Düşman bayrağını kap · ilk ${WIN} sayı`;
}
function onFlagMsg(m) {
  if (m.ts) TS = m.ts;
  const who = players.get(m.by), nm = who ? `<b style="color:${TEAMHEX[who.tm | 0]}">${esc(who.name)}</b>` : 'Bir oyuncu', fn = `<b style="color:${TEAMHEX[m.i]}">${TEAMTXT[m.i]}</b> bayrağı`;
  const mineFlag = m.i === myTeam();
  if (m.st === 'take') { feed(`${nm} ${fn}nı aldı`); if (m.by === myId) { pop('BAYRAĞI KAPTIN!'); sfx.tag(); } else { showMsg(mineFlag ? 'Bayrağın çalındı!' : 'Takımın düşman bayrağını aldı!', 1800); sfx.pick('armor'); } }
  else if (m.st === 'drop') { feed(`${fn} yere düştü`); if (m.p && flagG[m.i]) flagG[m.i].position.set(m.p[0], m.p[1], m.p[2]); }
  else if (m.st === 'return') { feed(`${fn} üsse döndü` + (m.by ? ` (${nm})` : '')); if (m.by === myId) pop('+1 BAYRAK İADE'); }
  else if (m.st === 'cap') { feed(`${nm} sayı yaptı!`, m.by === myId); if (m.by === myId) { pop('SAYI! +5'); } else showMsg(`${TEAMTXT[m.i === 0 ? 1 : 0]} takım sayı yaptı`, 2000); sfx.pick('hp'); }
}

function onMsg(m) {
  switch (m.t) {
    case 'full': case 'busy': case 'noroom': { rejected = true; const t = { full: 'Oda ya da sunucu dolu.', busy: 'Sunucuda boş oda yeri yok, biraz sonra dene.', noroom: 'Bu kodla oda bulunamadı.' }[m.t]; if (VA.hooks.status) VA.hooks.status(t); if (VA.hooks.toast) VA.hooks.toast(t); break; }
    case 'room': ROOM = m; syncPauseUi(); { const rt = $('roomtag'); if (rt) { rt.textContent = 'ODA ' + m.code + (m.priv ? ' (özel)' : ''); rt.style.display = ''; } } feed('Oda <b>' + esc(m.code) + '</b>' + (m.priv ? ' &middot; özel: kodu arkadaşlarınla paylaş' : '')); break;
    case 'init':
      myId = m.id; connected = true;
      buildViewmodels();
      MS = { kills: 0, deaths: 0, heads: 0 }; hideResults();
      applyRound(m);
      players.clear(); clearAvatars();
      m.players.forEach((p) => { players.set(p.id, p); if (p.id !== myId) ensureAvatar(p); });
      m.tags.forEach(addTag); (m.loot || []).forEach(addLoot);
      me.pos.set(...m.p); me.vel.set(0, 0, 0); me.kb.set(0, 0, 0); me.alive = true; me.yaw = 0; me.pitch = 0;
      resetLoadout(m);
      startPlaying();
      break;
    case 'join': players.set(m.player.id, m.player); if (m.player.id !== myId) { ensureAvatar(m.player); feed(`<b>${esc(m.player.name)}</b> katıldı`); } break;
    case 'leave': { const p = players.get(m.id); if (p) feed(`<b>${esc(p.name)}</b> ayrıldı`); players.delete(m.id); removeAvatar(m.id); lastShot.delete(m.id); break; }
    case 'snap': onSnap(m); break;
    case 'shot': onShot(m); break;
    case 'fire': lastShot.set(m.id, performance.now()); if (m.id !== myId) { const a = avatars.get(m.id); const d = a ? a.group.position.distanceTo(camera.position) : 99; sfx.shot(m.w, Math.max(0, 1 - d / 55) * 0.8); } break;
    case 'hit': hitMark(m.head, m.kill); if (m.head) { PR.track('heads', 1); MS.heads++; } break;
    case 'dmg': {
      sfx.hurt(); const v = $('vig'); v.style.boxShadow = 'inset 0 0 170px 40px rgba(220,0,0,.7)'; setTimeout(() => (v.style.boxShadow = 'inset 0 0 170px 30px rgba(220,0,0,0)'), 160);
      if (m.from) { const dx = m.from[0] - me.pos.x, dz = m.from[2] - me.pos.z; const fw = [-Math.sin(me.yaw), -Math.cos(me.yaw)], rt = [Math.cos(me.yaw), -Math.sin(me.yaw)]; const ang = Math.atan2(dx * rt[0] + dz * rt[1], dx * fw[0] + dz * fw[1]); const w = $('dirwrap'); w.style.transform = `rotate(${ang}rad)`; w.style.transition = 'none'; w.style.opacity = '1'; void w.offsetWidth; w.style.transition = 'opacity .8s'; w.style.opacity = '0'; }
      break;
    }
    case 'kill': {
      if (m.ts) TS = m.ts;
      const k = players.get(m.killer), v = players.get(m.victim);
      const mine = m.killer === myId || m.victim === myId;
      feed(`<b>${esc(k ? k.name : 'Bilinmeyen')}</b> [${esc(weaponName(m.w))}] &rarr; <b>${esc(v ? v.name : '?')}</b>`, mine);
      const a = avatars.get(m.victim); if (a) burst(a.group.position.clone().setY(a.group.position.y + 1), COLORS[(v && v.c || 0) % COLORS.length], 12, 6, 0.2, 0.9);
      if (m.victim === myId) { killerInfo = { name: k ? k.name : 'Kendin', w: m.w, self: m.killer === myId || !m.killer }; PR.data.deaths++; MS.deaths++; }
      if (m.killer === myId && m.victim !== myId) { PR.data.kills++; PR.track('kills', 1); MS.kills++; reward(10, 20, 'öldürme'); }
      break;
    }
    case 'chat': chatLine(m.name, m.text, m.id === myId); break;
    case 'tag': addTag(m); break;
    case 'loot': addLoot(m); break;
    case 'lootGone': { const o = removeLoot(m.id); if (o && m.kind === 'take') { const col = VW.RARITY_INFO[o.userData.r].color; burst(o.position.clone().setY(o.position.y + 1), col, 14, 4, 0.22, 0.6, 0); if (m.by !== myId) { const q = players.get(m.by); if (q && o.userData.r >= 2) feed(`<b>${esc(q.name)}</b> ${esc(WP[m.w].name)} aldı`); } } break; }
    case 'tagGone': removeTag(m.id); if (m.kind === 'confirm' && m.by === myId) { sfx.tag(); reward(5, 10, 'künye'); } break;
    case 'respawn': me.pos.set(...m.p); me.vel.set(0, 0, 0); me.kb.set(0, 0, 0); me.alive = true; resetLoadout(m); showMsg('', 0); killerInfo = null; break;
    case 'own': if (me.owned.indexOf(m.w) < 0) me.owned.push(m.w); me.ammo[m.w] = magOf(m.w); pop(WP[m.w].name + ' alındı'); sfx.pick('w'); break;
    case 'got': me.hp = m.hp; me.armor = m.ar; me.gren = m.gren; sfx.pick(m.kind); if (m.kind === 'hp') pop('+ SAĞLIK'); else if (m.kind === 'armor') pop('+ ZIRH'); else if (m.kind === 'gren') pop('+ BOMBA'); break;
    case 'pk': pickupState[m.i] = !!m.on; if (pickupMeshes[m.i]) pickupMeshes[m.i].g.visible = !!m.on; break;
    case 'boom': explosion(new THREE.Vector3(...m.p), m.r); break;
    case 'push': me.kb.x += m.v[0]; me.kb.z += m.v[2]; me.vel.y = Math.max(me.vel.y, m.v[1]); me.onGround = false; break;
    case 'shield': { const el = $('pnote'); if (el && paused) el.innerHTML += ' <b style="color:#8be07a">Kalkan aktif!</b>'; break; }
    case 'correct': me.pos.set(...m.p); me.vel.set(0, 0, 0); break;
    case 'ckdead': { const c = chickenMeshes.get(m.id); burst(new THREE.Vector3(...m.p).setY(m.p[1] + 0.4), 0xffffff, 10, 5, 0.12, 1.0, 5); sfx.bok(); if (c) c.visible = false; break; }
    case 'flag': onFlagMsg(m); break;
    case 'wave': if (m.st === 'start') { showMsg(`DALGA ${m.n}<small>${m.total} zombi geliyor${m.n >= m.win ? ' &middot; SON DALGA' : ''}</small>`, 3200); sfx.pick('armor'); feed(`<b style="color:#9be36a">Dalga ${m.n}</b> başladı`); } else { showMsg(`Dalga ${m.n} temizlendi!<small>Sonraki dalga ${m.next} sn içinde &middot; ölenler canlanır, +3 puan</small>`, 3500); sfx.pick('hp'); } break;
    case 'win':
      roundOver = true; if (m.ts) TS = m.ts; showMsg('', 0);
      showResults(m);
      break;
    case 'newround':
      MS = { kills: 0, deaths: 0, heads: 0 }; hideResults();
      applyRound(m); showMsg('', 0);
      clearAvatars();
      for (const p of m.players) { players.set(p.id, p); if (p.id !== myId) ensureAvatar(p); if (p.id === myId) { me.pos.set(...p.p); me.vel.set(0, 0, 0); me.kb.set(0, 0, 0); me.alive = true; resetLoadout(p); } }
      if (!locked && document.body.classList.contains('playing')) { paused = true; document.body.classList.add('paused'); syncPauseUi(); }
      break;
  }
}
function hideResults() { const r = $('results'); if (r) { r.style.display = 'none'; r.innerHTML = ''; } clearInterval(resultsTimer); }
let resultsTimer = 0;
function showResults(m) {
  const all = [...players.values()].filter((q) => !q.z).sort((a, b) => b.score - a.score || b.kills - a.kills);
  const tdm = TEAMMODE(), mt = myTeam(), me_ = players.get(myId);
  const zomR = MODE === 'zom', won = zomR ? m.team === 0 : tdm ? m.team === mt : m.id === myId;
  const place = Math.max(1, all.findIndex((q) => q.id === myId) + 1);
  const res = PR.matchEnd({ won, place: tdm || zomR ? 0 : place, kills: MS.kills, deaths: MS.deaths, heads: MS.heads, mode: MODE });
  const rows = all.slice(0, 8).map((q, i) => `<tr class="${q.id === myId ? 'me' : ''}"><td>${i + 1}</td><td${tdm ? ` style="color:${TEAMHEX[q.tm | 0]}"` : ''}>${esc(q.name)}</td><td>${q.kills}</td><td>${q.deaths}</td></tr>`).join('');
  const lines = res.lines.map((l) => `<div><span>${esc(l.t)}</span><b>${l.px ? '+' + l.px + ' PX ' : ''}${l.gem ? '+' + l.gem + ' ◆ ' : ''}${l.xp ? '+' + l.xp + ' XP' : ''}</b></div>`).join('');
  const crate = res.crate ? `<div class="drop">Kasa düştü: <b>${esc(PR.CRATES[res.crate].name)}</b></div>` : '';
  const r = $('results'); r.style.display = 'flex';
  r.innerHTML = `<div class="rbox"><div class="rtitle ${won ? 'win' : 'lose'}">${won ? 'ZAFER' : 'YENİLGİ'}</div><div class="rsub">${zomR ? (won ? `${m.zw || ZW[0] || WIN}. dalgaya kadar hayatta kaldınız` : `Zombiler kazandı &middot; ${Math.max(1, m.zw || 1)}. dalgada düştünüz`) : esc(m.name) + ' turu kazandı'}${tdm ? ` &middot; ${TS[0]} - ${TS[1]}` : ''}</div>
    <table>${'<tr><th>#</th><th>OYUNCU</th><th>ÖLDÜRME</th><th>ÖLÜM</th></tr>' + rows}</table>
    <div class="rlines"><div class="rh">ÖDÜLLER</div>${lines}<div class="rsum"><span>Toplam</span><b>+${res.px} PX${res.gem ? ' · +' + res.gem + ' ◆' : ''} · +${res.xp} XP</b></div><div><span>Sezon pası</span><b>+${res.passXp} XP${res.passUp ? ' · ' + res.passUp + ' kademe!' : ''}</b></div>${res.lv ? `<div class="drop">SEVİYE ATLADIN: ${PR.level()} (+${res.lv * 5} ◆)</div>` : ''}${crate}</div>
    <div class="rbtns"><button class="btn" id="rMenu">ANA MENÜYE DÖN</button></div><div class="rsub" id="rTimer"></div></div>`;
  $('rMenu').onclick = () => { sfx.ui(); leave(); };
  let n = 7; $('rTimer').textContent = 'Yeni tur ' + n + ' sn içinde…';
  clearInterval(resultsTimer); resultsTimer = setInterval(() => { n--; if ($('rTimer')) $('rTimer').textContent = n > 0 ? 'Yeni tur ' + n + ' sn içinde…' : ''; if (n <= 0) clearInterval(resultsTimer); }, 1000);
  if (document.exitPointerLock) document.exitPointerLock();
  sfx.pick('w');
}
function onSnap(m) {
  if (m.fl) FL = m.fl;
  if (m.zw !== undefined) ZW = m.zw;
  const seen = new Set();
  for (const p of m.ps) {
    seen.add(p.id);
    const old = players.get(p.id) || {}; players.set(p.id, Object.assign(old, p));
    if (p.id === myId) {
      if (me.alive && !p.alive) { me.alive = false; me.vel.set(0, 0, 0); setZoom(false); const k = killerInfo; showMsg(k && !k.self ? `${esc(k.name)} seni vurdu<small>${esc(weaponName(k.w))} &middot; ${MODE === 'zom' ? 'sonraki dalgada canlanacaksın' : '3 sn içinde yeniden doğacaksın'}</small>` : `Öldün<small>${MODE === 'zom' ? 'sonraki dalgada canlanacaksın' : '3 sn içinde yeniden doğacaksın'}</small>`, 0); }
      me.hp = p.hp; me.armor = p.ar;
    } else {
      const a = ensureAvatar(p); a.target.set(...p.p); a.yaw = p.yaw; a.head.rotation.x = -p.pitch * 0.8; a.group.visible = p.alive; a.body.scale.y = p.cr ? 0.78 : 1;
      if (a.gunIdx !== p.w || a.gunCl !== (p.cl | 0)) { a.gun.clear(); a.gun.add(makeGun(p.w, null, p.cl)); a.gunIdx = p.w; a.gunCl = p.cl | 0; }
    }
  }
  for (const id of [...avatars.keys()]) if (!seen.has(id)) removeAvatar(id);
  const ps = new Set();
  for (const pr of m.pr) {
    ps.add(pr[0]); let mesh = projMeshes.get(pr[0]);
    if (!mesh) {
      mesh = new THREE.Group();
      if (pr[1] === 0) mesh.add(box(0.14, 0.14, 0.5, 0x5b6b3a, 0, 0, 0), box(0.1, 0.1, 0.12, 0xff8a1f, 0, 0, 0.3));
      else if (pr[1] === 2) mesh.add(box(0.2, 0.2, 0.3, 0x4a4f55, 0, 0, 0), box(0.12, 0.12, 0.1, 0xffb000, 0, 0, -0.18));
      else mesh.add(box(0.22, 0.28, 0.22, 0x3f5a2a, 0, 0, 0), box(0.08, 0.08, 0.08, 0xcccccc, 0, 0.17, 0));
      mesh.userData.kind = pr[1]; mesh.position.set(pr[2], pr[3], pr[4]); mesh.userData.t = new THREE.Vector3(pr[2], pr[3], pr[4]); scene.add(mesh); projMeshes.set(pr[0], mesh);
    }
    mesh.userData.prev = mesh.position.clone(); mesh.userData.t.set(pr[2], pr[3], pr[4]);
  }
  for (const [id, mesh] of projMeshes) if (!ps.has(id)) { scene.remove(mesh); projMeshes.delete(id); }
  for (const k of m.ck) {
    let c = chickenMeshes.get(k[0]);
    if (!c) { c = new THREE.Group(); c.add(box(0.5, 0.4, 0.6, 0xf5f5f5, 0, 0.35, 0), box(0.28, 0.3, 0.28, 0xf5f5f5, 0, 0.65, -0.3), box(0.08, 0.1, 0.14, 0xe53935, 0, 0.86, -0.3), box(0.1, 0.06, 0.12, 0xff9800, 0, 0.62, -0.5), box(0.12, 0.3, 0.1, 0xdddddd, -0.3, 0.38, 0), box(0.12, 0.3, 0.1, 0xdddddd, 0.3, 0.38, 0), box(0.06, 0.2, 0.06, 0xff9800, -0.1, 0.1, 0), box(0.06, 0.2, 0.06, 0xff9800, 0.1, 0.1, 0)); c.userData.t = new THREE.Vector3(k[1], k[2], k[3]); c.position.copy(c.userData.t); scene.add(c); chickenMeshes.set(k[0], c); }
    c.userData.t.set(k[1], k[2], k[3]); c.rotation.y = k[4]; c.visible = !!k[5];
  }
}
function onShot(s) {
  lastShot.set(s.id, performance.now());
  const o = new THREE.Vector3(...s.o);
  if (s.id === myId) {
    const r = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion), u = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    o.addScaledVector(r, 0.22).addScaledVector(u, -0.18);
  } else { const d = o.distanceTo(camera.position); sfx.shot(s.w, Math.max(0, 1 - d / 55) * 0.8); }
  for (const e of s.es) {
    const end = new THREE.Vector3(e[0], e[1], e[2]);
    if (VW.isMelee(s.w)) { if (e[3] === 1) burst(end, 0xc0392b, 5, 4, 0.1, 0.4); else burst(end, 0xaaaaaa, 3, 3, 0.1, 0.3); continue; }
    const shooter = s.id === myId ? { cl: collOf() } : players.get(s.id), cdef = shooter && shooter.cl && window.VColls.LIST[shooter.cl];
    tracer(o, end, cdef ? cdef.glow : s.w === 5 || s.w === 12 ? 0xbfe6ff : 0xfff1a8);
    if (e[3] === 1) burst(end, 0xd32f2f, 5, 4, 0.09, 0.4); else if (e[3] === 0) burst(end, 0xb0b0b0, 4, 3.5, 0.08, 0.35);
  }
}

// ---------- silah kontrolü ----------
const baseFov = () => S().fov;
function setZoom(on) {
  const w = WP[me.w]; me.zoom = !!on && me.alive && w.kind !== 'melee';
  const scoped = w.zoom && w.zoom < 30, fov = me.zoom ? (w.zoom ? (w.zoom < 30 ? w.zoom : w.zoom * baseFov() / 75) : baseFov() * 0.82) : baseFov();
  camera.fov = fov; camera.updateProjectionMatrix();
  $('scope').style.display = me.zoom && scoped ? 'block' : 'none'; $('cross').style.display = me.zoom ? 'none' : 'block';
}
function setWeapon(i) {
  if (i === me.w || me.owned.indexOf(i) < 0 || !me.alive) return;
  me.w = i; me.reloadEnd = 0; me.drawT = 0; me.fireT = 1; setZoom(false); sfx.draw();
}
function cycleSlot(n) {
  const own = SLOTS[n].filter((w) => me.owned.indexOf(w) >= 0); if (!own.length) return;
  const k = own.indexOf(me.w); setWeapon(own[k < 0 ? 0 : (k + 1) % own.length]);
}
function cycleWeapon(dir) {
  const order = []; SLOTS.forEach((s) => s.forEach((w) => { if (me.owned.indexOf(w) >= 0) order.push(w); }));
  const k = order.indexOf(me.w); setWeapon(order[(k + dir + order.length) % order.length]);
}
function reload() {
  const w = WP[me.w], now = performance.now();
  if (w.kind === 'melee' || me.reloadEnd > now || me.ammo[me.w] === magOf(me.w) || !me.alive) return;
  me.reloadStart = now; me.reloadEnd = now + reloadOf(me.w); me.reloadFx = 0; setZoom(false);
  const wi = me.w; setTimeout(() => { if (me.w === wi && me.reloadEnd && performance.now() >= me.reloadEnd - 8) { me.ammo[wi] = magOf(wi); me.reloadEnd = 0; } }, reloadOf(wi));
}
function camBasis() {
  return { f: new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion), r: new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion), u: new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion) };
}
function tryFire() {
  if (!connected || !me.alive || roundOver || !locked || chatOpen) return;
  const now = performance.now(), w = WP[me.w];
  if (me.drawT < 0.75) return;
  if (me.reloadEnd > now || now < me.nextFire) return;
  if (w.spin && me.spinV < 17) return;
  if (w.kind !== 'melee') { if (me.ammo[me.w] <= 0) { sfx.empty(); me.nextFire = now + 250; reload(); return; } me.ammo[me.w]--; }
  me.nextFire = now + w.rate;
  const { f, r, u } = camBasis(), o = camera.position;
  const moving = Math.hypot(me.vel.x, me.vel.z) > 0.5 || !me.onGround;
  const sp = spreadOf(me.w) * (me.zoom ? 0.35 : moving ? 1.8 : me.crouch ? 0.6 : 1);
  const ds = [];
  for (let i = 0; i < Math.max(1, w.pellets); i++) { const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * sp; const d = f.clone().addScaledVector(r, Math.cos(a) * rr).addScaledVector(u, Math.sin(a) * rr).normalize(); ds.push([+d.x.toFixed(4), +d.y.toFixed(4), +d.z.toFixed(4)]); }
  send({ t: 'shoot', w: me.w, o: [o.x, o.y, o.z], ds });
  sfx.shot(me.w, 1);
  me.fireT = 0; me.recoil = w.kind === 'melee' ? 0 : Math.min(1.4, 0.6 + w.dmg / 120);
  me.pitch = Math.min(1.5, me.pitch + (w.kind === 'melee' ? 0 : 0.005 + w.dmg * 0.00016));
  const fl = vms[me.w].userData.flashMesh; if (fl) { fl.visible = true; setTimeout(() => (fl.visible = false), 45); }
  const L = VW.DEFS[me.w];
  if (me.w === 5 || me.w === 12) setTimeout(sfx.bolt, L.fireDur * 420); else if (me.w === 11) setTimeout(sfx.pump, L.fireDur * 500);
  if (w.kind !== 'melee' && me.ammo[me.w] <= 0) setTimeout(reload, w.mag <= 2 ? 450 : 200);
}
function throwNade() {
  if (!me.alive || me.gren <= 0 || roundOver || !locked || chatOpen) return;
  const { f } = camBasis(), o = camera.position; me.gren--;
  send({ t: 'nade', o: [o.x, o.y, o.z], d: [f.x, f.y, f.z] }); sfx.empty(); me.fireT = 1;
}
function dash() {
  if (!me.alive || me.dashCd > 0 || !locked) return;
  const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), r = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  let dx = -Math.sin(me.yaw) * (f || (r ? 0 : 1)) + Math.cos(me.yaw) * r, dz = -Math.cos(me.yaw) * (f || (r ? 0 : 1)) - Math.sin(me.yaw) * r;
  const l = Math.hypot(dx, dz) || 1; me.dashDir.set(dx / l, 0, dz / l); me.dashT = 0.17; me.dashCd = 2.4; sfx.dash();
}

// ---------- girdi ----------
addEventListener('keydown', (e) => {
  const tag = e.target && e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if (!document.body.classList.contains('playing')) return;
  if (e.code === 'Tab') { e.preventDefault(); $('board').style.display = 'block'; refreshBoard(); return; }
  if (e.code === 'Enter') { e.preventDefault(); if (!paused) openChat(); return; }
  if (e.repeat) { keys[e.code] = true; return; }
  keys[e.code] = true;
  if (e.code === 'KeyR') reload();
  else if (e.code === 'KeyG') throwNade();
  else if (e.code === 'KeyQ' || e.code === 'KeyX') dash();
  else { const n = parseInt(e.key, 10); if (n >= 1 && n <= SLOTS.length) cycleSlot(n - 1); }
});
addEventListener('keyup', (e) => { keys[e.code] = false; if (e.code === 'Tab') $('board').style.display = 'none'; });
addEventListener('wheel', (e) => { if (locked && !chatOpen) cycleWeapon(e.deltaY > 0 ? 1 : -1); }, { passive: true });
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  if (document.body.classList.contains('playing')) {
    if (!locked && chatOpen) closeChat(false);
    paused = !locked && !roundOver; document.body.classList.toggle('paused', paused);
    if (paused) { mouseDown = false; for (const k in keys) keys[k] = false; syncPauseUi(); if (!(LOCAL && ws instanceof window.FakeWS)) send({ t: 'away' }); }
    else if (connected && !(LOCAL && ws instanceof window.FakeWS)) send({ t: 'back' });
  }
});
canvas.addEventListener('click', () => { if (connected && !locked && !paused) canvas.requestPointerLock(); });
addEventListener('mousemove', (e) => {
  if (!locked) return;
  const sc = me.zoom ? (WP[me.w].zoom && WP[me.w].zoom < 30 ? 0.0009 : 0.0015) : 0.0022, k = sc * S().sens;
  me.yaw -= e.movementX * k; me.pitch = Math.max(-1.55, Math.min(1.55, me.pitch - e.movementY * k));
  me.swayX = Math.max(-1, Math.min(1, me.swayX + e.movementX * 0.0035)); me.swayY = Math.max(-1, Math.min(1, me.swayY + e.movementY * 0.0035));
});
addEventListener('mousedown', (e) => { if (!locked || chatOpen) return; if (e.button === 0) { mouseDown = true; tryFire(); } if (e.button === 2) setZoom(true); });
addEventListener('mouseup', (e) => { if (e.button === 0) mouseDown = false; if (e.button === 2) setZoom(false); });
addEventListener('contextmenu', (e) => e.preventDefault());

// ---------- fizik ----------
function physics(dt) {
  const want = !!(keys.ControlLeft || keys.KeyC) && me.alive;
  if (want && !me.crouch) me.crouch = true;
  else if (!want && me.crouch && !M.solidBox(me.pos.x, me.pos.y, me.pos.z, RAD, 1.8)) me.crouch = false;
  me.eye += ((me.crouch ? EYE_C : EYE) - me.eye) * Math.min(1, dt * 14);
  me.dashCd = Math.max(0, me.dashCd - dt);
  let ix = 0, iz = 0, speed = 0, sprint = false;
  if (me.alive && locked && !chatOpen) {
    const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), r = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    const dx = -Math.sin(me.yaw) * f + Math.cos(me.yaw) * r, dz = -Math.cos(me.yaw) * f - Math.sin(me.yaw) * r;
    const l = Math.hypot(dx, dz);
    if (l > 0) { sprint = !!(keys.ShiftLeft || keys.ShiftRight) && !me.zoom && !me.crouch; speed = me.crouch ? 2.6 : sprint ? 7.4 : 5.2; if (me.zoom) speed *= 0.65; if (WP[me.w].spin) speed *= 0.75; ix = (dx / l) * speed; iz = (dz / l) * speed; }
    if (keys.Space && me.onGround && !me.crouch) { me.vel.y = 8.2; me.onGround = false; }
  }
  me.sprinting = sprint && me.onGround;
  if (me.dashT > 0) { me.dashT -= dt; ix = me.dashDir.x * 17; iz = me.dashDir.z * 17; }
  me.vel.x = ix; me.vel.z = iz;
  me.kb.multiplyScalar(Math.max(0, 1 - dt * (me.onGround ? 7 : 1.4)));
  me.vel.y = Math.max(-45, me.vel.y - 24 * dt);
  const h = me.crouch ? 1.2 : 1.8;
  const mvx = (me.vel.x + me.kb.x) * dt, mvz = (me.vel.z + me.kb.z) * dt;
  if (!M.solidBox(me.pos.x + mvx, me.pos.y, me.pos.z, RAD, h)) me.pos.x += mvx; else me.kb.x = 0;
  if (!M.solidBox(me.pos.x, me.pos.y, me.pos.z + mvz, RAD, h)) me.pos.z += mvz; else me.kb.z = 0;
  const ny = me.pos.y + me.vel.y * dt;
  if (!M.solidBox(me.pos.x, ny, me.pos.z, RAD, h)) { me.pos.y = ny; me.onGround = false; }
  else { if (me.vel.y < 0) { me.pos.y = Math.floor(ny) + 1; me.onGround = true; } me.vel.y = 0; }
  if (me.pos.y < -20) me.pos.y = 8;
}

// ---------- silah animasyonu ----------
function animateViewmodel(dt, now, hv, alive) {
  if (vmCur !== me.w) { vms.forEach((v, i) => (v.visible = i === me.w)); vmCur = me.w; }
  const def = VW.DEFS[me.w], W = WP[me.w], reloading = me.reloadEnd > now;
  me.drawT = Math.min(1, me.drawT + dt / 0.42);
  const fd = def.fireDur || 0.2; if (me.fireT < 1) me.fireT = Math.min(1, me.fireT + dt / fd);
  const spinTarget = W.spin && mouseDown && locked && me.alive && !reloading ? 28 : 0;
  me.spinV += (spinTarget - me.spinV) * Math.min(1, dt * (spinTarget ? 4 : 2)); me.spin += me.spinV * dt;
  const rt = reloading ? Math.min(1, (now - me.reloadStart) / reloadOf(me.w)) : null;
  if (rt != null) { const tbl = RELOAD_SFX[me.w] || RELOAD_SFX.def; while (me.reloadFx < tbl.length && rt >= tbl[me.reloadFx][0]) { tbl[me.reloadFx][1](); me.reloadFx++; } }
  const off = VW.pose(vms[me.w], me.w, { draw: me.drawT < 1 ? me.drawT : null, fire: me.fireT < 1 ? me.fireT : null, reload: rt, spin: me.spin });
  const hasAds = !!def.ads && W.kind !== 'melee';
  const scoped = W.zoom && W.zoom < 30;
  me.adsT += ((me.zoom && hasAds ? 1 : 0) - me.adsT) * Math.min(1, dt * 12);
  me.sprintT += ((me.sprinting && hv > 5 && !reloading ? 1 : 0) - me.sprintT) * Math.min(1, dt * 9);
  me.swayX *= Math.max(0, 1 - dt * 7); me.swayY *= Math.max(0, 1 - dt * 7);
  const a = me.adsT, base = def.pos, ads = def.ads || def.pos;
  const bobA = (1 - a) * Math.min(1, hv / 5) * (me.onGround ? 1 : 0.3);
  gunRoot.visible = alive && !(me.zoom && scoped && me.adsT > 0.5);
  gunRoot.position.set(
    base[0] + (ads[0] - base[0]) * a + Math.sin(me.bob) * 0.012 * bobA - me.swayX * 0.03 * (1 - a * 0.7) + off.x - me.sprintT * 0.1,
    base[1] + (ads[1] - base[1]) * a + Math.abs(Math.cos(me.bob)) * 0.01 * bobA + me.swayY * 0.02 * (1 - a * 0.7) + off.y - (me.crouch ? 0.01 : 0) - me.sprintT * 0.07,
    base[2] + (ads[2] - base[2]) * a + me.recoil * 0.05 * (1 - a * 0.5) + off.z);
  gunRoot.rotation.set(me.recoil * 0.05 * (1 - a * 0.5) + off.rx + me.sprintT * 0.18, off.ry + me.sprintT * 0.55 - me.swayX * 0.04, off.rz - me.sprintT * 0.25);
}

// ---------- ana döngü ----------
const clock = { last: performance.now(), send: 0, board: 0, mini: 0 };
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - clock.last) / 1000); clock.last = now;
  const t = now / 1000;
  clouds.children.forEach((c, i) => { c.position.x += dt * (0.8 + (i % 3) * 0.3); if (c.position.x > 90) c.position.x = -90; });
  if (!connected || !M) { if (!document.body.classList.contains('playing')) menuFrame(t, dt); renderer.render(scene, camera); return; }

  updateFlags(t);
  if (!paused) physics(dt);
  if (mouseDown && locked && WP[me.w].auto) tryFire();
  clock.send += dt;
  if (clock.send >= 0.05) { clock.send = 0; send({ t: 'state', p: [+me.pos.x.toFixed(3), +me.pos.y.toFixed(3), +me.pos.z.toFixed(3)], yaw: +me.yaw.toFixed(4), pitch: +me.pitch.toFixed(4), w: me.w, c: me.crouch ? 1 : 0 }); }

  const alive = me.alive;
  const hv = Math.hypot(me.vel.x, me.vel.z);
  me.bob += dt * hv * 1.9; me.recoil = Math.max(0, me.recoil - dt * 9);
  const bobY = alive && me.onGround ? Math.sin(me.bob * 2) * 0.012 * Math.min(1, hv / 5) : 0;
  shake = Math.max(0, shake - dt * 2.2);
  camera.position.set(me.pos.x + (Math.random() - 0.5) * shake * 0.25, me.pos.y + (alive ? me.eye : 0.35) + bobY + (Math.random() - 0.5) * shake * 0.25, me.pos.z + (Math.random() - 0.5) * shake * 0.25);
  camera.rotation.set(me.pitch + me.recoil * 0.012, me.yaw, alive ? 0 : 0.7);
  animateViewmodel(dt, now, hv, alive);

  for (const a of avatars.values()) {
    a.group.position.lerp(a.target, Math.min(1, dt * 14));
    let dy = a.yaw - a.group.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); a.group.rotation.y += dy * Math.min(1, dt * 12);
    const mv = a.group.position.distanceTo(a.last); a.last.copy(a.group.position); a.moved = a.moved * 0.8 + mv * 4;
    a.walk += mv * 5; const sw = Math.sin(a.walk) * Math.min(0.9, a.moved * 0.4); a.l1.rotation.x = sw; a.l2.rotation.x = -sw;
  }
  for (const m of projMeshes.values()) {
    m.position.lerp(m.userData.t, Math.min(1, dt * 20));
    if (m.userData.kind === 0) { const d = m.userData.t.clone().sub(m.userData.prev || m.position); if (d.lengthSq() > 1e-4) m.lookAt(m.position.clone().add(d)); if (Math.random() < 0.8) burst(m.position, 0x777777, 1, 0.6, 0.18, 0.5, 0); }
    else m.rotation.x += dt * 9;
  }
  for (const c of chickenMeshes.values()) c.position.lerp(c.userData.t, Math.min(1, dt * 10));
  for (const p of pickupMeshes) { p.inner.rotation.y = t * 1.6; p.inner.position.y = 0.9 + Math.sin(t * 2 + p.i) * 0.1; }
  if (ROOM && connected && now2() - waitAt > 500) { waitAt = now2(); const w = waitEl(); w.style.display = players.size < 2 && !roundOver && !paused ? '' : 'none'; }
  for (const m of tagMeshes.values()) { const u = m.userData; u.plate.rotation.y += dt * 3; u.plate.position.y = 0.9 + Math.sin(t * 3 + u.ph) * 0.08; u.beam.material.opacity = 0.18 + 0.1 * Math.sin(t * 4 + u.ph); const q = 0.9 + 0.12 * Math.sin(t * 4 + u.ph); u.ring.scale.set(q, 0.03, q); }
  for (const m of lootMeshes.values()) { const u = m.userData; const age = (performance.now() - u.born) / 1000; u.inner.rotation.y += dt * 1.4 * u.spin * (age < 0.9 ? 6 - age * 5 : 1);
    // düşüş: yukarı fırlayıp iki kez zıplayarak yere yerleşir, sonra süzülür
    const toss = age < 0.9 ? Math.abs(Math.sin(age * 5.2)) * 1.7 * Math.pow(1 - age / 0.9, 1.1) : 0, hover = age < 0.9 ? 0 : Math.min(1, (age - 0.9) * 2) * Math.sin(t * 2.4 + u.ph) * 0.12;
    u.inner.position.y = 0.95 + toss + hover; u.shadow.scale.setScalar(0.9 - toss * 0.25); u.core.material.opacity = 0.14 + 0.1 * Math.sin(t * 5 + u.ph);
    if (u.r >= 1 && (u.spark -= dt) < 0) { u.spark = 0.28 - u.r * 0.05; const q = m.position.clone(); q.x += (Math.random() - 0.5) * 0.9; q.z += (Math.random() - 0.5) * 0.9; q.y += 0.3; burst(q, u.r >= 3 ? 0xffffff : VW.RARITY_INFO[u.r].color, 1, 0.8, 0.1, 1.1, -1.5); }
    if (u.lab) { const d = Math.hypot(camera.position.x - m.position.x, camera.position.z - m.position.z); u.lab.visible = d < 28; u.lab.material.opacity = d < 14 ? 1 : Math.max(0.35, 1 - (d - 14) / 14); }
    u.inner.position.y += 0; u.beam.material.opacity = 0.16 + 0.1 * Math.sin(t * 3 + u.ph); const q = u.rs * (1 + 0.08 * Math.sin(t * 3 + u.ph)); u.ring.scale.set(q, 0.04, q); const left = u.life - (performance.now() - u.born); m.visible = left > 5000 || Math.floor(performance.now() / 200) % 2 === 0; }

  for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dt; p.v.y -= p.grav * dt; p.m.position.addScaledVector(p.v, dt); if (p.life <= 0) { scene.remove(p.m); parts.splice(i, 1); } }
  for (let i = tracers.length - 1; i >= 0; i--) { const trc = tracers[i], age = now - trc.born; if (age > 110) { scene.remove(trc.l); trc.l.geometry.dispose(); trc.l.material.dispose(); tracers.splice(i, 1); } else trc.l.material.opacity = 0.9 * (1 - age / 110); }
  for (let i = booms.length - 1; i >= 0; i--) { const b = booms[i], k = (now - b.born) / 380; if (k >= 1) { scene.remove(b.m); b.m.geometry.dispose(); b.m.material.dispose(); booms.splice(i, 1); } else { b.m.scale.setScalar(b.r * (0.25 + k * 0.85)); b.m.material.opacity = 0.85 * (1 - k); } }

  refreshHud();
  $('dashf').style.width = (me.dashCd > 0 ? (1 - me.dashCd / 2.4) * 100 : 100) + '%';
  const gap = 5 + (hv > 1 ? 5 : 0) + me.recoil * 6 + (WP[me.w].spread * 160) * (me.zoom ? 0.3 : 1);
  $('cross').style.setProperty('--gap', gap.toFixed(1) + 'px');
  clock.mini += dt; if (clock.mini > 0.05) { clock.mini = 0; drawMini(); }
  clock.board += dt; if (clock.board > 0.3 && $('board').style.display === 'block') { clock.board = 0; refreshBoard(); }
  renderer.render(scene, camera);
}

// ---------- ana menü sahnesi ----------
const prev = { avatar: null, key: '', yaw: 0.5, vel: 0, drag: false, cfg: null, floor: null, lx: 0 };
function buildLobby() {
  if (prev.floor) return;
  const g = new THREE.Group();
  const grass = mat(0x5db04a), dirt = mat(0x8a5a36);
  for (let x = -5; x <= 5; x++) for (let z = -5; z <= 5; z++) {
    if (Math.hypot(x, z) > 5.4) continue;
    const top = new THREE.Mesh(blockGeo, grass); top.position.set(x, -0.5, z); g.add(top);
    if (Math.hypot(x, z) > 3.2) { const d = new THREE.Mesh(blockGeo, dirt); d.position.set(x, -1.5, z); g.add(d); }
  }
  g.add(box(2.6, 0.3, 2.6, 0xcfd2d8, 0, 0.15, 0), box(3.0, 0.15, 3.0, 0x8d9299, 0, 0.02, 0));
  for (const [x, z, h] of [[-4.5, -2, 3], [4.2, -3, 4], [-3.5, 3.5, 3], [4.8, 2.5, 3]]) { g.add(box(0.6, h, 0.6, 0xa8743a, x, h / 2, z)); g.add(box(2.4, 1.6, 2.4, 0x2f8f3a, x, h + 0.6, z), box(1.4, 1.2, 1.4, 0x3aa84a, x, h + 1.7, z)); }
  for (const [x, z] of [[-2.8, 4], [3, 4.2], [-5, 0.5]]) g.add(box(0.8, 0.8, 0.8, 0xa8aab0, x, 0.4, z));
  scene.add(g); prev.floor = g;
}
let visApplied = false;
function menuFrame(t, dt) {
  buildLobby();
  if (!visApplied) { applyVis(THEME_VIS[0], false); visApplied = true; }
  if (prev.cfg) {
    const key = JSON.stringify(prev.cfg);
    if (prev.key !== key) {
      if (prev.avatar) scene.remove(prev.avatar.group);
      const c = prev.cfg; prev.avatar = makeAvatar({ id: 0, name: c.name || '', c: c.c, sk: c.sk, hat: c.hat, bk: c.bk, p: [0, 0.3, 0], yaw: 0 });
      prev.avatar.label.visible = false; prev.avatar.group.position.set(0, 0.3, 0);
      if (c.w != null) { prev.avatar.gun.add(makeGun(c.w, gskinTint(c.gs), c.cl)); prev.avatar.gunIdx = c.w; }
      prev.key = key;
    }
  }
  if (!prev.drag) { prev.yaw += prev.vel * dt + dt * 0.15; prev.vel *= Math.max(0, 1 - dt * 3); }
  const a = prev.avatar;
  if (a) { a.group.rotation.y = prev.yaw; a.l1.rotation.x = Math.sin(t * 2) * 0.06; a.l2.rotation.x = -Math.sin(t * 2) * 0.06; a.head.rotation.y = Math.sin(t * 0.8) * 0.25; }
  camera.fov = 38; camera.updateProjectionMatrix();
  camera.position.set(0, 1.55, 5.2); camera.rotation.set(-0.05, 0, 0);
  gunRoot.visible = false;
}
canvas.addEventListener('pointerdown', (e) => { if (!connected) { prev.drag = true; prev.lx = e.clientX; prev.vel = 0; } });
addEventListener('pointermove', (e) => { if (prev.drag) { const dx = e.clientX - prev.lx; prev.lx = e.clientX; prev.yaw += dx * 0.012; prev.vel = dx * 0.5; } });
addEventListener('pointerup', () => { prev.drag = false; });

// ---------- oyuna giriş / çıkış ----------
function startPlaying() {
  document.body.classList.add('playing');
  if (VA.hooks.status) VA.hooks.status('');
  if (prev.avatar) { scene.remove(prev.avatar.group); prev.avatar = null; prev.key = ''; }
  if (prev.floor) { scene.remove(prev.floor); prev.floor = null; }
  visApplied = false;
  camera.fov = baseFov(); camera.updateProjectionMatrix();
  $('chatlog').innerHTML = ''; $('feed').innerHTML = '';
  gunRoot.visible = true;
  paused = true; document.body.classList.add('paused'); syncPauseUi();
  canvas.requestPointerLock();
}
function leave() {
  ROOM = null; { const rt = $('roomtag'); if (rt) rt.style.display = 'none'; }
  hideResults(); roundOver = false;
  leaving = true; connected = false; chatOpen = false; mouseDown = false;
  $('chatwrap').classList.remove('open');
  if (ws) { ws.onclose = null; try { ws.close(); } catch (e) {} ws = null; }
  if (document.exitPointerLock) document.exitPointerLock();
  document.body.classList.remove('playing', 'paused'); paused = false; locked = false;
  clearAvatars(); clearTags(); clearProjs(); clearEffects();
  for (const c of chickenMeshes.values()) scene.remove(c); chickenMeshes.clear();
  for (const p of pickupMeshes) scene.remove(p.g); pickupMeshes.length = 0;
  if (mapMesh) { scene.remove(mapMesh); mapMesh.material.dispose(); mapMesh = null; }
  M = null; mini = null; players.clear(); lastShot.clear();
  me.zoom = false; me.adsT = 0; me.reloadEnd = 0; me.fireT = 1; me.spinV = 0;
  $('scope').style.display = 'none'; $('cross').style.display = 'block'; showMsg('', 0); $('board').style.display = 'none';
  camera.rotation.set(0, 0, 0); camera.fov = 38; camera.updateProjectionMatrix(); visApplied = false;
  PR.save();
  if (VA.hooks.menuShown) VA.hooks.menuShown();
}

// ---------- duraklatma menüsü ----------
function syncPauseUi() {
  const online = !(LOCAL && ws instanceof window.FakeWS);
  $('pnote').innerHTML = online ? (ROOM ? '<b>Oda ' + ROOM.code + (ROOM.priv ? ' (özel)' : '') + '</b> &middot; ' : '') + '<b>Çevrimiçi oyun:</b> senin için menü açık, diğer oyuncular için oyun devam eder. Menü kalkanı 6 sn korur, sonra hedef olabilirsin.' : 'Yerel oyun duraklatıldı.';
  $('ptitle').textContent = online ? 'MENÜ' : 'DURAKLATILDI'; $('pSens').value = S().sens; $('pVol').value = S().vol; $('pFov').value = S().fov; $('pSensV').textContent = (+S().sens).toFixed(2); $('pVolV').textContent = Math.round(S().vol * 100); $('pFovV').textContent = S().fov; }
$('pResume').addEventListener('click', () => { sfx.ui(); canvas.requestPointerLock(); });
$('pMenu').addEventListener('click', () => { sfx.ui(); leave(); });
function bindSetting(id, key, fmt, apply) { $(id).addEventListener('input', () => { const v = +$(id).value; S()[key] = v; $(id + 'V').textContent = fmt(v); PR.save(); if (apply) apply(v); }); }
bindSetting('pSens', 'sens', (v) => v.toFixed(2)); bindSetting('pVol', 'vol', (v) => Math.round(v * 100), setVolume); bindSetting('pFov', 'fov', (v) => v, () => { if (connected) setZoom(me.zoom); });

// ---------- dış API ----------
const VA = {
  hooks: {},
  themePal: (t) => THEME_VIS[t] || THEME_VIS[0],
  start(info) { ac(); connect(info); },
  leave,
  isPlaying: () => connected,
  setVolume, ui: () => sfx.ui(),
  preview: { set(cfg) { prev.cfg = cfg; } },
};
VA.dbg = { get: () => ({ MODE, FL, flags: flagG.length, bases: baseG.length, myId, team: myTeam(), TS, zombie: typeof ZW !== 'undefined' ? ZW : null }), onMsg };
window.VA = VA;
requestAnimationFrame(frame);
})();
