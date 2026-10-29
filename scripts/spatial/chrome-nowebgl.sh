#!/usr/bin/env bash
# Chrome WITHOUT WebGL, for the spatial gate.
#
# WHY THIS EXISTS
# ---------------
# The gate measures three surfaces: the sign, the desk and the wall. None of
# them is the 3D room — the room is a canvas, and the probe reads the DOM.
# So a gate that has to wait for a room to be built is waiting for something
# it does not measure.
#
# On a machine with a GPU that wait is 1.5 seconds and nobody notices. On a
# CI runner there is no GPU at all: Chrome offers a software context, the
# world is assembled in software at about a frame a second, and the gate's
# five-second settle deadline passes long before the desk is on screen. The
# gate then measures the shell and calls it a clean sweep.
#
# So the CI browser has NO WebGL. The site has a path for exactly that: no
# renderer, no world, no animation loop — the sign, the desk and the wall,
# which is all the receipt covers. The run takes a minute instead of ten
# minutes and it needs no GPU.
#
# The instrument is unchanged. Only the browser's rendering backend changes,
# exactly as chrome-webgl.sh does in the other direction.
#
# Usage:
#   CHROME_PATH="$PWD/scripts/spatial/chrome-nowebgl.sh" \
#     node scripts/spatial/spatial-check.mjs --base http://127.0.0.1:8786/
set -euo pipefail

CHROME_CANDIDATES=(
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  "/Applications/Chromium.app/Contents/MacOS/Chromium"
  "/usr/bin/google-chrome"
  "/usr/bin/chromium"
  "/usr/bin/chromium-browser"
)

CHROME=""
for c in "${CHROME_CANDIDATES[@]}"; do
  if [ -x "$c" ]; then CHROME="$c"; break; fi
done
if [ -z "$CHROME" ]; then
  CHROME="$(command -v google-chrome || command -v chromium || true)"
fi
if [ -z "$CHROME" ]; then
  echo "chrome-nowebgl: no Chrome binary found" >&2
  exit 1
fi

ARGS=()
for a in "$@"; do
  case "$a" in
    --disable-gpu) ;;
    *) ARGS+=("$a") ;;
  esac
done

# --disable-3d-apis turns WebGL off at the source, so the browser does not
# hand out a software context and the site takes its no-room path from the
# first moment instead of discovering it later.
exec "$CHROME" "${ARGS[@]}" \
  --disable-3d-apis \
  --disable-background-timer-throttling \
  --disable-backgrounding-occluded-windows \
  --disable-renderer-backgrounding
