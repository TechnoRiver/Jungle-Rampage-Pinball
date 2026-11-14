/* Jungle Rampage Pinball v3 - shared state, sprite drawing, styled text, particles and small helpers. */
(function () {
  'use strict';
  var JR = window.JR, T = window.TABLE, A = window.SPRITE_ATLAS, CFG = JR.CFG, S = JR.Settings.S;
  var canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
  canvas.width = T.W; canvas.height = T.H;
  JR.canvas = canvas; JR.ctx = ctx; JR.images = {};
  JR.FONT = '"Bangers", "Impact", "Arial Black", sans-serif';

  // ---------------------------------------------------------------- sprites
  var rects = {};
  function cellRect(name) {
    if (rects[name]) return rects[name];
    var c = A.cells[name];
    if (!c) throw new Error('Unknown sprite cell: ' + name);
    var s = A.sheets[c.sheet], sc = c.spanC || 1, sr = c.spanR || 1;
    var r = { img: c.sheet, x: s.originX + s.line + c.col * (s.cellW + s.line), y: s.originY + s.line + c.row * (s.cellH + s.line),
      w: sc * s.cellW + (sc - 1) * s.line, h: sr * s.cellH + (sr - 1) * s.line, adv: c.advance || 1 };
    r.ax = c.anchor ? c.anchor[0] : r.w / 2; r.ay = c.anchor ? c.anchor[1] : r.h / 2;
    rects[name] = r; return r;
  }
  function spr(name, x, y, rot, scale, alpha, scaleX) {
    var r = cellRect(name);
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    var s = scale || 1;
    if (s !== 1 || scaleX) ctx.scale(s * (scaleX || 1), s);
    if (alpha !== undefined && alpha < 1) ctx.globalAlpha = Math.max(0, alpha);
    // inset 2 px so bilinear filtering of scaled/rotated sprites never samples the cyan grid lines
    var k = A.sheets[r.img].line ? 2 : 0;
    ctx.drawImage(JR.images[r.img], r.x + k, r.y + k, r.w - 2 * k, r.h - 2 * k, -r.ax + k, -r.ay + k, r.w - 2 * k, r.h - 2 * k);
    ctx.restore();
  }
  function fmt(n) { return Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function short(n) { return n >= 1e6 ? (n / 1e6).toFixed(n % 1e6 ? 1 : 0) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : String(n); }
  function drawNumber(n, cx, cy, h, maxW, str) {
    var s = str || fmt(n), sc = h / cellRect('digit_0').h, total = 0, i, ch, names = [];
    for (i = 0; i < s.length; i++) {
      ch = s[i];
      var name = ch === ',' ? 'digit_comma' : (ch === 'x' || ch === 'X') ? 'digit_x' : 'digit_' + ch;
      names.push(name); total += cellRect(name).adv * cellRect(name).w * sc;
    }
    if (maxW && total > maxW) { sc *= maxW / total; total = maxW; }
    var x = cx - total / 2;
    for (i = 0; i < names.length; i++) { var r = cellRect(names[i]), w = r.adv * r.w * sc; spr(names[i], x + w / 2, cy, 0, sc); x += w; }
  }
  // ---------------------------------------------------------------- jungle lettering: gold gradient, dark outline, drop shadow
  var PALETTE = {
    gold: ['#fff7c8', '#ffd34d', '#c47a12'], green: ['#f2ffd8', '#9cf06a', '#2f8a22'], red: ['#ffe2d8', '#ff7a55', '#a8200e'],
    blue: ['#e8fbff', '#7ae0ff', '#1d6fa8'], white: ['#ffffff', '#f2f2e8', '#c9c2a8'], purple: ['#ffe8ff', '#e09cff', '#7a2fa8']
  };
  function text(str, x, y, size, opt) {
    opt = opt || {};
    var pal = PALETTE[opt.color || 'gold'] || PALETTE.gold;
    ctx.save();
    if (opt.alpha !== undefined) ctx.globalAlpha = Math.max(0, Math.min(1, opt.alpha));
    ctx.font = (opt.weight || '') + ' ' + size + 'px ' + JR.FONT;
    ctx.textAlign = opt.align || 'center'; ctx.textBaseline = 'middle';
    if (opt.maxW) { var w = ctx.measureText(str).width; if (w > opt.maxW) { size *= opt.maxW / w; ctx.font = size + 'px ' + JR.FONT; } }
    if (opt.letterSpacing && 'letterSpacing' in ctx) ctx.letterSpacing = opt.letterSpacing + 'px';
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillText(str, x + size * 0.06, y + size * 0.09);
    // outline
    ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, size * 0.16); ctx.strokeStyle = opt.stroke || '#1c0e02'; ctx.strokeText(str, x, y);
    var g = ctx.createLinearGradient(0, y - size * 0.5, 0, y + size * 0.45);
    g.addColorStop(0, pal[0]); g.addColorStop(0.45, pal[1]); g.addColorStop(1, pal[2]);
    ctx.fillStyle = g; ctx.fillText(str, x, y);
    ctx.restore();
    return size;
  }
  function panel(x, y, w, h, alpha) {   // dark carved-wood plate behind text
    ctx.save(); ctx.globalAlpha = alpha === undefined ? 0.82 : alpha;
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, 18); else ctx.rect(x, y, w, h);
    var g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#2b1a0a'); g.addColorStop(1, '#120a03');
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#c99a3a'; ctx.stroke();
    ctx.restore();
  }
  // ---------------------------------------------------------------- state
  var G = {
    mode: 'attract', time: 0, paused: false, score: 0, ball: 1, balls: [], bonusX: 1, lanes: [], letters: {},
    dropsDown: [false, false, false], dropResetT: 0, lockLit: false, locks: 0, locked: [], multiball: false,
    jackpots: 0, tigerHits: 0, anacondaHits: 0, jungleCount: 0, expeditionsDone: 0, switches: 0,
    modes: { expedition: null, hunt: null, wizard: null }, done: { expedition: false, hunt: false, multiball: false },
    wizardReady: false, extraBallLit: false, extraBalls: 0, specials: 0, combo: { n: 0, t: 0 },
    skill: { zone: 0, t: 0, active: false, best: 0, frozen: -1 },
    ballSave: 0, tilt: 0, tilted: false, explore: false, vineLit: false,
    banners: [], callouts: [], msgs: [], pending: [], plungerPull: 0, plungerHeld: false, endT: 0, lastScore: 0,
    flash: {}, roarT: 0, monkeyT: 0, medT: 0, shake: 0, shakeY: 0, hitStop: 0, rescues: [], stats: { drains: 0, outlanes: 0, saves: 0, balls: 0 },
    entry: null
  };
  var LETTERS = ['J', 'U', 'N', 'G', 'L', 'E'];
  function resetLetters() { LETTERS.forEach(function (l) { G.letters[l] = false; }); }
  resetLetters();
  function flash(id, t) { G.flash[id] = Math.max(G.flash[id] || 0, t || 0.25); }
  function fl(id) { return (G.flash[id] || 0) > 0; }
  function banner(name, dur) { G.banners.push({ name: name, t: 0, dur: dur || 2.0 }); if (G.banners.length > 2) G.banners.shift(); }
  // big centre callout in jungle lettering (title + optional sub line)
  function callout(title, sub, color, dur) {
    G.callouts.push({ title: title, sub: sub || '', color: color || 'gold', t: 0, dur: dur || 2.2 });
    if (G.callouts.length > 2) G.callouts.shift();
  }
  function msg(textStr, dur, color) { G.msgs.push({ text: textStr, t: 0, dur: dur || 1.6, color: color || 'gold' }); if (G.msgs.length > 4) G.msgs.shift(); }
  function later(t, fn) { G.pending.push({ t: t, fn: fn }); }
  function add(pts, label, color) {
    if (G.tilted || G.mode !== 'play') return;
    G.score += pts;
    if (label) msg(label + '  ' + fmt(pts), 1.6, color);
  }
  // ---------------------------------------------------------------- effects: particles, shake, hit-stop, haptics
  var parts = [];
  function burst(x, y, color, n, speed) {
    if (S.reducedMotion) n = Math.ceil(n / 3);
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, v = (0.3 + Math.random() * 0.7) * (speed || 500);
      parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.35 + Math.random() * 0.35, t: 0, c: color || '#ffd34d', s: 3 + Math.random() * 4 });
    }
    if (parts.length > 400) parts.splice(0, parts.length - 400);
  }
  function updateParts(dt) {
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i]; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92;
      if (p.t > p.life) parts.splice(i, 1);
    }
  }
  function drawParts() {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    parts.forEach(function (p) {
      var a = 1 - p.t / p.life; ctx.globalAlpha = a; ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (0.5 + a * 0.5), 0, 7); ctx.fill();
    });
    ctx.restore();
  }
  function shake(amount) { if (!S.reducedMotion) G.shake = Math.max(Math.abs(G.shake), amount) * (G.shake < 0 ? -1 : 1) || amount; }
  function hitStop(t) { if (!S.reducedMotion) G.hitStop = Math.max(G.hitStop, t || CFG.time.hitStop); }
  function haptic(ms) { if (S.haptics && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { /* ignore */ } } }

  JR.core = { cellRect: cellRect, spr: spr, fmt: fmt, short: short, drawNumber: drawNumber, text: text, panel: panel,
    flash: flash, fl: fl, banner: banner, callout: callout, msg: msg, later: later, add: add,
    burst: burst, updateParts: updateParts, drawParts: drawParts, shake: shake, hitStop: hitStop, haptic: haptic,
    resetLetters: resetLetters, LETTERS: LETTERS, blink: function (hz) { return Math.floor(G.time * (hz || 4)) % 2 === 0; } };
  JR.G = G;
})();
