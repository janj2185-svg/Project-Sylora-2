#!/usr/bin/env sh
# Safe production deploy helper for getsylora.com (/opt/sylora).
#
# Modes:
#   backup   — local/on-server backup metadata only (no secrets printed)
#   dry-run  — validate compose + local /api/ready (requires Docker)
#   deploy   — on-server: backup → fetch → checkout REF → compose up → smoke
#   remote   — SSH to VPS and run deploy there (requires PROD_SSH_* secrets)
#   smoke    — hit https://getsylora.com (or SMOKE_BASE) readiness checks
#
# NEVER: git reset --hard, force-push, drop volumes, or delete production data.
# NEVER: invent or print PROD_SSH_PRIVATE_KEY / .env.local secrets.
set -eu

ROOT="${1:-.}"
MODE="${2:-deploy}"
# Verified tip of Project-Sylora-2 (LIVE ecosystem). Override with SYLORA_DEPLOY_REF.
REF="${SYLORA_DEPLOY_REF:-cursor/sylora-live-ecosystem-34a2}"
SMOKE_BASE="${SMOKE_BASE:-https://getsylora.com}"
EXPECTED_CACHE_HINT="${EXPECTED_CACHE_HINT:-20260811}"

cd "$ROOT"
ROOT="$(pwd)"

log() { printf '%s\n' "$*"; }
die() { printf '%s\n' "$*" >&2; exit 1; }

backup_tree() {
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  backup_dir="${ROOT}/.deploy-backup-${stamp}"
  mkdir -p "$backup_dir"
  if [ -d .git ]; then
    git rev-parse HEAD >"$backup_dir/HEAD.txt" 2>/dev/null || true
    git status --short >"$backup_dir/status.txt" 2>/dev/null || true
    git rev-parse --abbrev-ref HEAD >"$backup_dir/branch.txt" 2>/dev/null || true
  fi
  if [ -f .env.local ]; then
    # size only — never copy or print secret contents
    wc -c .env.local >"$backup_dir/env.local.size.txt"
  fi
  if command -v docker >/dev/null 2>&1; then
    docker compose ps >"$backup_dir/compose-ps.txt" 2>/dev/null || true
  fi
  date -u +%Y-%m-%dT%H:%M:%SZ >"$backup_dir/created_at.txt"
  log "[backup] wrote $backup_dir (no secrets printed)"
}

wait_ready() {
  url="$1"
  i=0
  while [ "$i" -lt 40 ]; do
    if curl -fsS "$url" >/dev/null 2>&1; then
      log "[ready] $url OK"
      return 0
    fi
    i=$((i + 1))
    sleep 2
  done
  die "[ready] $url not ready in time"
}

smoke_public() {
  base="$1"
  log "[smoke] base=$base"
  curl -fsS "$base/api/ready" >/dev/null || die "[smoke] /api/ready FAIL"
  curl -fsS "$base/api/health" >/dev/null || die "[smoke] /api/health FAIL"
  code="$(curl -sS -o /dev/null -w '%{http_code}' "$base/")"
  [ "$code" = "200" ] || die "[smoke] / HTTP $code"
  html="$(curl -fsS "$base/")"
  case "$html" in
    *"$EXPECTED_CACHE_HINT"*) log "[smoke] cache bust contains $EXPECTED_CACHE_HINT" ;;
    *)
      log "[smoke] WARN: expected cache hint $EXPECTED_CACHE_HINT not found (still serving old frontend?)"
      printf '%s\n' "$html" | sed -n 's/.*\(?v=[0-9A-Za-z.-]*\).*/\1/p' | head -5
      ;;
  esac
  # New platform markers (must exist after this deploy)
  for path in /api/sylora-live/capabilities /api/studio/companion-boundary /live-studio.js; do
    c="$(curl -sS -o /dev/null -w '%{http_code}' "$base$path")"
    [ "$c" = "200" ] || die "[smoke] $path HTTP $c (deploy ref too old or not applied)"
    log "[smoke] $path OK"
  done
  # Key-gated endpoints must fail closed honestly (not fake Connected)
  g="$(curl -sS -o /tmp/sylora-google.json -w '%{http_code}' "$base/api/auth/google")"
  if [ "$g" = "503" ] || [ "$g" = "200" ]; then
    log "[smoke] /api/auth/google HTTP $g (fail-closed or configured)"
  else
    die "[smoke] /api/auth/google unexpected HTTP $g"
  fi
  log "[smoke] PASS"
}

deploy_on_server() {
  command -v git >/dev/null 2>&1 || die "git required"
  command -v docker >/dev/null 2>&1 || die "docker required on production host"
  [ -f compose.yaml ] || die "compose.yaml missing in $ROOT — is this /opt/sylora?"

  backup_tree

  log "[deploy] fetching origin / ref=$REF"
  git fetch origin "$REF" || git fetch origin
  # Prefer remote branch tip; fall back to tag/sha
  if git show-ref --verify --quiet "refs/remotes/origin/$REF"; then
    git checkout -B "$REF" "origin/$REF"
  elif git show-ref --verify --quiet "refs/tags/$REF"; then
    git checkout --detach "$REF"
  else
    git checkout "$REF"
    git pull --ff-only origin "$REF" 2>/dev/null || true
  fi

  log "[deploy] HEAD=$(git rev-parse --short HEAD) branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo detached)"
  docker compose up -d --build
  wait_ready "http://127.0.0.1:8787/api/ready"
  curl -fsS "http://127.0.0.1:8787/api/ready"; echo
  log "[deploy] local ready OK — verifying public domain if reachable"
  if curl -fsS "$SMOKE_BASE/api/ready" >/dev/null 2>&1; then
    smoke_public "$SMOKE_BASE" || log "[deploy] public smoke WARN — check nginx/TLS; local container is up"
  else
    log "[deploy] public $SMOKE_BASE not reachable from this host yet; local container healthy"
  fi
  log "[deploy] complete. Hard-refresh browsers. Expected frontend cache ≥ $EXPECTED_CACHE_HINT"
}

remote_deploy() {
  host="${PROD_SSH_HOST:-77.42.42.246}"
  user="${PROD_SSH_USER:-}"
  port="${PROD_SSH_PORT:-22}"
  path="${PROD_DEPLOY_PATH:-/opt/sylora}"
  [ -n "$user" ] || die "PROD_SSH_USER is required for remote mode (Cursor secret / env — do not paste into chat)"

  key_args=""
  if [ -n "${PROD_SSH_KEY_FILE:-}" ] && [ -f "$PROD_SSH_KEY_FILE" ]; then
    key_args="-i $PROD_SSH_KEY_FILE"
  elif [ -n "${PROD_SSH_PRIVATE_KEY:-}" ]; then
    keyfile="$(mktemp)"
    # shellcheck disable=SC2064
    trap 'rm -f "$keyfile"' EXIT INT TERM
    printf '%s\n' "$PROD_SSH_PRIVATE_KEY" >"$keyfile"
    chmod 600 "$keyfile"
    key_args="-i $keyfile"
  else
    die "Set PROD_SSH_KEY_FILE or PROD_SSH_PRIVATE_KEY for remote deploy"
  fi

  log "[remote] $user@$host:$port → $path (ref=$REF)"
  # shellcheck disable=SC2086
  ssh -p "$port" $key_args -o BatchMode=yes -o StrictHostKeyChecking=accept-new \
    "$user@$host" \
    "set -eu; cd '$path'; SYLORA_DEPLOY_REF='$REF' SMOKE_BASE='$SMOKE_BASE' EXPECTED_CACHE_HINT='$EXPECTED_CACHE_HINT' ./scripts/deploy-prod.sh '$path' deploy"
  smoke_public "$SMOKE_BASE"
}

case "$MODE" in
  backup) backup_tree ;;
  dry-run)
    command -v docker >/dev/null 2>&1 || die "docker required for dry-run"
    docker compose config >/dev/null
    docker compose up -d --build
    wait_ready "http://127.0.0.1:8787/api/ready"
    ;;
  deploy) deploy_on_server ;;
  remote) remote_deploy ;;
  smoke) smoke_public "$SMOKE_BASE" ;;
  *) die "Unknown mode: $MODE (backup|dry-run|deploy|remote|smoke)" ;;
esac
