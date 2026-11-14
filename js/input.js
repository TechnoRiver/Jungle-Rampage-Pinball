/* Jungle Rampage Pinball v3 - keyboard (remappable), touch/mouse, two-finger and shake nudge. */
(function () {
  'use strict';
  var JR = window.JR, T = window.TABLE, G = JR.G, RL = JR.rules, AU = JR.Audio, ST = JR.Settings, canvas = JR.canvas;
  // on-canvas buttons, kept in the top corners, away from the flipper thumbs
  var BUTTONS = { mute: [62, 62], settings: [930, 62], pause: [1020, 62] };
  JR.BUTTONS = BUTTONS;
  var held = {};
  function primary() {
    if (G.mode === 'attract' || (G.mode === 'over' && G.endT > 1.5)) { RL.startGame(); return true; }
    return false;
  }
  function togglePause() { if (G.mode === 'attract' || G.mode === 'entry') return; G.paused = !G.paused; if (G.paused) { RL.flip('L', false); RL.flip('R', false); } }
  JR.input = { togglePause: togglePause, primary: primary };

  window.addEventListener('keydown', function (e) {
    if (!JR.booted) return;                         // ignore keys until the boot screen launches the table
    if (JR.ui && JR.ui.onKey(e)) return;            // settings panel / key capture
    var a = ST.actionFor(e.code);
    if (a) e.preventDefault();
    if (held[e.code]) return; held[e.code] = true;
    AU.unlock();
    if (G.mode === 'entry') {
      if (a === 'left') RL.entryInput('prev'); else if (a === 'right') RL.entryInput('next');
      else if (a === 'launch' || a === 'start') RL.entryInput('ok');
      return;
    }
    switch (a) {
      case 'left': RL.flip('L', true); break;
      case 'right': RL.flip('R', true); break;
      case 'launch': if (!primary()) RL.plunger(true); break;
      case 'start': primary(); break;
      case 'pause': togglePause(); break;
      case 'mute': AU.toggleMute(); break;
      case 'settings': if (JR.ui) JR.ui.open(); break;
      case 'nudgeLeft': RL.nudge(1, 0); break;
      case 'nudgeRight': RL.nudge(-1, 0); break;
      case 'nudgeUp': RL.nudge(0, -1); break;
    }
  });
  window.addEventListener('keyup', function (e) {
    held[e.code] = false;
    var a = ST.actionFor(e.code);
    if (a === 'left') RL.flip('L', false); else if (a === 'right') RL.flip('R', false); else if (a === 'launch') RL.plunger(false);
  });
  window.addEventListener('blur', function () { RL.flip('L', false); RL.flip('R', false); held = {}; });

  // ---------------------------------------------------------------- touch / mouse
  // left half = left flipper, right half = right flipper, lower-left (ball in lane) = plunger,
  // two fingers on the same half within 150 ms = nudge from that side (with tilt warning)
  var pointers = {}, lastDown = null;
  function toTable(e) {
    var r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * T.W, y: (e.clientY - r.top) / r.height * T.H };
  }
  canvas.addEventListener('pointerdown', function (e) {
    if (!JR.booted) return;                         // the boot screen covers the table until assets are in
    e.preventDefault(); AU.unlock(); askMotion();
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    var p = toTable(e), now = performance.now();
    for (var b in BUTTONS) if (Math.hypot(p.x - BUTTONS[b][0], p.y - BUTTONS[b][1]) < 55) {
      if (b === 'mute') AU.toggleMute(); else if (b === 'pause') togglePause(); else if (JR.ui) JR.ui.open();
      return;
    }
    if (G.paused) { togglePause(); return; }
    if (G.mode === 'entry') { RL.entryInput(p.x < 360 ? 'prev' : p.x > 720 ? 'next' : 'ok'); return; }
    if (primary()) return;
    var side = p.x < T.W / 2 ? 'L' : 'R';
    if (lastDown && now - lastDown.t < 150 && lastDown.side === side && pointers[lastDown.id]) {
      RL.nudge(side === 'L' ? 1 : -1, 0); lastDown = null;
    } else lastDown = { t: now, side: side, id: e.pointerId };
    var role = (p.x < 200 && p.y > 1450 && RL.ballInLane()) ? 'plunger' : side;
    pointers[e.pointerId] = role;
    if (role === 'plunger') RL.plunger(true); else RL.flip(role, true);
  });
  function release(e) {
    var role = pointers[e.pointerId]; if (!role) return;
    delete pointers[e.pointerId];
    if (role === 'plunger') RL.plunger(false);
    else { var still = false; for (var id in pointers) if (pointers[id] === role) still = true; if (!still) RL.flip(role, false); }
  }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  // ---------------------------------------------------------------- shake-to-nudge (phones)
  var asked = false, lastShake = 0, lastAcc = null;
  function askMotion() {
    if (asked || !ST.S.shakeNudge) return; asked = true;
    var DME = window.DeviceMotionEvent;
    if (DME && typeof DME.requestPermission === 'function') { try { DME.requestPermission().catch(function () {}); } catch (e) { /* ignore */ } }
  }
  window.addEventListener('devicemotion', function (e) {
    if (!ST.S.shakeNudge || G.mode !== 'play') return;
    var a = e.accelerationIncludingGravity; if (!a || a.x === null) return;
    if (lastAcc) {
      var dx = a.x - lastAcc.x, dy = a.y - lastAcc.y, now = performance.now();
      if (Math.hypot(dx, dy) > 14 && now - lastShake > 600) { lastShake = now; RL.nudge(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? -1 : 1) : 0, -1); }
    }
    lastAcc = { x: a.x, y: a.y };
  });
})();
