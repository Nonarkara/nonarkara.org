#!/usr/bin/env bash
# Capture the receipt, and only accept it if every measurement was of the
# surface it names.
#
# The spatial gate compares FINDINGS against the baseline. It does not know
# which surface it measured — a run that measures the sign instead of the
# desk produces a clean, green, worthless receipt.
#
# scripts/msh/spatial-gate.mjs is the command that runs both halves: the
# vendored gate for the findings and the surface check for the proof. It
# writes the candidate receipt to a temporary file and only copies it in
# when every measurement has a proof that it was of the surface it names.
# A bad capture never overwrites a good one.
#
#   node scripts/msh/spatial-gate.mjs --update
set -uo pipefail
cd "$(dirname "$0")/../.."

TRIES="${1:-4}"

for try in $(seq 1 "$TRIES"); do
  echo "── attempt $try of $TRIES"
  # The narrow pattern the suite uses: our own gate browser, and not the
  # browsers other projects on this machine are using.
  pkill -9 -f "Google Chrome.*--headless=new.*--user-data-dir=" 2>/dev/null || true
  sleep 20

  if node scripts/msh/spatial-gate.mjs --update; then
    echo "   ACCEPTED — the receipt is on the surface it names"
    exit 0
  fi

  echo "   REJECTED — the sweep did not agree with the surface it measured:"
  echo "   the committed receipt was NOT touched"
done

echo "FAILED — no capture in $TRIES attempts was of the right surface. The receipt was not changed."
exit 1
