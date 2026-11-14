/* Jungle Rampage Pinball - SPRITE ATLAS
   Every sheet is a 9:16 PNG (1080x1920). v2/v3: playfield.webp (static table, also the video poster) and moving.png use the user's painted art;
   overlay.png (v3) is drawn over the optional background video (assets/playfield.webm/.mp4). Cells sit on a regular grid:
     cell (col,row) inner rect:
        x = originX + line + col * (cellW + line)
        y = originY + line + row * (cellH + line)
        w = spanC*cellW + (spanC-1)*line,  h = spanR*cellH + (spanR-1)*line
   Grid lines (cyan, `line` px) are NOT part of any cell. Cells are drawn at 1:1 scale
   in playfield pixels, centred on the object (or on `anchor`, in px inside the cell).
   Animation frames use the suffix _0, _1, _2 ... Replace art by painting over a cell in the
   PNG; keep the same grid, or edit the numbers here if you change the grid. */
window.SPRITE_ATLAS = {
 "sheets": {
  "overlay": {
   "file": "assets/overlay.png",
   "width": 1080,
   "height": 1920,
   "cols": 1,
   "rows": 1,
   "cellW": 1080,
   "cellH": 1920,
   "line": 0,
   "originX": 0,
   "originY": 0
  },
  "playfield": {
   "file": "assets/playfield.webp",
   "width": 1080,
   "height": 1920,
   "cols": 1,
   "rows": 1,
   "cellW": 1080,
   "cellH": 1920,
   "line": 0,
   "originX": 0,
   "originY": 0
  },
  "moving": {
   "file": "assets/moving.png",
   "width": 1080,
   "height": 1920,
   "cols": 5,
   "rows": 8,
   "cellW": 204,
   "cellH": 204,
   "line": 4,
   "originX": 18,
   "originY": 234
  },
  "targets": {
   "file": "assets/targets.png",
   "width": 1080,
   "height": 1920,
   "cols": 6,
   "rows": 10,
   "cellW": 170,
   "cellH": 170,
   "line": 4,
   "originX": 16,
   "originY": 160
  },
  "ui": {
   "file": "assets/ui.png",
   "width": 1080,
   "height": 1920,
   "cols": 6,
   "rows": 10,
   "cellW": 170,
   "cellH": 170,
   "line": 4,
   "originX": 16,
   "originY": 160
  }
 },
 "cells": {
  "overlay": {
   "sheet": "overlay",
   "col": 0,
   "row": 0,
   "anchor": [
    0,
    0
   ]
  },
  "playfield": {
   "sheet": "playfield",
   "col": 0,
   "row": 0,
   "anchor": [
    0,
    0
   ]
  },
  "J_0": {
   "sheet": "targets",
   "col": 0,
   "row": 0
  },
  "U_0": {
   "sheet": "targets",
   "col": 1,
   "row": 0
  },
  "N_0": {
   "sheet": "targets",
   "col": 2,
   "row": 0
  },
  "G_0": {
   "sheet": "targets",
   "col": 3,
   "row": 0
  },
  "L_0": {
   "sheet": "targets",
   "col": 4,
   "row": 0
  },
  "E_0": {
   "sheet": "targets",
   "col": 5,
   "row": 0
  },
  "J_1": {
   "sheet": "targets",
   "col": 0,
   "row": 1
  },
  "U_1": {
   "sheet": "targets",
   "col": 1,
   "row": 1
  },
  "N_1": {
   "sheet": "targets",
   "col": 2,
   "row": 1
  },
  "G_1": {
   "sheet": "targets",
   "col": 3,
   "row": 1
  },
  "L_1": {
   "sheet": "targets",
   "col": 4,
   "row": 1
  },
  "E_1": {
   "sheet": "targets",
   "col": 5,
   "row": 1
  },
  "drop_0": {
   "sheet": "targets",
   "col": 0,
   "row": 2
  },
  "drop_1": {
   "sheet": "targets",
   "col": 1,
   "row": 2
  },
  "drop_2": {
   "sheet": "targets",
   "col": 2,
   "row": 2
  },
  "standup_0": {
   "sheet": "targets",
   "col": 3,
   "row": 2
  },
  "standup_1": {
   "sheet": "targets",
   "col": 4,
   "row": 2
  },
  "standupS_0": {
   "sheet": "targets",
   "col": 5,
   "row": 2
  },
  "standupS_1": {
   "sheet": "targets",
   "col": 0,
   "row": 3
  },
  "jackpotT_0": {
   "sheet": "targets",
   "col": 1,
   "row": 3
  },
  "jackpotT_1": {
   "sheet": "targets",
   "col": 2,
   "row": 3
  },
  "lane_0": {
   "sheet": "targets",
   "col": 3,
   "row": 3
  },
  "lane_1": {
   "sheet": "targets",
   "col": 4,
   "row": 3
  },
  "anaconda_0": {
   "sheet": "targets",
   "col": 5,
   "row": 3
  },
  "anaconda_1": {
   "sheet": "targets",
   "col": 0,
   "row": 4
  },
  "tigerL_0": {
   "sheet": "targets",
   "col": 1,
   "row": 4
  },
  "tigerL_1": {
   "sheet": "targets",
   "col": 2,
   "row": 4
  },
  "arrowWater_0": {
   "sheet": "targets",
   "col": 3,
   "row": 4
  },
  "arrowWater_1": {
   "sheet": "targets",
   "col": 4,
   "row": 4
  },
  "arrowRiver_0": {
   "sheet": "targets",
   "col": 5,
   "row": 4
  },
  "arrowRiver_1": {
   "sheet": "targets",
   "col": 0,
   "row": 5
  },
  "arrowRapids_0": {
   "sheet": "targets",
   "col": 1,
   "row": 5
  },
  "arrowRapids_1": {
   "sheet": "targets",
   "col": 2,
   "row": 5
  },
  "arrowLoop_0": {
   "sheet": "targets",
   "col": 3,
   "row": 5
  },
  "arrowLoop_1": {
   "sheet": "targets",
   "col": 4,
   "row": 5
  },
  "lockLamp_0": {
   "sheet": "targets",
   "col": 5,
   "row": 5
  },
  "lockLamp_1": {
   "sheet": "targets",
   "col": 0,
   "row": 6
  },
  "skill_0": {
   "sheet": "targets",
   "col": 1,
   "row": 6
  },
  "skill_1": {
   "sheet": "targets",
   "col": 2,
   "row": 6
  },
  "flowStart_0": {
   "sheet": "targets",
   "col": 3,
   "row": 6
  },
  "flowStart_1": {
   "sheet": "targets",
   "col": 4,
   "row": 6
  },
  "flowExplore_0": {
   "sheet": "targets",
   "col": 5,
   "row": 6
  },
  "flowExplore_1": {
   "sheet": "targets",
   "col": 0,
   "row": 7
  },
  "flowLock_0": {
   "sheet": "targets",
   "col": 1,
   "row": 7
  },
  "flowLock_1": {
   "sheet": "targets",
   "col": 2,
   "row": 7
  },
  "flowMulti_0": {
   "sheet": "targets",
   "col": 3,
   "row": 7
  },
  "flowMulti_1": {
   "sheet": "targets",
   "col": 4,
   "row": 7
  },
  "expedition_0": {
   "sheet": "targets",
   "col": 5,
   "row": 7
  },
  "expedition_1": {
   "sheet": "targets",
   "col": 0,
   "row": 8
  },
  "tigerHunt_0": {
   "sheet": "targets",
   "col": 1,
   "row": 8
  },
  "tigerHunt_1": {
   "sheet": "targets",
   "col": 2,
   "row": 8
  },
  "jackpotLamp_0": {
   "sheet": "targets",
   "col": 3,
   "row": 8
  },
  "jackpotLamp_1": {
   "sheet": "targets",
   "col": 4,
   "row": 8
  },
  "vine_0": {
   "sheet": "targets",
   "col": 5,
   "row": 8
  },
  "vine_1": {
   "sheet": "targets",
   "col": 0,
   "row": 9
  },
  "bonusx_0": {
   "sheet": "targets",
   "col": 1,
   "row": 9
  },
  "bonusx_1": {
   "sheet": "targets",
   "col": 2,
   "row": 9
  },
  "title": {
   "sheet": "ui",
   "col": 0,
   "row": 0,
   "spanC": 6,
   "spanR": 2
  },
  "digit_0": {
   "sheet": "ui",
   "col": 0,
   "row": 2,
   "advance": 0.72
  },
  "digit_1": {
   "sheet": "ui",
   "col": 1,
   "row": 2,
   "advance": 0.72
  },
  "digit_2": {
   "sheet": "ui",
   "col": 2,
   "row": 2,
   "advance": 0.72
  },
  "digit_3": {
   "sheet": "ui",
   "col": 3,
   "row": 2,
   "advance": 0.72
  },
  "digit_4": {
   "sheet": "ui",
   "col": 4,
   "row": 2,
   "advance": 0.72
  },
  "digit_5": {
   "sheet": "ui",
   "col": 5,
   "row": 2,
   "advance": 0.72
  },
  "digit_6": {
   "sheet": "ui",
   "col": 0,
   "row": 3,
   "advance": 0.72
  },
  "digit_7": {
   "sheet": "ui",
   "col": 1,
   "row": 3,
   "advance": 0.72
  },
  "digit_8": {
   "sheet": "ui",
   "col": 2,
   "row": 3,
   "advance": 0.72
  },
  "digit_9": {
   "sheet": "ui",
   "col": 3,
   "row": 3,
   "advance": 0.72
  },
  "digit_comma": {
   "sheet": "ui",
   "col": 4,
   "row": 3,
   "advance": 0.32
  },
  "digit_x": {
   "sheet": "ui",
   "col": 5,
   "row": 3,
   "advance": 0.72
  },
  "banner_multiball": {
   "sheet": "ui",
   "col": 0,
   "row": 4,
   "spanC": 6
  },
  "banner_jackpot": {
   "sheet": "ui",
   "col": 0,
   "row": 5,
   "spanC": 3
  },
  "banner_skill": {
   "sheet": "ui",
   "col": 3,
   "row": 5,
   "spanC": 3
  },
  "banner_tigerhunt": {
   "sheet": "ui",
   "col": 0,
   "row": 6,
   "spanC": 3
  },
  "banner_expedition": {
   "sheet": "ui",
   "col": 3,
   "row": 6,
   "spanC": 3
  },
  "banner_locked": {
   "sheet": "ui",
   "col": 0,
   "row": 7,
   "spanC": 3
  },
  "banner_gameover": {
   "sheet": "ui",
   "col": 3,
   "row": 7,
   "spanC": 3
  },
  "banner_tilt": {
   "sheet": "ui",
   "col": 0,
   "row": 8,
   "spanC": 2
  },
  "banner_paused": {
   "sheet": "ui",
   "col": 2,
   "row": 8,
   "spanC": 2
  },
  "banner_ballsaved": {
   "sheet": "ui",
   "col": 4,
   "row": 8,
   "spanC": 2
  },
  "button_start": {
   "sheet": "ui",
   "col": 0,
   "row": 9,
   "spanC": 2
  },
  "icon_soundOn": {
   "sheet": "ui",
   "col": 2,
   "row": 9
  },
  "icon_soundOff": {
   "sheet": "ui",
   "col": 3,
   "row": 9
  },
  "icon_pause": {
   "sheet": "ui",
   "col": 4,
   "row": 9
  },
  "icon_play": {
   "sheet": "ui",
   "col": 5,
   "row": 9
  },
  "flipperL_0": {
   "sheet": "moving",
   "col": 0,
   "row": 0,
   "spanC": 2,
   "anchor": [
    46,
    88
   ]
  },
  "flipperR_0": {
   "sheet": "moving",
   "col": 0,
   "row": 1,
   "spanC": 2,
   "anchor": [
    366,
    88
   ]
  },
  "flipperL_1": {
   "sheet": "moving",
   "col": 2,
   "row": 0,
   "spanC": 2,
   "anchor": [
    46,
    88
   ]
  },
  "flipperR_1": {
   "sheet": "moving",
   "col": 2,
   "row": 1,
   "spanC": 2,
   "anchor": [
    366,
    88
   ]
  },
  "ball_0": {
   "sheet": "moving",
   "col": 4,
   "row": 0
  },
  "ball_1": {
   "sheet": "moving",
   "col": 4,
   "row": 1
  },
  "plunger_0": {
   "sheet": "moving",
   "col": 0,
   "row": 2,
   "anchor": [
    102,
    14
   ]
  },
  "plunger_1": {
   "sheet": "moving",
   "col": 1,
   "row": 2,
   "anchor": [
    102,
    14
   ]
  },
  "plunger_2": {
   "sheet": "moving",
   "col": 2,
   "row": 2,
   "anchor": [
    102,
    14
   ]
  },
  "plunger_3": {
   "sheet": "moving",
   "col": 3,
   "row": 2,
   "anchor": [
    102,
    14
   ]
  },
  "plunger_4": {
   "sheet": "moving",
   "col": 4,
   "row": 2,
   "anchor": [
    102,
    14
   ]
  },
  "bumper_0": {
   "sheet": "moving",
   "col": 0,
   "row": 3
  },
  "bumper_1": {
   "sheet": "moving",
   "col": 1,
   "row": 3
  },
  "bumper_2": {
   "sheet": "moving",
   "col": 2,
   "row": 3
  },
  "post_0": {
   "sheet": "moving",
   "col": 3,
   "row": 3
  },
  "post_1": {
   "sheet": "moving",
   "col": 4,
   "row": 3
  },
  "slingL_0": {
   "sheet": "moving",
   "col": 0,
   "row": 4,
   "spanR": 2
  },
  "slingL_1": {
   "sheet": "moving",
   "col": 1,
   "row": 4,
   "spanR": 2
  },
  "slingR_0": {
   "sheet": "moving",
   "col": 2,
   "row": 4,
   "spanR": 2
  },
  "slingR_1": {
   "sheet": "moving",
   "col": 3,
   "row": 4,
   "spanR": 2
  },
  "tiger_0": {
   "sheet": "moving",
   "col": 4,
   "row": 4
  },
  "tiger_1": {
   "sheet": "moving",
   "col": 4,
   "row": 5
  },
  "monkey_0": {
   "sheet": "moving",
   "col": 0,
   "row": 6
  },
  "monkey_1": {
   "sheet": "moving",
   "col": 1,
   "row": 6
  },
  "medallion_0": {
   "sheet": "moving",
   "col": 2,
   "row": 6
  },
  "medallion_1": {
   "sheet": "moving",
   "col": 3,
   "row": 6
  },
  "lockring_0": {
   "sheet": "moving",
   "col": 4,
   "row": 6
  },
  "lockring_1": {
   "sheet": "moving",
   "col": 0,
   "row": 7
  },
  "spare_springGreen_0": {
   "sheet": "moving",
   "col": 1,
   "row": 7
  },
  "spare_springGreen_1": {
   "sheet": "moving",
   "col": 2,
   "row": 7
  }
 }
};
