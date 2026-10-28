#!/usr/bin/env bash
# Capture the receipt, and only accept it if every measurement was of the
# surface it names.
#
# The spatial gate compares FINDINGS against the baseline. It does not know
# which surface it measured — a run that measures the sign instead of the
# desk produces a clean, green, worthless receipt. So a capture is only
# accepted when the guard agrees with it, and a bad capture never overwrites
# a good one: it is written to a temporary file and copied in only if every
# cell is of the right surface.
#
#   node scripts/msh/capture-receipt.mjs [tries]
set -uo pipefail
cd "$(dirname "$0")/../.."

TRIES="${1:-4}"
BASE="http://127.0.0.1:8786/"
ROUTES="/,/?view=plan,/?view=ioc"
TMP_BASELINE=/tmp/receipt-candidate.json
TMP_JSON=/tmp/receipt-candidate-measurements.json
ACCEPTED=design/spatial-baseline.json

for try in $(seq 1 "$TRIES"); do
  echo "── attempt $try of $TRIES"
  # The narrow pattern the suite uses: our own gate browser, and not the
  # browsers other projects on this machine are using.
  pkill -9 -f "Google Chrome.*--headless=new.*--user-data-dir=" 2>/dev/null || true
  sleep 45

  CHROME_PATH="$PWD/scripts/spatial/chrome-webgl.sh" \
    node scripts/spatial/spatial-check.mjs \
      --base "$BASE" --routes "$ROUTES" \
      --baseline "$TMP_BASELINE" --json "$TMP_JSON" --update 2>&1 | tail -3

  if [ ! -f "$TMP_JSON" ]; then
    echo "   the run produced no measurements — trying again"
    continue
  fi

  if node scripts/msh/gate-guard.mjs "$TMP_JSON" | tee /tmp/guard-out.txt | grep -q "All .* measurements were of the surface a reader gets"; then
    cp "$TMP_BASELINE" "$ACCEPTED"
    echo "   ACCEPTED — the receipt is on the surface it names"
    node scripts/msh/gate-guard.mjs "$TMP_JSON"
    exit 0
  fi

  echo "   REJECTED — some measurements were of the wrong surface:"
  grep -E "WRONG|✗" /tmp/guard-out.txt | head -6
  echo "   the committed receipt was NOT touched"
done

echo "FAILED — no capture in $TRIES attempts was of the right surface. The receipt was not changed."
exit 1
