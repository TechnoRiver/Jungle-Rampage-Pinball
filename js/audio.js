/* Jungle Rampage Pinball v3 - Web Audio: layered synth effects with pitch variation, a looping jungle ambience,
   a light synthesized music bed that intensifies in modes and multiball, rolling/ramp sounds, stings and optional
   speech callouts. No audio files. */
(function () {
  'use strict';
  var JR = window.JR, S = JR.Settings.S;
  var ctx = null, master, sfxBus, musicBus, ambBus, noiseBuf, brownBuf, muted = false;
  var started = false, intensity = 0, rollGain = null, rollFilter = null;
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function ensure() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain(); master.connect(ctx.destination);
      var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(master);
      sfxBus = ctx.createGain(); sfxBus.connect(comp);
      musicBus = ctx.createGain(); musicBus.connect(comp);
      ambBus = ctx.createGain(); ambBus.connect(comp);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0), i;
      for (i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      brownBuf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
      var b = brownBuf.getChannelData(0), last = 0;
      for (i = 0; i < b.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; b[i] = last * 3.5; }
      applyLevels();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function applyLevels() {
    if (!ctx) return;
    var t = ctx.currentTime;
    master.gain.setTargetAtTime(muted ? 0 : 0.9 * S.volume, t, 0.05);
    sfxBus.gain.setTargetAtTime(S.sfx ? 0.55 : 0, t, 0.05);
    musicBus.gain.setTargetAtTime(S.music ? 0.22 : 0, t, 0.3);
    ambBus.gain.setTargetAtTime(S.music ? 0.35 : 0, t, 0.3);
  }
  // ---------------------------------------------------------------- primitives
  function tone(freq, dur, type, vol, slideTo, delay, bus) {
    if (!ensure()) return;
    var t = ctx.currentTime + (delay || 0);
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || sfxBus);
    o.start(t); o.stop(t + dur + 0.03);
  }
  function noise(dur, vol, type, freq, delay, freqTo, q, bus) {
    if (!ensure()) return;
    var t = ctx.currentTime + (delay || 0);
    var s = ctx.createBufferSource(); s.buffer = noiseBuf; s.playbackRate.value = rnd(0.9, 1.1);
    var f = ctx.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.setValueAtTime(freq || 1000, t);
    if (q) f.Q.value = q;
    if (freqTo) f.frequency.exponentialRampToValueAtTime(freqTo, t + dur);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus || sfxBus);
    s.start(t, Math.random()); s.stop(t + dur + 0.03);
  }
  function pv() { return rnd(0.94, 1.06); }    // pitch variation so repeated hits are never identical
  // ---------------------------------------------------------------- effects (each = tone layer + noise burst)
  var FX = {
    flipper: function () { var p = pv(); noise(0.05, 0.22, 'highpass', 2600 * p); tone(150 * p, 0.05, 'square', 0.07, 90); noise(0.04, 0.15, 'lowpass', 400); },
    flipperHit: function (v) { tone(90 * pv(), 0.07, 'sine', 0.12 + 0.2 * Math.min(1, v || 0), 50); },
    bumper: function () { var p = pv(); tone(520 * p, 0.12, 'square', 0.18, 170 * p); tone(1040 * p, 0.06, 'triangle', 0.08); noise(0.09, 0.22, 'bandpass', 1800 * p, 0, 600, 1.5); },
    sling: function () { var p = pv(); tone(330 * p, 0.09, 'square', 0.16, 150); noise(0.06, 0.2, 'highpass', 3000 * p); noise(0.08, 0.15, 'lowpass', 500); },
    post: function () { var p = pv(); tone(700 * p, 0.08, 'triangle', 0.22, 420 * p); noise(0.03, 0.12, 'highpass', 5000); },
    target: function () { var p = pv(); tone(880 * p, 0.1, 'triangle', 0.22); tone(1320 * p, 0.08, 'triangle', 0.13, null, 0.05); noise(0.05, 0.14, 'bandpass', 2500 * p); },
    drop: function () { var p = pv(); tone(300 * p, 0.16, 'sawtooth', 0.15, 110); noise(0.12, 0.22, 'lowpass', 900 * p, 0, 200); },
    dropsReset: function () { [400, 500, 600].forEach(function (f, i) { tone(f * pv(), 0.08, 'square', 0.12, null, i * 0.06); noise(0.04, 0.1, 'highpass', 3000, i * 0.06); }); },
    lane: function () { var p = pv(); tone(1200 * p, 0.08, 'sine', 0.22); tone(1600 * p, 0.08, 'sine', 0.18, null, 0.06); },
    letter: function () { var p = pv(); tone(660 * p, 0.1, 'square', 0.14); tone(990 * p, 0.12, 'square', 0.14, null, 0.08); noise(0.06, 0.1, 'bandpass', 3000); },
    ramp: function (len) { var d = len || 0.8; tone(260 * pv(), d, 'sawtooth', 0.08, 900); noise(d, 0.16, 'bandpass', 500, 0, 2600, 2); },
    rampReject: function () { noise(0.5, 0.12, 'bandpass', 1400, 0, 300, 2); tone(500, 0.4, 'triangle', 0.08, 200); },
    loop: function () { tone(500 * pv(), 0.35, 'triangle', 0.18, 1500); noise(0.4, 0.12, 'bandpass', 800, 0, 3000, 2); },
    lock: function () { [220, 330, 440].forEach(function (f, i) { tone(f, 0.22, 'square', 0.18, null, i * 0.18); }); noise(0.3, 0.15, 'lowpass', 600, 0.36); },
    saucer: function () { tone(180 * pv(), 0.2, 'square', 0.16, 90); noise(0.15, 0.2, 'lowpass', 500); },
    kick: function () { noise(0.14, 0.3, 'lowpass', 700); tone(90, 0.12, 'square', 0.18); tone(60, 0.2, 'sine', 0.25, 35); },
    jackpot: function () { stab([523, 659, 784], 0.5); [523, 659, 784, 1047, 1319, 1568].forEach(function (f, i) { tone(f, 0.16, 'square', 0.13, null, 0.1 + i * 0.07); }); noise(0.9, 0.14, 'highpass', 4000, 0.4); },
    superJackpot: function () { FX.jackpot(); stab([659, 831, 988], 0.9, 0.5); boom(0.5); },
    skill: function () { [784, 988, 1175, 1568].forEach(function (f, i) { tone(f, 0.15, 'triangle', 0.22, null, i * 0.07); }); noise(0.3, 0.1, 'highpass', 6000, 0.25); },
    multiball: function () { stab([262, 330, 392], 0.4); [262, 330, 392, 523, 392, 523, 659, 784].forEach(function (f, i) { tone(f, 0.16, 'sawtooth', 0.12, null, 0.2 + i * 0.1); }); boom(0.1); },
    mode: function () { stab([440, 554, 659], 0.35); [440, 554, 659, 880].forEach(function (f, i) { tone(f, 0.12, 'square', 0.12, null, 0.15 + i * 0.07); }); boom(0); },
    modeDone: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.25, 'triangle', 0.18, null, i * 0.12); }); stab([523, 659, 784], 0.8, 0.5); },
    wizard: function () { boom(0); stab([196, 247, 294], 0.8); stab([262, 330, 392], 0.8, 0.45); stab([349, 440, 523], 1.2, 0.9); },
    combo: function (n) { var base = 660 * Math.pow(1.12, Math.min(6, n || 2)); tone(base, 0.12, 'square', 0.14); tone(base * 1.5, 0.18, 'square', 0.14, null, 0.08); },
    roar: function () { tone(95 * pv(), 0.8, 'sawtooth', 0.25, 55); noise(0.9, 0.32, 'lowpass', 900, 0, 200); noise(0.5, 0.15, 'bandpass', 300, 0.1, 120, 3); },
    launch: function (p) { noise(0.25, 0.3 * (0.4 + p), 'bandpass', 400, 0, 2500); tone(70, 0.15, 'sine', 0.2, 40); },
    pull: function () { tone(110 * pv(), 0.04, 'square', 0.04); },
    drain: function () { tone(440, 0.9, 'sawtooth', 0.15, 55); noise(0.8, 0.12, 'lowpass', 1200, 0, 100); },
    outlane: function () { tone(330, 0.5, 'triangle', 0.15, 110); noise(0.4, 0.12, 'bandpass', 900, 0, 200); },
    ballsave: function () { tone(880, 0.12, 'sine', 0.2); tone(1175, 0.16, 'sine', 0.2, null, 0.15); },
    extraball: function () { [392, 523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.2, 'triangle', 0.2, null, i * 0.09); }); stab([523, 659, 784], 0.9, 0.5); },
    tilt: function () { tone(70, 1.0, 'square', 0.25); noise(0.6, 0.2, 'lowpass', 300); },
    warning: function () { tone(220, 0.15, 'square', 0.2); tone(220, 0.15, 'square', 0.2, null, 0.25); },
    nudge: function () { noise(0.12, 0.3, 'lowpass', 300); tone(55, 0.12, 'sine', 0.25, 35); },
    start: function () { [392, 523, 659, 784].forEach(function (f, i) { tone(f, 0.14, 'square', 0.15, null, i * 0.1); }); boom(0.4); },
    gameover: function () { [523, 392, 330, 262].forEach(function (f, i) { tone(f, 0.3, 'triangle', 0.2, null, i * 0.25); }); },
    bonus: function () { tone(1000 * pv(), 0.04, 'square', 0.08); },
    thud: function () { tone(70 * pv(), 0.05, 'sine', 0.13); noise(0.03, 0.08, 'lowpass', 400); },
    click: function () { tone(1400, 0.03, 'square', 0.06); }
  };
  function stab(freqs, dur, delay) { freqs.forEach(function (f) { tone(f, dur, 'sawtooth', 0.07, null, delay || 0); tone(f * 2, dur * 0.6, 'square', 0.03, null, delay || 0); }); }
  function boom(delay) { tone(110, 0.5, 'sine', 0.35, 38, delay); noise(0.3, 0.2, 'lowpass', 220, delay); }

  // ---------------------------------------------------------------- ambience: wind/water bed + birds + insects
  var nextBird = 0, nextInsect = 0;
  function startAmbience() {
    var s = ctx.createBufferSource(); s.buffer = brownBuf; s.loop = true;
    var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
    var g = ctx.createGain(); g.gain.value = 0.55;
    var lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 250;
    lfo.connect(lg); lg.connect(f.frequency); lfo.start();
    s.connect(f); f.connect(g); g.connect(ambBus); s.start();
    // continuous rolling-ball noise, level driven by ball speed
    var r = ctx.createBufferSource(); r.buffer = brownBuf; r.loop = true;
    rollFilter = ctx.createBiquadFilter(); rollFilter.type = 'lowpass'; rollFilter.frequency.value = 300;
    rollGain = ctx.createGain(); rollGain.gain.value = 0;
    r.connect(rollFilter); rollFilter.connect(rollGain); rollGain.connect(sfxBus); r.start();
  }
  function bird(t) {
    var o = ctx.createOscillator(), g = ctx.createGain(), base = rnd(1800, 3600), n = 2 + (Math.random() * 4 | 0);
    o.type = 'sine';
    for (var i = 0; i < n; i++) {
      var tt = t + i * rnd(0.08, 0.14);
      o.frequency.setValueAtTime(base * rnd(0.9, 1.1), tt);
      o.frequency.exponentialRampToValueAtTime(base * rnd(1.2, 1.6), tt + 0.06);
      g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.05, tt + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.07);
    }
    o.connect(g); g.connect(ambBus); o.start(t); o.stop(t + n * 0.15 + 0.1);
  }
  // ---------------------------------------------------------------- music bed (A minor pentatonic, 16th-note scheduler)
  var step = 0, nextNote = 0;
  var BASS = [45, 45, 48, 45, 50, 48, 45, 43];          // midi, one per beat (2 bars)
  var ARP = [69, 72, 74, 76, 79, 76, 74, 72];
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function schedule() {
    if (!ctx || !S.music) return;
    var bpm = [96, 112, 128][intensity], sp = 60 / bpm / 4;
    if (nextNote < ctx.currentTime) nextNote = ctx.currentTime + 0.05;
    while (nextNote < ctx.currentTime + 0.25) {
      var t = nextNote - ctx.currentTime, beat = step % 16 === 0 || step % 16 === 8 || (intensity > 0 && step % 4 === 0);
      if (step % 4 === 0) tone(mtof(BASS[(step / 4) % 8]), sp * 3.2, 'triangle', 0.22, null, t, musicBus);
      if (beat) { tone(120, 0.18, 'sine', 0.3, 45, t, musicBus); }
      if (step % 2 === 1) noise(0.04, intensity > 1 ? 0.1 : 0.05, 'highpass', 7000, t, null, null, musicBus);
      if (step % 8 === 4) noise(0.12, 0.08 + 0.05 * intensity, 'bandpass', 900, t, 400, 3, musicBus);   // log-drum tok
      if (intensity >= 1 && step % 2 === 0) { var m = ARP[(step / 2) % 8] + (intensity > 1 && step % 32 >= 16 ? 5 : 0); tone(mtof(m), sp * 1.6, 'sine', 0.08, null, t, musicBus); tone(mtof(m) * 3, sp * 0.6, 'sine', 0.02, null, t, musicBus); }
      if (intensity >= 2 && step % 16 === 0) stabMusic(t);
      step++; nextNote += sp;
    }
    // ambience events
    var now = ctx.currentTime;
    if (now > nextBird) { bird(now + 0.05); nextBird = now + rnd(1.5, 5); }
    if (now > nextInsect) { noise(rnd(0.6, 1.4), 0.03, 'bandpass', rnd(4500, 6500), 0.05, null, 12, ambBus); nextInsect = now + rnd(2, 6); }
  }
  function stabMusic(t) { [57, 60, 64].forEach(function (m) { tone(mtof(m), 0.3, 'sawtooth', 0.04, null, t, musicBus); }); }
  setInterval(function () { try { schedule(); } catch (e) { /* ignore */ } }, 90);

  var voices = null;
  JR.Audio = {
    play: function (name, arg) { try { if (FX[name] && !muted) FX[name](arg); } catch (e) { /* ignore */ } },
    unlock: function () { if (!ensure()) return; if (!started) { started = true; startAmbience(); } },
    toggleMute: function () { muted = !muted; applyLevels(); return muted; },
    isMuted: function () { return muted; },
    apply: applyLevels,
    setIntensity: function (n) { intensity = Math.max(0, Math.min(2, n | 0)); },
    setRolling: function (level, pitch) {   // level 0..1 from the fastest rolling ball
      if (!rollGain) return;
      var t = ctx.currentTime;
      rollGain.gain.setTargetAtTime(S.sfx && !muted ? 0.25 * level : 0, t, 0.08);
      rollFilter.frequency.setTargetAtTime(180 + 900 * (pitch || level), t, 0.08);
    },
    speak: function (text) {   // optional speech callouts (Settings > Voice callouts)
      if (!S.voice || muted || !window.speechSynthesis) return;
      try {
        var u = new SpeechSynthesisUtterance(text); u.rate = 1.05; u.pitch = 0.7; u.volume = Math.min(1, S.volume + 0.1);
        window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
      } catch (e) { /* ignore */ }
    }
  };
  window.SFX = JR.Audio;
})();
