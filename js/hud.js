/* Jungle Rampage Pinball v3 - HUD: score apron, mode ribbon, callouts, attract screen, pause, initials entry. */
(function () {
  'use strict';
  var JR = window.JR, T = window.TABLE, G = JR.G, C = JR.core, ctx = JR.ctx, ST = JR.Settings, AU = JR.Audio;
  var text = C.text, fmt = C.fmt, spr = C.spr, blink = C.blink;

  function iconButtons() {
    var B = JR.BUTTONS;
    [['mute', AU.isMuted() ? 'icon_soundOff' : 'icon_soundOn'], ['pause', G.paused ? 'icon_play' : 'icon_pause']].forEach(function (b) {
      spr(b[1], B[b[0]][0], B[b[0]][1], 0, 0.42, 0.85);
    });
    // settings gear (canvas-drawn)
    var x = B.settings[0], y = B.settings[1];
    ctx.save(); ctx.globalAlpha = 0.85; ctx.translate(x, y);
    ctx.fillStyle = '#1b1006'; ctx.beginPath(); ctx.arc(0, 0, 34, 0, 7); ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#d9a840'; ctx.stroke();
    ctx.fillStyle = '#ffd34d';
    for (var i = 0; i < 8; i++) { ctx.save(); ctx.rotate(i * Math.PI / 4); ctx.fillRect(-5, -24, 10, 12); ctx.restore(); }
    ctx.beginPath(); ctx.arc(0, 0, 15, 0, 7); ctx.fill(); ctx.fillStyle = '#1b1006'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.fill();
    ctx.restore();
  }
  function modeRibbon() {   // top-centre status: current mode + objective + timer, or the next goal
    var m = G.modes, line = null, sub = '', color = 'gold';
    if (m.wizard) { line = 'TEMPLE OF GOLD  ' + Math.ceil(m.wizard.t); sub = Object.keys(m.wizard.hit).length + ' / ' + JR.rules.WIZ_SHOTS.length + ' GOLD SHOTS'; color = 'purple'; }
    else if (G.multiball) { line = 'MULTIBALL'; sub = 'JACKPOTS ' + G.jackpots; }
    else if (m.hunt) { line = 'TIGER HUNT  ' + Math.ceil(m.hunt.t); color = 'red';
      sub = JR.CFG.rules.huntSequence.map(function (s, i) { return (i < m.hunt.idx ? '\u2713' : i === m.hunt.idx ? '\u25B6' : '') + JR.rules.SHOT_NAME[s]; }).join('  '); }
    else if (m.expedition) { line = 'EXPEDITION  ' + Math.ceil(m.expedition.t); color = 'green';
      sub = ['waterfall', 'river', 'rapids', 'loop'].map(function (s) { return (m.expedition.hit[s] ? '\u2713' : '\u2022') + JR.rules.SHOT_NAME[s]; }).join('  '); }
    else if (G.wizardReady) { line = 'WIZARD READY'; sub = 'SHOOT THE TIGER LOCK'; color = 'purple'; }
    else if (G.mode === 'play' && G.awaitingLaunch) { line = 'SKILL SHOT'; sub = 'PLUNGE TO LIT ZONE ' + (G.skill.zone || 1) + '  \u2022  SOFT = 1  \u00B7  MEDIUM = 2  \u00B7  FULL = 3'; color = 'blue'; }
    if (!line) return;
    C.panel(170, 112, 740, sub ? 92 : 60, 0.78);
    text(line, 540, 142, 40, { color: color, maxW: 700 });
    if (sub) text(sub, 540, 184, 22, { color: 'white', maxW: 700 });
  }
  function drawHUD() {
    // apron windows: ball | score | best (from the local top-10)
    C.drawNumber(0, 202, 1888, 44, 160, String(Math.min(G.ball, JR.CFG.rules.ballsPerGame)));
    var shown = G.mode === 'attract' ? G.lastScore : G.score;
    C.drawNumber(shown, 547, 1880, 62, 460);
    var best = ST.best(); if (best) C.drawNumber(best, 935, 1888, 36, 240); else text('NO SCORES YET', 935, 1888, 24, { color: 'white' });
    iconButtons();
    if (G.extraBalls > 0) text('SHOOT AGAIN x' + G.extraBalls, 202, 1828, 22, { color: 'green' });
    if (G.mode === 'play' && G.awaitingLaunch && JR.rules.ballInLane()) {
      var t = G.plungerHeld ? 'POWER ' + Math.round(G.plungerPull * 100) + '%' : 'HOLD LAUNCH';
      text(t, 150, 1650, 30, { color: blink(2) ? 'gold' : 'white', align: 'left' });
    }
    var timers = [];
    if (G.ballSave > 0 && !G.awaitingLaunch) timers.push(['BALL SAVE ' + Math.ceil(G.ballSave), 'blue']);
    if (G.combo.t > 0 && G.combo.n >= 1) timers.push(['COMBO READY', 'blue']);
    timers.forEach(function (tm, i) { text(tm[0], 527, 1640 + i * 32, 28, { color: tm[1] }); });
    modeRibbon();
    // sprite banners (multiball, jackpot, tilt...)
    G.banners.forEach(function (b, i) {
      var k = b.t < 0.25 ? 0.4 + 0.6 * (b.t / 0.25) * 1.1 : 1, a = b.t > b.dur - 0.4 ? (b.dur - b.t) / 0.4 : 1;
      var r = C.cellRect(b.name), sc = Math.min(1, 900 / r.w) * k;
      spr(b.name, 540, 700 + i * 110, 0, sc, a);
    });
    // callouts: big jungle lettering
    G.callouts.forEach(function (c, i) {
      var a = c.t > c.dur - 0.4 ? (c.dur - c.t) / 0.4 : 1, pop = c.t < 0.18 ? 0.6 + 0.4 * (c.t / 0.18) : 1, y = 960 + i * 150;
      C.panel(110, y - 70, 860, c.sub ? 140 : 100, 0.6 * a);
      text(c.title, 540, y - 12, 76 * pop, { color: c.color, alpha: a, maxW: 820 });
      if (c.sub) text(c.sub, 540, y + 46, 32, { color: 'white', alpha: a, maxW: 820 });
    });
    // small score messages rising from the lower playfield
    var recent = G.msgs.slice(-3);
    recent.forEach(function (m, i) {
      var a = m.t > m.dur - 0.4 ? (m.dur - m.t) / 0.4 : 1, y = 1236 + i * 42 - Math.min(m.t, 0.5) * 16;
      ctx.save(); ctx.globalAlpha = 0.55 * Math.max(0, a); ctx.fillStyle = '#0a0602';
      ctx.fillRect(267, y - 19, 520, 38); ctx.restore();
      text(m.text, 527, y, 30, { color: m.color, alpha: a, maxW: 500 });
    });
    if (G.mode === 'attract' || G.mode === 'over') attract();
    if (G.mode === 'entry') entry();
    if (G.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, T.W, T.H);
      text('PAUSED', 540, 820, 110, { color: 'gold' });
      text('TAP OR PRESS ' + ST.keyName(ST.S.keys.pause[0]) + ' TO RESUME', 540, 930, 34, { color: 'white' });
      text('SETTINGS: GEAR BUTTON OR ' + ST.keyName(ST.S.keys.settings[0]), 540, 985, 28, { color: 'white' });
    }
  }
  function keycap(label, x, y) {
    ctx.save(); ctx.font = '26px ' + JR.FONT; var w = Math.max(54, ctx.measureText(label).width + 26);
    ctx.fillStyle = '#f3e6c4'; ctx.strokeStyle = '#6b4a14'; ctx.lineWidth = 3;
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y - 24, w, 48, 9); else ctx.rect(x, y - 24, w, 48); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2a1a06'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, x + w / 2, y + 1);
    ctx.restore(); return w;
  }
  function controlsCard(y) {
    var K = ST.S.keys, rows = [
      ['LEFT FLIPPER', K.left.slice(0, 2)], ['RIGHT FLIPPER', K.right.slice(0, 2)], ['LAUNCH (HOLD)', K.launch.slice(0, 1)],
      ['NUDGE', [K.nudgeLeft[0], K.nudgeUp[0], K.nudgeRight[0]]], ['PAUSE \u2022 SETTINGS', [K.pause[0], K.settings[0]]]];
    C.panel(150, y, 780, 70 + rows.length * 62, 0.85);
    text('CONTROLS', 540, y + 38, 36, { color: 'gold' });
    rows.forEach(function (r, i) {
      var yy = y + 100 + i * 62;
      text(r[0], 200, yy, 30, { color: 'white', align: 'left' });
      var x = 600; r[1].forEach(function (code, j) { if (!code) return; if (j) { text('or', x + 14, yy, 22, { color: 'white' }); x += 30; } x += keycap(ST.keyName(code), x, yy) + 8; });
    });
    text('TOUCH: TAP LEFT / RIGHT HALF \u2022 HOLD LOWER-LEFT TO LAUNCH \u2022 TWO FINGERS = NUDGE', 540, y + 100 + rows.length * 62 - 6, 20, { color: 'white', maxW: 760 });
  }
  function leaderboard(y) {
    var b = ST.board();
    C.panel(230, y, 620, 80 + Math.max(1, b.length) * 44, 0.85);
    text('TOP 10 EXPLORERS', 540, y + 40, 38, { color: 'gold' });
    if (!b.length) text('NO SCORES YET - BE THE FIRST!', 540, y + 96, 28, { color: 'white' });
    b.forEach(function (e, i) {
      var yy = y + 96 + i * 44, me = G.rank === i && G.boardFocusT > 0;
      text((i + 1) + '.', 300, yy, 30, { color: me ? 'green' : 'white', align: 'right' });
      text(e.name, 330, yy, 30, { color: me ? 'green' : 'gold', align: 'left' });
      text(fmt(e.score), 800, yy, 30, { color: me ? 'green' : 'white', align: 'right' });
    });
  }
  function attract() {
    if (G.mode === 'over' && G.endT < 1.5) return;
    ctx.fillStyle = 'rgba(4,12,4,0.62)'; ctx.fillRect(0, 0, T.W, 1830);
    spr('title', 540, 420, 0, 0.9 + 0.02 * Math.sin(G.time * 3));
    text('PINBALL', 540, 560, 64, { color: 'gold' });
    var page = G.boardFocusT > 0 ? 1 : Math.floor(G.time / 6) % 2;
    if (page === 0) controlsCard(650); else leaderboard(650);
    if (G.lastScore) text('LAST SCORE  ' + fmt(G.lastScore), 540, 1300, 40, { color: 'white' });
    spr('button_start', 540, 1420, 0, 0.9 + 0.03 * Math.sin(G.time * 5));
    text('PRESS ' + ST.keyName(ST.S.keys.launch[0]) + ' OR TAP TO START', 540, 1540, 36, { color: blink(1.5) ? 'white' : 'gold' });
  }
  function entry() {
    var e = G.entry;
    ctx.fillStyle = 'rgba(4,12,4,0.75)'; ctx.fillRect(0, 0, T.W, 1830);
    text('NEW TOP-10 SCORE!', 540, 560, 70, { color: 'gold' });
    text(fmt(e.score), 540, 660, 60, { color: 'white' });
    text('ENTER YOUR INITIALS', 540, 760, 40, { color: 'green' });
    for (var i = 0; i < 3; i++) {
      var x = 400 + i * 140, cur = i === e.pos;
      C.panel(x - 55, 820, 110, 140, cur ? 0.95 : 0.6);
      text(JR.rules.ALPHA[e.letters[i]] === ' ' ? '_' : JR.rules.ALPHA[e.letters[i]], x, 892, 96, { color: cur ? (blink(3) ? 'gold' : 'white') : 'gold' });
    }
    text('FLIPPERS CHANGE LETTER \u2022 LAUNCH CONFIRMS', 540, 1030, 30, { color: 'white' });
    text('TOUCH: LEFT / RIGHT THIRD CHANGE \u2022 MIDDLE CONFIRMS', 540, 1075, 26, { color: 'white' });
  }
  JR.hud = { drawHUD: drawHUD };
})();
