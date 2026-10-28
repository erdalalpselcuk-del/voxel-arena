// Çok oyunculu sunucu: HTTP (statik dosyalar + /api/rooms) + WebSocket. Oyun mantığı public/game.js içinde.
// Her oda kendi Game örneğine sahiptir. Hızlı oyun: uygun herkese açık odaya sokar, yoksa yeni oda açar.
// Özel oda: 4 harfli kodla girilir. Boş odalar kapanır.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const { Game, MODES, MODE_ORDER } = require('./public/game.js');
const store = require('./store');
const lobby = require('./lobby');
store.load();
const STARTED = Date.now();

const PORT = process.env.PORT || 3000;
const MIN_PLAYERS = +(process.env.MIN_PLAYERS || 4); // herkese açık odalarda botlarla doldurulan toplam oyuncu (0 = bot yok)
const MAX_PLAYERS = 16, MAX_ROOMS = +(process.env.MAX_ROOMS || 40), MAX_PER_IP = +(process.env.MAX_PER_IP || 8);
const EMPTY_MS = 30000; // son insan çıkınca oda bu kadar sonra kapanır
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.json': 'application/json' };
const PUBLIC = path.join(__dirname, 'public');

const rooms = new Map(); // kod -> oda
const CODE_CH = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const newCode = () => { for (;;) { let c = ''; for (let i = 0; i < 4; i++) c += CODE_CH[Math.floor(Math.random() * CODE_CH.length)]; if (!rooms.has(c)) return c; } };
const isMode = (m) => typeof m === 'string' && Object.prototype.hasOwnProperty.call(MODES, m);
const cl = (v, lo, hi, d) => (typeof v === 'number' && isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : d);

function createRoom(opt) {
  if (rooms.size >= MAX_ROOMS) return null;
  const code = newCode(), sockets = new Map();
  const mode = isMode(opt.mode) ? opt.mode : null; // null = her turda değişen karışık mod
  const room = {
    code, priv: !!opt.priv, host: 0, sockets, emptyAt: 0, born: Date.now(),
    game: new Game({
      rotate: !mode, allowHeavy: false, mode: mode || MODE_ORDER[Math.floor(Math.random() * MODE_ORDER.length)],
      send: (id, obj) => { const ws = sockets.get(id); if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); },
      broadcast: (obj, skip) => { const s = JSON.stringify(obj); for (const [id, ws] of sockets) if (id !== skip && ws.readyState === 1) ws.send(s); },
    }),
  };
  room.fixedMode = mode;
  room.game.fillBots(cl(opt.bots, 0, MAX_PLAYERS, MIN_PLAYERS));
  rooms.set(code, room);
  return room;
}

const roomInfo = (r) => ({ code: r.code, priv: r.priv, mode: r.game.modeKey, modeName: r.game.mode().name, fixed: !!r.fixedMode, n: r.game.humans(), max: MAX_PLAYERS, bots: r.game.players.size - r.game.humans() });
const joinable = (r) => r.game.humans() < MAX_PLAYERS;

function quickRoom(wantMode, real) { // real: gerçek oyuncu ara; hiç oyuncu yoksa botsuz oda açar, bot dolgusu gerçek oyuncu geldikçe zaten çekilir
  let best = null;
  for (const r of rooms.values()) {
    if (r.priv || !joinable(r)) continue;
    if (isMode(wantMode) && r.game.modeKey !== wantMode) continue;
    if (!best || r.game.humans() > best.game.humans()) best = r; // en dolu odayı tercih et
  }
  return best || createRoom({ mode: isMode(wantMode) ? wantMode : null, bots: real ? 0 : MIN_PLAYERS });
}

function resolveRoom(msg, ip) {
  const req = (msg && typeof msg.room === 'object' && msg.room) || {};
  if (req.kind === 'code') {
    const r = rooms.get(String(req.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4));
    return r ? (joinable(r) ? r : 'full') : 'noroom';
  }
  if (req.kind === 'create') return createRoom({ mode: req.mode, bots: req.bots, priv: !!req.priv }) || 'busy';
  return quickRoom(typeof req.mode === 'string' ? req.mode : '', !!req.real) || 'busy';
}

const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/api/rooms') return json(res, 200, { rooms: [...rooms.values()].filter((r) => !r.priv).map(roomInfo), total: [...rooms.values()].reduce((a, r) => a + r.game.humans(), 0) });
  if (p === '/healthz') return json(res, 200, { ok: true, up: Math.round((Date.now() - STARTED) / 1000), rooms: rooms.size, players: totalHumans(), ...lobby.stats() });
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(PUBLIC, p));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

const totalHumans = () => { let n = 0; for (const r of rooms.values()) n += r.game.humans(); return n; };
lobby.setGameCount(totalHumans);
const wss = new WebSocketServer({ noServer: true, maxPayload: 8192 });
// /lobby: hesap, sohbet, sıralama, kulüp; diğer her yol: oyun odası
server.on('upgrade', (req, socket, head) => {
  const p = (req.url || '').split('?')[0];
  const target = p === '/lobby' ? lobby.wss : wss;
  target.handleUpgrade(req, socket, head, (ws) => target.emit('connection', ws, req));
});
const perIp = new Map();

wss.on('connection', (ws, req) => {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();
  if ((perIp.get(ip) || 0) >= MAX_PER_IP) { ws.close(); return; }
  perIp.set(ip, (perIp.get(ip) || 0) + 1);
  let id = 0, room = null;
  ws.isAlive = true; ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (!msg || typeof msg.t !== 'string') return;
    if (!room) {
      if (msg.t !== 'join') return;
      const r = resolveRoom(msg, ip);
      if (typeof r === 'string') { ws.send(JSON.stringify({ t: r })); return ws.close(); } // noroom | full | busy
      const g = r.game, tmp = g.nextId; // addPlayer id'yi kendisi atar; soket önce kaydedilmeli
      r.sockets.set(tmp, ws);
      const p = g.addPlayer(msg, true);
      if (!p) { r.sockets.delete(tmp); ws.send(JSON.stringify({ t: 'full' })); return ws.close(); }
      room = r; id = p.id; r.emptyAt = 0;
      if (!r.host) r.host = id;
      g.balanceBots();
      ws.send(JSON.stringify(Object.assign({ t: 'room', host: r.host === id }, roomInfo(r))));
      return;
    }
    room.game.onMsg(id, msg);
  });
  ws.on('close', () => {
    perIp.set(ip, Math.max(0, (perIp.get(ip) || 1) - 1));
    if (!room) return;
    room.sockets.delete(id);
    room.game.removePlayer(id);
    if (room.host === id) room.host = [...room.sockets.keys()][0] || 0;
    room.game.balanceBots();
    if (!room.game.humans()) room.emptyAt = Date.now();
  });
  ws.on('error', () => {});
});

// canlılık sinyali: proxy/yük dengeleyici boştaki bağlantıları kapatmasın, kopanlar temizlensin
setInterval(() => { for (const c of wss.clients) { if (c.isAlive === false) { c.terminate(); continue; } c.isAlive = false; try { c.ping(); } catch (e) {} } }, 25000).unref();

setInterval(() => {
  const now = Date.now();
  for (const [code, r] of rooms) {
    if (!r.game.humans()) { if (r.emptyAt && now - r.emptyAt > (r.priv ? EMPTY_MS : EMPTY_MS * 2)) rooms.delete(code); continue; } // boş odada oyun adımı çalışmaz
    r.game.step(0.05);
  }
}, 50);

if (require.main === module) {
  createRoom({ mode: process.env.MODE || null, bots: MIN_PLAYERS }); // hazır bir herkese açık oda
  server.listen(PORT, process.env.HOST || '0.0.0.0', () => console.log(`Voxel Arena http://localhost:${PORT}  (bot dolgusu: ${MIN_PLAYERS}, en çok ${MAX_ROOMS} oda, veri: ${store.DIR})`));
  const bye = () => { try { store.flush(); } catch (e) {} process.exit(0); };
  process.on('SIGTERM', bye); process.on('SIGINT', bye);
  process.on('uncaughtException', (e) => console.error('[hata]', e)); // bir hata sunucuyu düşürmesin
  process.on('unhandledRejection', (e) => console.error('[hata]', e));
}
module.exports = { server, rooms, createRoom, roomInfo };
