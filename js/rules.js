/* Jungle Rampage Pinball v3 - game flow, rules, scoring, modes, ramps, saucer, skill shot, stuck-ball rescue.
   Every score value / timer comes from JR.CFG (js/config.js). */
(function () {
  'use strict';
  var JR = window.JR, T = window.TABLE, P = window.PHYS, G = JR.G, C = JR.core, AU = JR.Audio;
  var CFG = JR.CFG, SC = CFG.score, TM = CFG.time, RU = CFG.rules, R = T.ballR;
  var add = C.add, msg = C.msg, later = C.later, flash = C.flash, callout = C.callout, banner = C.banner, fmt = C.fmt;
  var SHOT_POS = { waterfall: [290, 1080], river: [433, 1060], rapids: [711, 1040], loop: [930, 930], tiger: [1000, 695],
    jackpot: [536, 470], lock: [540, 1320], drops: [537, 1068], anaconda: [100, 935] };
  var SHOT_NAME = { waterfall: 'WATERFALL', river: 'RIVER RUN', rapids: 'RAPIDS', loop: 'JUNGLE LOOP', tiger: 'TIGER TARGET', jackpot: 'TEMPLE', lock: 'TIGER LOCK' };
  var WIZ_SHOTS = ['waterfall', 'river', 'rapids', 'loop', 'jackpot', 'tiger'];
  var nLanes = T.sensors.filter(function (s) { return /^lane\d$/.test(s.id); }).length;
  function laneArr() { var a = []; for (var i = 0; i < nLanes; i++) a.push(false); return a; }
  G.lanes = laneArr();

  // ---------------------------------------------------------------- balls
  function newBall(x, y, vx, vy) {
    var b = { x: x, y: y, px: x, py: y, vx: vx || 0, vy: vy || 0, state: 'play', sensors: {}, stuck: 0, cool: 0, saucerCool: 0,
      path: null, rot: Math.random() * 6, trail: [], cradled: 0, tunnelCool: 0 };
    G.balls.push(b); return b;
  }
  function ballInLane() {
    for (var i = 0; i < G.balls.length; i++) { var b = G.balls[i]; if (b.state === 'play' && b.x < T.laneX && b.y > 1500) return b; }
    return null;
  }
  function liveBalls() { return G.balls.filter(function (b) { return b.state === 'play' || b.state === 'tunnel' || b.state === 'saucer'; }).length; }
  function serveBall() {
    if (ballInLane()) return;
    newBall(T.plunger.x, T.plunger.top - R - 1, 0, 0);
    G.awaitingLaunch = true;
    G.skill = { active: true, zone: 0, t: 0, frozen: -1, best: 0, ball: null };
  }
  function autoLaunch() {
    var b = newBall(T.plunger.x, T.plunger.top - R - 2, 0, -P.feel.plunge[1]);
    AU.play('launch', 1); return b;
  }

  // ---------------------------------------------------------------- game flow
  function startGame() {
    AU.unlock();
    G.mode = 'play'; G.score = 0; G.ball = 1; G.balls = []; G.locks = 0; G.locked = []; G.lockLit = false; G.multiball = false;
    G.jackpots = 0; C.resetLetters(); G.tigerHits = 0; G.anacondaHits = 0; G.jungleCount = 0; G.extraBalls = 0; G.extraBallLit = false;
    G.done = { expedition: false, hunt: false, multiball: false }; G.wizardReady = false; G.specials = 0; G.expeditionsDone = 0; G.kickback = false;
    G.modes = { expedition: null, hunt: null, wizard: null }; G.pendingMode = null;
    G.banners = []; G.callouts = []; G.msgs = []; G.pending = []; G.entry = null; G.rescues = [];
    G.stats = { drains: 0, outlanes: 0, saves: 0, balls: 0, rescues: 0 };
    startBall(); AU.play('start'); callout('JUNGLE RAMPAGE', 'BALL 1', 'gold', 1.8);
  }
  function startBall() {
    G.bonusX = 1; G.lanes = laneArr(); G.dropsDown = [false, false, false]; T.drops.forEach(function (d) { d.seg.on = true; });
    G.tilted = false; G.tilt = 0; G.switches = 0; G.explore = false; G.ballSave = 0; G.vineLit = false; G.multiball = false;
    G.modes.expedition = null; G.modes.hunt = null; G.modes.wizard = null; G.combo = { n: 0, t: 0 };
    P.flippers.forEach(function (f) { f.enabled = true; });
    if (P.feel.kickbackEachBall) G.kickback = true;
    G.stats.balls++;
    serveBall();
  }
  function endBall() {
    var letters = C.LETTERS.filter(function (l) { return G.letters[l]; }).length;
    var base = G.switches * SC.bonusSwitch + letters * SC.bonusLetter + G.expeditionsDone * SC.bonusMode + G.tigerHits * SC.bonusTiger;
    var bonus = G.tilted ? 0 : base * G.bonusX;
    if (bonus > 0) { callout('BONUS ' + fmt(bonus), fmt(base) + ' x' + G.bonusX, 'green', 2.4); AU.play('bonus'); }
    G.score += bonus;
    G.mode = 'between';
    later(2.4, function () {
      if (G.extraBalls > 0) { G.extraBalls--; G.mode = 'play'; callout('SHOOT AGAIN', 'EXTRA BALL', 'green', 2); AU.speak('Shoot again'); startBall(); }
      else if (G.ball >= RU.ballsPerGame) gameOver();
      else { G.ball++; G.mode = 'play'; callout('BALL ' + G.ball, '', 'gold', 1.4); startBall(); }
    });
  }
  function gameOver() {
    G.mode = 'over'; G.endT = 0; G.lastScore = G.score; G.locked = []; G.locks = 0;
    banner('banner_gameover', 3.5); AU.play('gameover'); AU.setIntensity(0);
    if (JR.Settings.qualifies(G.score)) later(2.2, function () { G.mode = 'entry'; G.entry = { letters: [0, 0, 0], pos: 0, score: G.score, t: 0 }; });
  }
  var ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';
  function entryInput(what) {   // initials entry: 'prev', 'next', 'ok'
    var e = G.entry; if (!e) return;
    if (what === 'prev') e.letters[e.pos] = (e.letters[e.pos] + ALPHA.length - 1) % ALPHA.length;
    else if (what === 'next') e.letters[e.pos] = (e.letters[e.pos] + 1) % ALPHA.length;
    else if (what === 'ok') {
      e.pos++;
      if (e.pos >= 3) {
        var name = e.letters.map(function (i) { return ALPHA[i]; }).join('');
        G.rank = JR.Settings.addScore(name, e.score); G.entry = null; G.mode = 'over'; G.endT = 1.6; G.boardFocusT = 8;
      }
    }
    AU.play('click');
  }

  // ---------------------------------------------------------------- modes
  function anyMode() { return G.modes.expedition || G.modes.hunt || G.modes.wizard; }
  function modeStartMoment(title, sub, voice) {
    callout(title, sub, 'gold', 2.8); AU.play('mode'); AU.speak(voice || title);
    G.ballSave = Math.max(G.ballSave, TM.ballSaveMode); C.hitStop(0.12); C.shake(0.25); C.haptic([20, 40, 20]);
    G.modeFlash = 0.6;
  }
  function startExpedition() {
    if (anyMode()) { G.pendingMode = 'expedition'; msg('EXPEDITION READY', 2, 'green'); return; }
    G.modes.expedition = { t: TM.expedition, hit: {} }; G.explore = true;
    modeStartMoment('JUNGLE EXPEDITION', 'SHOOT ALL 4 RAMPS', 'Jungle expedition. Shoot every ramp.');
  }
  function startHunt() {
    if (anyMode()) { G.pendingMode = 'hunt'; msg('TIGER HUNT READY', 2, 'red'); return; }
    G.modes.hunt = { t: TM.tigerHunt, idx: 0 }; G.roarT = 1.5; AU.play('roar');
    modeStartMoment('TIGER HUNT', 'TRACK IT: ' + RU.huntSequence.map(function (s) { return SHOT_NAME[s]; }).join(' > '), 'Tiger hunt!');
  }
  function startWizard() {
    G.wizardReady = false;
    G.modes.wizard = { t: TM.wizard, hit: {} }; G.modes.expedition = null; G.modes.hunt = null;
    callout('TEMPLE OF GOLD', 'WIZARD MODE: EVERY SHOT ' + C.short(SC.wizardShot), 'gold', 3.5);
    AU.play('wizard'); AU.speak('Temple of gold!'); C.hitStop(0.2); C.shake(0.35); G.modeFlash = 1;
    G.ballSave = Math.max(G.ballSave, TM.ballSaveWizard);
    later(1.2, autoLaunch);    // two-ball wizard mode
  }
  function endMode(id, completed) {
    G.modes[id] = null;
    if (!completed) msg((id === 'hunt' ? 'TIGER HUNT' : id === 'wizard' ? 'TEMPLE OF GOLD' : 'EXPEDITION') + ' OVER', 2, 'white');
    if (id === 'wizard') { G.done = { expedition: false, hunt: false, multiball: false }; }
    checkWizardReady();
    if (G.pendingMode && !anyMode()) { var m = G.pendingMode; G.pendingMode = null; later(1.0, m === 'hunt' ? startHunt : startExpedition); }
  }
  function checkWizardReady() {
    if (!G.modes.wizard && !G.wizardReady && G.done.expedition && G.done.hunt && G.done.multiball) {
      G.wizardReady = true; callout('WIZARD READY', 'SHOOT THE TIGER LOCK', 'purple', 3); AU.play('modeDone'); AU.speak('Temple of gold is ready');
    }
  }
  // a "shot" = a completed ramp/loop, the tiger target, the temple target or the lock
  function shot(id) {
    var m = G.modes;
    if (m.wizard && WIZ_SHOTS.indexOf(id) >= 0) {
      if (!m.wizard.hit[id]) { m.wizard.hit[id] = true; add(SC.wizardShot, 'GOLD ' + SHOT_NAME[id], 'gold'); C.burst(SHOT_POS[id][0], SHOT_POS[id][1], '#ffd34d', 30, 700); }
      else add(SC.wizardShot / 5);
      if (WIZ_SHOTS.every(function (s) { return m.wizard.hit[s]; })) {
        add(SC.wizardComplete); callout('TEMPLE CONQUERED', C.short(SC.wizardComplete) + ' + SPECIAL', 'gold', 4); AU.play('superJackpot');
        AU.speak('Temple conquered'); award('special'); endMode('wizard', true);
      }
    }
    if (m.expedition && SHOT_POS[id] && ['waterfall', 'river', 'rapids', 'loop'].indexOf(id) >= 0 && !m.expedition.hit[id]) {
      m.expedition.hit[id] = true; add(SC.expeditionShot, 'EXPEDITION ' + SHOT_NAME[id], 'green');
      var n = Object.keys(m.expedition.hit).length;
      if (n >= 4) {
        add(SC.expeditionComplete); G.done.expedition = true; G.expeditionsDone++;
        callout('EXPEDITION COMPLETE', C.short(SC.expeditionComplete), 'green', 3); AU.play('modeDone'); AU.speak('Expedition complete');
        endMode('expedition', true);
      } else msg(n + ' / 4 RAMPS', 1.4, 'green');
    }
    if (m.hunt && id === RU.huntSequence[m.hunt.idx]) {
      m.hunt.idx++; G.roarT = 1; AU.play('roar');
      add(SC.huntStep * m.hunt.idx, 'TRACKS ' + m.hunt.idx + '/' + RU.huntSequence.length, 'red');
      if (m.hunt.idx >= RU.huntSequence.length) {
        add(SC.huntComplete); G.done.hunt = true; callout('TIGER CAUGHT!', C.short(SC.huntComplete), 'red', 3); AU.play('modeDone'); AU.speak('Tiger caught');
        endMode('hunt', true);
      } else m.hunt.t = Math.max(m.hunt.t, 12);   // each step buys a little time
    }
  }
  function award(what) {
    if (what === 'extraball') { G.extraBalls++; G.extraBallLit = false; add(SC.extraBall); callout('EXTRA BALL', '', 'green', 2.6); AU.play('extraball'); AU.speak('Extra ball'); C.haptic([30, 30, 30]); }
    if (what === 'special') { G.specials++; add(SC.special); callout('SPECIAL', C.short(SC.special), 'purple', 2.6); AU.play('extraball'); AU.speak('Special'); }
  }

  // ---------------------------------------------------------------- scoring rules
  function rampShot(id, entrySpeed) {
    G.switches++; G.explore = true;
    var label = SHOT_NAME[id];
    add(SC.ramp[id], label);
    AU.play(id === 'loop' ? 'loop' : 'ramp', 0.9);
    flash('arrow_' + id, 0.8);
    // combos: ramps/loop in quick succession
    if (G.combo.t > 0) {
      G.combo.n++;
      var v = SC.combo + SC.comboStep * (Math.min(G.combo.n, RU.comboMax || 6) - 2);
      add(v); callout(G.combo.n + '-WAY COMBO', fmt(v), 'blue', 1.8); AU.play('combo', G.combo.n);
      if (G.combo.n === 3) AU.speak('Triple combo');
    } else G.combo.n = 1;
    G.combo.t = TM.comboWindow;
    if (id === 'waterfall') { G.vineLit = true; }
    shot(id);
  }
  function letterHit(l) {
    G.switches++;
    if (!G.letters[l]) { G.letters[l] = true; add(SC.letter, 'LETTER ' + l, 'green'); AU.play('letter'); }
    else { add(SC.letterRepeat); AU.play('target'); }
    if (C.LETTERS.every(function (k) { return G.letters[k]; })) {
      G.jungleCount++; add(SC.jungleWord, 'J-U-N-G-L-E', 'green');
      later(1.0, C.resetLetters);
      if (G.jungleCount === RU.specialAtJungle) award('special');
      startExpedition();
    }
  }
  function targetHit(t) {
    if (G.tilted) return;
    var id = t.id; flash('t_' + id, 0.35);
    var mx = (t.a[0] + t.b[0]) / 2, my = (t.a[1] + t.b[1]) / 2;
    C.burst(mx, my, '#fff2a0', 14, 450);
    if (C.LETTERS.indexOf(id) >= 0) return letterHit(id);
    G.switches++;
    if (id === 'jackpot') {
      G.roarT = 1.2; AU.play('roar');
      if (G.multiball) {
        G.jackpots++;
        var v = G.jackpots % 4 === 0 ? SC.superJackpot : SC.jackpot + SC.jackpotStep * ((G.jackpots - 1) % 4);
        add(v); callout(G.jackpots % 4 === 0 ? 'SUPER JACKPOT' : 'TEMPLE JACKPOT', fmt(v), 'gold', 2.4);
        banner('banner_jackpot', 1.8); AU.play(G.jackpots % 4 === 0 ? 'superJackpot' : 'jackpot'); AU.speak(G.jackpots % 4 === 0 ? 'Super jackpot!' : 'Jackpot!');
        C.hitStop(0.15); C.shake(0.3); C.burst(536, 470, '#ffd34d', 60, 900); C.haptic([40, 30, 60]);
        if (!G.done.multiball) { G.done.multiball = true; checkWizardReady(); }
      } else add(SC.temple, 'TEMPLE');
      shot('jackpot');
    } else if (id === 'tiger') {
      AU.play('target');
      if (G.modes.hunt || G.modes.wizard) { shot('tiger'); return; }
      G.tigerHits++; add(SC.tiger, 'TIGER ' + Math.min(3, G.tigerHits % 3 || 3) + '/3', 'red');
      if (G.tigerHits % 3 === 0) startHunt();
    } else if (id === 'anaconda') {
      AU.play('target'); G.anacondaHits++;
      add(SC.anaconda, 'ANACONDA ' + ((G.anacondaHits - 1) % 3 + 1) + '/3', 'green');
      if (G.anacondaHits % 3 === 0) {
        add(SC.anacondaSqueeze); callout('ANACONDA SQUEEZE', 'BONUS X' + Math.min(RU.bonusXMax, G.bonusX + 1), 'green', 2); AU.play('mode');
        bumpBonusX();
      }
    }
  }
  function bumpBonusX() {
    if (G.bonusX < RU.bonusXMax) G.bonusX++;
    if (G.bonusX === RU.extraBallAtBonusX && !G.extraBallLit) { G.extraBallLit = true; msg('EXTRA BALL IS LIT AT THE LOCK', 3, 'green'); AU.speak('Extra ball is lit'); }
  }
  function dropHit(d, idx) {
    if (G.dropsDown[idx] || G.tilted) return;
    G.dropsDown[idx] = true; d.seg.on = false; G.switches++; flash('d' + idx, 0.2);
    add(SC.drop); AU.play('drop'); C.burst((d.a[0] + d.b[0]) / 2, d.a[1], '#ff8060', 12, 400);
    if (G.dropsDown.every(Boolean)) {
      add(SC.dropBank, 'EXPEDITION TARGETS');
      if (!G.multiball && !G.lockLit && G.locked.length < 3) { G.lockLit = true; callout('LOCK IS LIT', 'SHOOT THE TIGER LOCK', 'red', 2); AU.speak('Lock is lit'); }
      G.dropResetT = TM.dropReset;
    }
  }
  function laneHit(i) {
    G.switches++;
    if (!G.lanes[i]) { G.lanes[i] = true; add(SC.lane); } else add(SC.laneRepeat);
    AU.play('lane'); var s = T.sensors[i]; C.burst((s.rect[0] + s.rect[2]) / 2, 470, '#9fe8ff', 8, 300);
    if (G.lanes.every(Boolean)) {
      add(SC.laneComplete, 'BONUS X' + Math.min(RU.bonusXMax, G.bonusX + 1)); AU.play('mode');
      bumpBonusX();
      if (!G.kickback) { G.kickback = true; msg('KICKBACK LIT', 2, 'green'); }
      later(0.6, function () { G.lanes = laneArr(); });
    }
  }
  function rotateLanes(dir) {   // the FLIPPER buttons move the lit top lanes (slingshots no longer do)
    if (G.mode !== 'play') return;
    var l = G.lanes;
    G.lanes = dir < 0 ? l.slice(1).concat(l.slice(0, 1)) : l.slice(-1).concat(l.slice(0, -1));
  }
  function sensorEnter(id, b) {
    if (G.tilted) return;
    var lm = /^lane(\d)$/.exec(id);
    if (lm) return laneHit(+lm[1] - 1);
    if (id === 'inL') {   // left inlane = Vine Lane
      G.switches++; G.monkeyT = 1.5; add(G.vineLit ? SC.vineLit : SC.inlane, G.vineLit ? 'VINE LANE' : 'INLANE', 'green'); AU.play('lane'); G.vineLit = false;
    } else if (id === 'inR') { G.switches++; add(SC.inlane, 'INLANE'); AU.play('lane'); }
    else if ((id === 'outL' || id === 'outR') && G.kickback && b.vy > 0) {   // lit kickback fires the ball back up
      G.kickback = false; G.stats.kickbacks = (G.stats.kickbacks || 0) + 1;
      b.vx = id === 'outL' ? 40 : -40; b.vy = -RU.kickbackSpeed * (id === 'outR' ? 1.08 : 1);
      add(SC.outlane, 'KICKBACK!', 'green'); AU.play('kick'); C.burst(b.x, b.y, '#9cf06a', 20, 420); C.shake(0.12); C.haptic(40);
    }
    else if (id === 'outL' || id === 'outR') {
      add(SC.outlane); G.stats.outlanes++; AU.play('outlane'); msg(G.ballSave > 0 ? 'OUTLANE - SAVED' : 'OUTLANE!', 1.6, 'red'); C.haptic(60);
    }
  }

  // ---------------------------------------------------------------- ramps (rides along a path; speed-dependent)
  function enterTunnel(b, id, speedIn) {
    var t = T.tunnels[id], min = RU.rampMinSpeed[id] || 0, alt = RU.rampAltSpeed[id];
    b.state = 'tunnel'; b.tunnel = id; b.pi = 0; b.dirStep = 1; b.speedIn = speedIn;
    b.path = (alt && t.alt && speedIn >= alt) ? t.alt : t.path;
    b.x = b.path[0][0]; b.y = b.path[0][1];
    b.rideSpeed = Math.max(550, Math.min(1300, speedIn * 0.6));
    if (speedIn < min) {   // too weak: rolls part-way up and back out of the mouth
      b.rejectAt = Math.max(3, Math.floor((b.path.length - 1) * Math.max(0.15, Math.min(0.6, speedIn / min - 0.35))));
      AU.play('rampReject'); add(SC.rampReject);
    } else { b.rejectAt = -1; AU.play(id === 'loop' ? 'loop' : 'ramp', Math.min(1.4, (b.path.length * 9) / b.rideSpeed)); }
    flash('ride_' + id, 99);
  }
  function updateTunnel(b, dt) {
    var dist = b.rideSpeed * dt;
    while (dist > 0) {
      var ni = b.pi + b.dirStep;
      if (ni < 0 || ni >= b.path.length) break;
      var nx = b.path[ni][0], ny = b.path[ni][1], dx = nx - b.x, dy = ny - b.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d <= dist) { b.x = nx; b.y = ny; b.pi = ni; dist -= d; if (b.dirStep > 0 && b.pi === b.rejectAt) b.dirStep = -1; }
      else { b.x += dx / d * dist; b.y += dy / d * dist; dist = 0; }
    }
    var id = b.tunnel, t = T.tunnels[id];
    if (b.dirStep < 0 && b.pi === 0) {   // rolled back out of the mouth
      var p0 = b.path[0], p1 = b.path[2], lx = p0[0] - p1[0], ly = p0[1] - p1[1], ll = Math.hypot(lx, ly) || 1;
      b.state = 'play'; b.vx = lx / ll * 420; b.vy = ly / ll * 420; b.tunnelCool = 0.8; b.path = null; G.flash['ride_' + id] = 0;
      return;
    }
    if (b.dirStep > 0 && b.pi >= b.path.length - 1) {
      var p = b.path, a = p[p.length - 3], z = p[p.length - 1], ddx = z[0] - a[0], ddy = z[1] - a[1], l = Math.hypot(ddx, ddy) || 1;
      // exit speed and angle follow the entry speed: a harder shot comes out faster and slightly wider
      var min = RU.rampMinSpeed[id] || 800, k = Math.max(0, Math.min(1, (b.speedIn - min) / 1500));
      var sp = t.exit * (0.75 + 0.6 * k), ang = (k - 0.5) * 0.35 * (id === 'river' ? -1 : 1);
      // a little natural scatter (real ramps never return a ball identically) so no shot can be looped forever
      sp *= 0.93 + Math.random() * 0.14; ang += (Math.random() - 0.5) * 0.14;
      var ux = ddx / l, uy = ddy / l, c = Math.cos(ang), s = Math.sin(ang);
      b.state = 'play'; b.vx = (ux * c - uy * s) * sp; b.vy = (ux * s + uy * c) * sp; b.tunnelCool = 0.6; b.path = null;
      G.flash['ride_' + id] = 0;
      if (t.hidden) { C.burst(b.x, b.y, '#9fe8ff', 18, 380); AU.play('kick'); }
      rampShot(id, b.speedIn);
    }
  }

  // ---------------------------------------------------------------- saucer / tiger lock
  var SLOTS = [[492, 1352], [588, 1352], [540, 1268]];   // where locked balls sit, visible inside the ring
  function captureSaucer(b) {
    var sp = Math.hypot(b.vx, b.vy) || 1;
    b.entry = [b.vx / sp, b.vy / sp];
    b.state = 'saucer'; b.x = T.lock.x; b.y = T.lock.y; b.vx = b.vy = 0;
    G.switches++; AU.play('saucer'); C.burst(T.lock.x, T.lock.y, '#ffb050', 16, 380);
    shot('lock');
    if (G.wizardReady && !G.multiball) { startWizard(); later(1.6, function () { kickSaucer(b); }); return; }
    if (G.extraBallLit) { award('extraball'); }
    if (G.lockLit && !G.multiball && !G.modes.wizard) {
      G.lockLit = false; G.locks++;
      var slot = G.locked.length; G.locked.push(b);
      add(SC.lockBall); AU.play('lock'); C.hitStop(0.08);
      later(0.5, function () { b.state = 'locked'; b.x = SLOTS[slot][0]; b.y = SLOTS[slot][1]; b.px = b.x; b.py = b.y; });
      if (G.locked.length < 3) {
        callout('BALL ' + G.locked.length + ' LOCKED', 'NEW BALL AT THE PLUNGER', 'red', 2); AU.speak('Ball ' + G.locked.length + ' locked');
        later(1.3, function () { serveBall(); });
      } else later(0.8, startMultiball);
      return;
    }
    add(SC.saucerUnlit, 'TIGER LAIR', 'white');
    later(TM.saucerHold, function () { kickSaucer(b); });
  }
  function kickSaucer(b) {
    if (b.state !== 'saucer' && b.state !== 'locked') return;
    var e = b.entry || [0, -1];
    // kick-out follows the entry direction: a ball shot in moving up-right leaves up-right, and so on
    var ux = Math.max(-0.85, Math.min(0.85, e[0] * 1.1)), uy = -1, l = Math.hypot(ux, uy);
    b.state = 'play'; b.x = T.lock.x; b.y = T.lock.y; b.saucerCool = 0.8;
    b.vx = ux / l * RU.saucerKick; b.vy = uy / l * RU.saucerKick;
    AU.play('kick'); flash('lock', 0.3); C.burst(T.lock.x, T.lock.y, '#ffd34d', 20, 500); C.shake(0.12); C.haptic(25);
  }
  function startMultiball() {
    G.multiball = true; G.locks = 0; G.jackpots = 0; G.ballSave = TM.ballSaveMultiball; G.explore = true;
    banner('banner_multiball', 2.6); callout('4 BALL MULTIBALL', 'SHOOT THE TEMPLE FOR JACKPOTS', 'gold', 3);
    AU.play('multiball'); AU.speak('Multiball!'); add(SC.multiballStart); C.shake(0.3); C.hitStop(0.15);
    var balls = G.locked.slice(); G.locked = [];
    // physically release the locked balls one at a time from the tiger lock, alternating sides
    balls.forEach(function (b, i) {
      later(1.0 + i * TM.lockReleaseGap, function () { b.state = 'saucer'; b.x = T.lock.x; b.y = T.lock.y; b.entry = [i % 2 ? 0.55 : -0.55, -1]; kickSaucer(b); });
    });
    later(1.0 + balls.length * TM.lockReleaseGap, autoLaunch);
  }

  // ---------------------------------------------------------------- collisions / sensors
  function onHit(kind, ref, b, imp) {
    if (kind === 'wall') { if (imp > 900) AU.play('thud'); return; }
    if (kind === 'flipper') { if (ref.pressed) b.cradled = 0.15; if (imp > 400) { AU.play('flipperHit', imp / 3000); C.haptic(8); } return; }
    if (kind === 'plunger' || kind === 'gate') return;
    var key = kind + (ref && ref.id ? ref.id : '');
    if (b.cool > 0 && b.coolKey === key) return;
    b.cool = 0.08; b.coolKey = key;
    var K = P.feel.kicks;
    if (kind === 'bumper') {
      var nx = b.nx, ny = b.ny, vn = b.vx * nx + b.vy * ny;
      if (vn < K.bumper) { b.vx += (K.bumper - vn) * nx; b.vy += (K.bumper - vn) * ny; }
      if (G.tilted) return;
      flash('b_' + ref.id, 0.18); G.medT = 0.5; G.switches++;
      add(G.modes.expedition || G.modes.wizard ? SC.bumperMode : SC.bumper); AU.play('bumper');
      C.burst(ref.x + nx * ref.r, ref.y + ny * ref.r, '#ffe27a', 16, 520); C.shake(0.06); C.haptic(12);
    } else if (kind === 'post') {
      if (imp < 120) return;
      b.vx += b.nx * K.post; b.vy += b.ny * K.post;
      flash('p_' + ref.id, 0.2); add(SC.post); AU.play('post'); C.burst(b.x - b.nx * R, b.y - b.ny * R, '#ff9a6a', 8, 350);
    } else if (kind === 'sling') {
      if (imp < 160) return;
      b.vx += b.nx * K.sling; b.vy += b.ny * K.sling;
      flash('s_' + ref.id, 0.18); add(SC.sling); AU.play('sling'); C.burst(b.x - b.nx * R, b.y - b.ny * R, '#ff6a3a', 10, 420); C.haptic(10);
    } else if (kind === 'target') {
      if (imp < 120) return;
      targetHit(ref);
    } else if (kind === 'drop') {
      if (imp < 100) return;
      dropHit(ref, T.drops.indexOf(ref));
    }
  }
  function inRect(b, r) { return b.x >= r[0] && b.x <= r[2] && b.y >= r[1] && b.y <= r[3]; }
  function checkSensors(b) {
    T.sensors.forEach(function (s) {
      var inside = inRect(b, s.rect);
      if (inside && !b.sensors[s.id]) { b.sensors[s.id] = true; sensorEnter(s.id, b); }
      else if (!inside) b.sensors[s.id] = false;
    });
    // skill shot: track how far round the launch arc the plunged ball travels
    if (G.skill.ball === b) {
      T.skillZones.forEach(function (z, i) { if (inRect(b, z.rect)) G.skill.best = Math.max(G.skill.best, i + 1); });
      if (b.x > 320 || (b.y > 720 && b.x > T.laneX)) resolveSkill();
    }
    if ((b.tunnelCool || 0) <= 0) {
      for (var id in T.tunnels) {
        var e = T.tunnels[id].entry, dx = b.x - e[0], dy = b.y - e[1];
        if (dx * dx + dy * dy < e[2] * e[2] && b.vy < -200) { enterTunnel(b, id, Math.hypot(b.vx, b.vy)); return; }
      }
    }
    var lx = b.x - T.lock.x, ly = b.y - T.lock.y;
    if (b.saucerCool <= 0 && lx * lx + ly * ly < 26 * 26 && (b.vx * b.vx + b.vy * b.vy) < RU.saucerMaxSpeed * RU.saucerMaxSpeed &&
        (!RU.saucerUpwardOnly || b.vy < 0)) captureSaucer(b);
  }
  function resolveSkill() {
    var sk = G.skill; if (!sk.ball) return;
    sk.ball = null; sk.active = false;
    if (sk.frozen > 0 && sk.best === sk.frozen) {
      var v = SC.skillShot[sk.frozen - 1];
      add(v); callout('SKILL SHOT', 'ZONE ' + sk.frozen + '  ' + fmt(v), 'blue', 2.4); banner('banner_skill', 1.6); AU.play('skill'); AU.speak('Skill shot!');
      var z = T.skillZones[sk.frozen - 1]; C.burst(z.lamp[0], z.lamp[1], '#7ae0ff', 30, 600);
    }
    sk.frozen = -1;
  }

  // ---------------------------------------------------------------- input-driven actions
  function flip(side, down) {
    var f = P.flippers[side === 'L' ? 0 : 1];
    if (down && !f.pressed && f.enabled && G.mode === 'play' && !G.paused) { AU.play('flipper'); rotateLanes(side === 'L' ? -1 : 1); C.haptic(6); }
    f.pressed = down;
  }
  function plunger(down) {
    if (G.paused) return;
    if (down) { G.plungerHeld = true; return; }
    if (!G.plungerHeld) return;
    G.plungerHeld = false;
    var pull = G.plungerPull; G.plungerPull = 0;
    var b = ballInLane();
    if (b && pull > 0.03 && b.y > T.plunger.top - R - 30) {
      var F = P.feel;
      b.y = T.plunger.top - R - 1; b.vx = 0;
      b.vy = -(F.plunge[0] + pull * (F.plunge[1] - F.plunge[0])) - Math.random() * 15;
      AU.play('launch', pull); C.haptic(15);
      if (G.awaitingLaunch) {
        G.awaitingLaunch = false;
        if (!G.multiball && !G.modes.wizard) G.ballSave = Math.max(G.ballSave, G.ball === 1 ? TM.ballSaveFirst : TM.ballSaveLater);
        if (G.skill.active) { G.skill.frozen = G.skill.zone; G.skill.best = 0; G.skill.ball = b; }
      }
    }
  }
  function nudge(dx, dy) {   // dx: +1 = table bumped from the left (ball pushed right), -1 = from the right, 0 = up
    if (G.mode !== 'play' || G.paused || G.tilted) return;
    G.balls.forEach(function (b) { if (b.state === 'play') { b.vx += dx * 150; b.vy -= 70 + (dx === 0 ? 70 : 0); } });
    AU.play('nudge'); G.tilt += 1; G.shake = 0.18 * (dx || 1); G.shakeY = dx === 0 ? 0.15 : 0; C.haptic(30);
    if (G.tilt > RU.tiltLimit) {
      G.tilted = true; banner('banner_tilt', 3); callout('TILT', 'BALL LOST', 'red', 3); AU.play('tilt'); C.haptic([80, 50, 80]);
      P.flippers.forEach(function (f) { f.enabled = false; f.pressed = false; });
    } else if (G.tilt > RU.tiltLimit - 1.2) { callout('DANGER!', 'ONE MORE NUDGE = TILT', 'red', 1.5); AU.play('warning'); C.haptic([40, 40, 40]); }
  }

  // ---------------------------------------------------------------- per-tick update
  function update(dt, STEP_SUB) {
    G.time += dt;
    for (var k in G.flash) if (G.flash[k] > 0 && G.flash[k] < 90) G.flash[k] -= dt;
    G.roarT = Math.max(0, G.roarT - dt); G.monkeyT = Math.max(0, G.monkeyT - dt); G.medT = Math.max(0, G.medT - dt);
    G.modeFlash = Math.max(0, (G.modeFlash || 0) - dt);
    G.tilt = Math.max(0, G.tilt - dt * RU.tiltDecay);
    if (G.shake) { G.shake *= Math.max(0, 1 - dt * 12); if (Math.abs(G.shake) < 0.002) G.shake = 0; }
    if (G.shakeY) { G.shakeY *= Math.max(0, 1 - dt * 12); if (G.shakeY < 0.002) G.shakeY = 0; }
    G.banners.forEach(function (b) { b.t += dt; }); G.banners = G.banners.filter(function (b) { return b.t < b.dur; });
    G.callouts.forEach(function (m) { m.t += dt; }); G.callouts = G.callouts.filter(function (m) { return m.t < m.dur; });
    G.msgs.forEach(function (m) { m.t += dt; }); G.msgs = G.msgs.filter(function (m) { return m.t < m.dur; });
    var due = G.pending.filter(function (p) { p.t -= dt; return p.t <= 0; });
    G.pending = G.pending.filter(function (p) { return p.t > 0; });
    due.forEach(function (p) { p.fn(); });
    C.updateParts(dt);
    if (G.mode === 'over') { G.endT += dt; if (G.endT > 9) G.mode = 'attract'; }
    if (G.entry) G.entry.t += dt;
    if (G.boardFocusT > 0) G.boardFocusT -= dt;

    if (G.mode === 'play') {
      if (G.ballSave > 0 && !G.awaitingLaunch) G.ballSave -= dt;
      if (G.combo.t > 0) { G.combo.t -= dt; if (G.combo.t <= 0) G.combo.n = 0; }
      ['expedition', 'hunt', 'wizard'].forEach(function (id) {
        var m = G.modes[id]; if (!m) return;
        m.t -= dt; if (m.t <= 0) endMode(id, false);
      });
      if (G.dropResetT > 0) {
        G.dropResetT -= dt;
        if (G.dropResetT <= 0) { G.dropsDown = [false, false, false]; T.drops.forEach(function (d) { d.seg.on = true; }); AU.play('dropsReset'); }
      }
      if (G.skill.active && G.awaitingLaunch) { G.skill.t += dt; G.skill.zone = 1 + Math.floor(G.skill.t / TM.skillZoneCycle) % 3; }
      AU.setIntensity(G.multiball || G.modes.wizard ? 2 : anyMode() ? 1 : 0);
    }
    // plunger
    if (G.plungerHeld) { var before = G.plungerPull; G.plungerPull = Math.min(1, G.plungerPull + dt * 0.8); if ((before * 8 | 0) !== (G.plungerPull * 8 | 0)) AU.play('pull'); }
    P.setPlungerY(T.plunger.top + Math.round(G.plungerPull * 4) * T.plunger.travel / 4);

    // physics (paused during a short hit-stop)
    if (G.hitStop > 0) { G.hitStop -= dt; }
    else {
      var SUB = STEP_SUB || 4, sdt = dt / SUB;
      for (var s = 0; s < SUB; s++) {
        P.step(G.balls, sdt, onHit);
        for (var i = 0; i < G.balls.length; i++) {
          var b = G.balls[i];
          if (b.state === 'tunnel') { if (s === 0) updateTunnel(b, dt); continue; }
          if (b.state !== 'play') continue;
          checkSensors(b);
        }
      }
    }
    // per-ball housekeeping: spin, trail, stuck-ball rescue, drains
    var roll = 0;
    G.balls.forEach(function (b) {
      b.cool -= dt; b.saucerCool -= dt; if (b.tunnelCool > 0) b.tunnelCool -= dt; if (b.cradled > 0) b.cradled -= dt;
      if (b.state !== 'play' && b.state !== 'tunnel') return;
      var sp = Math.hypot(b.vx, b.vy);
      if (b.state === 'play') {
        b.rot += (b.vx >= 0 ? 1 : -1) * sp / R * dt * 0.5;
        if (b.contactT < 0.03) roll = Math.max(roll, Math.min(1, sp / 2000));
      }
      if (sp > 900 || b.state === 'tunnel') { b.trail.push([b.x, b.y]); if (b.trail.length > 7) b.trail.shift(); } else if (b.trail.length) b.trail.shift();
      if (b.state !== 'play') return;
      var inLane = b.x < T.laneX && b.y > 1500;
      // stuck-ball handling: never touch a ball resting on a held-up flipper (that is cradling, a skill);
      // rescue only a ball that has been genuinely motionless elsewhere, and log where it happened
      if (sp < 30 && !inLane && !(b.cradled > 0)) {
        b.stuck += dt;
        if (b.stuck > TM.rescueAfter) {
          var rec = { x: Math.round(b.x), y: Math.round(b.y), t: Math.round(G.time) };
          G.rescues.push(rec); G.stats.rescues = (G.stats.rescues || 0) + 1;
          if (window.console) console.info('[pinball] stuck-ball rescue at', rec.x, rec.y);
          b.rescueN = (b.rescueN || 0) + 1;
          if (b.rescueN >= 3) {   // still stuck after two escalating kicks: 'ball search' - re-serve it, no ball lost
            b.state = 'gone'; msg('BALL SEARCH', 2, 'white'); later(0.5, autoLaunch);
          } else {
            var nx = b.nx || 0, ny = b.ny || -1, k = b.rescueN;
            b.vx += nx * 260 * k + (Math.random() < 0.5 ? -1 : 1) * 220 * k; b.vy += Math.min(-260, ny * 260 - 200) * k;
          }
          b.stuck = 0;
        }
      } else b.stuck = 0;
      if (b.y > T.drainY && b.x > T.laneX) drain(b);
      else if (b.x < -40 || b.x > T.W + 40 || b.y < -60 || b.y > T.H + 40) drain(b);
    });
    AU.setRolling(roll, roll);
    G.balls = G.balls.filter(function (b) { return b.state !== 'gone'; });
  }
  function drain(b) {
    b.state = 'gone';
    if (G.mode !== 'play') return;
    G.stats.drains++;
    if (b.x < T.sep[0] || b.x > T.sep[1]) G.stats.outDrains = (G.stats.outDrains || 0) + 1; else G.stats.centerDrains = (G.stats.centerDrains || 0) + 1;
    var left = liveBalls();
    if (G.ballSave > 0 && !G.tilted) {
      G.stats.saves++;
      banner('banner_ballsaved', 1.4); AU.play('ballsave'); AU.speak('Ball saved');
      later(0.6, autoLaunch);
      return;
    }
    if ((G.multiball || G.modes.wizard) && left <= 1) {
      if (G.multiball) { G.multiball = false; msg('MULTIBALL OVER', 2, 'white'); }
    }
    if (left === 0 && G.pending.length === 0) { AU.play('drain'); C.haptic(80); endBall(); }
    else if (left === 0) {
      later(0.1, function () { if (G.mode === 'play' && liveBalls() === 0 && !G.pending.length) { AU.play('drain'); endBall(); } });
    }
  }

  // ---------------------------------------------------------------- what to shoot next (for the pulsing arrow)
  function nextShot() {
    if (G.mode !== 'play' || G.tilted) return null;
    if (G.awaitingLaunch) { var z = T.skillZones[(G.skill.zone || 1) - 1]; return { x: z.lamp[0], y: z.lamp[1] + 70, label: 'SKILL ZONE ' + (G.skill.zone || 1) }; }
    var m = G.modes, id = null, label = '';
    if (m.wizard) { id = WIZ_SHOTS.filter(function (s) { return !m.wizard.hit[s]; })[0]; label = 'GOLD SHOT'; }
    else if (G.wizardReady) { id = 'lock'; label = 'START WIZARD'; }
    else if (G.multiball) { id = 'jackpot'; label = 'JACKPOT'; }
    else if (m.hunt) { id = RU.huntSequence[m.hunt.idx]; label = 'TRACK THE TIGER'; }
    else if (m.expedition) { id = ['waterfall', 'river', 'rapids', 'loop'].filter(function (s) { return !m.expedition.hit[s]; })[0]; label = 'EXPEDITION'; }
    else if (G.extraBallLit) { id = 'lock'; label = 'EXTRA BALL'; }
    else if (G.lockLit) { id = 'lock'; label = 'LOCK BALL'; }
    else if (!G.dropsDown.every(Boolean)) { id = 'drops'; label = 'LIGHT LOCK'; }
    if (!id) return null;
    var p = SHOT_POS[id];
    return { id: id, x: p[0], y: p[1] + (id === 'lock' ? 110 : 70), label: label };
  }

  JR.rules = { newBall: newBall, ballInLane: ballInLane, startGame: startGame, flip: flip, plunger: plunger, nudge: nudge,
    update: update, entryInput: entryInput, nextShot: nextShot, liveBalls: liveBalls, SLOTS: SLOTS, SHOT_NAME: SHOT_NAME,
    WIZ_SHOTS: WIZ_SHOTS, anyMode: anyMode, startHunt: startHunt, startExpedition: startExpedition, ALPHA: ALPHA };
})();
