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
# software. The gate's own flags are untouched and the instrument stays
# byte-identical — only the browser's rendering backend changes, so the
# gate finally measures the site a reader actually gets.
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

exec "$CHROME" "$@" \
  --use-angle=swiftshader \
  --enable-unsafe-swiftshader
