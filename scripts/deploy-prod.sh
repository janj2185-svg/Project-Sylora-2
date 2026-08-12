#!/usr/bin/env sh
# Safe production deploy helper for getsylora.com (/opt/sylora).
#
# Modes:
#   backup   — full safe backup: metadata + Postgres + /app/data (no secrets printed)
#   dry-run  — validate compose + local /api/ready (requires Docker)
#   deploy   — clean-tree → backup → fetch → checkout REF → compose up → smoke
#   remote   — SSH to VPS and run deploy there (requires PROD_SSH_* secrets)
#   smoke    — hit https://getsylora.com (or SMOKE_BASE) readiness checks
#   diag     — write container diagnostics under .deploy-diag-<stamp>/ (no secrets)
#
# NEVER: git reset --hard, force-push, drop volumes, docker compose down -v, or delete production data.
# NEVER: invent or print PROD_SSH_PRIVATE_KEY / .env.local secrets.
# NEVER: copy .env.local into backup trees, git, or logs.
set -eu

ROOT="${1:-.}"
MODE="${2:-deploy}"
# Verified tip of Project-Sylora-2 (LIVE ecosystem). Override with SYLORA_DEPLOY_REF.
REF="${SYLORA_DEPLOY_REF:-cursor/sylora-live-ecosystem-34a2}"
SMOKE_BASE="${SMOKE_BASE:-https://getsylora.com}"
EXPECTED_CACHE_HINT="${EXPECTED_CACHE_HINT:-20260812}"
MIN_COMMIT="${SYLORA_MIN_COMMIT:-ddd576c4125643c1527582790a369b9faf566774}"

cd "$ROOT"
ROOT="$(pwd)"

log() { printf '%s\n' "$*"; }
die() { printf '%s\n' "$*" >&2; exit 1; }

# Build a filtered compose env file from .env.local containing ONLY interpolation keys.
# Avoids leaking COMPOSE_FILE / unrelated vars that can make `docker compose config` empty.
COMPOSE_ENV_FILE=""
prepare_compose_env() {
  COMPOSE_ENV_FILE=""
  [ -f .env.local ] || return 0
  COMPOSE_ENV_FILE="${ROOT}/.compose-interp.env"
  umask 077
  : >"$COMPOSE_ENV_FILE"
  chmod 600 "$COMPOSE_ENV_FILE"
  # shellcheck disable=SC2013
  for key in POSTGRES_PASSWORD DATABASE_URL REDIS_URL; do
    line="$(grep -E "^${key}=" .env.local 2>/dev/null | tail -n 1 || true)"
    if [ -n "$line" ]; then
      printf '%s\n' "$line" >>"$COMPOSE_ENV_FILE"
    fi
  done
  keys="$(grep -cE '^(POSTGRES_PASSWORD|DATABASE_URL|REDIS_URL)=' "$COMPOSE_ENV_FILE" 2>/dev/null || echo 0)"
  log "[compose] interpolation env ready ($keys keys from .env.local; secrets not printed)"
}

compose() {
  if [ -n "${COMPOSE_ENV_FILE:-}" ] && [ -f "$COMPOSE_ENV_FILE" ]; then
    docker compose --env-file "$COMPOSE_ENV_FILE" "$@"
  else
    docker compose "$@"
  fi
}

require_clean_worktree() {
  command -v git >/dev/null 2>&1 || die "git required"
  if [ -n "$(git status --porcelain 2>/dev/null || true)" ]; then
    log "[deploy] REFUSING: git working tree is dirty. Nothing was changed."
    log "[deploy] Clean, stash, or commit local changes, then re-run. Status:"
    git status --porcelain >&2 || true
    die "[deploy] abort (dirty worktree)"
  fi
}

refuse_main_ref() {
  case "$REF" in
    main|master)
      die "[deploy] REFUSING to deploy ref '$REF' — use cursor/sylora-live-ecosystem-34a2 (or an explicit feature ref)"
      ;;
  esac
}

volume_by_suffix() {
  suffix="$1"
  docker volume ls -q 2>/dev/null | grep -E "${suffix}$" | head -1 || true
}

# Resolve the Docker volume name mounted at /app/data (read-only backup target).
sylora_data_volume() {
  cid="$(compose ps -q sylora 2>/dev/null || true)"
  if [ -n "$cid" ]; then
    vol="$(docker inspect "$cid" --format '{{range .Mounts}}{{if eq .Destination "/app/data"}}{{.Name}}{{end}}{{end}}' 2>/dev/null || true)"
    if [ -n "$vol" ]; then
      printf '%s\n' "$vol"
      return 0
    fi
  fi
  volume_by_suffix 'sylora-data'
}

postgres_data_volume() {
  cid="$(compose ps -q postgres 2>/dev/null || true)"
  if [ -n "$cid" ]; then
    vol="$(docker inspect "$cid" --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}' 2>/dev/null || true)"
    if [ -n "$vol" ]; then
      printf '%s\n' "$vol"
      return 0
    fi
  fi
  volume_by_suffix 'sylora-postgres'
}

tar_volume_ro() {
  vol="$1"
  dest="$2"
  docker run --rm -v "$vol:/data:ro" alpine:3.21 tar -C /data -cf - . >"$dest"
}

capture_deploy_diagnostics() {
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  diag_dir="${ROOT}/.deploy-diag-${stamp}"
  mkdir -p "$diag_dir"
  chmod 700 "$diag_dir" 2>/dev/null || true
  log "[diag] writing $diag_dir (no .env.local)"
  compose ps -a >"$diag_dir/compose-ps.txt" 2>&1 || true
  docker ps -a >"$diag_dir/docker-ps.txt" 2>&1 || true
  docker volume ls >"$diag_dir/docker-volumes.txt" 2>&1 || true
  compose logs --no-color --tail=400 sylora >"$diag_dir/sylora.log" 2>&1 || true
  compose logs --no-color --tail=100 postgres >"$diag_dir/postgres.log" 2>&1 || true
  compose logs --no-color --tail=50 redis >"$diag_dir/redis.log" 2>&1 || true
  # Redacted highlight of failure lines (never dump env secrets)
  grep -E 'EACCES|DATA_DIR_NOT_WRITABLE|permission denied|FATAL|production env validation failed|Error:|DEFAULT_POSTGRES' \
    "$diag_dir/sylora.log" >"$diag_dir/sylora.errors.txt" 2>/dev/null || true
  if [ -s "$diag_dir/sylora.errors.txt" ]; then
    log "[diag] sylora error lines:"
    cat "$diag_dir/sylora.errors.txt" >&2 || true
  else
    log "[diag] no EACCES/FATAL lines matched in last sylora logs; see $diag_dir/sylora.log"
  fi
  printf '%s\n' "$diag_dir" >"${ROOT}/.deploy-diag-latest.txt"
  log "[diag] done → $diag_dir"
}

# Full production backup: metadata + Postgres + persistent /app/data.
# Read-only against live data. Never copies .env.local. Never mutates volumes.
# When containers are down but volumes exist: physical :ro volume tarballs.
# When nothing exists: EMPTY_STACK recovery marker (allows bring-up without false hard-fail).
backup_production() {
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  backup_dir="${ROOT}/.deploy-backup-${stamp}"
  mkdir -p "$backup_dir"
  chmod 700 "$backup_dir" 2>/dev/null || true

  if [ -d .git ]; then
    git rev-parse HEAD >"$backup_dir/HEAD.txt" 2>/dev/null || true
    git status --short >"$backup_dir/status.txt" 2>/dev/null || true
    git rev-parse --abbrev-ref HEAD >"$backup_dir/branch.txt" 2>/dev/null || true
  fi
  if [ -f .env.local ]; then
    wc -c .env.local >"$backup_dir/env.local.size.txt"
    ls -l .env.local | awk '{print $5,$6,$7,$8,$9}' >"$backup_dir/env.local.meta.txt" 2>/dev/null || true
  fi
  if command -v docker >/dev/null 2>&1; then
    compose ps -a >"$backup_dir/compose-ps.txt" 2>/dev/null || true
    docker volume ls >"$backup_dir/docker-volumes.txt" 2>/dev/null || true
  fi
  date -u +%Y-%m-%dT%H:%M:%SZ >"$backup_dir/created_at.txt"
  printf '%s\n' "$backup_dir" >"${ROOT}/.deploy-backup-latest.txt"

  pg_ok=0
  pg_mode=none
  data_ok=0

  # --- PostgreSQL: prefer logical dump; else physical volume tar ---
  if command -v docker >/dev/null 2>&1 && [ -f compose.yaml ]; then
    pg_cid="$(compose ps -q postgres 2>/dev/null || true)"
    if [ -n "$pg_cid" ] && docker inspect -f '{{.State.Running}}' "$pg_cid" 2>/dev/null | grep -q true; then
      log "[backup] dumping PostgreSQL via pg_dump (no secret echo)"
      if compose exec -T postgres pg_dump -U sylora -d sylora --no-owner --format=custom \
        >"$backup_dir/postgres.dump" 2>"$backup_dir/postgres.dump.err"; then
        if [ -s "$backup_dir/postgres.dump" ]; then
          wc -c "$backup_dir/postgres.dump" >"$backup_dir/postgres.dump.size.txt"
          if [ -f "$backup_dir/postgres.dump.err" ]; then
            scrubbed="$(sed 's/:[^:@/]*@/:***@/g' "$backup_dir/postgres.dump.err" 2>/dev/null || true)"
            printf '%s\n' "$scrubbed" >"$backup_dir/postgres.dump.err"
          fi
          pg_ok=1
          pg_mode=pg_dump
          log "[backup] postgres.dump OK ($(wc -c <"$backup_dir/postgres.dump") bytes)"
        fi
      fi
    fi
    if [ "$pg_ok" -ne 1 ]; then
      pgvol="$(postgres_data_volume || true)"
      if [ -n "$pgvol" ]; then
        log "[backup] postgres not dumpable — archiving volume $pgvol → postgres-data.tar (:ro)"
        if tar_volume_ro "$pgvol" "$backup_dir/postgres-data.tar" 2>"$backup_dir/postgres-data.tar.err"; then
          if [ -s "$backup_dir/postgres-data.tar" ]; then
            wc -c "$backup_dir/postgres-data.tar" >"$backup_dir/postgres-data.tar.size.txt"
            pg_ok=1
            pg_mode=volume_tar
            log "[backup] postgres-data.tar OK ($(wc -c <"$backup_dir/postgres-data.tar") bytes)"
          fi
        fi
      fi
    fi
  fi

  # --- Persistent SYLORA /app/data ---
  if command -v docker >/dev/null 2>&1; then
    vol="$(sylora_data_volume || true)"
    if [ -n "$vol" ]; then
      log "[backup] archiving persistent volume $vol → sylora-data.tar (:ro)"
      if tar_volume_ro "$vol" "$backup_dir/sylora-data.tar" 2>"$backup_dir/sylora-data.tar.err"; then
        if [ -s "$backup_dir/sylora-data.tar" ]; then
          wc -c "$backup_dir/sylora-data.tar" >"$backup_dir/sylora-data.tar.size.txt"
          data_ok=1
          log "[backup] sylora-data.tar OK ($(wc -c <"$backup_dir/sylora-data.tar") bytes)"
        fi
      fi
    else
      # Fallback when volume name unknown but container exists
      if compose exec -T sylora tar -C /app/data -cf - . >"$backup_dir/sylora-data.tar" 2>"$backup_dir/sylora-data.tar.err"; then
        :
      fi
      if [ ! -s "$backup_dir/sylora-data.tar" ]; then
        compose run --rm --no-deps --user root --entrypoint tar sylora -C /app/data -cf - . \
          >"$backup_dir/sylora-data.tar" 2>"$backup_dir/sylora-data.tar.err" || true
      fi
      if [ -s "$backup_dir/sylora-data.tar" ]; then
        wc -c "$backup_dir/sylora-data.tar" >"$backup_dir/sylora-data.tar.size.txt"
        data_ok=1
        log "[backup] sylora-data.tar OK ($(wc -c <"$backup_dir/sylora-data.tar") bytes)"
      fi
    fi
  fi

  pg_vol_present="$(postgres_data_volume || true)"
  data_vol_present="$(sylora_data_volume || true)"

  if [ "$pg_ok" -ne 1 ] && [ -n "$pg_vol_present" ]; then
    die "[backup] PostgreSQL backup FAILED but volume exists ($pg_vol_present). Refusing deploy. See $backup_dir"
  fi
  if [ "$data_ok" -ne 1 ] && [ -n "$data_vol_present" ]; then
    die "[backup] /app/data backup FAILED but volume exists ($data_vol_present). Refusing deploy. See $backup_dir"
  fi

  if [ "$pg_ok" -ne 1 ] && [ "$data_ok" -ne 1 ]; then
    log "[backup] WARN: no postgres dump/volume and no sylora-data volume — EMPTY_STACK recovery mode"
    echo "empty_stack=1" >"$backup_dir/EMPTY_STACK.txt"
    echo "note=containers/volumes not found; metadata-only backup; deploy may recreate empty volumes" >>"$backup_dir/EMPTY_STACK.txt"
  fi

  {
    echo "created_at=$(cat "$backup_dir/created_at.txt")"
    echo "head=$(cat "$backup_dir/HEAD.txt" 2>/dev/null || echo unknown)"
    echo "branch=$(cat "$backup_dir/branch.txt" 2>/dev/null || echo unknown)"
    echo "postgres_mode=$pg_mode"
    echo "postgres_ok=$pg_ok"
    echo "sylora_data_ok=$data_ok"
    echo "postgres_volume=${pg_vol_present:-none}"
    echo "sylora_data_volume=${data_vol_present:-none}"
    if [ -f "$backup_dir/postgres.dump" ]; then echo "postgres_dump_bytes=$(wc -c <"$backup_dir/postgres.dump")"; fi
    if [ -f "$backup_dir/postgres-data.tar" ]; then echo "postgres_data_tar_bytes=$(wc -c <"$backup_dir/postgres-data.tar")"; fi
    if [ -f "$backup_dir/sylora-data.tar" ]; then echo "sylora_data_tar_bytes=$(wc -c <"$backup_dir/sylora-data.tar")"; fi
    echo "env_local_copied=no"
  } >"$backup_dir/MANIFEST.txt"

  log "[backup] wrote $backup_dir (manifest OK; .env.local NOT copied)"
  cat "$backup_dir/MANIFEST.txt"
}

backup_tree() {
  backup_production
}

wait_ready() {
  url="$1"
  i=0
  while [ "$i" -lt 60 ]; do
    if curl -fsS "$url" >/dev/null 2>&1; then
      log "[ready] $url OK"
      return 0
    fi
    i=$((i + 1))
    sleep 2
  done
  log "[ready] $url not ready in time"
  return 1
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
  for path in /api/sylora-live/capabilities /api/studio/companion-boundary /live-studio.js; do
    c="$(curl -sS -o /dev/null -w '%{http_code}' "$base$path")"
    [ "$c" = "200" ] || die "[smoke] $path HTTP $c (deploy ref too old or not applied)"
    log "[smoke] $path OK"
  done
  g="$(curl -sS -o /tmp/sylora-google.json -w '%{http_code}' "$base/api/auth/google")"
  if [ "$g" = "503" ] || [ "$g" = "200" ]; then
    log "[smoke] /api/auth/google HTTP $g (fail-closed or configured)"
  else
    die "[smoke] /api/auth/google unexpected HTTP $g"
  fi
  if [ -x ./scripts/prod-smoke.sh ]; then
    ./scripts/prod-smoke.sh "$base" || die "[smoke] prod-smoke.sh FAIL"
  fi
  log "[smoke] PASS"
}

rollback_to() {
  prev="$1"
  [ -n "$prev" ] || return 1
  log "[rollback] restoring $prev"
  git checkout --force "$prev" || return 1
  ensure_persistent_data_permissions || true
  compose up -d --build || return 1
  wait_ready "http://127.0.0.1:8787/api/ready"
  log "[rollback] ready after restore"
}

# Prepare named volume /app/data so non-root user sylora can write sylora.json atomically.
# Never make the tree world-writable. Never wipe volume contents.
ensure_persistent_data_permissions() {
  command -v docker >/dev/null 2>&1 || return 0
  [ -f compose.yaml ] || return 0
  log "[deploy] ensuring sylora-data volume ownership for app user (owner rw only)"
  compose create sylora >/dev/null 2>&1 || true
  if compose run --rm --no-deps --user root --entrypoint sh sylora -c '
      set -eu
      mkdir -p /app/data /app/data/media
      if id sylora >/dev/null 2>&1; then
        chown -R sylora:sylora /app/data
        chmod 755 /app/data
        find /app/data -maxdepth 1 -type f \( -name "sylora.json" -o -name "sylora.json.tmp" -o -name "sylora-*.json" \) -exec chown sylora:sylora {} \; -exec chmod 600 {} \; 2>/dev/null || true
        echo "[deploy] /app/data ready for user sylora"
        ls -la /app/data | head -20
        touch /app/data/.write-test && rm -f /app/data/.write-test
        echo "[deploy] write-test OK as root before drop (volume writable)"
      else
        echo "[deploy] WARN: user sylora missing in image — rebuild required" >&2
        exit 1
      fi
    '; then
    log "[deploy] persistent data permissions OK"
  else
    log "[deploy] WARN: could not pre-chown volume (image may need rebuild); runtime entrypoint will retry as root"
  fi
}

deploy_on_server() {
  command -v git >/dev/null 2>&1 || die "git required"
  command -v docker >/dev/null 2>&1 || die "docker required on production host"
  [ -f compose.yaml ] || die "compose.yaml missing in $ROOT — is this /opt/sylora?"

  refuse_main_ref
  require_clean_worktree
  prepare_compose_env

  # Prove compose still sees services (guards against env-file pollution)
  svc="$(compose config --services 2>/dev/null | tr '\n' ' ')"
  log "[deploy] compose services: $svc"
  echo "$svc" | grep -q sylora || die "[deploy] compose config has no sylora service — check compose.yaml / interpolation env"
  echo "$svc" | grep -q postgres || die "[deploy] compose config has no postgres service"

  backup_production
  prev_head="$(git rev-parse HEAD 2>/dev/null || true)"
  printf '%s\n' "$prev_head" >"${ROOT}/.deploy-backup-latest-HEAD.txt" 2>/dev/null || true

  log "[deploy] fetching origin / ref=$REF (prev=$prev_head)"
  git fetch origin "$REF" || git fetch origin
  require_clean_worktree

  if git show-ref --verify --quiet "refs/remotes/origin/$REF"; then
    git checkout -B "$REF" "origin/$REF"
  elif git show-ref --verify --quiet "refs/tags/$REF"; then
    git checkout --detach "$REF"
  else
    git checkout "$REF"
    git pull --ff-only origin "$REF" 2>/dev/null || true
  fi

  case "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo detached)" in
    main|master) die "[deploy] REFUSING: landed on main/master" ;;
  esac

  if [ -n "$MIN_COMMIT" ]; then
    git merge-base --is-ancestor "$MIN_COMMIT" HEAD \
      || die "[deploy] HEAD does not contain required commit $MIN_COMMIT"
  fi

  # Re-prepare after checkout (script/env may have changed)
  prepare_compose_env

  log "[deploy] HEAD=$(git rev-parse --short HEAD) branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo detached)"

  if ! compose build sylora; then
    capture_deploy_diagnostics || true
    log "[deploy] build failed — attempting rollback"
    rollback_to "$prev_head" || die "[deploy] build failed and rollback failed"
    die "[deploy] build failed; rolled back to $prev_head"
  fi

  ensure_persistent_data_permissions

  # Never down -v. Bring stack up in place; keeps named volumes.
  if ! compose up -d --build --remove-orphans; then
    capture_deploy_diagnostics || true
    log "[deploy] compose failed — attempting rollback"
    rollback_to "$prev_head" || die "[deploy] compose failed and rollback failed"
    die "[deploy] compose failed; rolled back to $prev_head"
  fi

  if [ -f scripts/migrate.mjs ]; then
    log "[deploy] verifying migrations via sylora service"
    compose exec -T sylora node scripts/migrate.mjs 2>/dev/null \
      || log "[deploy] migrate exec skipped/failed non-fatally — check container logs (startup command may have migrated)"
  fi

  if ! wait_ready "http://127.0.0.1:8787/api/ready"; then
    capture_deploy_diagnostics || true
    log "[deploy] ready check failed — attempting rollback AFTER diagnostics"
    rollback_to "$prev_head" || die "[deploy] ready failed and rollback failed (see .deploy-diag-latest.txt)"
    die "[deploy] ready failed; rolled back to $prev_head (see .deploy-diag-latest.txt)"
  fi
  curl -fsS "http://127.0.0.1:8787/api/ready"; echo
  curl -fsS "http://127.0.0.1:8787/api/health"; echo
  compose ps
  log "[deploy] local ready OK — verifying public domain if reachable"
  if curl -fsS "$SMOKE_BASE/api/ready" >/dev/null 2>&1; then
    if ! smoke_public "$SMOKE_BASE"; then
      capture_deploy_diagnostics || true
      log "[deploy] public smoke FAIL — attempting rollback"
      rollback_to "$prev_head" || die "[deploy] smoke failed and rollback failed"
      die "[deploy] public smoke failed; rolled back to $prev_head"
    fi
  else
    log "[deploy] public $SMOKE_BASE not reachable from this host yet; running local smoke against 127.0.0.1:8787"
    if [ -x ./scripts/prod-smoke.sh ]; then
      ./scripts/prod-smoke.sh "http://127.0.0.1:8787" || {
        capture_deploy_diagnostics || true
        die "[deploy] local prod-smoke failed"
      }
    fi
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
    "set -eu; cd '$path'; SYLORA_DEPLOY_REF='$REF' SYLORA_MIN_COMMIT='$MIN_COMMIT' SMOKE_BASE='$SMOKE_BASE' EXPECTED_CACHE_HINT='$EXPECTED_CACHE_HINT' ./scripts/deploy-prod.sh '$path' deploy"
  smoke_public "$SMOKE_BASE"
}

prepare_compose_env

case "$MODE" in
  backup) backup_production ;;
  diag) capture_deploy_diagnostics ;;
  dry-run)
    command -v docker >/dev/null 2>&1 || die "docker required for dry-run"
    compose config >/dev/null
    compose up -d --build
    wait_ready "http://127.0.0.1:8787/api/ready" || die "dry-run ready failed"
    ;;
  deploy) deploy_on_server ;;
  remote) remote_deploy ;;
  smoke) smoke_public "$SMOKE_BASE" ;;
  *) die "Unknown mode: $MODE (backup|diag|dry-run|deploy|remote|smoke)" ;;
esac
