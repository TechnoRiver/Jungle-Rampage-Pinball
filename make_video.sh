#!/usr/bin/env bash
# Turn a looping playfield video into the game's background (no audio, seamless loop, web-friendly sizes).
#   usage: tools/make_video.sh input.mp4 [width: 1080 (default) or 720] [crossfade_seconds, default 0.8]
# Writes assets/playfield.mp4 (H.264, yuv420p, +faststart) and assets/playfield.webm (VP9), then lists them in
# js/config.js (CFG.video.sources). Target size is ~5-12 MB; lower CRF values = bigger/better.
# The video must show the same table layout as assets/playfield.webp (1080x1920 / 9:16). If it is framed
# differently, adjust CFG.video.x / y / w / h in js/config.js so the painted parts line up with the physics.
set -euo pipefail
IN="$1"; W="${2:-1080}"; XF="${3:-0.8}"
cd "$(dirname "$0")/.."
H=$(( W * 16 / 9 ))
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")
# seamless loop: crossfade the last XF seconds into the first XF seconds
OFF=$(python3 -c "print(max(0.0, $DUR - 2 * $XF))")
FILTER="[0:v]scale=${W}:${H}:flags=lanczos,setsar=1,fps=30,split[a][b];[b]trim=0:${XF},setpts=PTS-STARTPTS,fps=30[head];[a]trim=${XF},setpts=PTS-STARTPTS,fps=30[body];[body][head]xfade=transition=fade:duration=${XF}:offset=${OFF},format=yuv420p[v]"
ffmpeg -y -v error -i "$IN" -filter_complex "$FILTER" -map "[v]" -an -c:v libx264 -preset slow -crf 25 -profile:v high -movflags +faststart assets/playfield.mp4
ffmpeg -y -v error -i "$IN" -filter_complex "$FILTER" -map "[v]" -an -c:v libvpx-vp9 -b:v 0 -crf 36 -row-mt 1 -deadline good -cpu-used 2 assets/playfield.webm
python3 - <<'PY'
import re
p = 'js/config.js'; s = open(p).read()
s = re.sub(r"video: \{ sources: .*?, x:", "video: { sources: [['assets/playfield.webm', 'video/webm'], ['assets/playfield.mp4', 'video/mp4']], x:", s, count=1)
open(p, 'w').write(s)
PY
ls -la assets/playfield.mp4 assets/playfield.webm
echo "done - open index.html; Settings > Video background toggles it."
