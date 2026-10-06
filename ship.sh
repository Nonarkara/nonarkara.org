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
set -euo pipefail

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
if [ -n "$(git status --porcelain --untracked-files=no 2>/dev/null)" ]; then
  die "uncommitted tracked changes — commit first, or you will deploy bytes git does not have"
fi

if [ "${1:-}" != "--no-push" ]; then
  say "push"
  git push origin "$(git rev-parse --abbrev-ref HEAD)" || die "push failed"
fi

say "stage"
rm -rf dist
rsync -a --exclude-from=.deployignore ./ dist/ || die "staging failed"

# The truth the running page checks itself against. The BUILD hash is
# the real identity — version numbers are typed by hand and two parallel
# sessions once shipped different builds under the same number, which
# blinded the self-heal. The hash is stamped into the deployed app.js
# (dist only; the repo keeps 'dev') and into version.json.
BUILD_SHA=$(git rev-parse --short HEAD)
sed -i '' "s/const NON_BUILD = 'dev';/const NON_BUILD = '${BUILD_SHA}';/" dist/app.js
grep -q "NON_BUILD = '${BUILD_SHA}'" dist/app.js || die "build stamp failed"
printf '{"version":"%s","build":"%s"}\n' "$LOCAL_VERSION" "$BUILD_SHA" > dist/version.json
echo "  version.json → $LOCAL_VERSION · build $BUILD_SHA"
echo "  $(find dist -type f | wc -l | tr -d ' ') files, $(du -sh dist | cut -f1)"

# The shell must never see a token here; wrangler uses its OAuth session.
say "deploy"
npx wrangler pages deploy dist --project-name="$PROJECT" --branch=main || die "deploy failed"

say "verify"
# Cloudflare needs a moment to make the new deployment the live one, so
# poll rather than sleeping once and hoping.
for i in $(seq 1 12); do
  # Verify by BUILD HASH, not version number — the number can collide.
  # Capture the response before matching it. With `pipefail`, piping curl
  # directly into `grep -m1` can make a perfectly good request exit 56 when
  # grep closes the pipe as soon as it finds the build stamp.
  LIVE_BODY=$(curl -fsS --max-time 25 "${DOMAIN}/app.js?cb=$RANDOM$i" || true)
  if [[ "$LIVE_BODY" =~ NON_BUILD\ =\ \'([^\']+)\' ]]; then
    LIVE="${BASH_REMATCH[1]}"
  else
    LIVE=""
  fi
  if [ "$LIVE" = "$BUILD_SHA" ]; then
    echo "  live build ${LIVE} matches HEAD"
    HTTP=$(curl -s -o /dev/null -w '%{http_code}' "$DOMAIN")
    echo "  ${DOMAIN} → ${HTTP}"
    # The fifth stale layer: zone Browser Cache TTL on the custom domain
    # can rewrite _headers no-cache back to max-age=14400. Content can
    # still be correct (this loop proved the hash). Warn loudly so the
    # next agent does not call Cache-Control "fixed" from pages.dev alone.
    CC_HEADERS=$(curl -fsSI --max-time 25 "${DOMAIN}/app.js?cb=$RANDOM" || true)
    CC=$(grep -im1 '^cache-control:' <<< "${CC_HEADERS//$'\r'/}" || true)
    echo "  ${CC:-cache-control: (missing)}"
    case "${CC}" in
      *no-cache*|*no-store*|*max-age=0*) ;;
      *)
        echo "  WARN: custom domain is not honouring _headers no-cache."
        echo "  pages.dev does; the zone Browser Cache TTL is the fifth layer."
        echo "  Self-heal uses /heal (Clear-Site-Data) until the zone is set to Respect Existing Headers."
        ;;
    esac
    say "shipped v${LOCAL_VERSION}"
    exit 0
  fi
  printf '  waiting for edge (live=%s, want=%s)\n' "${LIVE:-none}" "$BUILD_SHA"
  sleep 10
done
die "deployed, but ${DOMAIN} still serves build '${LIVE:-nothing}' instead of '${BUILD_SHA}' — do not call this shipped"
