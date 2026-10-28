// Başsız simülasyon: tüm mod x harita kombinasyonlarını sahte saatle çalıştırır.
const path = require('path');
const { createGame } = require(path.join(__dirname, '../public/core.js'));
const VM = require(path.join(__dirname, '../public/map.js'));
const SECONDS = +process.argv[2] || 120;
const results = [];
for (const mode of ['ffa', 'tdm', 'kc', 'dom']) for (let m = 0; m < VM.THEMES.length; m++) {
  let clock = 1000; const counts = {}; let errors = 0;
  const g = createGame({ mode, modes: [mode], mapIdx: m, rotateMap: false, botTarget: 9, now: () => clock, emit: (to, o) => { counts[o.t] = (counts[o.t] || 0) + 1; } });
  const id = g.join('Test', null, { skin: { c: 1, h: 2 } });
  const start = [...g.players.values()].filter((p) => !p.human).map((p) => p.pos.slice());
  let wins = 0, kills = 0;
  const t0 = Date.now();
  try {
    for (let i = 0; i < SECONDS * 20; i++) {
      clock += 50; g.tick(0.05);
      // insan oyuncu kıpırdamaz; ara sıra yeniden doldur ve el ateş et
      if (i % 40 === 0) g.msg(id, { t: 'reload' });
    }
  } catch (e) { errors++; console.log('HATA', mode, m, e.stack); }
  const bots = [...g.players.values()].filter((p) => !p.human);
  const moved = bots.map((p, i) => Math.hypot(p.pos[0] - start[i][0], p.pos[2] - start[i][2]));
  const stuck = bots.filter((p, i) => moved[i] < 3).length;
  const row = { mode, map: VM.THEMES[m].name, ms: Date.now() - t0, kills: counts.kill || 0, tags: counts.tag || 0, pkOff: counts.pkOff || 0, boom: counts.boom || 0, win: counts.win || 0, newround: counts.newround || 0, chicken: counts.chicken || 0, stuckBots: stuck, team: g.teamScore.join('-'), dp: g.pts.map((p) => p.owner).join(','), err: errors };
  results.push(row);
}
console.table(results);
const bad = results.filter((r) => r.err || r.kills === 0 || r.stuckBots > 3);
if (bad.length) { console.log('SORUNLU:', bad.map((r) => r.mode + '/' + r.map).join(', ')); process.exit(1); }
console.log('Tüm kombinasyonlar çalıştı.');
