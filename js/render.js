/* Jungle Rampage Pinball v3 - draws the table: video/static background, lamps, parts, balls (interpolated), effects. */
(function () {
  'use strict';
  var JR = window.JR, T = window.TABLE, P = window.PHYS, G = JR.G, C = JR.core, ctx = JR.ctx, S = JR.Settings.S;
  var spr = C.spr, fl = C.fl, blink = C.blink, R = T.ballR;
  var FLIPPER_ART_LEN = 225;   // the flipper cells in moving.png are drawn for a 225 px flipper

  function lampState(name) {
    var m = G.modes;
    switch (name) {
      case 'J': case 'U': case 'N': case 'G': case 'L': case 'E': return G.letters[name] || (G.jungleCount > 0 && !G.letters[name] && false);
      case 'anaconda': return fl('t_anaconda') || (G.anacondaHits % 3 === 2 && blink(2));
      case 'tigerL': return fl('t_tiger') || !!m.hunt || (G.tigerHits % 3 === 2 && blink(2));
      case 'lane1': return G.lanes[0]; case 'lane2': return G.lanes[1]; case 'lane3': return G.lanes[2]; case 'lane4': return G.lanes[3];
      case 'jackpotLamp': return G.multiball ? blink(5) : fl('t_jackpot');
      case 'arrowWater': return fl('arrow_waterfall') || shotLit('waterfall');
      case 'arrowRiver': return fl('arrow_river') || shotLit('river');
      case 'arrowRapids': return fl('arrow_rapids') || fl('ride_rapids') && blink(8) || shotLit('rapids');
      case 'arrowLoop': return fl('arrow_loop') || shotLit('loop');
      case 'skill': return G.awaitingLaunch && blink(3);
      case 'expedition': return m.expedition ? (m.expedition.t > 5 || blink(6)) : G.done.expedition;
      case 'tigerHunt': return m.hunt ? (m.hunt.t > 5 || blink(6)) : G.done.hunt;
      case 'flowStart': return G.mode !== 'attract';
      case 'flowExplore': return G.explore;
      case 'flowLock': return G.lockLit ? blink(3) : G.locked.length > 0;
      case 'flowMulti': return (G.multiball && blink(4)) || G.done.multiball;
      case 'vine': return G.vineLit || G.monkeyT > 0;
      case 'bonusx': return G.bonusX > 1;
      case 'lock1': return G.locked.length >= 1 || (G.lockLit && G.locked.length === 0 && blink(3));
      case 'lock2': return G.locked.length >= 2 || (G.lockLit && G.locked.length === 1 && blink(3));
      case 'lock3': return G.locked.length >= 3 || (G.lockLit && G.locked.length === 2 && blink(3));
    }
    return false;
  }
  function shotLit(id) {
    var m = G.modes;
    if (m.wizard) return !m.wizard.hit[id] && blink(5);
    if (m.expedition) return !m.expedition.hit[id] && blink(4);
    if (m.hunt) return JR.CFG.rules.huntSequence[m.hunt.idx] === id && blink(4);
    return false;
  }
  var KEY_LAMPS = { J: 1, U: 1, N: 1, G: 1, L: 1, E: 1, lock1: 1, lock2: 1, lock3: 1, expedition: 1, tigerHunt: 1, flowMulti: 1 };
  function lampSprite(name) {
    if (name.indexOf('lock') === 0) return 'lockLamp';
    if (name.indexOf('lane') === 0) return 'lane';
    return name;
  }
  function halo(x, y, r, color, a) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a;
    var g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.restore();
  }

  function background() {
    var v = JR.video;
    if (S.video && v && v.ready && !v.el.paused) {
      var X = JR.videoXform;
      ctx.drawImage(v.el, X.x, X.y, X.w, X.h);
      spr('overlay', 0, 0);   // plunger lane, outlanes, apron, new posts and patches over the painted flippers
    } else spr('playfield', 0, 0);
  }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function render(alpha) {
    var a = alpha === undefined ? 1 : alpha;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, T.W, T.H);
    ctx.save();
    if (G.shake || G.shakeY) ctx.translate(G.shake * 40, (G.shakeY || 0) * 30);
    background();
    if (G.modeFlash > 0 && !S.reducedMotion) { ctx.fillStyle = 'rgba(255,215,90,' + (G.modeFlash * 0.25) + ')'; ctx.fillRect(0, 0, T.W, T.H); }
    // medallion glow
    if (G.medT > 0 || G.multiball || G.modes.wizard) spr(G.medT > 0.3 || ((G.multiball || G.modes.wizard) && blink(4)) ? 'medallion_1' : 'medallion_0', T.medallion.x, T.medallion.y, 0, T.medallion.glowScale || 1);
    // tiger lock: lit vs unlit look clearly different
    var lockHot = G.lockLit || G.extraBallLit || G.wizardReady;
    if (lockHot) halo(T.lock.x, T.lock.y, 150, G.wizardReady ? 'rgba(220,140,255,0.9)' : G.extraBallLit ? 'rgba(120,255,140,0.9)' : 'rgba(255,170,60,0.9)', 0.45 + 0.35 * Math.sin(G.time * 6));
    spr(lockHot ? 'lockring_1' : 'lockring_0', T.lock.x, T.lock.y, 0, 1, lockHot ? 1 : 0.8);
    if (!lockHot) { ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(T.lock.x, T.lock.y, 62, 0, 7); ctx.fill(); ctx.restore(); }
    // lamps (key lamps are bigger and get a glow when lit)
    for (var name in T.lamps) {
      var L = T.lamps[name], on = lampState(name);
      if (on && KEY_LAMPS[name]) halo(L[0], L[1], 70 * (L[3] || 1), name.indexOf('lock') === 0 ? 'rgba(255,90,60,0.9)' : 'rgba(255,230,120,0.9)', 0.75);
      spr(lampSprite(name) + (on ? '_1' : '_0'), L[0], L[1], (L[2] || 0) * Math.PI / 180, L[3] || 1);
    }
    if (G.bonusX > 1) C.text('x' + G.bonusX, T.lamps.bonusx[0], T.lamps.bonusx[1] + 40, 30, { color: 'white' });
    skillZones();
    // kickback lamps at the top of both outlanes
    [[95, 1610], [1013, 1610]].forEach(function (k) {
      if (G.kickback) halo(k[0], k[1], 46, 'rgba(150,255,120,1)', 0.55 + 0.3 * Math.sin(G.time * 6));
      ctx.save(); ctx.beginPath(); ctx.arc(k[0], k[1], 16, 0, 7); ctx.fillStyle = G.kickback ? '#c8ff9a' : 'rgba(20,40,20,0.85)'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#d9a840'; ctx.stroke(); ctx.restore();
      C.text('KICK', k[0], k[1] + 32, 18, { color: G.kickback ? 'green' : 'white', alpha: G.kickback ? 1 : 0.6 });
    });
    // standup targets
    T.targets.forEach(function (t) {
      var ang = Math.atan2(t.b[1] - t.a[1], t.b[0] - t.a[0]), cx = (t.a[0] + t.b[0]) / 2, cy = (t.a[1] + t.b[1]) / 2;
      var len = Math.hypot(t.b[0] - t.a[0], t.b[1] - t.a[1]);
      var base = t.sprite === 'jackpotT' ? 'jackpotT' : (len < 80 ? 'standupS' : 'standup');
      var lit = fl('t_' + t.id) || (C.LETTERS.indexOf(t.id) >= 0 && G.letters[t.id]) || (t.id === 'jackpot' && G.multiball && blink(5));
      spr(base + (lit ? '_1' : '_0'), cx, cy, ang);
    });
    T.drops.forEach(function (d, i) { spr(G.dropsDown[i] ? (fl('d' + i) ? 'drop_2' : 'drop_1') : 'drop_0', (d.a[0] + d.b[0]) / 2, (d.a[1] + d.b[1]) / 2); });
    T.bumpers.forEach(function (b) { var f = G.flash['b_' + b.id] || 0; if (f > 0) halo(b.x, b.y, 110, 'rgba(255,230,120,1)', f * 4); spr(f > 0.1 ? 'bumper_2' : f > 0 ? 'bumper_1' : 'bumper_0', b.x, b.y); });
    T.posts.forEach(function (p) { spr(fl('p_' + p.id) || (G.multiball && blink(3)) ? 'post_1' : 'post_0', p.x, p.y); });
    T.slings.forEach(function (s) { spr(s.sprite + (fl('s_' + s.id) ? '_1' : '_0'), s.cx, s.cy); });
    spr(G.roarT > 0 ? 'tiger_1' : 'tiger_0', T.deco.tiger[0], T.deco.tiger[1], 0, (T.deco.tiger[2] || 1) * (G.roarT > 0 && !S.reducedMotion ? 1 + 0.05 * Math.sin(G.time * 40) : 1));
    var swing = G.monkeyT > 0 ? Math.sin(G.time * 10) * 0.25 : Math.sin(G.time * 1.5) * 0.05;
    spr(G.monkeyT > 0 ? 'monkey_1' : 'monkey_0', T.deco.monkey[0], T.deco.monkey[1], S.reducedMotion ? 0 : swing, T.deco.monkey[2] || 1);
    spr('plunger_' + Math.round(G.plungerPull * 4), T.plunger.x, T.plunger.top);
    plungerMeter();
    // locked balls sit visibly in the tiger lock
    G.balls.forEach(function (b) { if (b.state === 'locked') { spr('ball_1', b.x, b.y, 0, 0.85); } });
    // flippers (interpolated angle; art stretched to the physics length)
    P.flippers.forEach(function (f) {
      var ang = lerp(f.rAng0 === undefined ? f.ang : f.rAng0, f.ang, a);
      spr('flipper' + f.id + (f.pressed && f.enabled ? '_1' : '_0'), f.x, f.y, f.dir === 1 ? ang : -ang, 1, undefined, f.len / FLIPPER_ART_LEN);
    });
    // balls on the playfield: trail at speed, shadow, subtle spin
    G.balls.forEach(function (b) {
      if (b.state !== 'play' && b.state !== 'saucer') return;
      var x = lerp(b.px, b.x, a), y = lerp(b.py, b.y, a);
      trail(b, x, y, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(x + 5, y + 7, R, 0, 7); ctx.fill();
      spr(G.multiball ? 'ball_1' : 'ball_0', x, y);
      spinMark(x, y, b.rot);
    });
    // balls riding ramps: elevated; the hidden Rapids run shows a faint ball under the rocks plus bubbles
    G.balls.forEach(function (b) {
      if (b.state !== 'tunnel') return;
      var x = lerp(b.px, b.x, a), y = lerp(b.py, b.y, a), hidden = T.tunnels[b.tunnel].hidden;
      if (hidden) {
        ctx.save(); ctx.globalAlpha = 0.45; spr('ball_1', x, y, b.rot, 0.9); ctx.restore();
        if (Math.random() < 0.5) C.burst(x, y, 'rgba(150,230,255,0.9)', 2, 120);
        halo(x, y, 70, 'rgba(120,220,255,0.8)', 0.5);
        return;
      }
      trail(b, x, y, 1.18);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(x + 12, y + 16, R, 0, 7); ctx.fill();
      spr('ball_1', x, y, b.rot, 1.18);
    });
    nextShotArrow();
    C.drawParts();
    ctx.restore();
  }
  function trail(b, x, y, sc) {
    if (S.reducedMotion || b.trail.length < 2) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < b.trail.length; i++) {
      var t = b.trail[i], k = (i + 1) / (b.trail.length + 1);
      ctx.globalAlpha = 0.18 * k; ctx.fillStyle = G.multiball ? '#ffb050' : '#bfe8ff';
      ctx.beginPath(); ctx.arc(t[0], t[1], R * sc * (0.5 + 0.5 * k), 0, 7); ctx.fill();
    }
    ctx.restore();
  }
  function spinMark(x, y, rot) {   // a small rotating glint so the ball's spin (and speed) reads
    ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#fffbe8';
    var r = R * 0.55; ctx.beginPath(); ctx.arc(x + Math.cos(rot) * r, y + Math.sin(rot) * r * 0.7, 3.2, 0, 7); ctx.fill();
    ctx.restore();
  }
  function skillZones() {
    var sk = G.skill; if (!(G.awaitingLaunch || sk.ball)) return;
    T.skillZones.forEach(function (z, i) {
      var lit = (G.awaitingLaunch ? sk.zone : sk.frozen) === i + 1;
      if (lit) halo(z.lamp[0], z.lamp[1], 60, 'rgba(120,224,255,1)', 0.6 + 0.4 * Math.sin(G.time * 12));
      ctx.save(); ctx.beginPath(); ctx.arc(z.lamp[0], z.lamp[1], 20, 0, 7);
      ctx.fillStyle = lit ? '#bff4ff' : 'rgba(20,40,50,0.8)'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#d9a840'; ctx.stroke(); ctx.restore();
      C.text(String(i + 1), z.lamp[0], z.lamp[1] + 1, 26, { color: lit ? 'blue' : 'white' });
    });
  }
  function plungerMeter() {   // power bands that map to skill zones 1/2/3 (soft, medium, full)
    if (!G.awaitingLaunch && !G.plungerHeld) return;
    var x = 82, y0 = 1830, h = 300, bands = [[0.08, 0.28, 1], [0.28, 0.48, 2], [0.48, 1.0, 3]];
    ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - 12, y0 - h - 6, 24, h + 12);
    bands.forEach(function (bd) {
      var lit = G.skill.zone === bd[2];
      ctx.fillStyle = lit ? 'rgba(122,224,255,0.95)' : 'rgba(122,224,255,0.25)';
      ctx.fillRect(x - 9, y0 - bd[1] * h, 18, (bd[1] - bd[0]) * h - 2);
    });
    ctx.fillStyle = '#ffd34d'; ctx.fillRect(x - 13, y0 - G.plungerPull * h - 3, 26, 6);
    ctx.restore();
  }
  function nextShotArrow() {
    var n = JR.rules.nextShot(); if (!n) return;
    var pulse = S.reducedMotion ? 0.8 : 0.6 + 0.4 * Math.sin(G.time * 7), bob = S.reducedMotion ? 0 : Math.sin(G.time * 7) * 8;
    var x = n.x, y = n.y + bob;
    ctx.save(); ctx.globalAlpha = 0.95;
    halo(x, y, 60, 'rgba(255,220,90,1)', 0.35 * pulse);
    ctx.beginPath(); ctx.moveTo(x, y - 34); ctx.lineTo(x + 30, y + 6); ctx.lineTo(x + 12, y + 6); ctx.lineTo(x + 12, y + 32); ctx.lineTo(x - 12, y + 32); ctx.lineTo(x - 12, y + 6); ctx.lineTo(x - 30, y + 6); ctx.closePath();
    var g = ctx.createLinearGradient(0, y - 34, 0, y + 32); g.addColorStop(0, '#fff7c8'); g.addColorStop(0.5, '#ffd34d'); g.addColorStop(1, '#c47a12');
    ctx.fillStyle = g; ctx.globalAlpha = pulse; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#1c0e02'; ctx.stroke();
    ctx.restore();
    C.text(n.label, x, y + 56, 24, { color: 'gold', alpha: 0.95, maxW: 220 });
  }
  JR.render = { render: render, lampState: lampState };
})();
