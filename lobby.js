// Lobi sunucusu (/lobby WebSocket): hesap (jeton), bulut kayıt, genel + kulüp sohbeti, sıralama, kulüpler, çevrimiçi oyuncu listesi.
// Oyun odalarından ayrıdır; oyun içindeyken de bağlı kalınır. Veriler store.js ile data/db.json içinde kalıcıdır.
'use strict';
const { WebSocketServer } = require('ws');
const store = require('./store');
const db = store.db;

const wss = new WebSocketServer({ noServer: true, maxPayload: 80 * 1024 });
const conns = new Map();      // uid -> ctx (tek oturum)
const perIp = new Map();
const globalChat = [];        // son mesajlar
const clubChat = new Map();   // tag -> son mesajlar
const MAX_CLUB = 30, MAX_PER_IP = 10, SAVE_MAX = 60000;

const clean = (s, n) => String(s == null ? '' : s).replace(/[<>&"'`\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
const num = (v, hi) => (typeof v === 'number' && isFinite(v) ? Math.max(0, Math.min(hi, Math.round(v))) : 0);
const send = (ws, o) => { if (ws.readyState === 1) ws.send(JSON.stringify(o)); };
const score = (st) => (st ? st.xp * 2 + st.kills * 10 + st.wins * 50 : 0);

let gameCount = () => 0; // server.js bağlar: oyun içindeki gerçek oyuncu sayısı

function clubLevel(c) { let xp = 0; for (const id of c.members) { const u = db.users[id]; if (u && u.stats) xp += u.stats.xp; } return 1 + Math.floor(xp / 3000); }
function clubPub(tag) {
  const c = tag && db.clubs[tag]; if (!c) return null;
  return { tag: c.tag, name: c.name, owner: c.owner, level: clubLevel(c), n: c.members.length, max: MAX_CLUB };
}
function members(tag) {
  const c = db.clubs[tag]; if (!c) return [];
  return c.members.map((id) => { const u = db.users[id] || {}; return { id, n: u.name || '?', lv: u.stats ? u.stats.level : 1, on: conns.has(id), owner: id === c.owner }; });
}
function pushClub(tag) { // kulüp değişince üyelere güncel kulüp + üye listesi
  const c = db.clubs[tag]; if (!c) return;
  const pub = clubPub(tag), mem = members(tag);
  for (const id of c.members) { const x = conns.get(id); if (x) send(x.ws, { t: 'club', club: pub, members: mem }); }
}
function onlineInfo() { return { lobby: conns.size, game: gameCount() }; }
let onlineTimer = null;
function scheduleOnline() {
  if (onlineTimer) return;
  onlineTimer = setTimeout(() => { onlineTimer = null; const m = { t: 'online', ...onlineInfo() }; for (const x of conns.values()) send(x.ws, m); }, 800);
}

function chatMsg(room, u, text) { return { t: 'chat', room, id: u.id, n: u.name, tag: u.club || '', text, ts: Date.now() }; }
function pushHist(arr, m) { arr.push(m); if (arr.length > 60) arr.shift(); }

let lbCache = null, lbAt = 0;
function leaderboard() {
  if (lbCache && Date.now() - lbAt < 5000) return lbCache;
  lbCache = Object.values(db.users).filter((u) => u.stats && (u.stats.xp || u.stats.kills)).map((u) => ({ id: u.id, n: u.name, s: score(u.stats), lv: u.stats.level, tag: u.club || '' })).sort((a, b) => b.s - a.s);
  lbAt = Date.now(); return lbCache;
}

function onMessage(ctx, msg) {
  const { ws } = ctx;
  if (!msg || typeof msg.t !== 'string') return;
  if (msg.t === 'hello') {
    if (ctx.uid) return;
    const token = String(msg.token || ''); if (token.length < 16 || token.length > 80) return ws.close();
    const uid = store.idOf(token);
    const old = conns.get(uid); if (old && old.ws !== ws) { send(old.ws, { t: 'kicked' }); old.ws.close(); }
    let u = db.users[uid];
    if (!u) { u = db.users[uid] = { id: uid, name: '', created: Date.now(), rev: 0, profile: null, stats: null, club: '' }; }
    u.name = clean(msg.name, 16) || u.name || 'Oyuncu'; u.seen = Date.now();
    ctx.uid = uid; conns.set(uid, ctx); store.touch();
    if (u.club && !db.clubs[u.club]) u.club = '';
    const clientRev = num(msg.rev, 9e15);
    send(ws, { t: 'welcome', id: uid, name: u.name, rev: u.rev, profile: u.profile && u.rev > clientRev ? u.profile : null, club: clubPub(u.club), members: u.club ? members(u.club) : [], chat: globalChat.slice(-40), cchat: u.club ? (clubChat.get(u.club) || []).slice(-30) : [], ...onlineInfo() });
    scheduleOnline();
    if (u.club) pushClub(u.club);
    return;
  }
  const u = ctx.uid && db.users[ctx.uid]; if (!u) return;
  switch (msg.t) {
    case 'save': {
      const p = msg.profile; if (!p || typeof p !== 'object' || Array.isArray(p)) return;
      let js; try { js = JSON.stringify(p); } catch (e) { return; }
      if (js.length > SAVE_MAX) return send(ws, { t: 'err', m: 'Kayıt çok büyük' });
      const rev = num(msg.rev, 9e15); if (rev < u.rev) return send(ws, { t: 'saved', rev: u.rev, stale: 1 }); // eski sürüm üzerine yazma
      u.profile = p; u.rev = rev; if (typeof p.name === 'string') u.name = clean(p.name, 16) || u.name;
      const s = msg.stats || {}; u.stats = { xp: num(s.xp, 1e9), kills: num(s.kills, 1e9), deaths: num(s.deaths, 1e9), wins: num(s.wins, 1e9), matches: num(s.matches, 1e9), level: Math.max(1, num(s.level, 9999)) };
      store.touch(); send(ws, { t: 'saved', rev }); break;
    }
    case 'name': u.name = clean(msg.name, 16) || u.name; store.touch(); break;
    case 'chat': {
      const text = clean(msg.text, 120), now = Date.now(); if (!text) return;
      if (now - ctx.lastChat < 800) return send(ws, { t: 'err', m: 'Biraz yavaş yaz' });
      ctx.lastChat = now;
      if (msg.room === 'club') {
        const c = db.clubs[u.club]; if (!c) return; const m = chatMsg('club', u, text);
        pushHist(clubChat.get(c.tag) || clubChat.set(c.tag, []).get(c.tag), m);
        for (const id of c.members) { const x = conns.get(id); if (x) send(x.ws, m); }
      } else { const m = chatMsg('global', u, text); pushHist(globalChat, m); for (const x of conns.values()) send(x.ws, m); }
      break;
    }
    case 'lb': { const rows = leaderboard(), i = rows.findIndex((r) => r.id === u.id); send(ws, { t: 'lb', rows: rows.slice(0, 25).map((r, k) => ({ r: k + 1, n: r.n, s: r.s, lv: r.lv, tag: r.tag, me: r.id === u.id ? 1 : 0 })), me: i >= 0 ? { r: i + 1, s: rows[i].s } : null, total: rows.length }); break; }
    case 'who': send(ws, { t: 'who', list: [...conns.values()].slice(0, 60).map((x) => { const q = db.users[x.uid]; return { n: q.name, tag: q.club || '', lv: q.stats ? q.stats.level : 1 }; }), ...onlineInfo() }); break;
    case 'clubs': send(ws, { t: 'clubs', list: Object.values(db.clubs).map((c) => clubPub(c.tag)).sort((a, b) => b.n - a.n).slice(0, 40) }); break;
    case 'club.info': send(ws, { t: 'club', club: clubPub(u.club), members: u.club ? members(u.club) : [], cchat: u.club ? (clubChat.get(u.club) || []).slice(-30) : [] }); break;
    case 'club.create': {
      if (u.club) return send(ws, { t: 'err', m: 'Zaten bir kulüptesin' });
      const name = clean(msg.name, 20), tag = clean(msg.tag, 4).toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (name.length < 3 || tag.length < 2) return send(ws, { t: 'err', m: 'Ad en az 3, etiket 2-4 harf/rakam olmalı' });
      if (db.clubs[tag]) return send(ws, { t: 'err', m: 'Bu etiket kullanılıyor' });
      db.clubs[tag] = { tag, name, owner: u.id, members: [u.id], created: Date.now() }; u.club = tag; store.touch(); pushClub(tag); break;
    }
    case 'club.join': {
      if (u.club) return send(ws, { t: 'err', m: 'Önce mevcut kulüpten ayrıl' });
      const tag = clean(msg.tag, 4).toUpperCase(), c = db.clubs[tag]; if (!c) return send(ws, { t: 'err', m: 'Kulüp bulunamadı' });
      if (c.members.length >= MAX_CLUB) return send(ws, { t: 'err', m: 'Kulüp dolu' });
      c.members.push(u.id); u.club = tag; store.touch(); pushClub(tag);
      send(ws, { t: 'cchat', list: (clubChat.get(tag) || []).slice(-30) }); break;
    }
    case 'club.leave': {
      const tag = u.club, c = db.clubs[tag]; if (!c) return;
      c.members = c.members.filter((id) => id !== u.id); u.club = '';
      if (!c.members.length) { delete db.clubs[tag]; clubChat.delete(tag); } else if (c.owner === u.id) c.owner = c.members[0];
      store.touch(); send(ws, { t: 'club', club: null, members: [] }); pushClub(tag); break;
    }
  }
}

wss.on('connection', (ws, req) => {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();
  if ((perIp.get(ip) || 0) >= MAX_PER_IP) { ws.close(); return; }
  perIp.set(ip, (perIp.get(ip) || 0) + 1);
  const ctx = { ws, uid: '', lastChat: 0, win: Date.now(), n: 0, alive: true, born: Date.now() };
  ws._ctx = ctx;
  ws.on('pong', () => { ctx.alive = true; });
  ws.on('message', (raw) => {
    const now = Date.now(); if (now - ctx.win > 10000) { ctx.win = now; ctx.n = 0; }
    if (++ctx.n > 80) return ws.close(); // 10 sn'de 80 mesajdan fazlası
    let msg; try { msg = JSON.parse(raw); } catch (e) { return; }
    try { onMessage(ctx, msg); } catch (e) { console.error('[lobi]', e.message); }
  });
  ws.on('close', () => {
    perIp.set(ip, Math.max(0, (perIp.get(ip) || 1) - 1));
    if (ctx.uid && conns.get(ctx.uid) === ctx) { conns.delete(ctx.uid); const u = db.users[ctx.uid]; if (u) { u.seen = Date.now(); store.touch(); if (u.club) pushClub(u.club); } scheduleOnline(); }
  });
  ws.on('error', () => {});
});
// bağlantı kopukluğunu ve boşta kalan proxy zaman aşımlarını yakalamak için canlılık sinyali
setInterval(() => { for (const c of wss.clients) { const x = c._ctx; if (!x) continue; if (!x.alive || (!x.uid && Date.now() - x.born > 15000)) { c.terminate(); continue; } x.alive = false; try { c.ping(); } catch (e) {} } }, 25000).unref();

module.exports = { wss, onlineInfo, setGameCount: (f) => { gameCount = f; }, stats: () => ({ users: Object.keys(db.users).length, clubs: Object.keys(db.clubs).length, lobby: conns.size }) };
