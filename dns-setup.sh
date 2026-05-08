#!/usr/bin/env bash
# nonarkara.org — Cloudflare DNS setup
# Run once after getting an API token:
#   1. Go to dash.cloudflare.com → My Profile → API Tokens → Create Token
#   2. Use "Edit zone DNS" template → scope to nonarkara.org
#   3. export CF_TOKEN="your-token-here"
#   4. bash dns-setup.sh

set -euo pipefail

: "${CF_TOKEN:?CF_TOKEN env var is required. See instructions above.}"

ZONE="8809ee955a8edb681c34f45ed8f5b765"
BASE="https://api.cloudflare.com/client/v4/zones/$ZONE/dns_records"

add() {
  local type=$1 name=$2 content=$3 proxied=$4
  local result
  result=$(curl -s -X POST "$BASE" \
    -H "Authorization: Bearer $CF_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"$type\",\"name\":\"$name\",\"content\":\"$content\",\"proxied\":$proxied,\"ttl\":1}")
  local ok
  ok=$(echo "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['success'])" 2>/dev/null)
  if [ "$ok" = "True" ]; then
    echo "✓  $type  $name  →  $content"
  else
    echo "✗  $type  $name  →  $content"
    echo "   $result" | python3 -c "import sys,json; d=json.load(sys.stdin); [print('  ', e['message']) for e in d.get('errors',[])]" 2>/dev/null
  fi
}

echo ""
echo "nonarkara.org — DNS setup"
echo "──────────────────────────────────────────────"

echo ""
echo "▸ Apex A records (GitHub Pages)"
add "A" "@" "185.199.108.153" "true"
add "A" "@" "185.199.109.153" "true"
add "A" "@" "185.199.110.153" "true"
add "A" "@" "185.199.111.153" "true"

echo ""
echo "▸ www"
add "CNAME" "www" "nonarkara.github.io" "true"

echo ""
echo "▸ GitHub Pages subdomains"
add "CNAME" "phuket"   "nonarkara.github.io" "true"
add "CNAME" "bus"      "nonarkara.github.io" "true"
add "CNAME" "kuching"  "nonarkara.github.io" "true"
add "CNAME" "solomon"  "nonarkara.github.io" "true"
add "CNAME" "axiom"    "nonarkara.github.io" "true"

echo ""
echo "▸ Vercel subdomains"
add "CNAME" "slic"     "cname.vercel-dns.com" "true"
add "CNAME" "conflict" "cname.vercel-dns.com" "true"
add "CNAME" "geo"      "cname.vercel-dns.com" "true"
add "CNAME" "oil"      "cname.vercel-dns.com" "true"
add "CNAME" "sciti"    "cname.vercel-dns.com" "true"

echo ""
echo "▸ Render subdomains (DNS only — grey cloud)"
add "CNAME" "monitor" "smart-city-thailand-monitor-web.onrender.com" "false"
add "CNAME" "brain"   "second-brain-v2-rngd.onrender.com"           "false"
add "CNAME" "bot"     "city-reporter-v2.onrender.com"               "false"

echo ""
echo "──────────────────────────────────────────────"
echo "Done. Propagation takes up to 5 minutes."
echo "Verify: dig nonarkara.org && dig slic.nonarkara.org"
