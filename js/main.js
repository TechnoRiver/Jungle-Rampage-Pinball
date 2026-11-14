/* Jungle Rampage Pinball v3 - boot: load sprite sheets + playfield video with a progress bar, then launch. */
(function () {
  'use strict';
  var JR = window.JR, T = window.TABLE, P = window.PHYS, A = window.SPRITE_ATLAS, G = JR.G, S = JR.Settings.S, CFG = JR.CFG;
  var STEP = 1 / 120, SUB = 4, canvas = JR.canvas;

  // ---------------------------------------------------------------- optional looping video background
  // Hidden <video muted loop playsinline autoplay>; frames are only ever drawn with drawImage (never read back),
  // so it works from file:// without tainting issues. Missing files simply fall back to the static playfield.
  var V = CFG.video;
  JR.videoXform = { x: V.x, y: V.y, w: V.w, h: V.h };
  JR.video = { el: null, ready: false, failed: false };
  JR.booted = false;
  function makeVideoEl() {
    var v = document.createElement('video');
    v.muted = true; v.defaultMuted = true; v.loop = true; v.autoplay = true; v.playsInline = true; v.preload = 'auto';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
    v.className = 'bgvideo';
    v.addEventListener('playing', function () { JR.video.ready = true; JR.video.failed = false; });
    return v;
  }
  function mountVideo(v) {
    if (!v || v.parentNode) return;
    document.body.appendChild(v);
    JR.video.el = v;
    var p = v.play(); if (p && p.catch) p.catch(function () { /* will retry on first input */ });
  }
  // Both files are listed, same as a local open. The browser plays the first one it can
  // decode and falls through to playfield.mp4 when WebM is missing or has no server type.
  function addSources(v, onAllFailed) {
    var failed = 0, added = 0;
    (V.sources || []).forEach(function (s) {
      if (v.canPlayType && !v.canPlayType(s[1])) { failed++; return; }
      var src = document.createElement('source');
      src.src = s[0];
      src.type = s[1];
      src.addEventListener('error', function () {
        failed++;
        if (failed >= V.sources.length && onAllFailed) onAllFailed();
      });
      v.appendChild(src);
      added++;
    });
    return added;
  }
  function setupVideo(onAllFailed) {
    if (JR.video.el || JR.video.failed) return JR.video.el;
    var v = makeVideoEl();
    var added = addSources(v, function () {
      JR.video.failed = true; JR.video.ready = false;
      if (onAllFailed) onAllFailed();
    });
    if (!added) { JR.video.failed = true; if (onAllFailed) onAllFailed(); return null; }
    mountVideo(v);
    return v;
  }
  function videoChanged() {
    if (S.video) { setupVideo(); if (JR.video.el) { var p = JR.video.el.play(); if (p && p.catch) p.catch(function () {}); } }
    else if (JR.video.el) JR.video.el.pause();
  }
  window.addEventListener('pointerdown', function () { if (S.video && JR.video.el && JR.video.el.paused) videoChanged(); });
  window.addEventListener('keydown', function () { if (S.video && JR.video.el && JR.video.el.paused) videoChanged(); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && G.mode === 'play' && !G.paused) JR.input.togglePause();
  });

  // ---------------------------------------------------------------- layout: portrait fills height; landscape adds side panels
  function fit() {
    var w = window.innerWidth, h = window.innerHeight, land = w > h * 1.05;
    document.body.classList.toggle('landscape', land);
    var availW = land ? Math.max(w * 0.42, w - 2 * Math.min(340, w * 0.28)) : w;
    var s = Math.min(availW / T.W, h / T.H);
    canvas.style.width = Math.floor(T.W * s) + 'px';
    canvas.style.height = Math.floor(T.H * s) + 'px';
  }
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', fit);

  // ---------------------------------------------------------------- fixed-step simulation, interpolated rendering
  function snapshot() {
    for (var i = 0; i < G.balls.length; i++) { var b = G.balls[i]; b.px = b.x; b.py = b.y; }
    for (var j = 0; j < P.flippers.length; j++) P.flippers[j].rAng0 = P.flippers[j].ang;
  }
  function step() {
    snapshot();
    JR.rules.update(STEP, SUB);
    // a ball that teleported (tunnel exit, lock slot, new ball) must not be smeared across the table
    for (var i = 0; i < G.balls.length; i++) { var b = G.balls[i]; if (Math.abs(b.x - b.px) > 120 || Math.abs(b.y - b.py) > 120 || b.px === undefined) { b.px = b.x; b.py = b.y; } }
  }
  function draw(alpha) { JR.render.render(alpha); JR.hud.drawHUD(); }
  var last = 0, acc = 0;
  function frame(ts) {
    var dt = last ? Math.min(0.1, (ts - last) / 1000) : STEP; last = ts;
    if (!G.paused && !(JR.ui && JR.ui.isOpen())) { acc += dt; while (acc >= STEP) { step(); acc -= STEP; } }
    draw(G.paused ? 1 : acc / STEP);
    requestAnimationFrame(frame);
  }
  function start() {
    P.build(); P.applyFeel(S.feel); fit();
    if (S.video) {
      setupVideo();
      if (JR.video.el && JR.video.el.paused) {
        var play = JR.video.el.play(); if (play && play.catch) play.catch(function () { /* retry on first input */ });
      }
    }
    showProgress(100);
    var ld = document.getElementById('loading');
    if (ld) { ld.setAttribute('aria-busy', 'false'); ld.style.display = 'none'; }
    document.documentElement.setAttribute('data-booted', '1');
    JR.booted = true;
    snapshot();
    requestAnimationFrame(frame);
  }
  JR.main = { videoChanged: videoChanged, fit: fit, step: step, draw: draw };
  // debugging / automated test hook
  window.__pinball = { G: G, P: P, JR: JR, rules: JR.rules, startGame: JR.rules.startGame, flip: JR.rules.flip, plunger: JR.rules.plunger,
    update: JR.rules.update, step: step, render: draw, newBall: JR.rules.newBall };

  // ---------------------------------------------------------------- packaged boot: byte progress for the sheets + the one playfield video this browser can play
  // Hints only. A Content-Length (or the blob size) replaces them so the bar matches the real download.
  var SIZE_HINT = {
    'assets/overlay.png': 532870,
    'assets/playfield.webp': 612010,
    'assets/moving.png': 1459766,
    'assets/targets.png': 396121,
    'assets/ui.png': 507496,
    'assets/playfield.webm': 27400916,
    'assets/playfield.mp4': 23603789
  };
  var jobs = [], paintQueued = false, announced = -1;
  function track(weight) {
    var job = { weight: weight > 0 ? weight : 1, frac: 0 };
    jobs.push(job);
    return function (frac, bytesTotal) {
      if (bytesTotal > 0) job.weight = bytesTotal;
      job.frac = frac < 0 ? 0 : (frac > 1 ? 1 : frac);
      schedulePaint();
    };
  }
  function overall() {
    var t = 0, l = 0, i;
    for (i = 0; i < jobs.length; i++) { t += jobs[i].weight; l += jobs[i].weight * jobs[i].frac; }
    return t ? l / t : 0;
  }
  function showProgress(pct) {
    var fill = document.getElementById('boot-fill');
    var bar = document.getElementById('boot-bar');
    var st = document.getElementById('boot-status');
    if (fill) fill.style.width = pct + '%';
    if (bar) { bar.setAttribute('aria-valuenow', String(pct)); bar.setAttribute('aria-valuetext', pct + ' percent'); }
    if (st && !st.classList.contains('is-error') && pct !== announced) {
      st.textContent = pct >= 100 ? 'Ready' : 'Loading resources ' + pct + '%';
      announced = pct;
    }
  }
  function schedulePaint() {
    if (paintQueued) return;
    paintQueued = true;
    requestAnimationFrame(function () { paintQueued = false; showProgress(Math.round(overall() * 100)); });
  }
  function bootFail(file) {
    var st = document.getElementById('boot-status');
    var ld = document.getElementById('loading');
    if (ld) ld.setAttribute('aria-busy', 'false');
    if (st) {
      st.classList.add('is-error');
      st.textContent = 'Could not load ' + file + '. Keep the assets folder next to index.html.';
    }
  }
  function loadImage(url, im, setFrac) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      function succeed() { if (settled) return; settled = true; setFrac(1); resolve(); }
      function fail() { if (settled) return; settled = true; reject(url); }
      function viaTag() {
        im.onload = function () { succeed(); };
        im.onerror = function () { fail(); };
        im.src = url;
      }
      // file:// cannot report download bytes; the image element still loads the sheet.
      if (location.protocol === 'file:') { viaTag(); return; }
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'blob';
      xhr.onprogress = function (e) {
        if (settled) return;
        var total = e.lengthComputable ? e.total : 0;
        if (total) setFrac(e.loaded / total, total);
        else if (e.loaded) setFrac(Math.min(0.95, e.loaded / (SIZE_HINT[url] || e.loaded)));
      };
      xhr.onload = function () {
        if (settled) return;
        if (!xhr.response || (xhr.status && (xhr.status < 200 || xhr.status >= 300))) { fail(); return; }
        var blobUrl = URL.createObjectURL(xhr.response);
        im.onload = function () { URL.revokeObjectURL(blobUrl); succeed(); };
        im.onerror = function () { URL.revokeObjectURL(blobUrl); fail(); };
        im.src = blobUrl;
      };
      xhr.onerror = function () { if (!settled) viaTag(); };
      try { xhr.send(); } catch (err) { viaTag(); }
    });
  }
  function pickVideoSource() {
    var probe = document.createElement('video'), i, support;
    if (!V.sources || !V.sources.length) return null;
    for (i = 0; i < V.sources.length; i++) {
      support = probe.canPlayType ? probe.canPlayType(V.sources[i][1]) : '';
      if (support === 'probably' || support === 'maybe') return V.sources[i];
    }
    return null;
  }
  // Play the file URL directly (not a blob) so hosted playback matches a local open.
  // The bar follows how much of the playfield video the browser has buffered.
  function preloadVideo(setFrac) {
    return new Promise(function (resolve) {
      if (!S.video) { setFrac(1); resolve(); return; }
      var settled = false;
      function finish() {
        if (settled) return;
        settled = true;
        setFrac(1);
        resolve();
      }
      var v = setupVideo(finish);
      if (!v) { finish(); return; }
      function tick() {
        if (settled) return;
        try {
          var d = v.duration;
          if (d && isFinite(d) && v.buffered.length) {
            setFrac(Math.min(0.99, v.buffered.end(v.buffered.length - 1) / d));
          }
        } catch (e) { /* duration not known yet */ }
      }
      v.addEventListener('progress', tick);
      v.addEventListener('canplaythrough', finish);
      v.addEventListener('playing', finish);
      // Slow hosts: start once the movie can play. Never mark it failed just for being slow.
      setTimeout(function () { if (!settled && (JR.video.ready || v.readyState >= 3)) finish(); }, 20000);
      setTimeout(finish, 45000);
    });
  }

  var tasks = [];
  Object.keys(A.sheets).forEach(function (k) {
    var im = new Image();
    JR.images[k] = im;
    var file = A.sheets[k].file;
    tasks.push(loadImage(file, im, track(SIZE_HINT[file] || 500000)));
  });
  var videoSrc = pickVideoSource();
  if (S.video && videoSrc) tasks.push(preloadVideo(track(SIZE_HINT[videoSrc[0]] || 20000000)));
  else if (S.video) JR.video.failed = true;

  // the jungle lettering font is embedded in css/fonts.css; wait for it (max 1.5 s) so the first frame uses it
  var fontJob = track(80000);
  tasks.push(new Promise(function (resolve) {
    var fontDone = false;
    function fontOk() { if (fontDone) return; fontDone = true; fontJob(1); resolve(); }
    try { if (document.fonts && document.fonts.load) document.fonts.load('40px "Bangers"').then(fontOk, fontOk); else fontOk(); }
    catch (e) { fontOk(); }
    setTimeout(fontOk, 1500);
  }));

  showProgress(0);
  Promise.all(tasks).then(function () {
    try { start(); } catch (err) { bootFail(err && err.message ? err.message : 'the table'); }
  }, bootFail);
})();
