#!/usr/bin/env bash
# Chrome with a WebGL backend the gate can measure, for the spatial gate.
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
# This wrapper gives the browser a WebGL backend, so the gate measures the
# site a reader actually gets. The instrument stays byte-identical — only the
# browser's rendering backend changes.
#
# WHY THE GPU IS NOT TURNED OFF, AND WHY SWIFTSHADER IS NOT FORCED
# ---------------------------------------------------------------
# The gate's settle deadline is five seconds: after that it measures whatever
# is on the screen and says so. The app assembles a 3D world before the desk
# is painted, so the backend decides whether the desk is reachable at all.
#
# Measured on this machine, same flags otherwise, desk painted at:
#
#   --disable-gpu (no WebGL at all)                1.5s   — but the app takes
#                                                            its no-WebGL path and
#                                                            shows the OS instead
#                                                            of the pavilion, so the
#                                                            landing route is measured
#                                                            as the desk: the wrong
#                                                            surface
#   --use-angle=swiftshader (software rendering)  44–125s — the world is built in
#                                                            software, and the gate
#                                                            has long since measured
#                                                            the shell
#   ANGLE on the real GPU (Metal)                  1.5s   — WebGL works, the
#                                                            world builds at speed, and
#                                                            the desk is the desk
#
# So: keep the GPU, and let ANGLE use it. `--enable-unsafe-swiftshader` stays
# as the fallback for a machine with no GPU that Chrome can still fall back
# to; the wrapper only stops FORCING software rendering.
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
  --enable-unsafe-swiftshader \
  --disable-background-timer-throttling \
  --disable-backgrounding-occluded-windows \
  --disable-renderer-backgrounding
