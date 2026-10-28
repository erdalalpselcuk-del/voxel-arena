// Lobi ağ katmanı (VNet): /lobby WebSocket'ine bağlanır. Hesap (gizli jeton), bulut kayıt, gerçek sohbet, sıralama, kulüpler.
// Oyun odalarından ayrı bir bağlantıdır. Bağlantı yoksa oyun yine çalışır (yerel kayıt), bağlanınca kendiliğinden eşitlenir.
(function (root) {
  'use strict';
  const PR = root.VProfile, LOCAL = !!root.LOCAL_BUILD;
  const S = { status: 'off', id: '', lobby: 0, game: 0, club: null, members: [], chat: [], cchat: [], who: null, lb: null, clubs: null, err: '' };
  const subs = [];
  let ws = null, tries = 0, rt = null, saveT = null, hbT = null, wantUrl = '', gen = 0, helloOk = false;

  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  function token() {
    let t = lsGet('va_token');
    if (!t || t.length < 16) {
      const a = new Uint8Array(24);
      if (root.crypto && root.crypto.getRandomValues) root.crypto.getRandomValues(a); else for (let i = 0; i < a.length; i++) a[i] = Math.random() * 256;
      t = Array.from(a, (b) => (b < 16 ? '0' : '') + b.toString(16)).join(''); lsSet('va_token', t);
    }
    return t;
  }
  const emit = (ev, d) => { for (const f of subs.slice()) { try { f(ev, d); } catch (e) { console.error(e); } } };
  function badge() {
    const el = root.document && root.document.getElementById('netst'); if (!el) return;
    const u = url();
    let txt, col;
    if (!u) { txt = 'YEREL'; col = '#888'; el.title = 'Lobi sunucusuna bağlı değil (yerel mod)'; }
    else if (S.status === 'on') { txt = 'ÇEVRİMİÇİ ' + S.lobby; col = '#4cd964'; el.title = S.lobby + ' kişi lobide, ' + S.game + ' kişi oyunda'; }
    else if (S.status === 'kicked') { txt = 'BAŞKA YERDE AÇIK'; col = '#ff9f0a'; el.title = 'Hesabın başka bir sekmede açıldı. Tıkla: yeniden bağlan'; }
    else { txt = 'BAĞLANIYOR'; col = '#ffd60a'; el.title = 'Lobi sunucusuna bağlanılıyor'; }
    el.innerHTML = '<i style="display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:6px;background:' + col + '"></i>' + txt;
  }
  function url() {
    const D = PR.data;
    if (LOCAL) {
      if (!D.online) return '';
      const a = (D.server || 'ws://localhost:3000').trim().replace(/\/+$/, '');
      return /^wss?:\/\//.test(a) ? a + '/lobby' : '';
    }
    const l = root.location; if (!l || !/^https?:$/.test(l.protocol)) return '';
    return (l.protocol === 'https:' ? 'wss://' : 'ws://') + l.host + '/lobby';
  }
  const open = () => ws && ws.readyState === 1 && helloOk;
  const send = (o) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };
  const pushMsg = (arr, m) => { arr.push(m); if (arr.length > 60) arr.shift(); };
  const mark = (m) => { m.me = m.id === S.id ? 1 : 0; return m; };

  function applyClub(club) {
    S.club = club || null;
    const D = PR.data, want = club ? { name: club.name, tag: club.tag } : null;
    const same = (!D.club && !want) || (D.club && want && D.club.tag === want.tag && D.club.name === want.name);
    if (!same) { D.club = want; PR.save(); }
  }
  function flushSave() {
    clearTimeout(saveT); saveT = null;
    if (!open()) return;
    send({ t: 'save', profile: PR.data, stats: PR.stats(), rev: PR.data.rev || Date.now() });
  }
  function onSave() { if (!saveT) saveT = setTimeout(flushSave, 1500); }

  function onMsg(m) {
    switch (m.t) {
      case 'welcome': {
        helloOk = true; tries = 0; S.status = 'on'; S.id = m.id; S.lobby = m.lobby | 0; S.game = m.game | 0;
        S.chat = (m.chat || []).map(mark); S.cchat = (m.cchat || []).map(mark); S.members = m.members || [];
        let imported = false;
        if (m.profile) imported = PR.importCloud(m.profile, m.rev);
        applyClub(m.club);
        if (!imported) flushSave(); // yerel kayıt sunucudakinden yeni/eşit: sunucuya yaz
        else if (PR.data.name == null || !PR.data.name.trim()) { /* ad boşsa lobi atar */ }
        badge(); emit('welcome', { imported }); if (imported) emit('profile'); break;
      }
      case 'chat': { const x = mark(m); pushMsg(x.room === 'club' ? S.cchat : S.chat, x); emit('chat', x); break; }
      case 'cchat': S.cchat = (m.list || []).map(mark); emit('club'); break;
      case 'online': S.lobby = m.lobby | 0; S.game = m.game | 0; badge(); emit('online'); break;
      case 'lb': S.lb = m; emit('lb'); break;
      case 'who': S.who = m; S.lobby = m.lobby | 0; S.game = m.game | 0; badge(); emit('who'); break;
      case 'clubs': S.clubs = m.list || []; emit('clubs'); break;
      case 'club': applyClub(m.club); S.members = m.members || []; if (m.cchat) S.cchat = m.cchat.map(mark); emit('club'); break;
      case 'err': S.err = m.m || ''; emit('err', S.err); break;
      case 'saved': emit('saved'); break;
      case 'kicked': S.status = 'kicked'; badge(); emit('status'); break;
    }
  }

  function connect() {
    clearTimeout(rt); rt = null;
    const u = url(); wantUrl = u;
    if (!u) { disconnect(true); badge(); return; }
    if (S.status === 'kicked') { badge(); return; }
    const my = ++gen; S.status = 'connecting'; helloOk = false; badge();
    let sock; try { sock = new WebSocket(u); } catch (e) { return retry(my); }
    ws = sock;
    sock.onopen = () => { if (my !== gen) return; send({ t: 'hello', token: token(), name: (PR.data.name || '').slice(0, 16), rev: PR.data.rev || 0 }); };
    sock.onmessage = (ev) => { if (my !== gen) return; let m; try { m = JSON.parse(ev.data); } catch (e) { return; } onMsg(m); };
    sock.onclose = () => { if (my !== gen) return; helloOk = false; if (S.status !== 'kicked') { S.status = 'connecting'; retry(my); } badge(); emit('status'); };
    sock.onerror = () => {};
  }
  function retry(my) { if (my !== gen) return; const d = Math.min(30000, 1000 * Math.pow(1.7, tries++)); clearTimeout(rt); rt = setTimeout(connect, d); }
  function disconnect(quiet) {
    gen++; clearTimeout(rt); rt = null; helloOk = false;
    if (ws) { try { ws.onclose = ws.onmessage = ws.onerror = null; ws.close(); } catch (e) {} ws = null; }
    S.status = 'off'; S.id = ''; S.lobby = S.game = 0; if (!quiet) emit('status');
  }
  // sunucu adresi / çevrimiçi anahtarı değişince çağrılır
  function refresh() { const u = url(); if (u === wantUrl && S.status !== 'off' && S.status !== 'kicked') return; if (S.status === 'kicked') S.status = 'off'; tries = 0; disconnect(true); connect(); emit('status'); }

  const api = {
    S, get on() { return S.status === 'on'; }, get hasServer() { return !!url(); },
    sub(f) { subs.push(f); }, refresh, url,
    get key() { return token(); },
    importKey(k) {
      k = String(k || '').trim(); if (!/^[A-Za-z0-9]{16,80}$/.test(k)) return false;
      lsSet('va_token', k); PR.data.rev = 0; // sunucudaki kayıt kazansın
      try { localStorage.setItem('va_prof2', JSON.stringify(PR.data)); } catch (e) {}
      S.status = 'off'; refresh(); return true;
    },
    reconnect() { S.status = 'off'; tries = 0; refresh(); },
    chat(room, text) { if (!open()) return false; send({ t: 'chat', room: room === 'club' ? 'club' : 'global', text }); return true; },
    lb() { send({ t: 'lb' }); }, who() { send({ t: 'who' }); }, clubs() { send({ t: 'clubs' }); }, clubInfo() { send({ t: 'club.info' }); },
    create(name, tag) { S.err = ''; send({ t: 'club.create', name, tag }); },
    join(tag) { S.err = ''; send({ t: 'club.join', tag }); },
    leave() { send({ t: 'club.leave' }); },
    flush: flushSave,
  };
  root.VNet = api;
  if (PR) PR.setHook(onSave);
  if (root.document) {
    root.document.addEventListener('visibilitychange', () => { if (root.document.hidden) flushSave(); });
    root.addEventListener('pagehide', flushSave);
    const el = root.document.getElementById('netst'); if (el) el.addEventListener('click', () => { if (S.status === 'kicked') api.reconnect(); });
  }
  hbT = setInterval(() => { if (open()) send({ t: 'ping' }); }, 30000);
  badge(); connect();
})(typeof self !== 'undefined' ? self : this);
