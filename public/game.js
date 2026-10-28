// Oyun mantığı (yetkili taraf). Hem Node sunucusunda hem tarayıcıdaki yerel modda çalışır.
(function (root) {
  const VM = typeof require !== 'undefined' ? require('./map.js') : root.VMap;
  const COLL_N = (typeof require !== 'undefined' ? require('./colls.js') : root.VColls).COUNT;
  const WP = VM.WEAPONS;

  const MODES = {
    kc: { key: 'kc', name: 'Kill Confirmed', win: 15, label: 'Künye' },
    ffa: { key: 'ffa', name: 'Herkes Tek', win: 20, label: 'Öldürme' },
    rocket: { key: 'rocket', name: 'Roket Arenası', win: 15, label: 'Öldürme' },
    tdm: { key: 'tdm', name: 'Takım Savaşı', win: 30, label: 'Takım', team: true },
    ctf: { key: 'ctf', name: 'Bayrak Kapmaca', win: 3, label: 'Bayrak', team: true },
    zom: { key: 'zom', name: 'Zombi Dalgası', win: 6, label: 'Dalga', team: true, coop: true },
  };
  const MODE_ORDER = ['kc', 'ffa', 'rocket', 'tdm', 'ctf', 'zom'];
  const TEAM_NAMES = ['Mavi', 'Kırmızı'];
  const BOT_NAMES = ['Kaplan', 'Şahin', 'Pixel', 'Blok', 'Zıpzıp', 'Gölge', 'Cesur', 'Tilki', 'Bulut', 'Kuzgun', 'Çakıl', 'Yıldız'];
  const RESPAWN_MS = 3000, TAG_LIFE = 25000, LOOT_LIFE = 30000, LOOT_MAX = 24, PICKUP_RESPAWN = 20000, MAX_PLAYERS = 16;
  const clamp = (v, lo, hi, d) => (typeof v === 'number' && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);

  function rayBox(o, d, min, max) {
    let tmin = 0, tmax = Infinity;
    for (let i = 0; i < 3; i++) {
      if (Math.abs(d[i]) < 1e-9) { if (o[i] < min[i] || o[i] > max[i]) return null; continue; }
      let t1 = (min[i] - o[i]) / d[i], t2 = (max[i] - o[i]) / d[i];
      if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
    return tmin;
  }

  function Game(opts) {
    this.send = opts.send;
    this.broadcast = opts.broadcast;
    this.rotate = !!opts.rotate;
    this.modeKey = opts.mode || 'kc';
    this.themeIdx = opts.theme == null ? Math.floor(Math.random() * VM.THEMES.length) : opts.theme;
    this.players = new Map();
    this.tags = new Map(); this.loot = new Map(); this.nextLoot = 1;
    this.projs = [];
    this.chickens = [];
    this.nextId = 1; this.nextTag = 1; this.nextProj = 1;
    this.roundOver = false;
    this.tscore = [0, 0];
    this.botTotal = 0;
    this.allowHeavy = opts.allowHeavy !== false;
    this.lastChat = new Map();
    this.newMap();
  }
  const G = Game.prototype;
  G.mode = function () { return MODES[this.modeKey]; };
  G.isTeam = function () { return !!MODES[this.modeKey].team; };
  G.pickTeam = function (want) {
    const n = [0, 0]; for (const q of this.players.values()) n[q.team | 0]++;
    if (want === 0 || want === 1) { if (n[want] <= n[1 - want]) return want; }
    return n[0] <= n[1] ? 0 : 1;
  };

  G.newMap = function () {
    this.seed = (Math.floor(Math.random() * 0xffffff) | 1);
    this.map = VM.generate(this.seed, this.themeIdx);
    this.tags.clear(); this.loot.clear(); this.projs.length = 0;
    this.pk = this.map.pickups.map((p) => ({ on: true, at: 0, kind: p.kind }));
    if (this.modeKey === 'rocket') this.pk.forEach((p, i) => { if (p.kind[0] === 'w' || p.kind === 'gren') p.on = false, p.disabled = true; });
    this.initBases();
    this.zw = this.modeKey === 'zom' ? { n: 0, left: 0, total: 0, breakUntil: Date.now() + 10000, nextSpawn: 0 } : null;
    this.chickens = [];
    for (let i = 0; i < 6; i++) {
      const s = this.spawn();
      this.chickens.push({ id: 1000 + i, pos: s.slice(), yaw: Math.random() * 6, hp: 10, alive: true, at: 0, goal: null, t: 0, vy: 0 });
    }
  };

  // ---------- bayrak kapmaca ----------
  G.initBases = function () {
    this.flags = null; this.bases = null;
    if (this.modeKey !== 'ctf') return;
    const sp = this.map.spawns; let a = 0, b = 1, bd = -1;
    for (let i = 0; i < sp.length; i++) for (let j = i + 1; j < sp.length; j++) { const d = Math.hypot(sp[i][0] - sp[j][0], sp[i][2] - sp[j][2]); if (d > bd) { bd = d; a = i; b = j; } }
    this.bases = [sp[a].slice(), sp[b].slice()];
    this.flags = this.bases.map((h, t) => ({ team: t, home: h.slice(), pos: h.slice(), carrier: 0, dropAt: 0 }));
  };
  G.spawnFor = function (p) {
    if (!this.bases) return this.spawn();
    const b = this.bases[p.team | 0], near = this.map.spawns.map((s) => [Math.hypot(s[0] - b[0], s[2] - b[2]), s]).sort((x, y) => x[0] - y[0]).slice(0, 5);
    return near[Math.floor(Math.random() * near.length)][1].slice();
  };
  G.flagsPub = function () { return this.flags ? this.flags.map((f) => [f.carrier, +f.pos[0].toFixed(2), +f.pos[1].toFixed(2), +f.pos[2].toFixed(2)]) : 0; };
  G.dropFlag = function (pid) {
    if (!this.flags) return;
    const c = this.players.get(pid);
    for (const f of this.flags) if (f.carrier === pid) { if (c) f.pos = c.pos.slice(); f.carrier = 0; f.dropAt = Date.now(); this.broadcast({ t: 'flag', i: f.team, st: 'drop', by: pid, p: f.pos }); }
  };
  G.returnFlag = function (f, by) { f.pos = f.home.slice(); f.carrier = 0; f.dropAt = 0; this.broadcast({ t: 'flag', i: f.team, st: 'return', by }); };
  G.flagStep = function () {
    if (!this.flags) return;
    const now = Date.now();
    for (const f of this.flags) {
      if (f.carrier) { const c = this.players.get(f.carrier); if (!c || !c.alive) this.dropFlag(f.carrier); else f.pos = c.pos.slice(); }
      else if (f.dropAt && now - f.dropAt > 15000) this.returnFlag(f, 0);
    }
  };
  G.flagCollect = function (p) {
    if (!this.flags || !p.alive || this.roundOver) return;
    const t = p.team | 0, own = this.flags[t], en = this.flags[1 - t];
    const near = (f, r) => Math.hypot(p.pos[0] - f.pos[0], p.pos[2] - f.pos[2]) < r && Math.abs(p.pos[1] - f.pos[1]) < 2.4;
    if (!own.carrier && own.dropAt && near(own, 1.7)) { p.score += 1; this.returnFlag(own, p.id); return; } // yerdeki kendi bayrağını geri götür
    if (!en.carrier && near(en, 1.7)) { en.carrier = p.id; en.dropAt = 0; this.broadcast({ t: 'flag', i: en.team, st: 'take', by: p.id }); }
    if (en.carrier === p.id && !own.carrier && !own.dropAt && near(own, 2.4)) { // teslim: kendi bayrağı üstte olmalı
      this.tscore[t]++; p.score += 5;
      en.carrier = 0; en.pos = en.home.slice(); en.dropAt = 0;
      this.broadcast({ t: 'flag', i: en.team, st: 'cap', by: p.id, ts: this.tscore });
      if (this.tscore[t] >= this.mode().win) this.endRound(p);
    }
  };

  G.spawn = function () { const sp = this.map.spawns; return sp[Math.floor(Math.random() * sp.length)].slice(); };

  const MELEE = [0, 15, 16, 17, 28, 29, 30, 31], PISTOLS = [1, 8, 18, 19], PRIMARY_OK = [2, 3, 4, 5, 6, 9, 10, 11, 12, 20, 21, 22, 23, 24, 25, 26, 27], HEAVY = [7, 13, 14];
  G.cleanUp = function (u) { // silah güçlendirme seviyeleri: { silahId: 0..5 }
    const out = {}; if (!u || typeof u !== 'object') return out;
    for (const k of Object.keys(u)) { const i = +k; if (Number.isInteger(i) && i >= 0 && i < WP.length) out[i] = clamp(u[k] | 0, 0, 5, 0); }
    return out;
  };
  G.cleanLoadout = function (l) {
    l = l || {};
    const pick = (v, list, d) => (list.indexOf(v | 0) >= 0 ? v | 0 : d);
    const primList = this.allowHeavy ? PRIMARY_OK.concat(HEAVY) : PRIMARY_OK;
    return { melee: pick(l.melee, MELEE, 0), pistol: pick(l.pistol, PISTOLS, 1), primary: pick(l.primary, primList, 2) };
  };
  G.loadout = function (p) {
    if (this.modeKey === 'rocket') { p.owned = [0, 7]; p.w = 7; p.gren = 0; }
    else { const l = p.pref; p.owned = [l.melee, l.pistol, l.primary]; p.w = l.primary; p.gren = 2; }
  };

  G.pub = function (p) {
    return { id: p.id, name: p.name, p: p.pos.map((v) => +v.toFixed(2)), yaw: +p.yaw.toFixed(3), pitch: +p.pitch.toFixed(3), hp: Math.round(p.hp), ar: Math.round(p.armor), alive: p.alive, w: p.w, score: p.score, kills: p.kills, deaths: p.deaths, c: p.color, tm: p.team | 0, hat: p.hat, sk: p.skin, bk: p.back, cr: p.crouch ? 1 : 0, bot: p.human ? 0 : 1, cl: p.cl | 0, z: p.z === 't' ? 2 : p.z ? 1 : 0 };
  };

  G.initMsg = function (p) {
    return { t: 'init', id: p.id, seed: this.seed, theme: this.themeIdx, mode: this.modeKey, win: this.mode().win, label: this.mode().label, ts: this.tscore, fl: this.flagsPub(), zw: this.zwPub(), p: p.pos, hp: p.hp, owned: p.owned, gren: p.gren, w: p.w,
      players: [...this.players.values()].filter((q) => q.joined).map((q) => this.pub(q)),
      tags: [...this.tags.values()].map((g) => ({ id: g.id, p: g.p, owner: g.owner })),
      loot: [...this.loot.values()].map((l) => ({ id: l.id, w: l.w, p: l.p, cl: l.cl, n: l.n, h: l.h })),
      pk: this.pk.map((k) => (k.on ? 1 : 0)) };
  };

  G.humans = function () { let n = 0; for (const p of this.players.values()) if (p.human) n++; return n; };

  G.addPlayer = function (info, human) {
    if (this.players.size >= MAX_PLAYERS && human) {
      const bot = [...this.players.values()].find((q) => !q.human);
      if (bot) this.removePlayer(bot.id);
    }
    if (this.players.size >= MAX_PLAYERS) return null;
    const p = { id: this.nextId++, name: String(info.name || 'Oyuncu').replace(/[<>&"'`]/g, '').trim().slice(0, 16) || 'Oyuncu', color: clamp(info.color | 0, 0, 11, 0), hat: clamp(info.hat | 0, 0, 22, 0), skin: clamp(info.skin | 0, 0, 17, 0), back: clamp(info.back | 0, 0, 13, 0), pref: this.cleanLoadout(info.loadout), team: this.modeKey === 'zom' ? (human ? 0 : 1) : this.pickTeam(info.team), up: this.cleanUp(info.up), cl: clamp(info.coll | 0, 0, COLL_N - 1, 0),
      pos: [0, 0, 0], yaw: 0, pitch: 0, hp: 100, armor: 0, alive: true, w: 2, owned: [0, 1, 2], gren: 2, score: 0, kills: 0, deaths: 0, nextFire: 0, nextNade: 0, lastT: 0, crouch: false, human, joined: true,
      vy: 0, strafe: 1, strafeT: 0, goal: null, goalT: 0, seen: 0, stuck: 0, lastPos: null };
    p.pos = this.spawnFor(p);
    this.loadout(p);
    this.players.set(p.id, p);
    if (human) this.send(p.id, this.initMsg(p));
    this.broadcast({ t: 'join', player: this.pub(p) }, human ? p.id : 0);
    return p;
  };

  G.removePlayer = function (id) {
    this.dropFlag(id);
    if (!this.players.delete(id)) return;
    this.broadcast({ t: 'leave', id });
    this.zomCheckLose();
  };

  G.fillBots = function (total) {
    this.botTotal = total;
    this.balanceBots();
  };
  G.balanceBots = function () {
    const bots = [...this.players.values()].filter((p) => !p.human && !p.z);
    if (this.modeKey === 'zom') { for (const b of bots) this.removePlayer(b.id); return; }
    const want = Math.max(0, this.botTotal - this.humans());
    for (let i = bots.length; i < want; i++) {
      const used = new Set([...this.players.values()].map((p) => p.name));
      let name = BOT_NAMES.find((n) => !used.has(n)) || 'Bot' + this.nextId;
      const PL = [2, 9, 3, 10, 4, 11, 5, 12, 20, 21, 22, 23, 24, 25, 27], prim = PL[Math.floor(Math.random() * PL.length)];
      this.addPlayer({ name, color: Math.floor(Math.random() * 12), hat: Math.floor(Math.random() * 23), skin: Math.floor(Math.random() * 18), back: Math.floor(Math.random() * 14), loadout: { melee: MELEE[Math.floor(Math.random() * MELEE.length)], pistol: [1, 8, 18, 19][Math.floor(Math.random() * 4)], primary: prim } }, false);
    }
    for (let i = bots.length - 1; i >= want && i >= 0; i--) this.removePlayer(bots[i].id);
  };

  // ---------- hasar ve ölüm ----------
  G.damage = function (v, amount, killer, weapon, fromPos, head) {
    if (!v.alive || this.roundOver) return false;
    if (v.shieldUntil > Date.now() && killer !== v) return false;
    if (this.isTeam() && killer && killer !== v && (killer.team | 0) === (v.team | 0)) return false;
    const absorbed = Math.min(v.armor, amount * 0.6);
    v.armor -= absorbed;
    v.hp -= amount - absorbed;
    if (v.human) this.send(v.id, { t: 'dmg', dmg: Math.round(amount), from: fromPos || null });
    if (killer && killer.human && killer !== v) this.send(killer.id, { t: 'hit', dmg: Math.round(amount), head: !!head, kill: v.hp <= 0 });
    if (v.hp <= 0) { v.hp = 0; this.kill(v, killer, weapon); return true; }
    return false;
  };

  // ölen oyuncunun silahı yere düşer; yakınından geçen alır (yalnızca sahip olunmayan silahlar alınır)
  G.dropLoot = function (v) {
    if (v.z || this.modeKey === 'rocket' || this.modeKey === 'zom') return;
    const c = (v.owned || []).filter((w) => MELEE.indexOf(w) < 0 && w !== 1);
    if (!c.length) return;
    const w = c.indexOf(v.w) >= 0 ? v.w : c[c.length - 1];
    if (this.loot.size >= LOOT_MAX) { const old = this.loot.keys().next().value; this.loot.delete(old); this.broadcast({ t: 'lootGone', id: old, kind: 'expire' }); }
    const l = { id: this.nextLoot++, w, p: [v.pos[0], v.pos[1], v.pos[2]], born: Date.now(), from: v.id, cl: v.cl | 0, n: v.name, h: v.human ? 1 : 0 };
    this.loot.set(l.id, l); this.broadcast({ t: 'loot', id: l.id, w: l.w, p: l.p, from: v.id, cl: l.cl, n: l.n, h: l.h });
  };

  G.kill = function (v, killer, weapon) {
    v.alive = false; v.deaths++;
    this.dropFlag(v.id);
    const self = !killer || killer === v;
    if (!self) killer.kills++;
    if (this.modeKey === 'kc') {
      const id = this.nextTag++;
      const tag = { id, p: [v.pos[0], v.pos[1] + 0.6, v.pos[2]], owner: v.id, born: Date.now() };
      this.tags.set(id, tag);
      this.broadcast({ t: 'tag', id, p: tag.p, owner: tag.owner });
    } else if (!self) {
      killer.score++;
      if (this.modeKey === 'tdm') { this.tscore[killer.team | 0]++; if (this.tscore[killer.team | 0] >= this.mode().win) this.endRound(killer); }
      else if (this.modeKey !== 'ctf' && this.modeKey !== 'zom' && killer.score >= this.mode().win) this.endRound(killer);
    }
    this.dropLoot(v);
    this.broadcast({ t: 'kill', killer: killer ? killer.id : 0, victim: v.id, w: weapon, ts: this.tscore });
    if (!self && !killer.human && !killer.z && Math.random() < 0.07) { const lines = ['gg', 'kolay :D', 'şans bu', 'yakaladım', 'bir daha dene', 'iyi atış', 'rpg yok mu?']; this.broadcast({ t: 'chat', id: killer.id, name: killer.name, text: lines[Math.floor(Math.random() * lines.length)] }); }
    if (v.z) v.diedAt = Date.now(); // zomStep kısa süre sonra kaldırır
    else if (this.modeKey === 'zom') this.zomCheckLose(); // dalga sürerken canlanma yok; sonraki dalgada dirilirsin
    else setTimeout(() => { if (this.players.has(v.id) && !this.roundOver) this.respawn(v); }, RESPAWN_MS);
  };

  G.respawn = function (p) {
    p.pos = this.spawnFor(p); p.hp = 100; p.armor = 0; p.alive = true; p.vy = 0; p.crouch = false; p.shieldUntil = 0;
    this.loadout(p);
    if (p.human) this.send(p.id, { t: 'respawn', p: p.pos, owned: p.owned, gren: p.gren, w: p.w });
  };

  G.endRound = function (winner, forced) { // forced: zombi modunda 0 = insanlar kazandı, 1 = zombiler
    if (this.roundOver) return;
    this.roundOver = true;
    const zom = forced != null, tm = zom ? forced : this.isTeam() ? winner.team | 0 : -1;
    const nm = zom ? (forced === 0 ? 'Hayatta kalanlar' : 'Zombiler') : tm >= 0 ? TEAM_NAMES[tm] + ' takım' : winner.name;
    this.broadcast({ t: 'win', id: winner ? winner.id : 0, name: nm, team: tm, ts: this.tscore, zw: this.zw ? this.zw.n : 0 });
    setTimeout(() => {
      const prevMode = this.modeKey;
      for (const p of [...this.players.values()]) if (p.z) this.removePlayer(p.id);
      if (this.rotate) this.modeKey = MODE_ORDER[(MODE_ORDER.indexOf(this.modeKey) + 1) % MODE_ORDER.length];
      this.themeIdx = (this.themeIdx + 1) % VM.THEMES.length;
      this.newMap();
      if (prevMode === 'zom' || this.modeKey === 'zom') { let i = 0; for (const p of this.players.values()) p.team = this.modeKey === 'zom' ? (p.human ? 0 : 1) : i++ % 2; this.balanceBots(); }
      this.roundOver = false; this.tscore = [0, 0];
      for (const p of this.players.values()) { p.score = 0; p.kills = 0; p.deaths = 0; p.pos = this.spawnFor(p); p.hp = 100; p.armor = 0; p.alive = true; p.vy = 0; this.loadout(p); }
      this.broadcast({ t: 'newround', seed: this.seed, theme: this.themeIdx, mode: this.modeKey, win: this.mode().win, label: this.mode().label, ts: this.tscore, fl: this.flagsPub(), zw: this.zwPub(),
        players: [...this.players.values()].map((p) => Object.assign(this.pub(p), { owned: p.owned, gren: p.gren })), pk: this.pk.map((k) => (k.on ? 1 : 0)) });
    }, 7000);
  };


  // ---------- zombi dalgası ----------
  const ZTYPES = {
    z: { name: 'Zombi', hp: 55, spd: 3.5, dmg: 12, per: 8 },
    r: { name: 'Koşucu', hp: 32, spd: 6.0, dmg: 9, per: 5 },
    t: { name: 'Dev Zombi', hp: 240, spd: 2.6, dmg: 28, per: 28 },
  };

  // Yürünebilir hücre grafiği (harita başına bir kez) ve insanlara giden akış alanı: zombiler duvarın arkasında takılmaz.
  function buildNav(map) {
    const S = map.SIZE, H = map.H, key = (x, y, z) => (y * S + z) * S + x;
    const free = (x, y, z) => !map.solidBox(x + 0.5, y, z + 0.5, 0.3, 1.8);
    const id = new Map(), nodes = [];
    for (let x = 1; x < S - 1; x++) for (let z = 1; z < S - 1; z++) for (let y = 1; y < H - 3; y++) {
      if (map.get(x, y - 1, z) && free(x, y, z)) { id.set(key(x, y, z), nodes.length); nodes.push([x, y, z]); }
    }
    const fwd = nodes.map(() => []), rev = nodes.map(() => []);
    nodes.forEach((n, i) => {
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        for (const dy of [1, 0, -1, -2, -3]) {
          const j = id.get(key(n[0] + dx, n[1] + dy, n[2] + dz));
          if (j === undefined) continue;
          if (!free(n[0], n[1] + (dy > 0 ? dy : 0), n[2])) continue;
          fwd[i].push(j); rev[j].push(i);
        }
      }
    });
    return { nodes, id, fwd, rev, key, dist: null, at: 0 };
  }
  G.navField = function (now) {
    const map = this.map; if (!map.nav) map.nav = buildNav(map);
    const nav = map.nav;
    if (nav.dist && now - nav.at < 450 && nav.owner === this) return nav;
    const dist = new Int32Array(nav.nodes.length).fill(-1), q = [];
    for (const v of this.players.values()) {
      if (!v.human || !v.alive) continue;
      for (let dy = 0; dy <= 2; dy++) { const i = nav.id.get(nav.key(Math.floor(v.pos[0]), Math.floor(v.pos[1] + 0.01) - dy, Math.floor(v.pos[2]))); if (i !== undefined && dist[i] < 0) { dist[i] = 0; q.push(i); break; } }
    }
    for (let h = 0; h < q.length; h++) { const i = q[h]; for (const j of nav.rev[i]) if (dist[j] < 0) { dist[j] = dist[i] + 1; q.push(j); } }
    nav.dist = dist; nav.at = now; nav.owner = this;
    return nav;
  };

  G.zwPub = function () {
    const w = this.zw; if (!w) return 0;
    let z = 0; for (const p of this.players.values()) if (p.z && p.alive) z++;
    return [w.n, w.left + z, w.breakUntil ? Math.max(0, Math.ceil((w.breakUntil - Date.now()) / 1000)) : 0];
  };
  G.zomCheckLose = function () {
    if (!this.zw || this.roundOver) return;
    const hum = [...this.players.values()].filter((p) => p.human);
    if (hum.length && hum.every((p) => !p.alive)) this.endRound(null, 1);
  };
  G.spawnZombie = function (n) {
    const hum = [...this.players.values()].filter((p) => p.human && p.alive), sp = this.map.spawns;
    const far = sp.map((s) => { let md = 1e9; for (const h of hum) md = Math.min(md, Math.hypot(s[0] - h.pos[0], s[2] - h.pos[2])); return [md, s]; }).sort((a, b) => b[0] - a[0]);
    if (!far.length) return false;
    const at = far[Math.floor(Math.random() * Math.min(4, far.length))][1], r = Math.random();
    const type = n >= 3 && r > 0.88 ? 't' : n >= 2 && r < 0.28 ? 'r' : 'z', C = ZTYPES[type];
    const p = this.addPlayer({ name: C.name, color: Math.floor(Math.random() * 12), hat: 0, skin: 3, back: 0, loadout: { melee: 0, pistol: 1, primary: 2 } }, false);
    if (!p) return false;
    p.z = type; p.pos = at.slice(); p.owned = [0]; p.w = 0; p.gren = 0;
    p.hp = Math.round(C.hp + n * C.per); p.spd = C.spd + Math.min(1.2, n * 0.12) + Math.random() * 0.4; p.dmg = C.dmg + Math.floor(n * 1.5); p.nextHit = 0;
    return true;
  };
  G.zomStep = function (now) {
    const w = this.zw; if (!w) return;
    for (const p of [...this.players.values()]) if (p.z && !p.alive && now - p.diedAt > 1500) this.removePlayer(p.id);
    if (this.roundOver) return;
    const hum = [...this.players.values()].filter((p) => p.human);
    if (!hum.length) return;
    let zs = 0; for (const p of this.players.values()) if (p.z && p.alive) zs++;
    if (w.breakUntil) {
      if (now < w.breakUntil) return;
      w.breakUntil = 0; w.n++;
      w.total = Math.round((5 + w.n * 3.5) * (1 + 0.45 * (hum.length - 1))); w.left = w.total; w.nextSpawn = now + 1500;
      for (const p of hum) { if (!p.alive) this.respawn(p); else p.hp = Math.min(100, p.hp + 40); }
      this.broadcast({ t: 'wave', n: w.n, st: 'start', total: w.total, win: this.mode().win });
      return;
    }
    if (w.left > 0) {
      const cap = Math.min(16, 7 + w.n * 2 + hum.length);
      if (now >= w.nextSpawn && zs < cap && this.players.size < MAX_PLAYERS) { if (this.spawnZombie(w.n)) w.left--; w.nextSpawn = now + Math.max(450, 1700 - w.n * 170); }
    } else if (zs === 0) {
      if (w.n >= this.mode().win) { const top = hum.slice().sort((a, b) => b.score - a.score)[0]; this.endRound(top, 0); return; }
      w.breakUntil = now + 9000;
      for (const p of hum) if (p.alive) p.score += 3; // dalga bonusu
      this.broadcast({ t: 'wave', n: w.n, st: 'clear', next: 9 });
    }
  };
  G.zombieStep = function (z, dt) {
    if (!z.alive || this.roundOver) return;
    const map = this.map, now = Date.now();
    let tgt = null, td = 1e9;
    for (const v of this.players.values()) {
      if (!v.human || !v.alive) continue;
      const d = Math.hypot(v.pos[0] - z.pos[0], v.pos[2] - z.pos[2]) + Math.abs(v.pos[1] - z.pos[1]) * 0.6;
      if (d < td) { td = d; tgt = v; }
    }
    let gx = z.pos[0], gz = z.pos[2], jump = false;
    if (tgt) {
      gx = tgt.pos[0]; gz = tgt.pos[2];
      if (td > 1.6) { // akış alanında en yakın komşuya yürü
        const nav = this.navField(now), cx = Math.floor(z.pos[0]), cz = Math.floor(z.pos[2]);
        let ci; for (let dy = 0; dy <= 1 && ci === undefined; dy++) ci = nav.id.get(nav.key(cx, Math.floor(z.pos[1] + 0.01) - dy, cz));
        if (ci !== undefined && nav.dist[ci] > 0) {
          let best = -1, bd = nav.dist[ci];
          for (const j of nav.fwd[ci]) { const d = nav.dist[j]; if (d >= 0 && d < bd) { bd = d; best = j; } }
          if (best >= 0) { const n = nav.nodes[best]; gx = n[0] + 0.5; gz = n[2] + 0.5; if (n[1] > Math.floor(z.pos[1] + 0.01)) jump = true; }
        }
      }
    } else { z.goalT -= dt; if (!z.goal || z.goalT < 0) { z.goal = this.spawn(); z.goalT = 6; } gx = z.goal[0]; gz = z.goal[2]; }
    let dyaw = Math.atan2(-(gx - z.pos[0]), -(gz - z.pos[2])) - z.yaw; dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
    z.yaw += dyaw * Math.min(1, dt * 7); z.pitch = 0;
    const mx = gx - z.pos[0], mz = gz - z.pos[2], ml = Math.hypot(mx, mz) || 1, close = tgt && td < 1.3;
    const sp = close ? 0 : z.spd, nx = z.pos[0] + (mx / ml) * sp * dt, nz = z.pos[2] + (mz / ml) * sp * dt;
    let blocked = false;
    if (!map.solidBox(nx, z.pos[1], z.pos[2])) z.pos[0] = nx; else blocked = true;
    if (!map.solidBox(z.pos[0], z.pos[1], nz)) z.pos[2] = nz; else blocked = true;
    const onGround = map.solidBox(z.pos[0], z.pos[1] - 0.05, z.pos[2]);
    if ((blocked || jump) && onGround) z.vy = 8.2;
    z.vy = Math.max(-40, z.vy - 24 * dt);
    const ny = z.pos[1] + z.vy * dt;
    if (!map.solidBox(z.pos[0], ny, z.pos[2])) z.pos[1] = ny; else { if (z.vy < 0) z.pos[1] = Math.floor(ny) + 1; z.vy = 0; }
    if (z.pos[1] < -20) z.pos = this.spawn();
    if (tgt && td < 1.9 && Math.abs(tgt.pos[1] - z.pos[1]) < 1.9 && now >= z.nextHit) {
      z.nextHit = now + 850;
      this.broadcast({ t: 'fire', id: z.id, w: 0 });
      this.damage(tgt, z.dmg, z, 0, z.pos.slice(), false);
    }
  };

  // ---------- ateş ----------
  G.hitboxes = function (exclude) {
    const out = [];
    for (const v of this.players.values()) if (v !== exclude && v.alive) {
      const h = v.crouch ? 1.2 : 1.8;
      out.push({ ent: v, min: [v.pos[0] - 0.3, v.pos[1], v.pos[2] - 0.3], max: [v.pos[0] + 0.3, v.pos[1] + h, v.pos[2] + 0.3], h });
    }
    for (const k of this.chickens) if (k.alive) out.push({ ent: k, chicken: true, min: [k.pos[0] - 0.35, k.pos[1], k.pos[2] - 0.35], max: [k.pos[0] + 0.35, k.pos[1] + 0.8, k.pos[2] + 0.35], h: 0.8 });
    return out;
  };

  G.fire = function (p, wi, o, ds) {
    if (!p.alive || this.roundOver) return;
    const W = WP[wi];
    if (!W || p.owned.indexOf(wi) < 0) return;
    const now = Date.now();
    if (now < p.nextFire - 40) return;
    p.nextFire = now + W.rate;
    const hb = this.hitboxes(p);
    const eyeY = p.pos[1] + (p.crouch ? 1.15 : 1.6);
    if (Math.hypot(o[0] - p.pos[0], o[1] - eyeY, o[2] - p.pos[2]) > 3) return;

    if (W.kind === 'launcher') {
      const d = ds[0], l = Math.hypot(d[0], d[1], d[2]) || 1, n = [d[0] / l, d[1] / l, d[2] / l];
      this.projs.push({ id: this.nextProj++, k: 'gl', pos: [o[0] + n[0] * 0.8, o[1] + n[1] * 0.8 - 0.1, o[2] + n[2] * 0.8], vel: [n[0] * 24, n[1] * 24, n[2] * 24], grav: 10, owner: p, born: now, fuse: 3.5 });
      this.broadcast({ t: 'fire', id: p.id, w: wi });
      return;
    }
    if (W.kind === 'rocket') {
      const d = ds[0], l = Math.hypot(d[0], d[1], d[2]) || 1, n = [d[0] / l, d[1] / l, d[2] / l];
      this.projs.push({ id: this.nextProj++, k: 'rocket', pos: [o[0] + n[0] * 0.9, o[1] + n[1] * 0.9 - 0.1, o[2] + n[2] * 0.9], vel: [n[0] * 26, n[1] * 26, n[2] * 26], grav: 0, owner: p, born: now, fuse: 6 });
      this.broadcast({ t: 'fire', id: p.id, w: wi });
      return;
    }

    const ends = [], dmgBy = new Map();
    const reachMax = W.kind === 'melee' ? W.range : 120;
    for (const raw of ds.slice(0, W.pellets)) {
      let d = [clamp(raw[0], -1, 1, 0), clamp(raw[1], -1, 1, 0), clamp(raw[2], -1, 1, 0)];
      const len = Math.hypot(d[0], d[1], d[2]);
      if (len < 0.5) continue;
      d = [d[0] / len, d[1] / len, d[2] / len];
      const wall = this.map.raycast(o, d, reachMax);
      let best = null;
      for (const b of hb) {
        const t = rayBox(o, d, b.min, b.max);
        if (t !== null && t < wall && t < reachMax && (!best || t < best.t)) best = { b, t };
      }
      const reach = best ? best.t : Math.min(wall, reachMax);
      ends.push([+(o[0] + d[0] * reach).toFixed(2), +(o[1] + d[1] * reach).toFixed(2), +(o[2] + d[2] * reach).toFixed(2), best ? 1 : wall < reachMax ? 0 : 2]);
      if (best) {
        const head = !best.b.chicken && (o[1] + d[1] * best.t) > best.b.min[1] + best.b.h - 0.4;
        const cur = dmgBy.get(best.b) || { dmg: 0, head: false };
        cur.dmg += W.dmg * (1 + 0.06 * ((p.up && p.up[wi]) | 0)) * (head ? 2 : 1); cur.head = cur.head || head;
        dmgBy.set(best.b, cur);
      }
    }
    if (ends.length) this.broadcast({ t: 'shot', id: p.id, w: wi, o, es: ends });
    for (const [b, info] of dmgBy) {
      if (b.chicken) {
        b.ent.hp -= info.dmg;
        if (b.ent.hp <= 0 && b.ent.alive) { b.ent.alive = false; b.ent.at = now + 10000; this.broadcast({ t: 'ckdead', id: b.ent.id, p: b.ent.pos.slice() }); if (p.human) this.send(p.id, { t: 'hit', dmg: 0, head: false, kill: true }); }
        else if (p.human) this.send(p.id, { t: 'hit', dmg: 0, head: false, kill: false });
      } else this.damage(b.ent, info.dmg, p, wi, p.pos, info.head);
    }
  };

  G.throwNade = function (p, o, d) {
    if (!p.alive || this.roundOver || p.gren <= 0) return;
    const now = Date.now();
    if (now < p.nextNade) return;
    p.nextNade = now + 900; p.gren--;
    const l = Math.hypot(d[0], d[1], d[2]) || 1;
    const n = [d[0] / l, d[1] / l + 0.18, d[2] / l];
    this.projs.push({ id: this.nextProj++, k: 'nade', pos: [o[0] + n[0] * 0.6, o[1] + n[1] * 0.6, o[2] + n[2] * 0.6], vel: [n[0] * 15, n[1] * 15, n[2] * 15], grav: 20, owner: p, born: now, fuse: 2.1 });
  };

  G.explode = function (pos, owner, R, base, weapon) {
    this.broadcast({ t: 'boom', p: pos.map((v) => +v.toFixed(2)), r: R });
    for (const v of this.players.values()) {
      if (!v.alive) continue;
      const c = [v.pos[0], v.pos[1] + 0.9, v.pos[2]];
      const dx = c[0] - pos[0], dy = c[1] - pos[1], dz = c[2] - pos[2], d = Math.hypot(dx, dy, dz);
      if (d >= R) continue;
      const f = 1 - d / R;
      let amount = base * f;
      if (v === owner) amount *= 0.45;
      const k = d < 0.01 ? 1 : 1 / d, s = 17 * f + 3;
      const vx = dx * k * s, vy = dy * k * s + 4 * f, vz = dz * k * s;
      if (v.human) this.send(v.id, { t: 'push', v: [vx, vy, vz] }); else { v.vy = Math.max(v.vy, vy); v.pos[0] += vx * 0.04; v.pos[2] += vz * 0.04; }
      this.damage(v, amount, owner, weapon, pos, false);
    }
    for (const k of this.chickens) if (k.alive && Math.hypot(k.pos[0] - pos[0], k.pos[1] - pos[1], k.pos[2] - pos[2]) < R) {
      k.alive = false; k.at = Date.now() + 10000; this.broadcast({ t: 'ckdead', id: k.id, p: k.pos.slice() });
    }
  };

  // ---------- istemci mesajları ----------
  G.onMsg = function (id, msg) {
    const p = this.players.get(id);
    if (!p || !msg || typeof msg.t !== 'string') return;
    switch (msg.t) {
      case 'away': { // menü açıldı: 6 sn kalkan, 20 sn bekleme
        const now = Date.now();
        if (p.alive && !this.roundOver && (!p.awayAt || now - p.awayAt > 20000)) { p.awayAt = now; p.shieldUntil = now + 6000; this.send(id, { t: 'shield', ms: 6000 }); }
        break;
      }
      case 'back': p.shieldUntil = 0; break;
      case 'state': {
        if (!p.alive || this.roundOver) break;
        const np = [clamp(msg.p && msg.p[0], -5, VM.SIZE + 5, p.pos[0]), clamp(msg.p && msg.p[1], -5, VM.H + 5, p.pos[1]), clamp(msg.p && msg.p[2], -5, VM.SIZE + 5, p.pos[2])];
        const nowT = Date.now(), dtS = Math.min(1, (nowT - p.lastT) / 1000), limit = 24 * dtS + 2;
        if (p.lastT === 0 || Math.hypot(np[0] - p.pos[0], np[2] - p.pos[2]) <= limit) p.pos = np;
        else this.send(id, { t: 'correct', p: p.pos });
        p.lastT = nowT;
        p.yaw = clamp(msg.yaw, -1000, 1000, p.yaw);
        p.pitch = clamp(msg.pitch, -1.6, 1.6, p.pitch);
        const w = msg.w | 0; if (p.owned.indexOf(w) >= 0) p.w = w;
        p.crouch = !!msg.c;
        this.collect(p);
        break;
      }
      case 'shoot':
        if (Array.isArray(msg.o) && Array.isArray(msg.ds)) this.fire(p, msg.w | 0, [clamp(msg.o[0], -100, 200, 0), clamp(msg.o[1], -10, 100, 0), clamp(msg.o[2], -100, 200, 0)], msg.ds.filter((d) => Array.isArray(d)));
        break;
      case 'chat': {
        const txt = String(msg.text || '').replace(/[<>]/g, '').trim().slice(0, 80);
        const now = Date.now();
        if (!txt || now - (this.lastChat.get(id) || 0) < 800) break;
        this.lastChat.set(id, now);
        this.broadcast({ t: 'chat', id, name: p.name, text: txt });
        break;
      }
      case 'nade':
        if (Array.isArray(msg.o) && Array.isArray(msg.d)) this.throwNade(p, [clamp(msg.o[0], -100, 200, 0), clamp(msg.o[1], -10, 100, 0), clamp(msg.o[2], -100, 200, 0)], [clamp(msg.d[0], -1, 1, 0), clamp(msg.d[1], -1, 1, 0), clamp(msg.d[2], -1, 1, 0)]);
        break;
    }
  };

  // ---------- toplama ----------
  G.collect = function (p) {
    if (!p.alive) return;
    this.flagCollect(p);
    for (const [id, tag] of this.tags) {
      if (Math.hypot(p.pos[0] - tag.p[0], p.pos[1] + 0.8 - tag.p[1], p.pos[2] - tag.p[2]) > 1.4) continue;
      this.tags.delete(id);
      if (tag.owner === p.id) this.broadcast({ t: 'tagGone', id, by: p.id, kind: 'deny' });
      else {
        p.score++;
        this.broadcast({ t: 'tagGone', id, by: p.id, kind: 'confirm', score: p.score });
        if (p.score >= this.mode().win) this.endRound(p);
      }
    }
    for (const [id, l] of this.loot) {
      if (Math.hypot(p.pos[0] - l.p[0], p.pos[2] - l.p[2]) > 1.3 || Math.abs(p.pos[1] - l.p[1]) > 1.8) continue;
      if (p.owned.indexOf(l.w) >= 0) continue;
      p.owned.push(l.w); this.loot.delete(id);
      if (p.human) this.send(p.id, { t: 'own', w: l.w }); else p.w = l.w;
      this.broadcast({ t: 'lootGone', id, by: p.id, w: l.w, kind: 'take' });
    }
    const pk = this.map.pickups;
    for (let i = 0; i < pk.length; i++) {
      const st = this.pk[i];
      if (!st.on) continue;
      if (Math.hypot(p.pos[0] - pk[i].x, p.pos[2] - pk[i].z) > 1.1 || Math.abs(p.pos[1] - pk[i].y) > 1.6) continue;
      let ok = false;
      const k = st.kind;
      if (k === 'hp') { if (p.hp < 100) { p.hp = Math.min(100, p.hp + 35); ok = true; } }
      else if (k === 'armor') { if (p.armor < 100) { p.armor = Math.min(100, p.armor + 50); ok = true; } }
      else if (k === 'gren') { if (p.gren < 5) { p.gren = Math.min(5, p.gren + 2); ok = true; } }
      else if (k[0] === 'w') { const w = +k.slice(1); if (p.owned.indexOf(w) < 0) { p.owned.push(w); ok = true; if (p.human) this.send(p.id, { t: 'own', w }); } }
      if (ok) {
        st.on = false; st.at = Date.now() + PICKUP_RESPAWN;
        if (p.human) this.send(p.id, { t: 'got', kind: k, hp: p.hp, ar: p.armor, gren: p.gren });
        this.broadcast({ t: 'pk', i, on: 0, by: p.id });
        if (!p.human && k[0] === 'w') { const w = +k.slice(1); p.w = w; }
      }
    }
  };

  // ---------- adım ----------
  G.botStep = function (b, dt) {
    if (!b.alive || this.roundOver) return;
    const map = this.map;
    const eye = [b.pos[0], b.pos[1] + 1.6, b.pos[2]];
    let tgt = null, td = 45;
    for (const v of this.players.values()) {
      if (v === b || !v.alive || (this.isTeam() && (v.team | 0) === (b.team | 0))) continue;
      const c = [v.pos[0], v.pos[1] + 1.2, v.pos[2]];
      const dx = c[0] - eye[0], dy = c[1] - eye[1], dz = c[2] - eye[2], dist = Math.hypot(dx, dy, dz);
      if (dist < td && map.raycast(eye, [dx / dist, dy / dist, dz / dist], dist) === Infinity) { tgt = { v, c, dist }; td = dist; }
    }
    let gx, gz, speed = 4.2;
    if (tgt) {
      // silah seçimi
      const has = (w) => b.owned.indexOf(w) >= 0;
      let w = b.pref.primary;
      if (this.modeKey === 'rocket') w = 7;
      else if (tgt.dist < 2.2) w = b.pref.melee;
      else if (tgt.dist < 6 && (has(4) || has(11))) w = has(11) ? 11 : 4;
      else if (tgt.dist > 26 && (has(5) || has(12))) w = has(12) ? 12 : 5;
      else if (tgt.dist > 14 && (has(7) || has(13))) w = has(7) ? 7 : 13;
      else if (!has(w)) w = b.pref.pistol;
      b.w = w;
      const dx = tgt.c[0] - eye[0], dy = tgt.c[1] - eye[1], dz = tgt.c[2] - eye[2];
      let dyaw = Math.atan2(-dx, -dz) - b.yaw; dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
      b.yaw += dyaw * Math.min(1, dt * 6);
      b.pitch = Math.atan2(dy, Math.hypot(dx, dz));
      b.strafeT -= dt; if (b.strafeT <= 0) { b.strafeT = 0.7 + Math.random(); b.strafe = Math.random() < 0.5 ? -1 : 1; }
      gx = b.pos[0] + Math.cos(b.yaw) * b.strafe * 2 + (tgt.dist > 14 ? -Math.sin(b.yaw) * 3 : 0);
      gz = b.pos[2] - Math.sin(b.yaw) * b.strafe * 2 + (tgt.dist > 14 ? -Math.cos(b.yaw) * 3 : 0);
      if (this.flags && this.flags[1 - (b.team | 0)].carrier === b.id) { gx = this.flags[b.team | 0].home[0]; gz = this.flags[b.team | 0].home[2]; }
      b.seen += dt;
      const W = WP[w];
      if (b.seen > 0.5 && Math.abs(dyaw) < 0.3 && Date.now() >= b.nextFire + (W.auto ? 40 : 220) && (W.kind !== 'melee' || tgt.dist < 2.4)) {
        const err = 0.04 + tgt.dist * 0.0022 + W.spread;
        const ds = [];
        for (let i = 0; i < Math.max(1, W.pellets); i++) ds.push([dx / tgt.dist + (Math.random() - 0.5) * err * 2, dy / tgt.dist + (Math.random() - 0.5) * err * 2 - (W.kind === 'rocket' ? 0.05 : 0), dz / tgt.dist + (Math.random() - 0.5) * err * 2]);
        this.fire(b, w, eye, ds);
      }
    } else {
      b.seen = 0;
      let obj = null;
      if (this.flags) {
        const t = b.team | 0, own = this.flags[t], en = this.flags[1 - t];
        if (en.carrier === b.id) obj = own.home;
        else if (own.dropAt && !own.carrier) obj = own.pos;
        else if (b.id % 3 === 0) { const c = own.carrier && this.players.get(own.carrier); obj = c ? c.pos : own.home; } // savunmacı
        else { const c = en.carrier && this.players.get(en.carrier); obj = c ? c.pos : en.pos; } // hücumcu / eskort
      }
      let bt = null, bd = Infinity;
      for (const t of this.tags.values()) { if (t.owner === b.id) continue; const d = Math.hypot(t.p[0] - b.pos[0], t.p[2] - b.pos[2]); if (d < bd) { bd = d; bt = t; } }
      let pkt = null, pd = Infinity;
      this.map.pickups.forEach((p, i) => { if (!this.pk[i].on) return; if (p.kind === 'hp' && b.hp > 80) return; if (p.kind === 'armor' && b.armor > 60) return; const d = Math.hypot(p.x - b.pos[0], p.z - b.pos[2]); if (d < pd) { pd = d; pkt = p; } });
      if (obj) { gx = obj[0]; gz = obj[2]; speed = 5.2; if (Math.hypot(gx - b.pos[0], gz - b.pos[2]) < 2) { b.goalT -= dt; if (b.goalT < 0 || !b.goal) { b.goal = this.spawnFor(b); b.goalT = 3; } gx = b.goal[0]; gz = b.goal[2]; } }
      else if (bt && bd < 45) { gx = bt.p[0]; gz = bt.p[2]; speed = 5.2; }
      else if (pkt && pd < 22) { gx = pkt.x; gz = pkt.z; speed = 5.2; }
      else {
        b.goalT -= dt;
        if (!b.goal || Math.hypot(b.goal[0] - b.pos[0], b.goal[2] - b.pos[2]) < 1.5 || b.goalT < 0) { b.goal = this.spawn(); b.goalT = 8; }
        gx = b.goal[0]; gz = b.goal[2];
      }
      let dyaw = Math.atan2(-(gx - b.pos[0]), -(gz - b.pos[2])) - b.yaw; dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
      b.yaw += dyaw * Math.min(1, dt * 5); b.pitch *= 0.9;
    }
    const mx = gx - b.pos[0], mz = gz - b.pos[2], ml = Math.hypot(mx, mz) || 1;
    const nx = b.pos[0] + (mx / ml) * speed * dt, nz = b.pos[2] + (mz / ml) * speed * dt;
    let blocked = false;
    if (!map.solidBox(nx, b.pos[1], b.pos[2])) b.pos[0] = nx; else blocked = true;
    if (!map.solidBox(b.pos[0], b.pos[1], nz)) b.pos[2] = nz; else blocked = true;
    const onGround = map.solidBox(b.pos[0], b.pos[1] - 0.05, b.pos[2]);
    if (blocked && onGround) b.vy = 8.2;
    b.vy = Math.max(-40, b.vy - 24 * dt);
    const ny = b.pos[1] + b.vy * dt;
    if (!map.solidBox(b.pos[0], ny, b.pos[2])) b.pos[1] = ny; else { if (b.vy < 0) b.pos[1] = Math.floor(ny) + 1; b.vy = 0; }
    if (b.pos[1] < -20) b.pos = this.spawn();
    // takılma
    b.stuck += dt;
    if (b.stuck > 1.5) { if (b.lastPos && Math.hypot(b.lastPos[0] - b.pos[0], b.lastPos[2] - b.pos[2]) < 0.5) b.goal = null; b.lastPos = b.pos.slice(); b.stuck = 0; }
    this.collect(b);
  };

  G.stepProjectiles = function (dt) {
    const map = this.map;
    for (let i = this.projs.length - 1; i >= 0; i--) {
      const pr = this.projs[i];
      pr.fuse -= dt;
      let boom = pr.fuse <= 0;
      const steps = Math.ceil((Math.hypot(pr.vel[0], pr.vel[1], pr.vel[2]) * dt) / 0.3) || 1, sd = dt / steps;
      for (let s = 0; s < steps && !boom; s++) {
        pr.vel[1] -= pr.grav * sd;
        for (let a = 0; a < 3; a++) {
          const np = pr.pos.slice(); np[a] += pr.vel[a] * sd;
          if (map.get(np[0], np[1], np[2])) {
            if (pr.k !== 'nade') { boom = true; break; }
            pr.vel[a] *= -0.4; for (let b = 0; b < 3; b++) if (b !== a) pr.vel[b] *= 0.8;
          } else pr.pos = np;
        }
        if (pr.k !== 'nade' && !boom) {
          for (const v of this.players.values()) {
            if (!v.alive || (v === pr.owner && Date.now() - pr.born < 250)) continue;
            if (pr.pos[0] > v.pos[0] - 0.5 && pr.pos[0] < v.pos[0] + 0.5 && pr.pos[2] > v.pos[2] - 0.5 && pr.pos[2] < v.pos[2] + 0.5 && pr.pos[1] > v.pos[1] && pr.pos[1] < v.pos[1] + 1.9) { boom = true; break; }
          }
        }
      }
      if (boom) {
        this.projs.splice(i, 1);
        this.explode(pr.pos, pr.owner, pr.k === 'rocket' ? 4.2 : pr.k === 'gl' ? 4 : 4.6, pr.k === 'rocket' ? 115 : 95, pr.k === 'rocket' ? 7 : pr.k === 'gl' ? 13 : -1);
      }
    }
  };

  G.stepChickens = function (dt) {
    const map = this.map, now = Date.now();
    for (const k of this.chickens) {
      if (!k.alive) { if (now >= k.at) { k.alive = true; k.hp = 10; k.pos = this.spawn(); } continue; }
      k.t -= dt;
      if (k.t <= 0 || !k.goal) { k.t = 2 + Math.random() * 3; k.goal = Math.random() < 0.4 ? null : [k.pos[0] + (Math.random() - 0.5) * 8, k.pos[2] + (Math.random() - 0.5) * 8]; if (k.goal) k.yaw = Math.atan2(-(k.goal[0] - k.pos[0]), -(k.goal[1] - k.pos[1])); }
      if (k.goal) {
        const nx = k.pos[0] - Math.sin(k.yaw) * 1.3 * dt, nz = k.pos[2] - Math.cos(k.yaw) * 1.3 * dt;
        let blocked = false;
        if (!map.solidBox(nx, k.pos[1], k.pos[2], 0.3, 0.8)) k.pos[0] = nx; else blocked = true;
        if (!map.solidBox(k.pos[0], k.pos[1], nz, 0.3, 0.8)) k.pos[2] = nz; else blocked = true;
        if (blocked) k.t = 0;
      }
      k.vy = Math.max(-30, k.vy - 24 * dt);
      const ny = k.pos[1] + k.vy * dt;
      if (!map.solidBox(k.pos[0], ny, k.pos[2], 0.3, 0.8)) k.pos[1] = ny; else { if (k.vy < 0) k.pos[1] = Math.floor(ny) + 1; k.vy = 0; }
      if (k.pos[1] < -5) k.pos = this.spawn();
    }
  };

  G.step = function (dt) {
    const now = Date.now();
    for (const l of [...this.loot.values()]) if (now - l.born > LOOT_LIFE) { this.loot.delete(l.id); this.broadcast({ t: 'lootGone', id: l.id, kind: 'expire' }); }
    for (const tag of [...this.tags.values()]) if (now - tag.born > TAG_LIFE) { this.tags.delete(tag.id); this.broadcast({ t: 'tagGone', id: tag.id, kind: 'expire' }); }
    this.pk.forEach((k, i) => { if (!k.on && !k.disabled && now >= k.at) { k.on = true; this.broadcast({ t: 'pk', i, on: 1 }); } });
    for (const p of [...this.players.values()]) if (!p.human) { if (p.z) this.zombieStep(p, dt); else this.botStep(p, dt); }
    this.flagStep();
    this.zomStep(now);
    this.stepProjectiles(dt);
    this.stepChickens(dt);
    if (this.players.size) this.broadcast({
      t: 'snap', fl: this.flagsPub(), zw: this.zwPub(),
      ps: [...this.players.values()].map((p) => this.pub(p)),
      pr: this.projs.map((p) => [p.id, p.k === 'rocket' ? 0 : p.k === 'gl' ? 2 : 1, +p.pos[0].toFixed(2), +p.pos[1].toFixed(2), +p.pos[2].toFixed(2)]),
      ck: this.chickens.map((k) => [k.id, +k.pos[0].toFixed(2), +k.pos[1].toFixed(2), +k.pos[2].toFixed(2), +k.yaw.toFixed(2), k.alive ? 1 : 0]),
    });
  };

  const api = { Game, MODES, MODE_ORDER };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.VGame = api;
})(typeof self !== 'undefined' ? self : this);
