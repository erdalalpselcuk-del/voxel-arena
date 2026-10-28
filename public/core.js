// Ortak oyun mantığı. Hem Node sunucusu (server.js) hem tarayıcı içi sunucu (localserver.js) bunu kullanır.
(function (root) {
  const VM = typeof require !== 'undefined' && typeof module !== 'undefined' ? require('./map.js') : root.VMap;
  const W = VM.WEAPONS;
  const MODES = {
    ffa: { name: 'Herkes Tek', teams: false, win: 20 },
    tdm: { name: 'Takım Savaşı', teams: true, win: 30 },
    kc: { name: 'Kill Confirmed', teams: true, win: 20 },
  };
  const EYE = 1.6, RESPAWN = 3000, TAG_LIFE = 25000, PROTECT = 2000, PICK_RESPAWN = 20000, GREN_CD = 4000;
  const BOT_NAMES = ['Kaplan', 'Şahin', 'Pixel', 'Blok', 'Zıpzıp', 'Gölge', 'Volkan', 'Fırtına', 'Ateş', 'Bulut', 'Çelik', 'Yıldırım'];
  const BOT_WEAPONS = [2, 4, 3, 4, 5, 7, 2, 1];

  const r2 = (v) => Math.round(v * 100) / 100;
  const num = (v, lo, hi, d) => (typeof v === 'number' && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
  const norm = (d) => { const l = Math.hypot(d[0], d[1], d[2]) || 1; return [d[0] / l, d[1] / l, d[2] / l]; };

  // ışın - kutu (slab) kesişimi; çarpmazsa null
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

  function createGame(opts) {
    const mode = MODES[opts.mode] ? opts.mode : 'kc';
    const cfg = MODES[mode];
    const send = opts.send || (() => {});
    const broadcast = opts.broadcast || (() => {});
    const maxPlayers = opts.maxPlayers || 16;
    const fixedType = opts.mapType != null && opts.mapType >= 0 && opts.mapType < VM.MAP_TYPES.length;
    let mapType = fixedType ? opts.mapType : Math.floor(Math.random() * VM.MAP_TYPES.length);
    let seed = (Math.floor(Math.random() * 0xffffff) | 1);
    let map = VM.generate(seed, mapType);

    let clock = 0, roundOver = false, nextProj = 1, nextTag = 1, nextBot = 1000, snapAcc = 0;
    const players = new Map(), tags = new Map();
    let pickups = [], projectiles = [];
    const teamScore = [0, 0];
    let events = [];
    const schedule = (ms, fn) => events.push({ at: clock + ms, fn });
    const toHuman = (p, obj) => { if (p && p.human) send(p.id, obj); };

    function setupPickups() { pickups = map.pickups.map((p) => ({ x: p.x, y: p.y, z: p.z, kind: p.kind, on: true })); }
    setupPickups();

    function assignTeam() {
      if (!cfg.teams) return -1;
      const c = [0, 0];
      for (const p of players.values()) if (p.team >= 0) c[p.team]++;
      return c[1] < c[0] ? 1 : 0;
    }

    function pub(p) {
      return { id: p.id, name: p.name, team: p.team, p: p.pos.map(r2), yaw: r2(p.yaw), pitch: r2(p.pitch), hp: Math.round(p.hp), armor: Math.round(p.armor), alive: p.alive, w: p.w, score: p.score, kills: p.kills, deaths: p.deaths };
    }

    function pickSpawn(p) {
      let best = null, bd = -1;
      for (let i = 0; i < 8; i++) {
        const s = map.spawns[Math.floor(Math.random() * map.spawns.length)];
        let md = 999;
        for (const q of players.values()) {
          if (q === p || !q.alive) continue;
          if (cfg.teams && q.team === p.team) continue;
          md = Math.min(md, Math.hypot(q.pos[0] - s[0], q.pos[2] - s[2]));
        }
        if (md > bd) { bd = md; best = s; }
      }
      return best.slice();
    }

    function mkPlayer(id, name, human) {
      return { id, name, human, team: -1, pos: [0, 1, 0], yaw: 0, pitch: 0, hp: 100, armor: 0, alive: true, w: 4, score: 0, kills: 0, deaths: 0, nextFire: 0, nextGren: 0, lastT: -1, protectUntil: 0, vy: 0, onGround: true };
    }

    // ---------------- hasar ve ölüm ----------------
    function damage(v, amt, attacker, wi, head, from) {
      if (!v.alive || roundOver) return false;
      if (clock < v.protectUntil) return false;
      if (attacker && attacker !== v && cfg.teams && attacker.team === v.team) return false;
      const a = Math.min(v.armor, amt * 0.66);
      v.armor -= a;
      v.hp -= amt - a;
      if (attacker && attacker !== v) toHuman(attacker, { t: 'hit', dmg: Math.round(amt), head: !!head, kill: v.hp <= 0 });
      toHuman(v, { t: 'dmg', dmg: Math.round(amt), from: from || (attacker ? attacker.pos : null) });
      if (v.hp <= 0) { v.hp = 0; kill(v, attacker, wi, head); return true; }
      return false;
    }

    function kill(victim, killer, wi, head) {
      victim.alive = false;
      victim.deaths++;
      const enemy = killer && killer !== victim && (!cfg.teams || killer.team !== victim.team);
      if (enemy) {
        killer.kills++;
        if (mode === 'ffa') killer.score++;
        else if (mode === 'tdm') { killer.score++; teamScore[killer.team]++; }
      }
      broadcast({ t: 'kill', killer: killer ? killer.id : 0, victim: victim.id, w: wi, head: !!head });
      if (mode === 'kc') {
        const id = nextTag++;
        const tag = { id, p: [r2(victim.pos[0]), r2(victim.pos[1] + 0.6), r2(victim.pos[2])], owner: victim.id, team: victim.team, born: clock };
        tags.set(id, tag);
        broadcast({ t: 'tag', id, p: tag.p, owner: tag.owner, team: tag.team });
      }
      schedule(RESPAWN, () => { if (players.has(victim.id) && !roundOver && !victim.alive) respawn(victim); });
      checkWin();
    }

    function respawn(p) {
      p.pos = pickSpawn(p); p.hp = 100; p.armor = 0; p.alive = true; p.vy = 0; p.protectUntil = clock + PROTECT;
      p.path = null; p.lastSeen = null;
      toHuman(p, { t: 'respawn', p: p.pos });
    }

    function checkWin() {
      if (roundOver) return;
      if (mode === 'ffa') {
        for (const p of players.values()) if (p.score >= cfg.win) return endRound({ id: p.id, name: p.name, team: -1 });
      } else {
        for (let t = 0; t < 2; t++) if (teamScore[t] >= cfg.win) return endRound({ id: 0, name: t === 0 ? 'MAVİ TAKIM' : 'TURUNCU TAKIM', team: t });
      }
    }

    function endRound(win) {
      roundOver = true;
      broadcast({ t: 'win', id: win.id, name: win.name, team: win.team });
      schedule(8000, newRound);
    }

    function newRound() {
      seed = (Math.floor(Math.random() * 0xffffff) | 1);
      if (!fixedType) mapType = (mapType + 1) % VM.MAP_TYPES.length;
      map = VM.generate(seed, mapType);
      setupPickups();
      tags.clear(); projectiles = []; teamScore[0] = teamScore[1] = 0; roundOver = false;
      for (const p of players.values()) {
        p.score = p.kills = p.deaths = 0; p.hp = 100; p.armor = 0; p.alive = true; p.vy = 0; p.path = null; p.goal = null;
        p.pos = pickSpawn(p); p.protectUntil = clock + PROTECT;
      }
      broadcast({ t: 'newround', seed, mapType, players: [...players.values()].map(pub), pk: pickups.map((x) => 1), ts: teamScore });
    }

    // ---------------- ateş ----------------
    function doShoot(p, wi, o, ds) {
      const Wp = W[wi];
      if (!Wp || !p.alive || roundOver) return;
      if (clock < p.nextFire - 40) return;
      p.nextFire = clock + Wp.rate;
      p.w = wi;
      if (Wp.melee) return melee(p, Wp, o, norm(ds[0]));
      if (Wp.projectile) {
        const d = norm(ds[0]);
        spawnProj(0, p, [o[0] + d[0] * 0.9, o[1] + d[1] * 0.9, o[2] + d[2] * 0.9], [d[0] * 26, d[1] * 26, d[2] * 26]);
        broadcast({ t: 'rocket', id: p.id, o: o.map(r2) });
        return;
      }
      const es = [], hits = [], dmgBy = new Map();
      for (const raw of ds.slice(0, Wp.pellets)) {
        const d = norm(raw);
        const wall = map.raycast(o, d, 120);
        let best = null;
        for (const v of players.values()) {
          if (v === p || !v.alive) continue;
          if (cfg.teams && v.team === p.team) continue;
          const t = rayBox(o, d, [v.pos[0] - 0.3, v.pos[1], v.pos[2] - 0.3], [v.pos[0] + 0.3, v.pos[1] + 1.8, v.pos[2] + 0.3]);
          if (t !== null && t < wall && t < 120 && (!best || t < best.t)) best = { v, t };
        }
        const reach = best ? best.t : Math.min(wall, 120);
        es.push([r2(o[0] + d[0] * reach), r2(o[1] + d[1] * reach), r2(o[2] + d[2] * reach)]);
        hits.push(best ? 1 : 0);
        if (best) {
          const head = o[1] + d[1] * best.t > best.v.pos[1] + 1.4;
          const cur = dmgBy.get(best.v) || { dmg: 0, head: false };
          cur.dmg += Wp.dmg * (head ? 2 : 1); cur.head = cur.head || head;
          dmgBy.set(best.v, cur);
        }
      }
      broadcast({ t: 'shot', id: p.id, w: wi, o: o.map(r2), es, hits });
      for (const [v, info] of dmgBy) damage(v, info.dmg, p, wi, info.head);
    }

    function melee(p, Wp, o, d) {
      const wall = map.raycast(o, d, Wp.range);
      let best = null;
      for (const v of players.values()) {
        if (v === p || !v.alive) continue;
        if (cfg.teams && v.team === p.team) continue;
        const t = rayBox(o, d, [v.pos[0] - 0.55, v.pos[1] - 0.2, v.pos[2] - 0.55], [v.pos[0] + 0.55, v.pos[1] + 2.0, v.pos[2] + 0.55]);
        if (t !== null && t <= Wp.range && t < wall && (!best || t < best.t)) best = { v, t };
      }
      broadcast({ t: 'melee', id: p.id, hit: best ? 1 : 0 });
      if (best) damage(best.v, Wp.dmg, p, 0, false);
    }

    function spawnProj(type, owner, pos, vel) {
      projectiles.push({ id: nextProj++, type, owner: owner.id, pos, vel, born: clock });
    }

    function explode(pos, owner, radius, dmgMax, wi) {
      broadcast({ t: 'boom', p: pos.map(r2), r: radius });
      for (const v of players.values()) {
        if (!v.alive) continue;
        const c = [v.pos[0], v.pos[1] + 1.0, v.pos[2]];
        const dx = c[0] - pos[0], dy = c[1] - pos[1], dz = c[2] - pos[2], d = Math.hypot(dx, dy, dz);
        if (d >= radius) continue;
        if (d > 1.2 && map.raycast(pos, [dx / d, dy / d, dz / d], d - 0.3) !== Infinity) continue;
        const f = 1 - d / radius;
        if (v === owner) damage(v, dmgMax * f * 0.5, owner, wi, false, pos);
        else damage(v, dmgMax * f, owner, wi, false, pos);
        const kb = 16 * f, inv = 1 / (d || 1);
        const imp = [dx * inv * kb, Math.max(dy * inv, 0.35) * kb * 0.9, dz * inv * kb];
        if (v.human) toHuman(v, { t: 'kb', v: imp.map(r2) });
        else v.vy = Math.max(v.vy, imp[1] * 0.6);
      }
    }

    function updateProjectiles(dt) {
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const pr = projectiles[i];
        const owner = players.get(pr.owner) || null;
        const age = clock - pr.born;
        if (pr.type === 0) { // roket
          const sp = Math.hypot(pr.vel[0], pr.vel[1], pr.vel[2]), d = [pr.vel[0] / sp, pr.vel[1] / sp, pr.vel[2] / sp], step = sp * dt;
          let hitT = null;
          const wall = map.raycast(pr.pos, d, step + 0.2);
          if (wall <= step + 0.15) hitT = Math.max(0, wall - 0.1);
          for (const v of players.values()) {
            if (!v.alive || (v.id === pr.owner && age < 400)) continue;
            const t = rayBox(pr.pos, d, [v.pos[0] - 0.55, v.pos[1] - 0.2, v.pos[2] - 0.55], [v.pos[0] + 0.55, v.pos[1] + 2.0, v.pos[2] + 0.55]);
            if (t !== null && t <= step && (hitT === null || t < hitT)) hitT = t;
          }
          if (hitT !== null || age > 6000) {
            const t = hitT === null ? 0 : hitT;
            projectiles.splice(i, 1);
            explode([pr.pos[0] + d[0] * t, pr.pos[1] + d[1] * t, pr.pos[2] + d[2] * t], owner, W[7].radius, W[7].dmg, 7);
          } else { pr.pos[0] += d[0] * step; pr.pos[1] += d[1] * step; pr.pos[2] += d[2] * step; }
        } else { // bomba
          pr.vel[1] -= 22 * dt;
          for (let a = 0; a < 3; a++) {
            const n = pr.pos[a] + pr.vel[a] * dt, q = pr.pos.slice();
            q[a] = n + (pr.vel[a] > 0 ? 0.12 : -0.12);
            if (map.get(q[0], q[1], q[2])) {
              pr.vel[a] *= -0.45;
              if (a === 1) { pr.vel[0] *= 0.8; pr.vel[2] *= 0.8; if (Math.abs(pr.vel[1]) < 1) pr.vel[1] = 0; }
            } else pr.pos[a] = n;
          }
          if (age >= 2400) { projectiles.splice(i, 1); explode(pr.pos.slice(), owner, 4.5, 100, 7); }
        }
      }
    }

    // ---------------- künye ve eşyalar ----------------
    function collectTags(p) {
      if (!p.alive) return;
      for (const tag of [...tags.values()]) {
        if (Math.hypot(p.pos[0] - tag.p[0], p.pos[2] - tag.p[2]) > 1.4 || Math.abs(p.pos[1] + 0.9 - tag.p[1]) > 1.8) continue;
        tags.delete(tag.id);
        if (tag.team === p.team) broadcast({ t: 'tagGone', id: tag.id, by: p.id, kind: 'deny' });
        else {
          p.score++; teamScore[p.team]++;
          broadcast({ t: 'tagGone', id: tag.id, by: p.id, kind: 'confirm', ts: teamScore });
          checkWin();
        }
      }
    }

    function collectPickups(p) {
      if (!p.alive) return;
      for (let i = 0; i < pickups.length; i++) {
        const k = pickups[i];
        if (!k.on) continue;
        if (Math.hypot(p.pos[0] - k.x, p.pos[2] - k.z) > 1.1 || Math.abs(p.pos[1] - k.y) > 1.5) continue;
        if (k.kind === 'health') { if (p.hp >= 100) continue; p.hp = Math.min(100, p.hp + 35); }
        else { if (p.armor >= 100) continue; p.armor = Math.min(100, p.armor + 30); }
        k.on = false;
        broadcast({ t: 'pickup', i, on: 0, by: p.id, kind: k.kind });
        schedule(PICK_RESPAWN, () => { k.on = true; broadcast({ t: 'pickup', i, on: 1 }); });
      }
    }

    // ---------------- botlar ----------------
    function solidBox(x, y, z) {
      for (let ix = Math.floor(x - 0.3); ix <= Math.floor(x + 0.3); ix++)
        for (let iy = Math.floor(y); iy <= Math.floor(y + 1.799); iy++)
          for (let iz = Math.floor(z - 0.3); iz <= Math.floor(z + 0.3); iz++) if (map.get(ix, iy, iz)) return true;
      return false;
    }

    function addBot() {
      const id = nextBot++;
      const b = mkPlayer(id, BOT_NAMES[(id - 1000) % BOT_NAMES.length], false);
      b.team = assignTeam();
      b.pos = pickSpawn(b); b.protectUntil = clock + PROTECT;
      b.baseW = BOT_WEAPONS[(id - 1000) % BOT_WEAPONS.length]; b.w = b.baseW;
      b.skill = 0.7 + Math.random() * 0.7;
      b.path = null; b.pi = 0; b.repath = 0; b.strafe = 1; b.strafeT = 0; b.goal = null; b.goalT = 0; b.seen = 0;
      b.lastSeen = null; b.lastSeenT = -99999; b.stuckT = 0; b.lastPos = b.pos.slice();
      players.set(id, b);
      broadcast({ t: 'join', player: pub(b) });
      return b;
    }

    function nav(b, goal, dt) {
      b.repath -= dt;
      if (!b.path || b.repath <= 0) { b.path = map.findPath(b.pos, goal) || []; b.pi = 0; b.repath = 0.9 + Math.random() * 0.5; }
      let wp = b.path[b.pi];
      while (wp && Math.hypot(wp[0] - b.pos[0], wp[2] - b.pos[2]) < 0.5 && Math.abs(wp[1] - b.pos[1]) < 1.3) wp = b.path[++b.pi];
      return wp || goal;
    }

    function chooseGoal(b) {
      let best = null, bd = Infinity;
      if (b.hp < 60) for (const k of pickups) if (k.on && k.kind === 'health') { const d = Math.hypot(k.x - b.pos[0], k.z - b.pos[2]); if (d < bd) { bd = d; best = [k.x, k.y, k.z]; } }
      if (!best && b.armor < 30) for (const k of pickups) if (k.on && k.kind === 'armor') { const d = Math.hypot(k.x - b.pos[0], k.z - b.pos[2]); if (d < bd && d < 25) { bd = d; best = [k.x, k.y, k.z]; } }
      if (!best) for (const t of tags.values()) { const d = Math.hypot(t.p[0] - b.pos[0], t.p[2] - b.pos[2]); if (d < bd && d < 50) { bd = d; best = [t.p[0], t.p[1] - 0.6, t.p[2]]; } }
      return best;
    }

    function botStep(b, dt) {
      if (!b.alive || roundOver) return;
      const eye = [b.pos[0], b.pos[1] + EYE, b.pos[2]];
      let tgt = null, td = 50;
      for (const v of players.values()) {
        if (v === b || !v.alive) continue;
        if (cfg.teams && v.team === b.team) continue;
        const c = [v.pos[0], v.pos[1] + 1.2, v.pos[2]];
        const dx = c[0] - eye[0], dy = c[1] - eye[1], dz = c[2] - eye[2], dist = Math.hypot(dx, dy, dz);
        if (dist < td && map.raycast(eye, [dx / dist, dy / dist, dz / dist], dist) === Infinity) { tgt = { v, c, dist, dx, dy, dz }; td = dist; }
      }
      let mx = 0, mz = 0, speed = 4.4, wantJump = false, faceMove = true;
      if (tgt) {
        b.seen += dt; b.lastSeen = tgt.v.pos.slice(); b.lastSeenT = clock;
        b.w = tgt.dist < 6 ? 3 : tgt.dist > 32 ? 5 : b.baseW;
        const wantYaw = Math.atan2(-tgt.dx, -tgt.dz);
        let dyaw = wantYaw - b.yaw; dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
        b.yaw += dyaw * Math.min(1, dt * 7);
        b.pitch = Math.atan2(tgt.dy, Math.hypot(tgt.dx, tgt.dz));
        faceMove = false;
        if (tgt.dist > 16) {
          const wp = nav(b, tgt.v.pos, dt); mx = wp[0] - b.pos[0]; mz = wp[2] - b.pos[2];
          if (wp[1] > b.pos[1] + 0.4 && Math.hypot(mx, mz) < 1.4) wantJump = true;
        } else {
          b.strafeT -= dt;
          if (b.strafeT <= 0) { b.strafeT = 0.7 + Math.random(); b.strafe = Math.random() < 0.5 ? -1 : 1; }
          const f = [-Math.sin(b.yaw), -Math.cos(b.yaw)], s = [Math.cos(b.yaw), -Math.sin(b.yaw)];
          const fw = tgt.dist < 5 ? -0.5 : 0.2;
          mx = s[0] * b.strafe + f[0] * fw; mz = s[1] * b.strafe + f[1] * fw;
        }
        const Wp = W[b.w];
        if (b.seen > 0.35 * b.skill && Math.abs(dyaw) < 0.3 && clock >= b.nextFire + (Wp.auto ? 0 : 150)) {
          const err = (0.035 + tgt.dist * 0.0018) * b.skill, ds = [];
          for (let i = 0; i < Wp.pellets; i++) ds.push([tgt.dx / tgt.dist + (Math.random() - 0.5) * err * 2, tgt.dy / tgt.dist + (Math.random() - 0.5) * err * 2, tgt.dz / tgt.dist + (Math.random() - 0.5) * err * 2]);
          doShoot(b, b.w, eye, ds);
        }
      } else {
        b.seen = 0;
        let goal = null;
        if (b.lastSeen && clock - b.lastSeenT < 6000 && Math.hypot(b.lastSeen[0] - b.pos[0], b.lastSeen[2] - b.pos[2]) > 2) goal = b.lastSeen;
        else {
          goal = chooseGoal(b);
          if (!goal) {
            b.goalT -= dt;
            if (!b.goal || b.goalT <= 0 || Math.hypot(b.goal[0] - b.pos[0], b.goal[2] - b.pos[2]) < 1.5) { b.goal = map.spawns[Math.floor(Math.random() * map.spawns.length)].slice(); b.goalT = 10; b.path = null; }
            goal = b.goal;
          }
        }
        const wp = nav(b, goal, dt);
        mx = wp[0] - b.pos[0]; mz = wp[2] - b.pos[2];
        if (wp[1] > b.pos[1] + 0.4 && Math.hypot(mx, mz) < 1.4) wantJump = true;
        speed = 5.0;
      }
      if (faceMove && (mx || mz)) {
        const wantYaw = Math.atan2(-mx, -mz);
        let dyaw = wantYaw - b.yaw; dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
        b.yaw += dyaw * Math.min(1, dt * 6); b.pitch *= 0.9;
      }
      const ml = Math.hypot(mx, mz) || 1;
      const nx = b.pos[0] + (mx / ml) * speed * dt, nz = b.pos[2] + (mz / ml) * speed * dt;
      let blocked = false;
      if (!solidBox(nx, b.pos[1], b.pos[2])) b.pos[0] = nx; else blocked = true;
      if (!solidBox(b.pos[0], b.pos[1], nz)) b.pos[2] = nz; else blocked = true;
      b.onGround = solidBox(b.pos[0], b.pos[1] - 0.05, b.pos[2]);
      if ((blocked || wantJump) && b.onGround) b.vy = 8.2;
      b.vy = Math.max(-40, b.vy - 24 * dt);
      const ny = b.pos[1] + b.vy * dt;
      if (!solidBox(b.pos[0], ny, b.pos[2])) b.pos[1] = ny;
      else { if (b.vy < 0) b.pos[1] = Math.floor(ny) + 1; b.vy = 0; }
      if (b.pos[1] < -20) { b.pos = pickSpawn(b); b.path = null; }
      // takılma denetimi
      b.stuckT += dt;
      if (b.stuckT >= 1.6) {
        if (Math.hypot(b.pos[0] - b.lastPos[0], b.pos[2] - b.lastPos[2]) < 0.5 && !tgt) { b.goal = null; b.path = null; b.vy = 8.2; b.lastSeen = null; }
        b.lastPos = b.pos.slice(); b.stuckT = 0;
      }
      collectTags(b); collectPickups(b);
    }

    // ---------------- istemci mesajları ----------------
    function addHuman(id, name) {
      if (players.size >= maxPlayers) { send(id, { t: 'full' }); return null; }
      const p = mkPlayer(id, String(name || 'Oyuncu').replace(/[<>&"'`]/g, '').trim().slice(0, 16) || 'Oyuncu', true);
      p.team = assignTeam(); p.pos = pickSpawn(p); p.protectUntil = clock + PROTECT; p.w = 4;
      players.set(id, p);
      send(id, { t: 'init', id, seed, mapType, mode, modeName: cfg.name, win: cfg.win, teams: cfg.teams, p: p.pos, team: p.team, players: [...players.values()].map(pub), tags: [...tags.values()].map((g) => ({ id: g.id, p: g.p, owner: g.owner, team: g.team })), pk: pickups.map((x) => (x.on ? 1 : 0)), ts: teamScore, roundOver });
      broadcast({ t: 'join', player: pub(p) });
      return p;
    }

    function removePlayer(id) {
      if (!players.has(id)) return;
      players.delete(id);
      broadcast({ t: 'leave', id });
    }

    function handle(id, msg) {
      const p = players.get(id);
      if (!p || !msg || typeof msg.t !== 'string') return;
      if (msg.t === 'state') {
        if (!p.alive || roundOver || !Array.isArray(msg.p)) return;
        const np = [num(msg.p[0], -5, VM.SIZE + 5, p.pos[0]), num(msg.p[1], -5, VM.H + 5, p.pos[1]), num(msg.p[2], -5, VM.SIZE + 5, p.pos[2])];
        const dtS = p.lastT < 0 ? 1 : Math.min(1, (clock - p.lastT) / 1000);
        if (p.lastT < 0 || Math.hypot(np[0] - p.pos[0], np[2] - p.pos[2]) <= 18 * dtS + 2.5) p.pos = np;
        else toHuman(p, { t: 'correct', p: p.pos });
        p.lastT = clock;
        p.yaw = num(msg.yaw, -1000, 1000, p.yaw); p.pitch = num(msg.pitch, -1.6, 1.6, p.pitch);
        const w = msg.w | 0; p.w = w >= 0 && w < W.length ? w : 4;
        collectTags(p); collectPickups(p);
      } else if (msg.t === 'shoot') {
        if (!Array.isArray(msg.o) || !Array.isArray(msg.ds) || !msg.ds.length) return;
        const wi = msg.w | 0;
        if (!W[wi]) return;
        const o = [num(msg.o[0], -100, 200, 0), num(msg.o[1], -10, 100, 0), num(msg.o[2], -100, 200, 0)];
        if (Math.hypot(o[0] - p.pos[0], o[1] - (p.pos[1] + EYE), o[2] - p.pos[2]) > 3) return;
        const ds = [];
        for (const d of msg.ds.slice(0, 8)) if (Array.isArray(d)) ds.push([num(d[0], -1, 1, 0), num(d[1], -1, 1, 0), num(d[2], -1, 1, 0)]);
        if (ds.length) doShoot(p, wi, o, ds);
      } else if (msg.t === 'grenade') {
        if (!p.alive || roundOver || clock < p.nextGren || !Array.isArray(msg.o) || !Array.isArray(msg.d)) return;
        const o = [num(msg.o[0], -100, 200, 0), num(msg.o[1], -10, 100, 0), num(msg.o[2], -100, 200, 0)];
        if (Math.hypot(o[0] - p.pos[0], o[1] - (p.pos[1] + EYE), o[2] - p.pos[2]) > 3) return;
        const d = norm([num(msg.d[0], -1, 1, 0), num(msg.d[1], -1, 1, 0), num(msg.d[2], -1, 1, 0)]);
        p.nextGren = clock + GREN_CD;
        spawnProj(1, p, [o[0] + d[0] * 0.6, o[1] + d[1] * 0.6, o[2] + d[2] * 0.6], [d[0] * 15, d[1] * 15 + 3, d[2] * 15]);
        toHuman(p, { t: 'grenOk', cd: GREN_CD });
      }
    }

    // ---------------- zaman adımı ----------------
    function tick(dt) {
      clock += dt * 1000;
      if (events.length) {
        const due = events.filter((e) => e.at <= clock);
        if (due.length) { events = events.filter((e) => e.at > clock); for (const e of due) e.fn(); }
      }
      for (const t of [...tags.values()]) if (clock - t.born > TAG_LIFE) { tags.delete(t.id); broadcast({ t: 'tagGone', id: t.id, kind: 'expire' }); }
      updateProjectiles(dt);
      for (const p of players.values()) if (!p.human) botStep(p, dt);
      snapAcc += dt;
      if (snapAcc >= 0.05) {
        snapAcc = 0;
        if (players.size) broadcast({ t: 'snap', ps: [...players.values()].map(pub), pr: projectiles.map((q) => [q.id, q.type, r2(q.pos[0]), r2(q.pos[1]), r2(q.pos[2])]), ts: teamScore });
      }
    }

    for (let i = 0; i < (opts.bots | 0); i++) addBot();

    return {
      addHuman, removePlayer, handle, tick, addBot,
      state: () => ({ players, tags, pickups, projectiles, teamScore, seed, mapType, roundOver, clock, map, mode }),
    };
  }

  const api = { createGame, MODES, rayBox };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.VCore = api;
})(typeof self !== 'undefined' ? self : this);
