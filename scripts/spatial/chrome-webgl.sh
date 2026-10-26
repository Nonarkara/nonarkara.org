#!/usr/bin/env bash
# Chrome with a software WebGL backend, for the spatial gate.
#
# WHY THIS EXISTS
# ---------------
# The gate launches Chrome with `--headless=new --disable-gpu`. On macOS
# that leaves headless Chrome with NO WebGL at all — and this site shows a
# "your browser can't run the 3D room" panel when WebGL is missing. So the
# gate was measuring THAT PANEL: a full-screen curtain that no reader with a
# working GPU ever sees. Every number in the receipt was a fact about the
# wrong surface. (The tell was a first action of 523px, which is the
# curtain's CONTINUE TO PLAN VIEW button.)
#
# This wrapper adds SwiftShader's ANGLE backend, which renders WebGL in
# software. The instrument stays byte-identical — only the browser's
# rendering backend changes, so the gate finally measures the site a reader
# actually gets.
#
# WHY `--disable-gpu` IS DROPPED
# ------------------------------
# The gate's settle deadline is five seconds: after that it measures
# whatever is on the screen and says so. On macOS, `--disable-gpu` forces
# the whole compositor into software on top of SwiftShader, and the app's
# boot takes twice as long for it. Measured on this machine, same flags
# otherwise: the app is alive at 3s without the flag and at 5s with it —
# and at 5s the gate is measuring the page BEFORE the app has drawn, which
# is a receipt for the shell rather than for the site. The gate passes that
# way, which is the worst possible way to pass.
#
# WebGL does not need the flag: SwiftShader's ANGLE backend provides it.
#
# WHY THE THROTTLING FLAGS ARE ADDED
# ----------------------------------
# The gate measures the site inside an iframe in a harness page. Chrome
# treats a page it cannot see as a background page and slows it down:
# timers are throttled, and the animation frames the app's boot depends on
# stop coming. The app then has not drawn when the settle deadline arrives,
# and the gate measures the page before the app ran. These three flags turn
# that throttling off. They change how fast the browser gets to the drawing,
# not what it draws.
#
# Usage:
#   CHROME_PATH="$PWD/scripts/spatial/chrome-webgl.sh" \
#     node scripts/spatial/spatial-check.mjs --base http://127.0.0.1:8784/
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
  echo "chrome-webgl: no Chrome binary found" >&2
  exit 1
fi

# Drop the flag the gate passes; keep every other argument exactly as given.
ARGS=()
for a in "$@"; do
  case "$a" in
    --disable-gpu) ;;
    *) ARGS+=("$a") ;;
  esac
done

exec "$CHROME" "${ARGS[@]}" \
  --use-angle=swiftshader \
  --enable-unsafe-swiftshader \
  --disable-background-timer-throttling \
  --disable-backgrounding-occluded-windows \
  --disable-renderer-backgrounding
