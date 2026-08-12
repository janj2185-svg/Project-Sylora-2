#!/usr/bin/env bash
# SYLORA Cloud Agent start: per-boot reconciliation of local services.
# Starts PostgreSQL + Redis (idempotently), waits for readiness, applies
# any pending migrations, then returns. Long-running processes belong in
# terminals, not here.
set -euo pipefail

cd "$(dirname "$0")/.."

SYLORA_HOME="${SYLORA_HOME:-$HOME/.sylora}"
PGDATA="$SYLORA_HOME/pgdata"
mkdir -p "$SYLORA_HOME"
PG_BIN="$(ls -d /usr/lib/postgresql/*/bin | sort -V | tail -1)"

echo "==> Starting Redis (if not already running)"
if ! redis-cli ping >/dev/null 2>&1; then
  redis-server --daemonize yes --dir "$SYLORA_HOME" --appendonly no --save ""
fi

echo "==> Starting PostgreSQL (if not already accepting connections)"
if ! "$PG_BIN/pg_isready" -h 127.0.0.1 -U sylora >/dev/null 2>&1; then
  # A snapshot may embed a stale postmaster.pid from when the cluster was
  # captured while running; clear it if no server is actually alive.
  if [ -f "$PGDATA/postmaster.pid" ] && ! "$PG_BIN/pg_ctl" -D "$PGDATA" status >/dev/null 2>&1; then
    rm -f "$PGDATA/postmaster.pid"
  fi
  "$PG_BIN/pg_ctl" -D "$PGDATA" -o "-k $SYLORA_HOME" -l "$SYLORA_HOME/pg.log" -w start
fi

echo "==> Waiting for PostgreSQL to accept connections"
for _ in $(seq 1 30); do
  if "$PG_BIN/pg_isready" -h 127.0.0.1 -U sylora >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
"$PG_BIN/pg_isready" -h 127.0.0.1 -U sylora

echo "==> Applying database migrations (idempotent)"
DATABASE_URL="postgresql://sylora:sylora_dev_only@127.0.0.1:5432/sylora" \
  node scripts/migrate.mjs

echo "==> start complete: PostgreSQL + Redis ready"
