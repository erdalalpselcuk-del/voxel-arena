// Kalıcı depolama: tek bir JSON dosyası (data/db.json). Hesaplar, bulut kayıtları ve kulüpler burada tutulur.
// DATA_DIR ortam değişkeniyle klasör değiştirilir (Docker/Fly için bir disk/volume bağlayın, bkz. DEPLOY.md).
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const FILE = path.join(DIR, 'db.json');
const db = { v: 1, users: {}, clubs: {} };
let dirty = false, timer = null;

function load() {
  try {
    fs.mkdirSync(DIR, { recursive: true });
    const j = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    if (j && typeof j === 'object') { db.users = j.users || {}; db.clubs = j.clubs || {}; }
  } catch (e) { if (e.code !== 'ENOENT') console.error('[db] okunamadı:', e.message); }
}
function flush() {
  if (!dirty) return;
  dirty = false;
  try { const tmp = FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(db)); fs.renameSync(tmp, FILE); }
  catch (e) { console.error('[db] yazılamadı:', e.message); dirty = true; }
}
function touch() { dirty = true; if (!timer) timer = setTimeout(() => { timer = null; flush(); }, 2000); }
// jetonun kendisi saklanmaz, yalnızca özeti
const idOf = (token) => crypto.createHash('sha256').update(String(token)).digest('hex').slice(0, 24);

module.exports = { db, load, flush, touch, idOf, DIR };
