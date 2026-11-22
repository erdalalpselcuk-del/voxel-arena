// Mobil / dokunmatik kontroller: sol yarıda kayan sanal joystick (hareket), sağ yarıda sürükleyerek bakış,
// sağ altta ATEŞ ve diğer düğmeler. client.js içindeki TOUCH, tj, me, tryFire... global değişkenlerini kullanır.
(function () {
  'use strict';
  const T = window.VA && window.VA.T; if (!T || !T.TOUCH) return;
  const { tj, keys, WP, S, me, tryFire, setZoom, reload, cycleWeapon, throwNade, dash, refreshBoard, onLockChange } = T;
  const $ = (id) => document.getElementById(id);
  const root = $('touch'); if (!root) return;
  const R = 58; // joystick yarıçapı (px)
  let joyId = null, joyX = 0, joyY = 0, lookId = null, lx = 0, ly = 0, fireId = null;
  const ok = () => T.locked && me.alive;

  function enterFull() {
    try { const d = document.documentElement; if (!document.fullscreenElement && d.requestFullscreen) d.requestFullscreen({ navigationUI: 'hide' }).catch(() => {}); } catch (e) {}
    try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } catch (e) {}
  }
  window.VTouch = { enterFull };

  const base = $('tJoy'), knob = $('tKnob');
  function joyMove(x, y) {
    let dx = x - joyX, dy = y - joyY; const d = Math.hypot(dx, dy);
    if (d > R) { dx = dx / d * R; dy = dy / d * R; }
    knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    const m = Math.hypot(dx, dy) / R;
    if (m < 0.18) { tj.x = tj.y = 0; tj.sprint = false; return; }
    tj.x = dx / R; tj.y = -dy / R; tj.sprint = m > 0.96 && tj.y > 0.6;
  }
  function joyEnd() { joyId = null; tj.x = tj.y = 0; tj.sprint = false; base.style.display = 'none'; }

  function down(e) {
    for (const t of e.changedTouches) {
      if (t.target.closest && t.target.closest('.tb')) continue;
      if (joyId == null && t.clientX < innerWidth * 0.45) { joyId = t.identifier; joyX = t.clientX; joyY = t.clientY; base.style.display = 'block'; base.style.left = joyX + 'px'; base.style.top = joyY + 'px'; knob.style.transform = 'translate(0,0)'; }
      else if (lookId == null && t.clientX >= innerWidth * 0.3) { lookId = t.identifier; lx = t.clientX; ly = t.clientY; }
    }
    e.preventDefault();
  }
  function move(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === joyId) joyMove(t.clientX, t.clientY);
      else if (t.identifier === lookId && ok()) {
        const dx = t.clientX - lx, dy = t.clientY - ly; lx = t.clientX; ly = t.clientY;
        const sc = me.zoom ? (WP[me.w].zoom && WP[me.w].zoom < 30 ? 0.0018 : 0.003) : 0.0048, k = sc * S().sens;
        me.yaw -= dx * k; me.pitch = Math.max(-1.55, Math.min(1.55, me.pitch - dy * k));
        me.swayX = Math.max(-1, Math.min(1, me.swayX + dx * 0.004)); me.swayY = Math.max(-1, Math.min(1, me.swayY + dy * 0.004));
      } else if (t.identifier === fireId && ok()) { // ateş parmağını kaydırarak da nişan al
        const dx = t.clientX - lx, dy = t.clientY - ly; lx = t.clientX; ly = t.clientY;
        const k = (me.zoom ? 0.003 : 0.0048) * S().sens * 0.6; me.yaw -= dx * k; me.pitch = Math.max(-1.55, Math.min(1.55, me.pitch - dy * k));
      }
    }
    e.preventDefault();
  }
  function up(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === joyId) joyEnd();
      if (t.identifier === lookId) lookId = null;
      if (t.identifier === fireId) { fireId = null; T.mouseDown = false; $('tFire').classList.remove('on'); }
    }
    e.preventDefault();
  }
  root.addEventListener('touchstart', down, { passive: false });
  root.addEventListener('touchmove', move, { passive: false });
  root.addEventListener('touchend', up, { passive: false });
  root.addEventListener('touchcancel', up, { passive: false });

  // düğmeler
  const press = (id, fn, release) => {
    const b = $(id); if (!b) return;
    b.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); b.classList.add('on'); if (!document.fullscreenElement) enterFull(); if (ok() || id === 'tMenu') fn(e); }, { passive: false });
    const end = (e) => { e.preventDefault(); e.stopPropagation(); if (release) release(e); if (!b.dataset.toggle) b.classList.remove('on'); };
    b.addEventListener('touchend', end, { passive: false }); b.addEventListener('touchcancel', end, { passive: false });
  };
  // ATEŞ: basılı tutunca otomatik silahlar sürekli ateş eder; parmak kayarsa nişan da alınır
  const fb = $('tFire');
  fb.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); if (!ok()) return; const t = e.changedTouches[0]; fireId = t.identifier; lx = t.clientX; ly = t.clientY; fb.classList.add('on'); T.mouseDown = true; tryFire(); }, { passive: false });
  const fEnd = (e) => { e.preventDefault(); e.stopPropagation(); for (const t of e.changedTouches) if (t.identifier === fireId) { fireId = null; T.mouseDown = false; fb.classList.remove('on'); } };
  fb.addEventListener('touchend', fEnd, { passive: false }); fb.addEventListener('touchcancel', fEnd, { passive: false });

  press('tJump', () => { keys.Space = true; }, () => { keys.Space = false; });
  press('tCrouch', () => { tj.crouch = !tj.crouch; $('tCrouch').classList.toggle('on', tj.crouch); $('tCrouch').dataset.toggle = tj.crouch ? '1' : ''; });
  press('tAim', () => { setZoom(!me.zoom); $('tAim').classList.toggle('on', me.zoom); $('tAim').dataset.toggle = me.zoom ? '1' : ''; });
  press('tReload', () => reload());
  press('tNext', () => cycleWeapon(1));
  press('tPrev', () => cycleWeapon(-1));
  press('tNade', () => throwNade());
  press('tDash', () => dash());
  press('tBoard', () => { const b = $('board'); const show = b.style.display !== 'block'; b.style.display = show ? 'block' : 'none'; if (show) refreshBoard(); });
  press('tMenu', () => { onLockChange(false); });
  // yeniden doğunca / duraklatınca durumları sıfırla
  setInterval(() => { if (!me.alive || T.paused) { tj.crouch = false; $('tCrouch').classList.remove('on'); $('tCrouch').dataset.toggle = ''; joyEnd(); T.mouseDown = false; } if (!me.zoom) { $('tAim').classList.remove('on'); $('tAim').dataset.toggle = ''; } }, 250);
})();
