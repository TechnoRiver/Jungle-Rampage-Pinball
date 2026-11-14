/* Jungle Rampage Pinball v3 - DOM settings panel (feel, video, audio, accessibility, key remapping, scores)
   and the landscape side panels. */
(function () {
  'use strict';
  var JR = window.JR, ST = JR.Settings, S = ST.S, AU = JR.Audio, G = JR.G;
  var panel = document.getElementById('settings'), capture = null, wasPaused = false;

  function row(label, control) { return '<label class="row"><span>' + label + '</span>' + control + '</label>'; }
  function check(id) { return '<input type="checkbox" id="s_' + id + '"' + (S[id] ? ' checked' : '') + '>'; }
  function build() {
    var h = '<div class="card"><h2>SETTINGS</h2>';
    h += row('Feel', '<select id="s_feel"><option value="casual">Casual (slow, forgiving)</option><option value="classic">Classic</option><option value="fast">Fast (arcade)</option></select>');
    h += row('Video background' + (JR.video && JR.video.failed ? ' <small>(no video file listed in js/config.js)</small>' : ''), check('video'));
    h += row('Music', check('music')) + row('Sound effects', check('sfx'));
    h += row('Volume', '<input type="range" id="s_volume" min="0" max="1" step="0.05" value="' + S.volume + '">');
    h += row('Spoken callouts', check('voice')) + row('Haptics (vibration)', check('haptics'));
    h += row('Reduced motion', check('reducedMotion')) + row('Shake phone to nudge', check('shakeNudge'));
    h += '<h3>KEYS <small>click a key, then press the new one</small></h3><div class="keys">';
    for (var a in ST.ACTION_LABELS) {
      h += '<div class="krow"><span>' + ST.ACTION_LABELS[a] + '</span><button data-act="' + a + '">' +
        (S.keys[a] || []).map(ST.keyName).join(' or ') + '</button></div>';
    }
    h += '</div><div class="btns"><button id="s_resetKeys">Reset keys</button><button id="s_clear">Clear top 10</button><button id="s_close" class="go">Close</button></div></div>';
    panel.innerHTML = h;
    panel.querySelector('#s_feel').value = S.feel;
    ['video', 'music', 'sfx', 'voice', 'haptics', 'reducedMotion', 'shakeNudge'].forEach(function (id) {
      panel.querySelector('#s_' + id).addEventListener('change', function (e) { S[id] = e.target.checked; ST.save(); AU.apply(); if (id === 'video' && JR.main) JR.main.videoChanged(); });
    });
    panel.querySelector('#s_feel').addEventListener('change', function (e) { S.feel = e.target.value; ST.save(); window.PHYS.applyFeel(S.feel); });
    panel.querySelector('#s_volume').addEventListener('input', function (e) { S.volume = +e.target.value; ST.save(); AU.apply(); });
    panel.querySelectorAll('.keys button').forEach(function (btn) {
      btn.addEventListener('click', function () { capture = btn.getAttribute('data-act'); btn.textContent = 'press a key\u2026'; btn.classList.add('wait'); });
    });
    panel.querySelector('#s_resetKeys').addEventListener('click', function () { ST.resetKeys(); build(); });
    panel.querySelector('#s_clear').addEventListener('click', function () { if (window.confirm('Clear the local top-10 scores?')) ST.clearBoard(); });
    panel.querySelector('#s_close').addEventListener('click', close);
  }
  function open() {
    if (isOpen()) return;
    wasPaused = G.paused; if (G.mode === 'play') { G.paused = true; JR.rules.flip('L', false); JR.rules.flip('R', false); }
    build(); panel.hidden = false;
  }
  function close() { panel.hidden = true; capture = null; if (G.mode === 'play' && !wasPaused) G.paused = false; }
  function isOpen() { return !panel.hidden; }
  function onKey(e) {
    if (!isOpen()) return false;
    if (capture) { e.preventDefault(); if (e.code !== 'Escape') ST.remap(capture, e.code); capture = null; build(); return true; }
    if (e.code === 'Escape' || ST.actionFor(e.code) === 'settings') { e.preventDefault(); close(); }
    return true;   // the game ignores keys while the panel is open
  }
  JR.ui = { open: open, close: close, onKey: onKey, isOpen: isOpen };

  // ---------------------------------------------------------------- landscape side panels
  var sideL = document.getElementById('sideL'), sideR = document.getElementById('sideR'), last = '';
  function sideUpdate() {
    if (!document.body.classList.contains('landscape')) return;
    var K = S.keys, m = G.modes, goal = 'Spell J-U-N-G-L-E, complete the lanes, light the tiger lock.';
    if (m.wizard) goal = 'TEMPLE OF GOLD: hit every gold shot!'; else if (G.multiball) goal = 'MULTIBALL: shoot the JACKPOT target.';
    else if (m.hunt) goal = 'TIGER HUNT: follow the sequence.'; else if (m.expedition) goal = 'EXPEDITION: ride all four ramps.';
    else if (G.lockLit) goal = 'Lock is lit: shoot the tiger lock (saucer).';
    var l = '<h2>JUNGLE RAMPAGE</h2><p class="goal">' + goal + '</p><h3>PROGRESS</h3><ul>' +
      '<li>Bonus x' + G.bonusX + '</li><li>Locked balls ' + G.locked.length + ' / 3</li>' +
      '<li>Expedition ' + (G.done.expedition ? '\u2713' : '\u2013') + '</li><li>Tiger Hunt ' + (G.done.hunt ? '\u2713' : '\u2013') + '</li>' +
      '<li>Multiball ' + (G.done.multiball ? '\u2713' : '\u2013') + '</li><li>Wizard ' + (G.wizardReady ? 'READY' : '\u2013') + '</li></ul>' +
      '<h3>CONTROLS</h3><ul class="kc"><li><kbd>' + ST.keyName(K.left[0]) + '</kbd> <kbd>' + ST.keyName(K.left[1] || '') + '</kbd> left flipper</li>' +
      '<li><kbd>' + ST.keyName(K.right[0]) + '</kbd> <kbd>' + ST.keyName(K.right[1] || '') + '</kbd> right flipper</li>' +
      '<li><kbd>' + ST.keyName(K.launch[0]) + '</kbd> launch (hold)</li><li><kbd>' + ST.keyName(K.nudgeLeft[0]) + '</kbd> <kbd>' + ST.keyName(K.nudgeUp[0]) + '</kbd> <kbd>' + ST.keyName(K.nudgeRight[0]) + '</kbd> nudge</li>' +
      '<li><kbd>' + ST.keyName(K.pause[0]) + '</kbd> pause &nbsp;<kbd>' + ST.keyName(K.settings[0]) + '</kbd> settings</li></ul>';
    var r = '<h2>TOP 10</h2><ol>' + (ST.board().length ? ST.board().map(function (e) { return '<li><b>' + e.name + '</b> ' + JR.core.fmt(e.score) + '</li>'; }).join('') : '<li>No scores yet</li>') + '</ol>';
    var key = l + r; if (key === last) return; last = key;
    sideL.innerHTML = l; sideR.innerHTML = r;
  }
  setInterval(sideUpdate, 400);
})();
