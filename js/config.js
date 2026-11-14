/* Jungle Rampage Pinball v3 - ALL tunable numbers in one place: table feel presets, score values, timers, rules.
   Edit and reload index.html. (Plain script: works from file://.) */
(function () {
  'use strict';
  var M = 1000000, K = 1000;
  window.JR = window.JR || {};
  window.JR.CFG = {
    // ---------------------------------------------------------------- table feel presets
    // gravity px/s^2 | maxSpeed px/s cap | flipUp/flipDown rad/s | *E = restitution | kicks = active kick speed (px/s)
    // plunge = plunger speed range [min, max] (max always reaches the top of the launch arc)
    feel: {
      casual:  { label: 'Casual',  gravity: 1250, maxSpeed: 3000, damping: 0.16, flipUp: 11, flipDown: 9,
                 flipE: 0.20, flipEStill: 0.10, wallE: 0.33, slingE: 0.45, bumperE: 0.45, postE: 0.45,
                 kicks: { bumper: 660, sling: 500, post: 340 }, plunge: [1880, 2500], kickbackEachBall: true },
      classic: { label: 'Classic', gravity: 1600, maxSpeed: 3400, damping: 0.13, flipUp: 12.5, flipDown: 10,
                 flipE: 0.22, flipEStill: 0.12, wallE: 0.40, slingE: 0.50, bumperE: 0.50, postE: 0.50,
                 kicks: { bumper: 760, sling: 580, post: 380 }, plunge: [2080, 2820] },
      fast:    { label: 'Fast',    gravity: 2000, maxSpeed: 4000, damping: 0.10, flipUp: 14.5, flipDown: 11,
                 flipE: 0.25, flipEStill: 0.14, wallE: 0.46, slingE: 0.55, bumperE: 0.55, postE: 0.55,
                 kicks: { bumper: 860, sling: 660, post: 430 }, plunge: [2240, 3150] }
    },
    // ---------------------------------------------------------------- score values
    score: {
      bumper: 25 * K, bumperMode: 50 * K, post: 10 * K, sling: 5010,
      lane: 50 * K, laneRepeat: 10 * K, laneComplete: 500 * K,
      letter: 100 * K, letterRepeat: 25 * K, jungleWord: 2 * M,
      drop: 75 * K, dropBank: 1 * M,
      anaconda: 200 * K, anacondaSqueeze: 2 * M,
      tiger: 200 * K,
      temple: 250 * K, jackpot: 10 * M, jackpotStep: 5 * M, superJackpot: 40 * M,
      ramp: { waterfall: 1 * M, river: 750 * K, rapids: 1 * M, loop: 500 * K },
      rampReject: 20 * K,
      combo: 1.5 * M, comboStep: 1 * M,            // 2nd ramp within comboWindow = combo; each further one +comboStep
      saucerUnlit: 150 * K, lockBall: 500 * K, multiballStart: 2 * M,
      inlane: 100 * K, vineLit: 500 * K, outlane: 50 * K,
      skillShot: [6 * M, 8 * M, 4 * M],            // skill-shot zones 1 (soft plunge) .. 3 (full plunge)
      expeditionShot: 3 * M, expeditionComplete: 15 * M,
      huntStep: 5 * M, huntComplete: 20 * M,
      wizardShot: 5 * M, wizardComplete: 75 * M,
      special: 25 * M, extraBall: 5 * M,
      bonusSwitch: 5 * K, bonusLetter: 100 * K, bonusMode: 1 * M, bonusTiger: 50 * K
    },
    // ---------------------------------------------------------------- timers (seconds)
    time: {
      ballSaveFirst: 10, ballSaveLater: 5,           // after each plunge: ball 1 is forgiving, later balls less so
      ballSaveMode: 3, ballSaveMultiball: 10, ballSaveWizard: 15,
      expedition: 40, tigerHunt: 35, wizard: 45,
      comboWindow: 4.0, skillZoneCycle: 0.9, dropReset: 1.3,
      rescueAfter: 4.0,                               // a ball that is genuinely stuck (not cradled) is rescued after this
      saucerHold: 0.9, lockReleaseGap: 1.2, hitStop: 0.045
    },
    // ---------------------------------------------------------------- rules
    rules: {
      ballsPerGame: 3, bonusXMax: 6, tiltWarnings: 2, tiltDecay: 0.35, tiltLimit: 3.2,
      saucerMaxSpeed: 1500,         // only shots slower than this are caught...
      saucerUpwardOnly: true,       // ...and only when they were shot UP into it (falling balls pass over: no hidden ball saver)
      saucerKick: 1150,             // kick-out speed; direction follows the entry direction (see rules.js)
      extraBallAtBonusX: 4,         // reaching this bonus multiplier lights EXTRA BALL at the lock
      specialAtJungle: 3,           // spelling J-U-N-G-L-E this many times lights SPECIAL
      rampMinSpeed: { waterfall: 1150, river: 900, rapids: 950, loop: 1000 },   // slower shots roll back out
      rampAltSpeed: { waterfall: 1900, loop: 1950 },                         // faster shots take the long route
      kickbackSpeed: 2500,          // outlane kickback launch speed (lit by completing the top lanes; Casual: lit every ball)
      comboMax: 6,                  // combo value stops growing after a 6-way combo
      huntSequence: ['loop', 'tiger', 'rapids', 'jackpot']                    // Tiger Hunt: these shots, in order
    },
    // looping background video (optional). List the files here (tools/make_video.sh does it for you), e.g.
    //   sources: [['assets/playfield.webm', 'video/webm'], ['assets/playfield.mp4', 'video/mp4']]
    // The video is drawn under assets/overlay.png; with no sources (or Settings > Video off) the static
    // assets/playfield.webp is used. x/y/w/h place the video frame in table pixels to line up with the geometry.
    // (An empty list avoids 404 noise in the console: file:// pages cannot test whether a file exists.)
    video: { sources: [['assets/playfield.webm', 'video/webm'], ['assets/playfield.mp4', 'video/mp4']], x: 0, y: 0, w: 1080, h: 1920 },
    leaderboard: { size: 10 }      // local top-10 with initials, starts empty
  };
})();
