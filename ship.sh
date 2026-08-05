#!/bin/bash
# ship — push, deploy, and prove the deploy actually landed.
#
#   ./ship.sh            push the current branch, deploy, verify
#   ./ship.sh --no-push  deploy what is already committed
#
# Why this exists: GitHub Actions holds a Cloudflare API token that has
# expired, so a push no longer deploys anything. Rather than mint a new
# credential, this uses the wrangler OAuth session already signed in on
# this machine. Nothing here needs a secret.
#
# The last step is the point. A green deploy only proves the upload
# succeeded; it says nothing about whether the site now serves what you
# just built. This compares the version stamp in the local app.js to the
# one the live domain actually returns, and fails loudly when they differ.
set -uo pipefail

cd "$(dirname "$0")"
PROJECT="nonarkara-org"
DOMAIN="https://nonarkara.org"

say() { printf '\n\033[1m%s\033[0m\n' "$1"; }
die() { printf '\n\033[31m%s\033[0m\n' "$1" >&2; exit 1; }

LOCAL_VERSION=$(grep -m1 -oE "NON_VERSION = '[^']+'" app.js | grep -oE "'[^']+'" | tr -d "'")
[ -n "$LOCAL_VERSION" ] || die "could not read NON_VERSION from app.js"
say "shipping v${LOCAL_VERSION}"

# Refuse to ship a working tree that does not match what is committed —
# otherwise the version you verify is not the version in git.
if [ -n "$(git status --porcelain -- app.js index.html styles.css sw.js mixtape.html sky.js ground.js 2>/dev/null)" ]; then
  die "uncommitted changes to shipped files — commit first, or you will deploy something git does not have"
fi

if [ "${1:-}" != "--no-push" ]; then
  say "push"
  git push origin "$(git rev-parse --abbrev-ref HEAD)" || die "push failed"
fi

say "stage"
rm -rf dist
rsync -a --exclude-from=.deployignore ./ dist/ || die "staging failed"
echo "  $(find dist -type f | wc -l | tr -d ' ') files, $(du -sh dist | cut -f1)"

# The shell must never see a token here; wrangler uses its OAuth session.
say "deploy"
npx wrangler pages deploy dist --project-name="$PROJECT" --branch=main || die "deploy failed"

say "verify"
# Cloudflare needs a moment to make the new deployment the live one, so
# poll rather than sleeping once and hoping.
for i in $(seq 1 12); do
  LIVE=$(curl -s "${DOMAIN}/app.js?cb=$RANDOM$i" | grep -m1 -oE "NON_VERSION = '[^']+'" | grep -oE "'[^']+'" | tr -d "'")
  if [ "$LIVE" = "$LOCAL_VERSION" ]; then
    echo "  live version ${LIVE} matches local"
    HTTP=$(curl -s -o /dev/null -w '%{http_code}' "$DOMAIN")
    echo "  ${DOMAIN} → ${HTTP}"
    say "shipped v${LOCAL_VERSION}"
    exit 0
  fi
  printf '  waiting for edge (live=%s, want=%s)\n' "${LIVE:-none}" "$LOCAL_VERSION"
  sleep 10
done
die "deployed, but ${DOMAIN} still serves '${LIVE:-nothing}' instead of '${LOCAL_VERSION}' — do not call this shipped"
