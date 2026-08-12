#!/usr/bin/env sh
# Production smoke against a live base URL (default https://getsylora.com).
# Does not require SSH. Safe: creates one disposable smoke account if register works.
set -eu
BASE="${1:-https://getsylora.com}"
FAIL=0
pass() { printf 'PASS %s\n' "$*"; }
fail() { printf 'FAIL %s\n' "$*"; FAIL=1; }

check_code() {
  path="$1"; want="$2"
  code="$(curl -sS -o /tmp/sylora-smoke-body -w '%{http_code}' --connect-timeout 12 "$BASE$path" || echo 000)"
  if [ "$code" = "$want" ]; then pass "$path → $code"; else fail "$path → $code (want $want)"; fi
}

printf '=== SYLORA prod smoke %s ===\n' "$BASE"
check_code / 200
check_code /api/ready 200
check_code /api/health 200
check_code /api/live 200
check_code /api/gifts 200
check_code /app.js 200
check_code /live-studio.js 200
check_code /live-studio.css 200
check_code /api/sylora-live/capabilities 200
check_code /api/studio/companion-boundary 200
check_code /api/live/following 200

html="$(curl -fsS "$BASE/" || true)"
case "$html" in
  *20260812*) pass "frontend cache bust ≥ 20260812" ;;
  *20260811*) pass "frontend cache bust ≥ 20260811 (acceptable tip)" ;;
  *20260809-3*) fail "frontend still on stale cache bust 20260809-3 — deploy not applied" ;;
  *) fail "frontend cache bust unknown" ;;
esac
# Favicon should not 404 after ready tip
fav="$(curl -sS -o /dev/null -w '%{http_code}' "$BASE/assets/sylora-mark-v2.svg" || echo 000)"
[ "$fav" = "200" ] && pass "brand mark asset → 200" || fail "brand mark asset → $fav"

# Auth journey
EMAIL="smoke$(date +%s)@getsylora-smoke.test"
USER="smk$(date +%s | tail -c 7)"
REG_CODE="$(curl -sS -o /tmp/sylora-reg.json -w '%{http_code}' -X POST "$BASE/api/auth/register" \
  -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"username\":\"$USER\",\"password\":\"password123\"}" || echo 000)"
if [ "$REG_CODE" = "201" ]; then
  pass "register"
  TOK="$(node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/sylora-reg.json','utf8')).token||'')")"
  ME_CODE="$(curl -sS -o /dev/null -w '%{http_code}' "$BASE/api/me" -H "authorization: Bearer $TOK")"
  [ "$ME_CODE" = "200" ] && pass "session /api/me" || fail "session /api/me → $ME_CODE"
  POST_CODE="$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$BASE/api/posts" \
    -H "authorization: Bearer $TOK" -H 'content-type: application/json' -d '{"text":"prod smoke"}')"
  [ "$POST_CODE" = "201" ] && pass "create post" || fail "create post → $POST_CODE"
  W_CODE="$(curl -sS -o /dev/null -w '%{http_code}' "$BASE/api/wallet" -H "authorization: Bearer $TOK")"
  [ "$W_CODE" = "200" ] && pass "wallet" || fail "wallet → $W_CODE"
  curl -sS -o /dev/null -X POST "$BASE/api/auth/logout" -H "authorization: Bearer $TOK" || true
  LOGIN_CODE="$(curl -sS -o /tmp/sylora-login.json -w '%{http_code}' -X POST "$BASE/api/auth/login" \
    -H 'content-type: application/json' \
    -d "{\"identity\":\"$USER\",\"password\":\"password123\"}")"
  [ "$LOGIN_CODE" = "200" ] && pass "re-login" || fail "re-login → $LOGIN_CODE"
else
  fail "register → $REG_CODE"
fi

# Honesty: Google without keys should not fake success
G_CODE="$(curl -sS -o /tmp/sylora-google.json -w '%{http_code}' "$BASE/api/auth/google" || echo 000)"
if [ "$G_CODE" = "503" ]; then
  pass "google oauth fail-closed ($G_CODE)"
elif [ "$G_CODE" = "200" ]; then
  pass "google oauth configured ($G_CODE)"
else
  fail "google oauth unexpected $G_CODE"
fi

if [ "$FAIL" -ne 0 ]; then
  printf '=== SMOKE RESULT: FAIL ===\n'
  exit 1
fi
printf '=== SMOKE RESULT: PASS ===\n'
