// Silah modelleri ve animasyonları. Her silah adlandırılmış parçalardan oluşur (şarjör, sürgü, pompa, namlu...)
// ve çekme / doldurma / ateş animasyonları bu parçaların anahtar karelerini sürer.
(function (root) {
  const T = root.THREE;
  const geo = new T.BoxGeometry(1, 1, 1);
  const mats = {};
  const mat = (c) => mats[c] || (mats[c] = new T.MeshLambertMaterial({ color: c }));

  const M = 0x2a2a2c, M2 = 0x3a3a3f, K = 0x1d1d1f, WD = 0x8a5a2b, WD2 = 0x7a4d24, ST = 0x555555, OL = 0x4a5d3a, SIL = 0x6e7077;
  // parça: [sx, sy, sz, renk, x, y, z, grup, boyanabilir]
  const tr = (g, ch, k) => ({ g, ch, k });
  const tilt = (rz, rx, y) => [tr('root', 'rz', [[0, 0], [0.14, rz], [0.86, rz], [1, 0]]), tr('root', 'rx', [[0, 0], [0.14, rx], [0.86, rx], [1, 0]]), tr('root', 'y', [[0, 0], [0.14, y || 0], [0.86, y || 0], [1, 0]])];
  const magSwap = (g, d) => tr(g, 'y', [[0, 0], [0.22, 0], [0.4, d], [0.52, d], [0.7, 0], [1, 0]]);
  const kick = (z, rx) => [tr('root', 'z', [[0, 0], [0.1, z], [1, 0]]), tr('root', 'rx', [[0, 0], [0.1, rx], [1, 0]])];
  const slide = (g, d) => tr(g, 'z', [[0, 0], [0.12, d], [0.45, 0], [1, 0]]);
  const rifleReload = (extraBolt) => tilt(0.38, 0.22, -0.05).concat([magSwap('mag', -0.32), tr('bolt', 'z', [[0, 0], [0.78, 0], [0.86, 0.08], [0.95, 0], [1, 0]])]).concat(extraBolt || []);
  const swing = (rx, ry, z) => [tr('root', 'rx', [[0, 0], [0.25, rx], [0.55, -rx * 0.5], [1, 0]]), tr('root', 'ry', [[0, 0], [0.25, ry], [0.55, -ry], [1, 0]]), tr('root', 'z', [[0, 0], [0.3, z], [1, 0]])];

  const DEFS = [
    // 0 Levye
    { parts: [[0.05, 0.05, 0.62, 0xb8302a, 0, 0, -0.15, null, 1], [0.05, 0.05, 0.16, 0xb8302a, 0, 0.055, -0.5, null, 1], [0.065, 0.065, 0.12, 0x333333, 0, 0, 0.18]], pos: [0.3, -0.3, -0.55], fireDur: 0.45, fire: swing(-0.9, 0.5, -0.12) },
    // 1 Glock
    { groups: { slide: [0, 0.025, -0.1], mag: [0, -0.15, 0] },
      parts: [[0.055, 0.045, 0.26, 0x2b2b2e, 0, 0.025, -0.1, 'slide', 1], [0.055, 0.04, 0.24, M2, 0, -0.02, -0.08], [0.05, 0.13, 0.07, K, 0, -0.1, 0.0], [0.045, 0.05, 0.06, 0x777777, 0, -0.17, 0, 'mag']],
      pos: [0.26, -0.24, -0.55], ads: [0, -0.115, -0.5], flash: [0, 0.03, -0.26], fireDur: 0.3,
      reload: tilt(0.5, 0.3, 0).concat([magSwap('mag', -0.25), tr('slide', 'z', [[0, 0], [0.75, 0], [0.85, 0.07], [0.95, 0], [1, 0]])]), fire: kick(0.05, 0.12).concat([slide('slide', 0.08)]) },
    // 2 AK-47
    { groups: { mag: [0, -0.06, -0.08], bolt: [0.04, 0.04, -0.05] },
      parts: [[0.07, 0.09, 0.5, M, 0, 0, -0.1, null, 1], [0.06, 0.1, 0.24, WD, 0, -0.01, 0.3], [0.075, 0.06, 0.2, WD, 0, -0.03, -0.38], [0.05, 0.1, 0.06, K, 0, -0.1, 0.1], [0.05, 0.15, 0.08, K, 0, -0.11, -0.08, 'mag'], [0.03, 0.03, 0.2, ST, 0, 0.02, -0.6], [0.02, 0.02, 0.07, ST, 0.04, 0.04, -0.05, 'bolt'], [0.02, 0.03, 0.02, ST, 0, 0.065, -0.5]],
      pos: [0.27, -0.25, -0.55], ads: [0, -0.135, -0.42], flash: [0, 0.02, -0.72], fireDur: 0.12, reload: rifleReload(), fire: kick(0.06, 0.1).concat([tr('bolt', 'z', [[0, 0], [0.2, 0.05], [0.6, 0], [1, 0]])]) },
    // 3 MP5
    { groups: { mag: [0, -0.08, -0.1], bolt: [0.04, 0.04, -0.12] },
      parts: [[0.07, 0.1, 0.38, 0x1e1f22, 0, 0, -0.1, null, 1], [0.04, 0.17, 0.05, M, 0, -0.13, -0.1, 'mag'], [0.04, 0.05, 0.2, M, 0, 0, 0.22], [0.03, 0.03, 0.12, ST, 0, 0.02, -0.35], [0.07, 0.07, 0.14, M, 0, -0.01, -0.3], [0.02, 0.02, 0.06, ST, 0.045, 0.04, -0.12, 'bolt'], [0.04, 0.1, 0.05, K, 0, -0.1, 0.06]],
      pos: [0.26, -0.25, -0.55], ads: [0, -0.13, -0.45], flash: [0, 0.02, -0.46], fireDur: 0.07, reload: rifleReload(), fire: kick(0.045, 0.07).concat([tr('bolt', 'z', [[0, 0], [0.3, 0.04], [0.8, 0], [1, 0]])]) },
    // 4 Çift Namlu
    { groups: { brl: [0, 0, 0.02], sh: [0, 0, 0.0] },
      parts: [[0.03, 0.035, 0.6, SIL, -0.022, 0.01, -0.3, 'brl', 1], [0.03, 0.035, 0.6, SIL, 0.022, 0.01, -0.3, 'brl', 1], [0.08, 0.1, 0.32, WD2, 0, -0.03, 0.12], [0.075, 0.05, 0.16, WD2, 0, -0.04, -0.25, 'brl'], [0.026, 0.026, 0.07, 0xc0392b, -0.022, 0.0, -0.01, 'sh'], [0.026, 0.026, 0.07, 0xc0392b, 0.022, 0.0, -0.01, 'sh']],
      pos: [0.27, -0.26, -0.5], ads: [0, -0.12, -0.45], flash: [0, 0.02, -0.64], fireDur: 0.45,
      reload: tilt(0.35, 0.25, 0).concat([tr('brl', 'rx', [[0, 0], [0.15, 0], [0.32, -0.5], [0.72, -0.5], [0.88, 0], [1, 0]]), tr('sh', 'y', [[0, 0], [0.32, 0], [0.45, 0.3], [0.52, 0.3], [0.64, 0], [1, 0]])]),
      fire: kick(0.09, 0.3).concat([tr('brl', 'rx', [[0, 0], [0.1, 0.08], [0.5, 0], [1, 0]])]) },
    // 5 AWP
    { groups: { mag: [0, -0.07, -0.1], bolt: [0.04, 0.03, 0.0] },
      parts: [[0.06, 0.08, 0.85, OL, 0, 0, -0.2, null, 1], [0.05, 0.05, 0.22, 0x111111, 0, 0.09, -0.15], [0.07, 0.1, 0.22, 0x3b4a2d, 0, -0.02, 0.35], [0.04, 0.06, 0.07, 0x222222, 0, -0.07, -0.1, 'mag'], [0.02, 0.02, 0.1, ST, 0.05, 0.03, 0.0, 'bolt'], [0.04, 0.04, 0.04, ST, 0.07, 0.03, 0.04, 'bolt'], [0.025, 0.025, 0.2, 0x333333, 0, 0, -0.75]],
      pos: [0.24, -0.24, -0.5], ads: [0, -0.15, -0.45], flash: [0, 0, -0.88], fireDur: 0.95,
      reload: tilt(0.3, 0.22, -0.03).concat([magSwap('mag', -0.25), tr('bolt', 'rz', [[0, 0], [0.7, 0], [0.76, 1.0], [0.9, 1.0], [0.96, 0], [1, 0]]), tr('bolt', 'z', [[0, 0], [0.76, 0], [0.84, 0.12], [0.92, 0], [1, 0]])]),
      fire: kick(0.1, 0.22).concat([tr('bolt', 'rz', [[0, 0], [0.3, 0], [0.38, 1.0], [0.7, 1.0], [0.78, 0], [1, 0]]), tr('bolt', 'z', [[0, 0], [0.38, 0], [0.5, 0.12], [0.62, 0], [1, 0]])]) },
    // 6 Arbalet
    { groups: { str: [0, 0.03, -0.38], bolt: [0, 0.058, -0.25] },
      parts: [[0.06, 0.06, 0.55, WD2, 0, 0, -0.1, null, 1], [0.6, 0.03, 0.05, 0x3d3d40, 0, 0.03, -0.38], [0.025, 0.025, 0.4, ST, 0, 0.045, -0.2], [0.07, 0.1, 0.16, 0x5c3a1c, 0, -0.07, 0.15], [0.5, 0.012, 0.012, 0xeeeeee, 0, 0.03, -0.38, 'str'], [0.02, 0.02, 0.3, 0xcccccc, 0, 0.058, -0.25, 'bolt']],
      pos: [0.26, -0.26, -0.5], ads: [0, -0.13, -0.45], flash: [0, 0.04, -0.5], fireDur: 0.5,
      reload: tilt(0.25, 0.2, 0).concat([tr('str', 'z', [[0, 0], [0.3, 0], [0.55, 0.2], [0.65, 0.2], [0.72, 0], [1, 0]]), tr('bolt', 's', [[0, 0.001], [0.5, 0.001], [0.62, 1], [1, 1]]), tr('bolt', 'y', [[0, 0], [0.5, 0.15], [0.7, 0], [1, 0]])]),
      fire: kick(0.05, 0.1).concat([tr('str', 'z', [[0, 0.0], [0.08, -0.05], [0.3, 0], [1, 0]]), tr('bolt', 's', [[0, 0.001], [1, 0.001]])]) },
    // 7 RPG
    { groups: { rkt: [0, 0, -0.55] },
      parts: [[0.12, 0.12, 0.75, OL, 0, 0, -0.15, null, 1], [0.17, 0.17, 0.1, 0x7a7d82, 0, 0, -0.55], [0.05, 0.14, 0.07, 0x222222, 0, -0.12, -0.05], [0.15, 0.15, 0.06, 0x333333, 0, 0, 0.25], [0.02, 0.06, 0.02, ST, 0, 0.09, -0.2], [0.09, 0.09, 0.16, 0xc0392b, 0, 0, -0.64, 'rkt']],
      pos: [0.3, -0.22, -0.55], ads: [0, -0.15, -0.4], flash: [0, 0, 0.38], fireDur: 0.6,
      reload: tilt(0.3, 0.3, -0.05).concat([tr('rkt', 's', [[0, 0.001], [0.2, 0.001], [0.22, 1], [1, 1]]), tr('rkt', 'z', [[0, 0], [0.2, -0.5], [0.7, 0], [1, 0]]), tr('rkt', 'y', [[0, 0], [0.2, 0.2], [0.7, 0], [1, 0]])]),
      fire: kick(0.12, 0.28).concat([tr('rkt', 's', [[0, 0.001], [1, 0.001]])]) },
    // 8 Magnum
    { groups: { cyl: [0, 0, -0.02], sh: [0, 0, -0.02], hammer: [0, 0.055, 0.09] },
      parts: [[0.04, 0.05, 0.38, SIL, 0, 0.02, -0.25, null, 1], [0.055, 0.08, 0.18, ST, 0, 0, 0.0, null, 1], [0.07, 0.07, 0.1, 0x666666, 0, 0, -0.02, 'cyl'], [0.05, 0.12, 0.07, WD2, 0, -0.1, 0.07], [0.02, 0.03, 0.04, 0x333333, 0, 0.055, 0.09, 'hammer'], [0.025, 0.025, 0.05, 0xd4af37, 0, 0.01, -0.02, 'sh']],
      pos: [0.26, -0.25, -0.5], ads: [0, -0.125, -0.5], flash: [0, 0.03, -0.46], fireDur: 0.5,
      reload: tilt(0.55, 0.28, 0).concat([tr('cyl', 'x', [[0, 0], [0.2, -0.07], [0.8, -0.07], [1, 0]]), tr('cyl', 'rz', [[0, 0], [0.2, 0.5], [0.8, 0.5], [1, 0]]), tr('sh', 'y', [[0, 0], [0.25, 0], [0.4, 0.3], [0.5, 0.3], [0.6, 0], [1, 0]]), tr('sh', 'x', [[0, 0], [0.2, -0.07], [0.8, -0.07], [1, 0]])]),
      fire: kick(0.07, 0.3).concat([tr('hammer', 'rx', [[0, 0.5], [0.1, 0.5], [0.6, 0], [1, 0]]), tr('cyl', 'rz', [[0, 0], [0.5, 0], [1, 0.0]])]) },
    // 9 M4A1
    { groups: { mag: [0, -0.06, -0.04], bolt: [0.04, 0.05, -0.1] },
      parts: [[0.07, 0.09, 0.45, 0x2f3133, 0, 0, -0.1, null, 1], [0.055, 0.08, 0.2, 0x1f2123, 0, -0.01, 0.28], [0.075, 0.075, 0.2, 0x2a2c2e, 0, 0, -0.38, null, 1], [0.03, 0.04, 0.2, 0x2a2c2e, 0, 0.075, -0.1], [0.05, 0.14, 0.07, 0x222222, 0, -0.11, -0.04, 'mag'], [0.05, 0.1, 0.06, K, 0, -0.1, 0.08], [0.03, 0.03, 0.18, ST, 0, 0.015, -0.58], [0.02, 0.02, 0.06, ST, 0.045, 0.045, -0.1, 'bolt']],
      pos: [0.27, -0.25, -0.55], ads: [0, -0.135, -0.42], flash: [0, 0.02, -0.7], fireDur: 0.1, reload: rifleReload(), fire: kick(0.05, 0.08).concat([tr('bolt', 'z', [[0, 0], [0.25, 0.05], [0.7, 0], [1, 0]])]) },
    // 10 P90
    { groups: { mag: [0, 0.075, -0.12] },
      parts: [[0.09, 0.1, 0.42, 0x3d3d44, 0, 0, -0.08, null, 1], [0.07, 0.03, 0.3, 0x777777, 0, 0.075, -0.12, 'mag'], [0.05, 0.11, 0.06, K, 0, -0.1, 0.06], [0.03, 0.03, 0.1, ST, 0, 0.0, -0.34], [0.04, 0.07, 0.1, M, 0, -0.02, 0.2]],
      pos: [0.25, -0.24, -0.52], ads: [0, -0.13, -0.42], flash: [0, 0.0, -0.4], fireDur: 0.06,
      reload: tilt(0.4, 0.2, -0.04).concat([magSwap('mag', 0.28)]), fire: kick(0.04, 0.06) },
    // 11 Pompalı
    { groups: { pump: [0, -0.04, -0.25], sh: [0, -0.06, 0.0] },
      parts: [[0.035, 0.04, 0.6, SIL, 0, 0.02, -0.3, null, 1], [0.04, 0.035, 0.45, ST, 0, -0.025, -0.25], [0.08, 0.05, 0.16, WD2, 0, -0.04, -0.25, 'pump'], [0.08, 0.1, 0.3, WD2, 0, -0.03, 0.2], [0.07, 0.08, 0.16, 0x333333, 0, 0, 0.0], [0.03, 0.03, 0.06, 0xc0392b, 0, -0.06, 0.0, 'sh']],
      pos: [0.27, -0.25, -0.5], ads: [0, -0.125, -0.45], flash: [0, 0.02, -0.62], fireDur: 0.75,
      reload: tilt(0.4, 0.25, -0.02).concat([tr('sh', 'y', [[0, 0], [0.1, -0.08], [0.18, 0], [0.28, -0.08], [0.36, 0], [0.46, -0.08], [0.54, 0], [1, 0]]), tr('pump', 'z', [[0, 0], [0.7, 0], [0.8, 0.12], [0.9, 0], [1, 0]])]),
      fire: kick(0.09, 0.28).concat([tr('pump', 'z', [[0, 0], [0.35, 0], [0.55, 0.13], [0.8, 0], [1, 0]])]) },
    // 12 Barrett
    { groups: { mag: [0, -0.09, -0.05], bolt: [0.05, 0.04, 0.05] },
      parts: [[0.08, 0.1, 0.95, 0x3a3a3f, 0, 0, -0.25, null, 1], [0.06, 0.06, 0.3, 0x111111, 0, 0.1, -0.2], [0.07, 0.07, 0.1, 0x222222, 0, 0, -0.78], [0.07, 0.08, 0.12, 0x222222, 0, -0.09, -0.05, 'mag'], [0.08, 0.12, 0.25, M, 0, -0.02, 0.4], [0.02, 0.1, 0.02, ST, -0.04, -0.08, -0.55], [0.02, 0.02, 0.1, ST, 0.06, 0.04, 0.05, 'bolt'], [0.04, 0.04, 0.04, ST, 0.08, 0.04, 0.09, 'bolt']],
      pos: [0.26, -0.26, -0.5], ads: [0, -0.16, -0.45], flash: [0, 0, -0.9], fireDur: 1.1,
      reload: tilt(0.3, 0.25, -0.04).concat([magSwap('mag', -0.3), tr('bolt', 'rz', [[0, 0], [0.7, 0], [0.76, 1.0], [0.9, 1.0], [0.96, 0], [1, 0]]), tr('bolt', 'z', [[0, 0], [0.76, 0], [0.84, 0.14], [0.92, 0], [1, 0]])]),
      fire: kick(0.14, 0.32).concat([tr('bolt', 'rz', [[0, 0], [0.35, 0], [0.42, 1.0], [0.7, 1.0], [0.78, 0], [1, 0]]), tr('bolt', 'z', [[0, 0], [0.42, 0], [0.55, 0.14], [0.65, 0], [1, 0]])]) },
    // 13 Bomba Atar
    { groups: { cyl: [0, -0.01, -0.1] },
      parts: [[0.1, 0.1, 0.5, 0x4a4f55, 0, 0, -0.1, null, 1], [0.09, 0.09, 0.3, 0x333333, 0, 0, -0.45], [0.14, 0.14, 0.14, 0x666666, 0, -0.01, -0.1, 'cyl'], [0.05, 0.12, 0.07, K, 0, -0.11, 0.05], [0.06, 0.08, 0.2, M, 0, -0.02, 0.28]],
      pos: [0.29, -0.24, -0.55], ads: [0, -0.15, -0.42], flash: [0, 0, -0.62], fireDur: 0.4,
      reload: tilt(0.3, 0.3, -0.04).concat([tr('cyl', 'ry', [[0, 0], [0.25, 0], [0.8, 1.571], [1, 1.571]]), tr('cyl', 'x', [[0, 0], [0.15, 0.05], [0.85, 0.05], [1, 0]])]),
      fire: kick(0.1, 0.25).concat([tr('cyl', 'ry', [[0, 0], [0.6, 0.4], [1, 0.4]])]) },
    // 14 Minigun
    { groups: { spin: [0, 0, -0.4], box: [-0.12, -0.1, 0.0] },
      parts: [[0.03, 0.03, 0.5, ST, 0.04, 0.04, -0.4, 'spin'], [0.03, 0.03, 0.5, ST, -0.04, 0.04, -0.4, 'spin'], [0.03, 0.03, 0.5, ST, 0, -0.05, -0.4, 'spin'], [0.12, 0.12, 0.25, M2, 0, 0, -0.12, null, 1], [0.1, 0.14, 0.14, OL, -0.12, -0.1, 0.0, 'box'], [0.05, 0.12, 0.05, K, 0.04, -0.12, 0.0], [0.05, 0.05, 0.12, K, 0, 0.09, -0.05]],
      pos: [0.3, -0.27, -0.55], ads: [0, -0.16, -0.45], flash: [0, 0, -0.7], fireDur: 0.04,
      reload: tilt(0.2, 0.15, -0.05).concat([tr('box', 'y', [[0, 0], [0.2, 0], [0.4, -0.3], [0.6, -0.3], [0.8, 0], [1, 0]]), tr('box', 'x', [[0, 0], [0.4, -0.1], [0.6, -0.1], [0.8, 0], [1, 0]])]), fire: kick(0.02, 0.02) },
    // 15 Bıçak
    { parts: [[0.03, 0.05, 0.28, 0xd0d6dc, 0, 0, -0.3, null, 1], [0.05, 0.06, 0.14, 0x333333, 0, 0, -0.05], [0.08, 0.03, 0.03, 0x555555, 0, 0, -0.14]],
      pos: [0.28, -0.28, -0.5], fireDur: 0.32,
      fire: [tr('root', 'z', [[0, 0], [0.3, -0.35], [1, 0]]), tr('root', 'rx', [[0, 0], [0.3, 0.25], [1, 0]]), tr('root', 'ry', [[0, 0], [0.3, 0.2], [1, 0]])] },

    // 16 Balta
    { parts: [[0.04, 0.04, 0.56, WD2, 0, 0, -0.12, null, 1], [0.035, 0.2, 0.17, 0xaab2ba, 0, 0.07, -0.43], [0.03, 0.24, 0.03, 0xf0f4f8, 0, 0.07, -0.52], [0.035, 0.07, 0.07, 0x7a8088, 0, 0.07, -0.28], [0.05, 0.05, 0.1, 0x222222, 0, 0, 0.2]],
      pos: [0.3, -0.3, -0.55], fireDur: 0.6, fire: swing(-1.05, 0.35, -0.15) },
    // 17 Katana
    { parts: [[0.012, 0.04, 0.64, 0xe8f0f6, 0, 0, -0.42, null, 1], [0.075, 0.075, 0.016, 0xc9a227, 0, 0, -0.09], [0.032, 0.032, 0.22, 0x1f1f3a, 0, 0, 0.04], [0.04, 0.04, 0.03, 0xc9a227, 0, 0, 0.16], [0.012, 0.012, 0.66, 0xffffff, 0, 0.022, -0.42]],
      pos: [0.3, -0.3, -0.55], fireDur: 0.3, fire: swing(-0.6, 0.95, -0.1) },
    // 18 Lazer Tabanca
    { groups: { mag: [0, -0.15, 0.02] },
      parts: [[0.055, 0.07, 0.24, 0xdfe6ee, 0, 0.01, -0.1, null, 1], [0.02, 0.02, 0.2, 0x35e0ff, 0, 0.05, -0.1], [0.04, 0.04, 0.06, 0x35e0ff, 0, 0.01, -0.25], [0.05, 0.12, 0.06, 0x2b2f36, 0, -0.09, 0.03], [0.04, 0.05, 0.07, 0x35e0ff, 0, -0.15, 0.02, 'mag']],
      pos: [0.26, -0.24, -0.55], ads: [0, -0.115, -0.5], flash: [0, 0.02, -0.28], fireDur: 0.2,
      reload: tilt(0.5, 0.3, 0).concat([magSwap('mag', -0.25)]), fire: kick(0.03, 0.08) },
    // 19 Desert Eagle
    { groups: { slide: [0, 0.03, -0.12], mag: [0, -0.15, 0.0] },
      parts: [[0.06, 0.055, 0.32, 0xc3c8ce, 0, 0.03, -0.12, 'slide', 1], [0.06, 0.045, 0.28, 0x2a2a2c, 0, -0.015, -0.1], [0.055, 0.14, 0.075, 0x1f1f21, 0, -0.1, 0.03], [0.045, 0.05, 0.06, 0x666666, 0, -0.17, 0.02, 'mag'], [0.03, 0.02, 0.2, 0x111111, 0, 0.065, -0.14]],
      pos: [0.26, -0.24, -0.55], ads: [0, -0.12, -0.5], flash: [0, 0.03, -0.3], fireDur: 0.5,
      reload: tilt(0.5, 0.3, 0).concat([magSwap('mag', -0.25), tr('slide', 'z', [[0, 0], [0.75, 0], [0.85, 0.07], [0.95, 0], [1, 0]])]), fire: kick(0.08, 0.28).concat([slide('slide', 0.1)]) },
    // 20 SCAR-H
    { groups: { mag: [0, -0.06, -0.06], bolt: [0.04, 0.04, -0.05] },
      parts: [[0.075, 0.09, 0.5, 0xb59a68, 0, 0, -0.1, null, 1], [0.07, 0.07, 0.26, 0x8f7a50, 0, 0, -0.47], [0.06, 0.1, 0.22, 0x4a3f2a, 0, -0.01, 0.3], [0.03, 0.03, 0.34, 0x222222, 0, 0.07, -0.18], [0.05, 0.15, 0.07, K, 0, -0.11, -0.06, 'mag'], [0.05, 0.1, 0.06, K, 0, -0.1, 0.1], [0.03, 0.03, 0.14, ST, 0, 0.01, -0.68], [0.02, 0.02, 0.06, ST, 0.045, 0.04, -0.05, 'bolt']],
      pos: [0.27, -0.25, -0.55], ads: [0, -0.135, -0.42], flash: [0, 0.01, -0.76], fireDur: 0.13, reload: rifleReload(), fire: kick(0.07, 0.12).concat([tr('bolt', 'z', [[0, 0], [0.2, 0.05], [0.6, 0], [1, 0]])]) },
    // 21 Vektör
    { groups: { mag: [0, -0.14, 0.0] },
      parts: [[0.08, 0.1, 0.32, 0x1a1a1d, 0, 0, -0.08, null, 1], [0.03, 0.025, 0.26, 0xd9a521, 0, 0.065, -0.08], [0.06, 0.06, 0.14, M2, 0, 0, -0.3], [0.04, 0.18, 0.06, 0x333338, 0, -0.14, 0.0, 'mag'], [0.03, 0.08, 0.03, K, 0, -0.07, -0.24], [0.03, 0.03, 0.2, M, 0, 0.01, 0.22]],
      pos: [0.25, -0.24, -0.52], ads: [0, -0.125, -0.42], flash: [0, 0.0, -0.38], fireDur: 0.05,
      reload: tilt(0.4, 0.2, -0.04).concat([magSwap('mag', -0.28)]), fire: kick(0.03, 0.05) },
    // 22 Thompson
    { groups: { mag: [0, -0.1, -0.05] },
      parts: [[0.07, 0.09, 0.4, M, 0, 0, -0.1, null, 1], [0.075, 0.06, 0.18, WD, 0, -0.02, -0.32], [0.06, 0.1, 0.26, WD, 0, -0.02, 0.28], [0.1, 0.1, 0.07, M2, 0, -0.1, -0.05, 'mag'], [0.03, 0.03, 0.18, ST, 0, 0.01, -0.52], [0.03, 0.1, 0.03, WD, 0, -0.1, -0.28], [0.05, 0.08, 0.05, K, 0, -0.08, 0.1]],
      pos: [0.26, -0.25, -0.53], ads: [0, -0.13, -0.43], flash: [0, 0.01, -0.62], fireDur: 0.08,
      reload: tilt(0.4, 0.2, -0.04).concat([magSwap('mag', -0.3)]), fire: kick(0.05, 0.08) },
    // 23 Dragunov
    { groups: { mag: [0, -0.07, -0.05], bolt: [0.04, 0.03, 0.0] },
      parts: [[0.05, 0.08, 0.7, 0x5a4a32, 0, 0, -0.15, null, 1], [0.03, 0.03, 0.3, ST, 0, 0.01, -0.62], [0.045, 0.05, 0.22, 0x111111, 0, 0.085, -0.08], [0.05, 0.1, 0.24, WD, 0, -0.02, 0.32], [0.04, 0.12, 0.06, 0x2a2a2c, 0, -0.07, -0.05, 'mag'], [0.02, 0.02, 0.08, ST, 0.04, 0.03, 0.0, 'bolt']],
      pos: [0.25, -0.24, -0.5], ads: [0, -0.15, -0.45], flash: [0, 0.01, -0.8], fireDur: 0.5,
      reload: tilt(0.3, 0.22, -0.03).concat([magSwap('mag', -0.25), tr('bolt', 'z', [[0, 0], [0.8, 0], [0.88, 0.1], [0.96, 0], [1, 0]])]), fire: kick(0.09, 0.2).concat([tr('bolt', 'z', [[0, 0], [0.2, 0.06], [0.6, 0], [1, 0]])]) },
    // 24 Plazma Tüfeği
    { groups: { cell: [0, -0.1, -0.05] },
      parts: [[0.09, 0.1, 0.5, 0xe9eef5, 0, 0, -0.1, null, 1], [0.05, 0.06, 0.18, 0x35ffb0, 0, 0.035, -0.12], [0.11, 0.11, 0.04, 0x2a3a4a, 0, 0, -0.4], [0.11, 0.11, 0.04, 0x2a3a4a, 0, 0, -0.5], [0.06, 0.06, 0.08, 0x35ffb0, 0, 0, -0.6], [0.05, 0.1, 0.06, 0x2b2f36, 0, -0.1, 0.1], [0.07, 0.09, 0.2, 0xc7d0da, 0, -0.01, 0.3], [0.06, 0.12, 0.08, 0x35ffb0, 0, -0.1, -0.05, 'cell']],
      pos: [0.27, -0.25, -0.55], ads: [0, -0.135, -0.43], flash: [0, 0.0, -0.66], fireDur: 0.09,
      reload: tilt(0.4, 0.2, -0.04).concat([magSwap('cell', -0.3)]), fire: kick(0.04, 0.06) },
    // 25 AA-12
    { groups: { drum: [0, -0.11, -0.05], bolt: [0.04, 0.04, -0.02] },
      parts: [[0.08, 0.09, 0.5, 0x2d2f33, 0, 0, -0.1, null, 1], [0.035, 0.035, 0.3, ST, 0, 0.01, -0.55], [0.09, 0.14, 0.1, 0x444448, 0, -0.11, -0.05, 'drum'], [0.06, 0.09, 0.25, M, 0, -0.01, 0.3], [0.05, 0.1, 0.06, K, 0, -0.1, 0.1], [0.09, 0.02, 0.1, 0xff6a00, 0, 0.05, -0.3], [0.02, 0.02, 0.06, ST, 0.045, 0.04, -0.02, 'bolt']],
      pos: [0.27, -0.25, -0.53], ads: [0, -0.13, -0.43], flash: [0, 0.01, -0.72], fireDur: 0.19,
      reload: rifleReload().slice(0, 3).concat([magSwap('drum', -0.3)]).filter((t) => t.g !== 'mag'), fire: kick(0.08, 0.18).concat([tr('bolt', 'z', [[0, 0], [0.2, 0.05], [0.6, 0], [1, 0]])]) },
    // 26 Yay
    { groups: { str: [0, 0, 0.05], arrow: [0, 0, -0.12] },
      parts: [[0.03, 0.14, 0.04, WD2, 0, 0, 0.0, null, 1], [0.025, 0.1, 0.03, WD, 0, 0.12, -0.02], [0.025, 0.1, 0.03, WD, 0, 0.2, -0.07], [0.025, 0.1, 0.03, WD, 0, -0.12, -0.02], [0.025, 0.1, 0.03, WD, 0, -0.2, -0.07], [0.008, 0.46, 0.008, 0xeeeeee, 0, 0, 0.05, 'str'], [0.014, 0.014, 0.46, 0xcfa86a, 0, 0, -0.12, 'arrow'], [0.026, 0.026, 0.05, 0xcccccc, 0, 0, -0.37, 'arrow'], [0.05, 0.01, 0.06, 0xe53935, 0, 0, 0.08, 'arrow']],
      pos: [0.24, -0.24, -0.5], ads: [0, -0.1, -0.45], flash: [0, 0, -0.4], fireDur: 0.4,
      reload: tilt(0.25, 0.15, 0).concat([tr('arrow', 's', [[0, 0.001], [0.3, 0.001], [0.45, 1], [1, 1]]), tr('arrow', 'z', [[0, 0], [0.5, 0], [0.85, 0.1], [1, 0.1]]), tr('str', 'z', [[0, 0], [0.5, 0], [0.85, 0.1], [1, 0.1]])]),
      fire: kick(0.04, 0.08).concat([tr('arrow', 's', [[0, 0.001], [1, 0.001]]), tr('str', 'z', [[0, 0.1], [0.15, -0.02], [0.4, 0], [1, 0]])]) },
    // 27 Altın AK (AK-47'nin altın sürümü)
    null,
  ];
  // 27: AK-47'yi altınla kaplanmış hâliyle üret
  (function () {
    const src = DEFS[2], gold = (c) => { const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255, l = (r + g + b) / 3; return l < 0x50 ? 0xb8860b : r > g + 20 ? 0xffe28a : 0xe3b52a; };
    DEFS[27] = Object.assign({}, src, { parts: src.parts.map((p) => { const q = p.slice(); q[3] = gold(q[3]); q[8] = 1; return q; }) });
  })();
  // 28-31: yeni bıçaklar (karambit, kelebek, pala, plazma kılıcı)
  DEFS.push(
    // 28 Karambit: kavisli kanca ağızlı, halkalı sap
    { parts: [[0.036, 0.036, 0.17, 0x2a2a30, 0, 0, 0.065, null, 1], [0.012, 0.05, 0.09, 0xe8f0f6, 0, 0, -0.05], [0.012, 0.046, 0.07, 0xe8f0f6, 0, -0.012, -0.125], [0.012, 0.04, 0.05, 0xe8f0f6, 0, -0.03, -0.17], [0.012, 0.03, 0.035, 0xffffff, 0, -0.055, -0.205],
      [0.012, 0.012, 0.085, 0x9aa3ad, 0, 0.012, 0.185], [0.012, 0.012, 0.085, 0x9aa3ad, 0, -0.062, 0.185], [0.012, 0.086, 0.012, 0x9aa3ad, 0, -0.025, 0.2], [0.014, 0.014, 0.1, 0xb8302a, 0, 0.024, -0.05]],
      pos: [0.3, -0.3, -0.55], fireDur: 0.26, fire: swing(-0.9, 0.7, -0.12) },
    // 29 Kelebek bıçağı: iki parçalı açılır sap
    { parts: [[0.016, 0.034, 0.22, 0x7a7d82, -0.03, 0, 0.11, null, 1], [0.016, 0.034, 0.22, 0x7a7d82, 0.03, 0, 0.11, null, 1], [0.076, 0.034, 0.03, 0x555a60, 0, 0, 0.0], [0.012, 0.07, 0.2, 0xe8f0f6, 0, 0.004, -0.11], [0.012, 0.05, 0.05, 0xffffff, 0, 0.0, -0.235], [0.014, 0.012, 0.2, 0xb8302a, 0, 0.042, -0.11], [0.05, 0.034, 0.02, 0x9aa3ad, 0, 0, 0.215]],
      pos: [0.3, -0.3, -0.55], fireDur: 0.3, fire: swing(-0.7, 1.2, -0.1).concat([tr('root', 'rz', [[0, 0], [0.3, 0.9], [0.7, -0.3], [1, 0]])]) },
    // 30 Pala (kukri): kalın, öne doğru genişleyen ağır bıçak
    { parts: [[0.042, 0.042, 0.2, 0x7a4d24, 0, 0, 0.1, null, 1], [0.075, 0.06, 0.02, 0xc9a227, 0, 0, -0.005], [0.02, 0.05, 0.15, 0xdfe6ee, 0, 0, -0.085], [0.02, 0.078, 0.14, 0xdfe6ee, 0, 0.014, -0.225], [0.02, 0.064, 0.09, 0xdfe6ee, 0, 0.024, -0.34], [0.02, 0.04, 0.05, 0xffffff, 0, 0.034, -0.41], [0.022, 0.012, 0.36, 0x9aa3ad, 0, 0.056, -0.23]],
      pos: [0.3, -0.3, -0.55], fireDur: 0.5, fire: swing(-1.0, 0.4, -0.15) },
    // 31 Plazma kılıcı: parlayan enerji ağzı
    { parts: [[0.036, 0.036, 0.22, 0x2b2b30, 0, 0, 0.11, null, 1], [0.07, 0.022, 0.04, 0x9aa3ad, 0, 0, -0.005], [0.02, 0.02, 0.7, 0xffffff, 0, 0, -0.37, null, 0, 1], [0.042, 0.042, 0.7, 0x35e0ff, 0, 0, -0.37, null, 1, 1], [0.04, 0.04, 0.03, 0x9aa3ad, 0, 0, 0.225]],
      pos: [0.3, -0.3, -0.55], fireDur: 0.32, fire: swing(-0.6, 1.0, -0.1) },
  );
  // Küçük boşluklar yüzünden havada kalan parçaları (arpacık, dipçik, namlu ucu, süs parçaları) komşusuna birleştir.
  // from: bu indisten sonraki parçalar büyütülebilir (öncekiler sabit kalır)
  function weldParts(P, from) {
    const box = (p) => ({ lo: [p[4] - p[0] / 2, p[5] - p[1] / 2, p[6] - p[2] / 2], hi: [p[4] + p[0] / 2, p[5] + p[1] / 2, p[6] + p[2] / 2] });
    const gap = (a, b) => { const g = [0, 0, 0]; for (let k = 0; k < 3; k++) { if (a.lo[k] > b.hi[k]) g[k] = a.lo[k] - b.hi[k]; else if (b.lo[k] > a.hi[k]) g[k] = -(b.lo[k] - a.hi[k]); } return g; };
    for (let iter = 0; iter < 8; iter++) {
      const B = P.map(box), seen = new Set([0]), q = [0];
      const touch = (i, j) => { const g = gap(B[i], B[j]); return Math.abs(g[0]) <= 0.004 && Math.abs(g[1]) <= 0.004 && Math.abs(g[2]) <= 0.004; };
      while (q.length) { const i = q.pop(); for (let j = 0; j < P.length; j++) if (!seen.has(j) && touch(i, j)) { seen.add(j); q.push(j); } }
      let changed = false;
      for (let j = from; j < P.length; j++) {
        if (seen.has(j)) continue;
        let best = null;
        for (const i of seen) { const g = gap(B[j], B[i]), m = Math.max(Math.abs(g[0]), Math.abs(g[1]), Math.abs(g[2])); if (!best || m < best.m) best = { m, g }; }
        if (best && best.m <= 0.075) {
          const part = P[j];
          for (let k = 0; k < 3; k++) { const gk = best.g[k]; if (gk === 0) continue; const grow = Math.abs(gk) + 0.006; part[k] += grow; part[4 + k] += (gk > 0 ? -1 : 1) * grow / 2; }
          changed = true;
        }
      }
      if (!changed) break;
    }
  }
  for (const d of DEFS) weldParts(d.parts, 0);
  const DRAW = [tr('root', 'y', [[0, -0.45], [1, 0]]), tr('root', 'rx', [[0, -0.7], [1, 0]]), tr('root', 'rz', [[0, 0.35], [1, 0]])];
  const FLASH_FREE = { 0: 1, 15: 1, 16: 1, 17: 1, 28: 1, 29: 1, 30: 1, 31: 1 };
  const MELEE_SET = FLASH_FREE;
  // Pixel Gun tarzı nadirlik: 0 sıradan, 1 nadir, 2 epik, 3 efsanevi (renkli şerit, parlayan uç, halo)
  const RARITY = { 0: 0, 15: 0, 1: 0, 2: 0, 3: 0, 4: 0, 8: 1, 5: 1, 9: 1, 11: 1, 10: 2, 6: 2, 13: 2, 7: 3, 12: 3, 14: 3, 16: 1, 17: 2, 18: 2, 19: 1, 20: 1, 21: 1, 22: 1, 23: 2, 24: 3, 25: 2, 26: 2, 27: 3, 28: 2, 29: 3, 30: 1, 31: 3 };
  const RARITY_INFO = [{ name: 'Sıradan', color: 0x9aa3ad }, { name: 'Nadir', color: 0x4fc3f7 }, { name: 'Epik', color: 0xc66bff }, { name: 'Efsanevi', color: 0xffc400 }];
  const bmat = {};
  const basic = (c, o) => { const k = c + '_' + (o || 1); return bmat[k] || (bmat[k] = new T.MeshBasicMaterial(o ? { color: c, transparent: true, opacity: o, depthWrite: false } : { color: c })); };

  function sample(k, t) {
    if (t <= k[0][0]) return k[0][1];
    for (let i = 1; i < k.length; i++) {
      if (t <= k[i][0]) { const a = k[i - 1], b = k[i], u = (t - a[0]) / (b[0] - a[0] || 1), s = u * u * (3 - 2 * u); return a[1] + (b[1] - a[1]) * s; }
    }
    return k[k.length - 1][1];
  }


  // ---------- koleksiyon şekilleri (silahın kendi ölçülerine göre, gövdeye değen parçalar) ----------
  const CL = (root.VColls && root.VColls.LIST) || [{ name: 'Yok' }];
  const MOVING = { mag: 1, bolt: 1, spin: 1, box: 1 }; // oynayan gruplara şekil eklenmez
  function loc1(P, z) { // tek konumda gövde yarı genişliği ve üst/alt
    for (let k = 0; k < 12; k++) for (const sgn of k ? [1, -1] : [1]) {
      const zz = z + sgn * k * 0.02; let wl = 0, wr = 0, top = -1e9, bot = 1e9, hit = false;
      for (const p of P) { if (MOVING[p[7]]) continue; if (zz >= p[6] - p[2] / 2 - 0.004 && zz <= p[6] + p[2] / 2 + 0.004) { hit = true; wr = Math.max(wr, p[4] + p[0] / 2); wl = Math.max(wl, -(p[4] - p[0] / 2)); top = Math.max(top, p[5] + p[1] / 2); bot = Math.min(bot, p[5] - p[1] / 2); } }
      if (hit) return { wl, wr, top, bot };
    }
    return { wl: 0.03, wr: 0.03, top: 0.03, bot: -0.03 };
  }
  // parçanın kapladığı aralıkta: dar genişlik (gövdeye gömülür), en yüksek üst (hiçbir yerde havada kalmaz)
  function loc(P, z, half) {
    const h = half || 0, a = loc1(P, z - h), b = loc1(P, z), c = loc1(P, z + h);
    const wl = Math.max(0.004, Math.min(a.wl, b.wl, c.wl)), wr = Math.max(0.004, Math.min(a.wr, b.wr, c.wr));
    return { wl, wr, w: Math.min(wl, wr), at: (s) => (s > 0 ? wr : wl), top: Math.max(a.top, b.top, c.top), bot: Math.min(a.bot, b.bot, c.bot) };
  }
  const decorCache = {};
  function decor(wi, ci) {
    const key = wi + '_' + ci; if (decorCache[key]) return decorCache[key];
    const C = CL[ci], P = DEFS[wi].parts, out = [], melee = !!MELEE_SET[wi];
    let z0 = 1e9, z1 = -1e9; for (const p of P) { if (MOVING[p[7]]) continue; z0 = Math.min(z0, p[6] - p[2] / 2); z1 = Math.max(z1, p[6] + p[2] / 2); }
    const L = z1 - z0, zm = (z0 + z1) / 2;
    const add = (sx, sy, sz, col, x, y, z, glow) => out.push([sx, sy, sz, col, x, y, z, null, 0, glow ? 1 : 0, 1]);
    const topY = (z, h, half) => loc(P, z, half || 0.02).top + h / 2 - 0.002;
    const OPS = {
      rail() { const n = Math.max(2, Math.round(L * 0.7 / 0.06)); for (let i = 0; i < n; i++) { const z = z0 + L * 0.12 + (L * 0.66) * i / (n - 1); add(0.012, 0.012, 0.064, C.glow, 0, topY(z, 0.012, 0.032), z, 1); } },
      stripes() { const n = Math.max(2, Math.round(L * 0.5 / 0.07)); for (const s of [-1, 1]) for (let i = 0; i < n; i++) { const z = z0 + L * 0.25 + (L * 0.45) * i / (n - 1), l = loc(P, z, 0.037); add(0.01, 0.014, 0.074, C.glow, s * (l.at(s) + 0.003), (l.top + l.bot) / 2, z, 1); } },
      spikes(n) { for (let i = 0; i < n; i++) { const z = z0 + L * (0.16 + 0.6 * i / Math.max(1, n - 1)); add(0.012, 0.034, 0.014, C.accent, 0, topY(z, 0.034, 0.007), z); } },
      fins() { for (const s of [-1, 1]) { const z = z1 - 0.07, l = loc(P, z, 0.025); add(0.01, 0.07, 0.05, C.accent, s * (l.at(s) + 0.003), l.top + 0.025, z); add(0.01, 0.04, 0.036, C.accent, s * (l.at(s) + 0.003), l.top + 0.075, z + 0.014); } },
      ring() { if (melee) return; const z = z0 + 0.04, l = loc(P, z, 0.011), hh = (l.top - l.bot) / 2 + 0.014, yc = (l.top + l.bot) / 2, ww = l.w + 0.014;
        add(ww * 2, 0.012, 0.022, C.accent, 0, yc + hh - 0.006, z); add(ww * 2, 0.012, 0.022, C.accent, 0, yc - hh + 0.006, z);
        for (const s of [-1, 1]) add(0.012, hh * 2, 0.022, C.accent, s * (ww - 0.006), yc, z); },
      charm() { const z = z1 - 0.03, l = loc(P, z, 0.004); add(0.008, 0.05, 0.008, C.accent, 0, l.bot - 0.022, z); add(0.026, 0.026, 0.026, C.glow, 0, l.bot - 0.062, z, 1); },
      crystal() { const z = z0 + 0.1, l = loc(P, z, 0.004); add(0.008, 0.04, 0.008, C.accent, 0, l.top + 0.018, z); add(0.034, 0.034, 0.034, C.glow, 0, l.top + 0.052, z, 1); },
      horns() { for (const s of [-1, 1]) { const z = z0 + 0.06, l = loc(P, z, 0.015), x = s * (l.at(s) + 0.005), y = (l.top + l.bot) / 2;
        add(0.014, 0.04, 0.03, C.accent, x, y + 0.01, z); add(0.012, 0.04, 0.026, C.accent, x + s * 0.008, y + 0.045, z - 0.012); add(0.01, 0.03, 0.02, C.accent, x + s * 0.015, y + 0.078, z - 0.022); } },
      wings() { for (const s of [-1, 1]) { const zc = zm, len = L * 0.3, l = loc(P, zc, len / 2), y = (l.top + l.bot) / 2;
        add(0.008, (l.top - l.bot) * 0.8 + 0.02, len, C.accent, s * (l.at(s) + 0.002), y + 0.012, zc); add(0.008, 0.05, len * 0.7, C.accent, s * (l.at(s) + 0.009), y + 0.04, zc + len * 0.1); } },
      shroud() { if (melee) return; const z = z0 + 0.08, l = loc(P, z, 0.06); add(l.w * 2 + 0.016, (l.top - l.bot) + 0.016, 0.12, C.main, 0, (l.top + l.bot) / 2, z); },
      crown() { const z = z0 + 0.02, l = loc(P, z, 0.006), dx = Math.min(0.018, Math.max(0, l.w - 0.005)); for (const x of dx ? [-dx, 0, dx] : [0]) { const h = x === 0 ? 0.045 : 0.03; add(0.01, h, 0.012, C.accent, x, l.top + h / 2 - 0.002, z); } },
      frags() { [-0.25, 0, 0.2, -0.05, 0.3].forEach((f, i) => { const z = zm + L * f, l = loc(P, z, 0.013), s = i % 2 ? 1 : -1, sz = 0.02 + 0.01 * (i % 3), k = [0.8, 0.3, 0.6, 0.15, 0.5][i];
        add(sz, 0.022, 0.026, i % 2 ? C.glow : C.accent, s * (l.at(s) + sz / 2 - 0.003), l.bot + (l.top - l.bot) * k, z, i % 2); }); },
    };
    for (const [name, a] of C.ops) if (OPS[name]) OPS[name](a);
    const all = P.concat(out); weldParts(all, P.length); // süs parçaları da gövdeye bağlanır
    return (decorCache[key] = out);
  }
  // koleksiyon rengi: tahta/çelik gibi orta tonlu gövde parçaları koleksiyon rengine karışır (koyu metal ve parlayan parçalar kalır)
  function shade(c, ci) {
    const C = CL[ci]; if (!C || C.main == null) return c;
    const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255; if ((r + g + b) / 3 < 48) return c;
    const m = C.main, k = 0.55, mr = (m >> 16) & 255, mg = (m >> 8) & 255, mb = m & 255;
    return (Math.round(r + (mr - r) * k) << 16) | (Math.round(g + (mg - g) * k) << 8) | Math.round(b + (mb - b) * k);
  }
  const partColor = (p, tint, ci) => (p[9] || p[10] ? p[3] : p[8] && tint != null ? tint : ci > 0 ? shade(p[3], ci) : p[3]);
  const partsFor = (wi, ci) => (ci > 0 && CL[ci] && CL[ci].ops ? DEFS[wi].parts.concat(decor(wi, ci)) : DEFS[wi].parts);

  function makeGun(wi, tint, ci) {
    const d = DEFS[wi], g = new T.Group(), ud = { groups: {} };
    ci = ci | 0; if (ci > 0 && CL[ci] && CL[ci].main != null) tint = CL[ci].main;
    const grp = (name) => {
      if (!ud.groups[name]) { const o = new T.Group(), piv = d.groups[name]; o.position.set(piv[0], piv[1], piv[2]); g.add(o); ud.groups[name] = { obj: o, piv }; }
      return ud.groups[name];
    };
    for (const p of partsFor(wi, ci)) {
      const col = partColor(p, tint, ci);
      const m = new T.Mesh(geo, p[9] ? basic(col) : mat(col)); m.scale.set(p[0], p[1], p[2]);
      if (p[7]) { const G = grp(p[7]); m.position.set(p[4] - G.piv[0], p[5] - G.piv[1], p[6] - G.piv[2]); G.obj.add(m); }
      else { m.position.set(p[4], p[5], p[6]); g.add(m); }
    }
    const r = RARITY[wi] | 0;
    if (r > 0 && d.parts.length) {
      const b = d.parts[0], c = RARITY_INFO[r].color, add = (sx, sy, sz, x, y, z, o) => { const m = new T.Mesh(geo, basic(c, o)); m.scale.set(sx, sy, sz); m.position.set(x, y, z); g.add(m); };
      add(0.014, 0.014, b[2] * 0.82, b[4], b[5] + b[1] / 2 + 0.008, b[6]);
      if (r >= 2) { add(0.012, 0.012, b[2] * 0.6, b[4] + b[0] / 2 + 0.006, b[5], b[6]); add(0.012, 0.012, b[2] * 0.6, b[4] - b[0] / 2 - 0.006, b[5], b[6]); }
      if (r >= 2 && d.flash) add(0.03, 0.03, 0.03, d.flash[0], d.flash[1], d.flash[2] + 0.05);
      if (r >= 3) add(b[0] * 1.5, b[1] * 1.5, b[2] * 1.08, b[4], b[5], b[6], 0.16);
    }
    g.userData = ud;
    return g;
  }

  // st: {reload, fire, draw: 0..1 veya null, spin: radyan}; dönen değer: gövde kayması
  function pose(g, wi, st) {
    const d = DEFS[wi], ud = g.userData, out = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 };
    for (const k in ud.groups) { const G = ud.groups[k]; G.obj.position.set(G.piv[0], G.piv[1], G.piv[2]); G.obj.rotation.set(0, 0, 0); G.obj.scale.set(1, 1, 1); }
    const run = (tracks, t) => {
      if (!tracks || t == null) return;
      for (const tk of tracks) {
        const v = sample(tk.k, t);
        if (tk.g === 'root') { out[tk.ch] += v; continue; }
        const G = ud.groups[tk.g]; if (!G) continue;
        if (tk.ch === 's') G.obj.scale.set(v, v, v);
        else if (tk.ch.length === 1) G.obj.position[tk.ch] += v;
        else G.obj.rotation[tk.ch[1]] += v;
      }
    };
    run(DRAW, st.draw); run(d.reload, st.reload); run(d.fire, st.fire);
    if (ud.groups.spin) ud.groups.spin.obj.rotation.z = st.spin || 0;
    return out;
  }

  root.VWeapons = { DEFS, RARITY, RARITY_INFO, makeGun, pose, partsFor, partColor, isMelee: (wi) => !!MELEE_SET[wi], hasFlash: (wi) => !FLASH_FREE[wi] };
})(typeof self !== 'undefined' ? self : this);
