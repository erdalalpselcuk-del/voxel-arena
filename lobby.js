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


// ---- hesap sistemi: kullanıcı adı + parola (scrypt). Oturum jetonu sunucuda üretilir, yalnızca özeti saklanır ----
const crypto = require('crypto');
const VIP_USERS = (process.env.VIP_USERS || 'erdal,gencbaayy').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
const VIP_CODE = process.env.VIP_CODE || ''; // ayrılmış adlarla kayıt için gizli kod (boşsa o adlar kaydedilemez)
const VIP_LEVEL = 2;
const vipLevel = (acct) => (acct && VIP_USERS.indexOf(String(acct).toLowerCase()) >= 0 ? VIP_LEVEL : 0);
const userOk = (s) => /^[A-Za-z0-9_çğıöşüÇĞİÖŞÜ.-]{3,16}$/.test(s);
const hashPw = (pw, salt) => crypto.scryptSync(String(pw), salt, 32).toString('hex');
const attempts = new Map(); // ip|kullanıcı -> {n, t}
function tooMany(key) { const now = Date.now(), a = attempts.get(key); if (!a || now - a.t > 600000) { attempts.set(key, { n: 1, t: now }); return false; } a.n++; return a.n > 8; }
function newSession(uid) { const tok = crypto.randomBytes(24).toString('hex'); db.sess[store.idOf(tok)] = uid; return tok; }
const rankName = (m) => (m < 900 ? 'Bronz' : m < 1100 ? 'Gümüş' : m < 1300 ? 'Altın' : m < 1500 ? 'Platin' : 'Elmas');
function verify(tok) { // oyun odasına gelen oturum jetonunu doğrula (yalnızca giriş yapmış hesaplar)
  tok = String(tok || ''); if (tok.length < 16 || tok.length > 80) return null;
  const uid = db.sess[store.idOf(tok)], u = uid && db.users[uid]; if (!u) return null;
  return { uid, mmr: u.mmr || 1000 };
}
function rankResult(uid, won, kills) {
  const u = db.users[uid]; if (!u) return;
  const old = u.mmr || 1000, d = won ? 24 + Math.min(8, kills) : -(18 - Math.min(8, kills >> 1));
  u.mmr = Math.max(100, old + d); u.rm = (u.rm | 0) + 1; if (won) u.rw = (u.rw | 0) + 1; store.touch();
  const x = conns.get(uid); if (x) send(x.ws, { t: 'mmr', mmr: u.mmr, d, rank: rankName(u.mmr) });
}
function authMsg(ctx, msg) {
  const { ws } = ctx, user = clean(msg.user, 16), pw = String(msg.pass == null ? '' : msg.pass), key = user.toLowerCase();
  if (tooMany(ctx.ip + '|' + msg.t) || tooMany('u|' + key)) return send(ws, { t: 'autherr', m: 'Çok fazla deneme. 10 dakika sonra tekrar dene.' });
  if (!userOk(user)) return send(ws, { t: 'autherr', m: 'Kullanıcı adı 3-16 harf/rakam olmalı (boşluk yok)' });
  if (pw.length < 6 || pw.length > 64) return send(ws, { t: 'autherr', m: 'Parola 6-64 karakter olmalı' });
  if (msg.t === 'reg') {
    if (db.accts[key]) return send(ws, { t: 'autherr', m: 'Bu kullanıcı adı alınmış' });
    if (VIP_USERS.indexOf(key) >= 0 && (!VIP_CODE || String(msg.code || '') !== VIP_CODE)) return send(ws, { t: 'autherr', m: 'Bu ad ayrılmış (kayıt kodu gerekli)' });
    const salt = crypto.randomBytes(16).toString('hex'), uid = 'a' + crypto.randomBytes(11).toString('hex');
    db.accts[key] = { name: user, salt, hash: hashPw(pw, salt), uid, created: Date.now() };
    // misafir ilerlemesini taşı: o anki bağlantının kullanıcı kaydı yeni hesaba kopyalanır
    const g = ctx.uid && db.users[ctx.uid];
    db.users[uid] = { id: uid, name: user, created: Date.now(), rev: g ? g.rev : 0, profile: g ? g.profile : null, stats: g ? g.stats : null, club: '' };
  } else {
    const a = db.accts[key]; if (!a) return send(ws, { t: 'autherr', m: 'Kullanıcı bulunamadı' });
    const h = Buffer.from(hashPw(pw, a.salt), 'hex'), ok = Buffer.from(a.hash, 'hex');
    if (h.length !== ok.length || !crypto.timingSafeEqual(h, ok)) return send(ws, { t: 'autherr', m: 'Parola yanlış' });
  }
  const a = db.accts[key]; store.touch();
  send(ws, { t: 'auth', token: newSession(a.uid), user: a.name, reg: msg.t === 'reg' ? 1 : 0 });
}


// ---- arkadaşlar ve parti (yalnızca giriş yapmış hesaplar) ----
let partyRoom = () => null; // server.js bağlar: (mode) -> oda kodu
const parties = new Map(); // pid -> { id, leader, members: [uid], mode }
const partyOf = new Map(); // uid -> pid
const nameOf = (uid) => (db.users[uid] && db.users[uid].name) || 'Oyuncu';
const isAcct = (uid) => /^a/.test(uid);
function uidByName(n) { const a = db.accts[String(n || '').trim().toLowerCase()]; return a ? a.uid : ''; }
function friendsView(uid) {
  const u = db.users[uid] || {};
  const mk = (id) => { const c = conns.get(id); return { id, name: nameOf(id), online: !!c, party: !!partyOf.get(id), rank: rankName((db.users[id] && db.users[id].mmr) || 1000) }; };
  return { t: 'fr', friends: (u.friends || []).map(mk).sort((a, b) => (b.online - a.online) || a.name.localeCompare(b.name)), reqs: (u.fin || []).map((id) => ({ id, name: nameOf(id) })) };
}
function partyView(pid) { const p = parties.get(pid); return p ? { t: 'party', id: p.id, leader: p.leader, mode: p.mode, members: p.members.map((id) => ({ id, name: nameOf(id), online: conns.has(id) })) } : { t: 'party', id: '', members: [] }; }
function pushParty(pid, extra) { const p = parties.get(pid); if (!p) return; const v = partyView(pid); for (const id of p.members) { const c = conns.get(id); if (c) send(c.ws, extra ? Object.assign({}, v, extra) : v); } }
function leaveParty(uid) {
  const pid = partyOf.get(uid); if (!pid) return; partyOf.delete(uid);
  const p = parties.get(pid); if (!p) return;
  p.members = p.members.filter((x) => x !== uid);
  const c = conns.get(uid); if (c) send(c.ws, { t: 'party', id: '', members: [] });
  if (p.members.length < 2) { for (const m of p.members) { partyOf.delete(m); const cc = conns.get(m); if (cc) send(cc.ws, { t: 'party', id: '', members: [] }); } parties.delete(pid); return; }
  if (p.leader === uid) p.leader = p.members[0];
  pushParty(pid);
}
function social(ctx, msg) {
  const uid = ctx.uid; if (!uid || msg.t.slice(0, 3) !== 'fr.' && msg.t.slice(0, 6) !== 'party.') return false;
  if (!isAcct(uid)) { send(ctx.ws, { t: 'err', m: 'Arkadaş ve parti için hesapla giriş yapmalısın' }); return true; }
  const me = db.users[uid]; me.friends = me.friends || []; me.fin = me.fin || [];
  switch (msg.t) {
    case 'fr.list': send(ctx.ws, friendsView(uid)); send(ctx.ws, partyView(partyOf.get(uid))); break;
    case 'fr.add': {
      const id = uidByName(msg.user);
      if (!id) return send(ctx.ws, { t: 'err', m: 'Bu adla bir hesap bulunamadı' }), true;
      if (id === uid) return send(ctx.ws, { t: 'err', m: 'Kendini ekleyemezsin' }), true;
      const o = db.users[id]; o.friends = o.friends || []; o.fin = o.fin || [];
      if (me.friends.indexOf(id) >= 0) return send(ctx.ws, { t: 'err', m: 'Zaten arkadaşsınız' }), true;
      if (me.fin.indexOf(id) >= 0) { // karşılıklı: direkt arkadaş
        me.fin = me.fin.filter((x) => x !== id); me.friends.push(id); o.friends.push(uid);
        send(ctx.ws, { t: 'note', m: nameOf(id) + ' ile arkadaş oldunuz' });
      } else if (o.fin.indexOf(uid) < 0) { if (o.fin.length >= 50) return send(ctx.ws, { t: 'err', m: 'Bu oyuncunun istek kutusu dolu' }), true; o.fin.push(uid); send(ctx.ws, { t: 'note', m: 'İstek gönderildi' }); }
      else send(ctx.ws, { t: 'note', m: 'İstek zaten gönderilmiş' });
      store.touch(); send(ctx.ws, friendsView(uid)); const c = conns.get(id); if (c) { send(c.ws, friendsView(id)); send(c.ws, { t: 'note', m: me.name + ' seni arkadaş olarak ekledi / istek gönderdi' }); }
      break;
    }
    case 'fr.accept': case 'fr.decline': {
      const id = String(msg.id || ''); if (me.fin.indexOf(id) < 0) break;
      me.fin = me.fin.filter((x) => x !== id);
      if (msg.t === 'fr.accept' && db.users[id]) { const o = db.users[id]; o.friends = o.friends || []; if (me.friends.indexOf(id) < 0) me.friends.push(id); if (o.friends.indexOf(uid) < 0) o.friends.push(uid); const c = conns.get(id); if (c) send(c.ws, friendsView(id)); }
      store.touch(); send(ctx.ws, friendsView(uid)); break;
    }
    case 'fr.remove': {
      const id = String(msg.id || ''); me.friends = me.friends.filter((x) => x !== id); const o = db.users[id]; if (o && o.friends) o.friends = o.friends.filter((x) => x !== uid);
      store.touch(); send(ctx.ws, friendsView(uid)); const c = conns.get(id); if (c) send(c.ws, friendsView(id)); break;
    }
    case 'party.invite': {
      const id = String(msg.id || ''); if (me.friends.indexOf(id) < 0) break;
      const c = conns.get(id); if (!c) return send(ctx.ws, { t: 'err', m: nameOf(id) + ' çevrimdışı' }), true;
      if (partyOf.get(id)) return send(ctx.ws, { t: 'err', m: nameOf(id) + ' zaten bir partide' }), true;
      let pid = partyOf.get(uid);
      if (!pid) { pid = 'p' + Math.random().toString(36).slice(2, 8); parties.set(pid, { id: pid, leader: uid, members: [uid], mode: 'kc', inv: new Set() }); partyOf.set(uid, pid); }
      const p = parties.get(pid); if (p.leader !== uid) return send(ctx.ws, { t: 'err', m: 'Sadece parti lideri davet edebilir' }), true;
      if (p.members.length >= 5) return send(ctx.ws, { t: 'err', m: 'Parti dolu (en fazla 5 kişi)' }), true;
      p.inv.add(id); send(c.ws, { t: 'party.inv', pid, from: me.name }); send(ctx.ws, { t: 'note', m: 'Parti daveti gönderildi' }); pushParty(pid); break;
    }
    case 'party.join': {
      const pid = String(msg.pid || ''), p = parties.get(pid);
      if (!p || !p.inv.has(uid)) return send(ctx.ws, { t: 'err', m: 'Davet geçersiz ya da süresi doldu' }), true;
      if (partyOf.get(uid)) leaveParty(uid);
      if (p.members.length >= 5) return send(ctx.ws, { t: 'err', m: 'Parti dolu' }), true;
      p.inv.delete(uid); p.members.push(uid); partyOf.set(uid, pid); pushParty(pid); break;
    }
    case 'party.leave': leaveParty(uid); break;
    case 'party.kick': { const pid = partyOf.get(uid), p = parties.get(pid); if (p && p.leader === uid && p.members.indexOf(String(msg.id)) > 0) leaveParty(String(msg.id)); break; }
    case 'party.mode': { const p = parties.get(partyOf.get(uid)); if (p && p.leader === uid) { p.mode = String(msg.mode || '').slice(0, 8); pushParty(p.id); } break; }
    case 'party.go': { // lider başlatır: özel oda açılır, herkes o koda girer
      const p = parties.get(partyOf.get(uid)); if (!p || p.leader !== uid) break;
      const code = partyRoom(p.mode === 'rnd' ? '' : p.mode); if (!code) return send(ctx.ws, { t: 'err', m: 'Sunucuda boş oda yok' }), true;
      pushParty(p.id, { go: code }); break;
    }
  }
  return true;
}

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
  if (msg.t === 'reg' || msg.t === 'login') return authMsg(ctx, msg);
  if (typeof msg.t === 'string' && social(ctx, msg)) return;
  if (msg.t === 'hello') {
    if (ctx.uid) return;
    const token = String(msg.token || ''); if (token.length < 16 || token.length > 80) return ws.close();
    const tid = store.idOf(token), uid = db.sess[tid] || tid;
    ctx.acct = db.sess[tid] ? (Object.values(db.accts).find((a) => a.uid === uid) || {}).name || '' : '';
    const old = conns.get(uid); if (old && old.ws !== ws) { send(old.ws, { t: 'kicked' }); old.ws.close(); }
    let u = db.users[uid];
    if (!u) { u = db.users[uid] = { id: uid, name: '', created: Date.now(), rev: 0, profile: null, stats: null, club: '' }; }
    u.name = clean(msg.name, 16) || u.name || 'Oyuncu'; u.seen = Date.now();
    ctx.uid = uid; conns.set(uid, ctx); store.touch();
    if (u.club && !db.clubs[u.club]) u.club = '';
    const clientRev = num(msg.rev, 9e15);
    send(ws, { t: 'welcome', id: uid, name: u.name, acct: ctx.acct || '', vip: vipLevel(ctx.acct), mmr: u.mmr || 1000, rank: rankName(u.mmr || 1000), rm: u.rm | 0, rw: u.rw | 0, rev: u.rev, profile: u.profile && u.rev > clientRev ? u.profile : null, club: clubPub(u.club), members: u.club ? members(u.club) : [], chat: globalChat.slice(-40), cchat: u.club ? (clubChat.get(u.club) || []).slice(-30) : [], ...onlineInfo() });
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
  const ctx = { ip, acct: '', ws, uid: '', lastChat: 0, win: Date.now(), n: 0, alive: true, born: Date.now() };
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
    if (ctx.uid && conns.get(ctx.uid) === ctx) { leaveParty(ctx.uid); conns.delete(ctx.uid); const u = db.users[ctx.uid]; if (u) { u.seen = Date.now(); store.touch(); if (u.club) pushClub(u.club); } scheduleOnline(); }
  });
  ws.on('error', () => {});
});
// bağlantı kopukluğunu ve boşta kalan proxy zaman aşımlarını yakalamak için canlılık sinyali
setInterval(() => { for (const c of wss.clients) { const x = c._ctx; if (!x) continue; if (!x.alive || (!x.uid && Date.now() - x.born > 15000)) { c.terminate(); continue; } x.alive = false; try { c.ping(); } catch (e) {} } }, 25000).unref();

module.exports = { verify, rankResult, wss, onlineInfo, setGameCount: (f) => { gameCount = f; }, setPartyRoom: (f) => { partyRoom = f; }, stats: () => ({ users: Object.keys(db.users).length, clubs: Object.keys(db.clubs).length, lobby: conns.size }) };
