/* Jungle Rampage Pinball v3 - player settings, key bindings and the local top-10, stored in localStorage. */
(function () {
  'use strict';
  var JR = window.JR, KEY = 'jungleRampage.settings.v3', LB_KEY = 'jungleRampage.top10.v3';
  var reduced = false;
  try { reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* ignore */ }
  var DEFAULT_KEYS = {
    left: ['KeyZ', 'ArrowLeft', 'ShiftLeft'], right: ['Slash', 'ArrowRight', 'ShiftRight'],
    launch: ['Space', 'ArrowDown'], start: ['Enter', 'KeyS'],
    nudgeLeft: ['KeyX'], nudgeRight: ['Period'], nudgeUp: ['ArrowUp', 'KeyN'],
    pause: ['KeyP', 'Escape'], mute: ['KeyM'], settings: ['KeyO']
  };
  var ACTION_LABELS = { left: 'Left flipper', right: 'Right flipper', launch: 'Launch (hold)', start: 'Start game',
    nudgeLeft: 'Nudge from left', nudgeRight: 'Nudge from right', nudgeUp: 'Nudge up', pause: 'Pause', mute: 'Mute', settings: 'Settings' };
  var DEFAULTS = { feel: 'classic', video: true, music: true, sfx: true, volume: 0.8, voice: false, haptics: true,
    reducedMotion: reduced, shakeNudge: true, keys: DEFAULT_KEYS };
  var S = JSON.parse(JSON.stringify(DEFAULTS));
  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved) for (var k in saved) if (k in S) S[k] = saved[k];
    for (var a in DEFAULT_KEYS) if (!S.keys[a]) S.keys[a] = DEFAULT_KEYS[a].slice();
  } catch (e) { /* storage blocked: defaults */ }

  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }
  function actionFor(code) {
    for (var a in S.keys) if (S.keys[a].indexOf(code) >= 0) return a;
    return null;
  }
  // readable key names for the controls card: no ambiguous "/" separators
  function keyName(code) {
    var map = { ArrowLeft: '\u2190', ArrowRight: '\u2192', ArrowUp: '\u2191', ArrowDown: '\u2193', Space: 'SPACE', Slash: '/',
      ShiftLeft: 'L-SHIFT', ShiftRight: 'R-SHIFT', Enter: 'ENTER', Escape: 'ESC', Period: '.', Comma: ',', Semicolon: ';',
      ControlLeft: 'L-CTRL', ControlRight: 'R-CTRL', AltLeft: 'L-ALT', AltRight: 'R-ALT', Backspace: 'BKSP', Tab: 'TAB' };
    if (map[code]) return map[code];
    if (/^Key[A-Z]$/.test(code)) return code.slice(3);
    if (/^Digit\d$/.test(code)) return code.slice(5);
    return code;
  }
  function remap(action, code) {
    // a key can only drive one action: remove it elsewhere, then make it the action's primary key
    for (var a in S.keys) S.keys[a] = S.keys[a].filter(function (c) { return c !== code; });
    S.keys[action] = [code].concat(S.keys[action].filter(function (c, i) { return i > 0; })).slice(0, 3);
    save();
  }
  function resetKeys() { S.keys = JSON.parse(JSON.stringify(DEFAULT_KEYS)); save(); }

  // ---------------------------------------------------------------- local top-10 leaderboard
  var board = [];
  try { board = JSON.parse(localStorage.getItem(LB_KEY) || '[]') || []; } catch (e) { board = []; }
  function saveBoard() { try { localStorage.setItem(LB_KEY, JSON.stringify(board)); } catch (e) { /* ignore */ } }
  function qualifies(score) {
    if (score <= 0) return false;
    return board.length < JR.CFG.leaderboard.size || score > board[board.length - 1].score;
  }
  function addScore(initials, score) {
    board.push({ name: initials, score: score, date: new Date().toISOString().slice(0, 10) });
    board.sort(function (a, b) { return b.score - a.score; });
    board = board.slice(0, JR.CFG.leaderboard.size);
    saveBoard();
    for (var i = 0; i < board.length; i++) if (board[i].name === initials && board[i].score === score) return i;
    return -1;
  }
  JR.Settings = {
    S: S, save: save, actionFor: actionFor, keyName: keyName, remap: remap, resetKeys: resetKeys, ACTION_LABELS: ACTION_LABELS,
    board: function () { return board; }, qualifies: qualifies, addScore: addScore,
    clearBoard: function () { board = []; saveBoard(); },
    best: function () { return board.length ? board[0].score : 0; }
  };
})();
