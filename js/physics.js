/* Jungle Rampage Pinball v3 - 2D ball physics.
   Balls are circles; walls, targets and slingshots are capsules (line segments with radius);
   bumpers/posts are circles; flippers are tapered capsules with angular velocity.
   All feel constants come from a preset in js/config.js (P.applyFeel). */
(function () {
  'use strict';
  var T = window.TABLE;
  var P = { R: T.ballR, segs: [], circles: [], flippers: [], feel: null };
  var D2R = Math.PI / 180;

  P.applyFeel = function (name) {
    var F = window.JR.CFG.feel[name] || window.JR.CFG.feel.classic;
    P.feel = F; P.feelName = window.JR.CFG.feel[name] ? name : 'classic';
    P.GRAVITY = F.gravity; P.MAX_SPEED = F.maxSpeed; P.DAMPING = F.damping;
    P.FLIP_UP_SPEED = F.flipUp; P.FLIP_DOWN_SPEED = F.flipDown;
    P.segs.forEach(function (s) { s.e = P.eFor(s.kind); });
    P.circles.forEach(function (c) { c.e = P.eFor(c.kind); });
  };
  P.eFor = function (kind) {
    var F = P.feel;
    return { wall: F.wallE, sling: F.slingE, gate: 0.3, target: F.wallE, drop: F.wallE * 0.85, plunger: 0.05,
             bumper: F.bumperE, post: F.postE, tiger: F.bumperE }[kind];
  };

  function addSeg(ax, ay, bx, by, r, kind, ref) {
    var s = { ax: ax, ay: ay, bx: bx, by: by, r: r, e: P.eFor(kind), kind: kind, ref: ref || null, on: true };
    s.dx = bx - ax; s.dy = by - ay; s.len2 = s.dx * s.dx + s.dy * s.dy || 1;
    P.segs.push(s); return s;
  }
  P.build = function () {
    if (!P.feel) P.applyFeel('classic');
    P.segs.length = 0; P.circles.length = 0; P.flippers.length = 0;
    T.walls.forEach(function (w) {
      for (var i = 0; i < w.pts.length - 1; i++) addSeg(w.pts[i][0], w.pts[i][1], w.pts[i + 1][0], w.pts[i + 1][1], w.r, 'wall', w);
    });
    T.slings.forEach(function (s) { s.seg = addSeg(s.a[0], s.a[1], s.b[0], s.b[1], s.r, 'sling', s); });
    T.gates.forEach(function (g) { var s = addSeg(g.a[0], g.a[1], g.b[0], g.b[1], g.r, 'gate', g); s.nx = g.n[0]; s.ny = g.n[1]; });
    T.targets.forEach(function (t) { t.seg = addSeg(t.a[0], t.a[1], t.b[0], t.b[1], t.r, 'target', t); });
    T.drops.forEach(function (t) { t.seg = addSeg(t.a[0], t.a[1], t.b[0], t.b[1], t.r, 'drop', t); });
    P.plungerSeg = addSeg(T.plunger.x0, T.plunger.top, T.plunger.x1, T.plunger.top, 4, 'plunger', null);
    T.bumpers.forEach(function (b) { P.circles.push({ x: b.x, y: b.y, r: b.r, e: P.eFor('bumper'), kind: 'bumper', ref: b }); });
    T.posts.forEach(function (b) { P.circles.push({ x: b.x, y: b.y, r: b.r, e: P.eFor('post'), kind: 'post', ref: b }); });
    if (T.tiger && T.tiger.r > 0) P.circles.push({ x: T.tiger.x, y: T.tiger.y, r: T.tiger.r, e: P.eFor('tiger'), kind: 'tiger', ref: T.tiger });
    T.flippers.forEach(function (f) {
      P.flippers.push({ id: f.id, x: f.x, y: f.y, len: f.len, r1: f.r1, r2: f.r2, dir: f.dir,
        rest: f.rest * D2R, up: f.up * D2R, ang: f.rest * D2R, prevAng: f.rest * D2R, omega: 0, pressed: false, enabled: true });
    });
  };
  P.setPlungerY = function (y) { var s = P.plungerSeg; s.ay = s.by = y; };

  P.updateFlippers = function (dt) {
    P.flippers.forEach(function (f) {
      var target = (f.pressed && f.enabled) ? f.up : f.rest;
      var old = f.ang, sp = (target < f.ang) ? P.FLIP_UP_SPEED : P.FLIP_DOWN_SPEED;
      if (f.ang > target) f.ang = Math.max(target, f.ang - sp * dt);
      else if (f.ang < target) f.ang = Math.min(target, f.ang + sp * dt);
      f.omega = (f.ang - old) / dt;
    });
  };

  // returns impact speed (>0) when a bounce happened, 0 if only touching, -1 if no contact
  function collideSeg(b, s) {
    var t = ((b.x - s.ax) * s.dx + (b.y - s.ay) * s.dy) / s.len2;
    if (t < 0) t = 0; else if (t > 1) t = 1;
    var px = s.ax + s.dx * t, py = s.ay + s.dy * t;
    var dx = b.x - px, dy = b.y - py, m = P.R + s.r, d2 = dx * dx + dy * dy;
    if (d2 >= m * m) return -1;
    var gate = s.kind === 'gate';
    // one-way gate: ignore balls behind it or already moving out through it
    if (gate && (((b.x - s.ax) * s.nx + (b.y - s.ay) * s.ny) < 0 || (b.vx * s.nx + b.vy * s.ny) > 0)) return -1;
    var d = Math.sqrt(d2), nx, ny;
    if (d < 1e-6) { nx = -s.dy; ny = s.dx; var l = Math.sqrt(nx * nx + ny * ny); nx /= l; ny /= l; d = 0; }
    else { nx = dx / d; ny = dy / d; }
    if (gate && nx * s.nx + ny * s.ny < 0) { nx = -nx; ny = -ny; d = -d; }
    b.x += nx * (m - d); b.y += ny * (m - d);
    b.contactT = 0;
    var vn = b.vx * nx + b.vy * ny;
    if (vn < 0) {
      b.vx -= (1 + s.e) * vn * nx; b.vy -= (1 + s.e) * vn * ny;
      // tangential friction only on real bounces (resting contact must not glue the ball, see v2 notes)
      if (-vn > 60) { var tx = -ny, ty = nx, vt = b.vx * tx + b.vy * ty; b.vx -= vt * 0.015 * tx; b.vy -= vt * 0.015 * ty; }
      b.nx = nx; b.ny = ny;
      return -vn;
    }
    return 0;
  }
  function collideCircle(b, c) {
    var dx = b.x - c.x, dy = b.y - c.y, m = P.R + c.r, d2 = dx * dx + dy * dy;
    if (d2 >= m * m) return -1;
    var d = Math.sqrt(d2) || 0.001, nx = dx / d, ny = dy / d;
    b.x += nx * (m - d); b.y += ny * (m - d);
    var vn = b.vx * nx + b.vy * ny;
    b.nx = nx; b.ny = ny; b.contactT = 0;
    if (vn < 0) { b.vx -= (1 + c.e) * vn * nx; b.vy -= (1 + c.e) * vn * ny; return -vn; }
    return 0;
  }
  P.flipperTip = function (f, ang) {
    var a = ang === undefined ? f.ang : ang;
    return { x: f.x + f.dir * f.len * Math.cos(a), y: f.y + f.len * Math.sin(a) };
  };
  function collideFlipper(b, f) {
    var tip = P.flipperTip(f);
    var sx = tip.x - f.x, sy = tip.y - f.y, len2 = sx * sx + sy * sy;
    var t = ((b.x - f.x) * sx + (b.y - f.y) * sy) / len2;
    if (t < 0) t = 0; else if (t > 1) t = 1;
    var px = f.x + sx * t, py = f.y + sy * t, rr = f.r1 + (f.r2 - f.r1) * t;
    var dx = b.x - px, dy = b.y - py, m = P.R + rr, d2 = dx * dx + dy * dy;
    if (d2 >= m * m) return -1;
    var d = Math.sqrt(d2) || 0.001, nx = dx / d, ny = dy / d;
    // rounded pivot cap: tilt the normal slightly toward the tip so a ball can never balance on top of the pivot
    if (t < 0.02 && ny < -0.2) { nx += f.dir * 0.18 * Math.cos(f.ang); ny += 0.18 * Math.sin(f.ang); var nl = Math.sqrt(nx * nx + ny * ny); nx /= nl; ny /= nl; }
    b.x += nx * (m - d); b.y += ny * (m - d);
    // surface velocity of the flipper at the contact point: shot power grows with distance from the pivot
    var qx = px + nx * rr - f.x, qy = py + ny * rr - f.y;
    var svx = f.dir * f.omega * -qy, svy = f.dir * f.omega * qx;
    var rvx = b.vx - svx, rvy = b.vy - svy, vn = rvx * nx + rvy * ny;
    b.flipper = f; b.flipT = t; b.contactT = 0;
    if (vn < 0) {
      var e = Math.abs(f.omega) > 1 ? P.feel.flipE : P.feel.flipEStill;
      b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny;
      return -vn;
    }
    return 0;
  }
  function collideBalls(a, b) {
    var dx = b.x - a.x, dy = b.y - a.y, m = 2 * P.R, d2 = dx * dx + dy * dy;
    if (d2 >= m * m || d2 === 0) return;
    var d = Math.sqrt(d2), nx = dx / d, ny = dy / d, pen = (m - d) / 2;
    a.x -= nx * pen; a.y -= ny * pen; b.x += nx * pen; b.y += ny * pen;
    var rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (rv < 0) { var j = -0.95 * rv; a.vx -= j * nx; a.vy -= j * ny; b.vx += j * nx; b.vy += j * ny; }
  }
  function clamp(b) {
    var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    if (sp > P.MAX_SPEED) { b.vx *= P.MAX_SPEED / sp; b.vy *= P.MAX_SPEED / sp; }
  }

  /* step all balls that are in 'play'. onHit(kind, ref, ball, impact) is called for bounces. */
  P.step = function (balls, dt, onHit) {
    P.updateFlippers(dt);
    var damp = Math.max(0, 1 - P.DAMPING * dt);
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      if (b.state !== 'play') continue;
      b.contactT = (b.contactT || 0) + dt; b.flipper = null;
      b.vy += P.GRAVITY * dt;
      b.vx *= damp; b.vy *= damp;
      clamp(b);
      b.x += b.vx * dt; b.y += b.vy * dt;
      var k, imp;
      for (k = 0; k < P.segs.length; k++) {
        var s = P.segs[k];
        if (!s.on) continue;
        imp = collideSeg(b, s);
        if (imp > 0) onHit(s.kind, s.ref, b, imp, s);
      }
      for (k = 0; k < P.circles.length; k++) {
        imp = collideCircle(b, P.circles[k]);
        if (imp >= 0) onHit(P.circles[k].kind, P.circles[k].ref, b, imp, P.circles[k]);
      }
      for (k = 0; k < P.flippers.length; k++) {
        imp = collideFlipper(b, P.flippers[k]);
        if (imp >= 0) onHit('flipper', P.flippers[k], b, imp);
      }
      clamp(b);   // again after flipper/bumper impulses
    }
    for (i = 0; i < balls.length; i++)
      for (var j = i + 1; j < balls.length; j++)
        if (balls[i].state === 'play' && balls[j].state === 'play') collideBalls(balls[i], balls[j]);
  };
  window.PHYS = P;
})();
