#!/usr/bin/env bash
# Extract a Facebook/Instagram event's public fields without a manual paste.
#
# Strategy (most-reliable-first):
#   1. Resolve /share/ and short links to the canonical event URL.
#   2. PRIMARY — fetch with the facebookexternalhit crawler UA and NO cookies.
#      FB serves OpenGraph tags to its own crawler: og:title, og:description
#      (date + host + interested count), og:url (address slug), og:image.
#      This needs no login and is stable.
#   3. FALLBACK — if --authed is passed, decrypt the default browser's cookies
#      (scripts/chrome-cookies.py, triggers a one-time Keychain Allow prompt)
#      and fetch the page logged-in. Note: FB events still load the exact start
#      TIME and full description via an authed GraphQL route that is NOT in the
#      HTML, so even authed you often must read the time off the open page.
#   4. --open also launches the link in the default browser so the user can
#      read/copy anything the scrape can't reach (precise time, description).
#
# Usage: fb-extract.sh [--authed] [--open] <facebook-or-instagram-url>
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UA_CRAWLER='facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
UA_BROWSER='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'

AUTHED=0; OPEN=0; URL=""
for a in "$@"; do
  case "$a" in
    --authed) AUTHED=1 ;;
    --open)   OPEN=1 ;;
    *)        URL="$a" ;;
  esac
done
[ -n "$URL" ] || { echo "usage: fb-extract.sh [--authed] [--open] <url>" >&2; exit 64; }

# 1. resolve /share/ etc. -> canonical event url. The interstitial is a JS/meta
#    redirect, not an HTTP 3xx; the target carries an escaped "/events/<id>/".
#    Pull the numeric id and rebuild a clean URL (avoids \/ and query cruft).
resolve() {
  local html target eid
  html=$(curl -sL -A "$UA_BROWSER" "$1") || true
  target="$1$html"
  eid=$(printf '%s' "$target" | grep -oE 'events\\?/[0-9]{6,}' | head -1 | grep -oE '[0-9]{6,}')
  if [ -n "$eid" ]; then
    printf 'https://www.facebook.com/events/%s/' "$eid"
  else
    printf '%s' "$1"
  fi
}
CANON="$(resolve "$URL")"
echo "canonical_url: $CANON"
[ "$OPEN" = 1 ] && open "$CANON" 2>/dev/null || true

# 2. crawler-UA OG extraction (no cookies). Write HTML to a temp file — DON'T
#    pipe it into a `python3 - <<HEREDOC`, the heredoc itself is python's stdin.
OG_FILE=$(mktemp); trap 'rm -f "$OG_FILE"' EXIT
curl -sL -A "$UA_CRAWLER" "$CANON" -o "$OG_FILE" || true
python3 - "$OG_FILE" <<'PY'
import sys,re,html
h=open(sys.argv[1],encoding="utf-8",errors="replace").read()
def og(p):
    m=re.search(r'<meta property="og:'+p+r'" content="([^"]*)"',h) \
      or re.search(r'<meta name="'+p+r'" content="([^"]*)"',h)
    return html.unescape(m.group(1)) if m else ""
print("name:       ", og("title"))
print("description:", og("description"))   # "Event in <city> by <host> on <date>[ at <time>] with N interested"
print("canon_og:   ", og("url"))           # slug usually embeds the street address
print("image:      ", og("image"))
PY

# 3. optional authed fetch (cookie grab). FB events load the exact start time via
#    an authed GraphQL route that is NOT in the HTML, so this often can't recover
#    a time the crawler OG didn't already give — but it confirms login + can pick
#    up start_timestamp on the events that do inline it.
if [ "$AUTHED" = 1 ]; then
  echo "--- authed fetch (Keychain prompt may appear) ---"
  if COOKIES=$(python3 "$HERE/chrome-cookies.py" facebook.com 2>/dev/null); then
    AUTH_FILE=$(mktemp)
    curl -sL -b "$COOKIES" -A "$UA_BROWSER" "$CANON" -o "$AUTH_FILE" || true
    HIT=$(grep -oiE '"start_timestamp":[0-9]+|"day_time_sentence":"[^"]*"' "$AUTH_FILE" | head -5 || true)
    rm -f "$AUTH_FILE"
    [ -n "$HIT" ] && echo "$HIT" || echo "(logged in OK; no start time inlined — read it off the open page)"
  else
    echo "(not logged into facebook.com in Chrome — pass --open and log in, or paste the time)"
  fi
fi
