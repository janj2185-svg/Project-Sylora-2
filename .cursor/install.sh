#!/usr/bin/env bash
# SYLORA Cloud Agent install: idempotent dependency + local-service preparation.
# Runs after the repository is checked out. Must terminate and be safe to re-run.
set -euo pipefail

cd "$(dirname "$0")/.."

SYLORA_HOME="${SYLORA_HOME:-$HOME/.sylora}"
PGDATA="$SYLORA_HOME/pgdata"
mkdir -p "$SYLORA_HOME"

echo "==> Installing system packages (postgresql, redis-server, ffmpeg)"
if ! command -v redis-server >/dev/null 2>&1 \
  || ! ls -d /usr/lib/postgresql/*/bin >/dev/null 2>&1 \
  || ! command -v ffmpeg >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  sudo apt-get update -qq
  sudo apt-get install -y -qq --no-install-recommends \
    postgresql postgresql-contrib redis-server ffmpeg
fi

PG_BIN="$(ls -d /usr/lib/postgresql/*/bin | sort -V | tail -1)"

echo "==> Installing Node dependencies (npm ci)"
npm ci

echo "==> Initializing local PostgreSQL cluster (if needed)"
if [ ! -s "$PGDATA/PG_VERSION" ]; then
  "$PG_BIN/initdb" -D "$PGDATA" -U sylora --auth-local=trust --auth-host=trust >/dev/null
  {
    echo "listen_addresses = '127.0.0.1'"
    echo "unix_socket_directories = '$SYLORA_HOME'"
    echo "port = 5432"
  } >> "$PGDATA/postgresql.conf"
fi

echo "==> Creating sylora database + role password (if needed)"
"$PG_BIN/pg_ctl" -D "$PGDATA" -o "-k $SYLORA_HOME" -l "$SYLORA_HOME/pg-install.log" -w start
trap '"$PG_BIN/pg_ctl" -D "$PGDATA" -m fast -w stop >/dev/null 2>&1 || true' EXIT
"$PG_BIN/psql" -h 127.0.0.1 -U sylora -d postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname='sylora'" | grep -q 1 \
  || "$PG_BIN/createdb" -h 127.0.0.1 -U sylora sylora
"$PG_BIN/psql" -h 127.0.0.1 -U sylora -d postgres -c \
  "ALTER ROLE sylora WITH PASSWORD 'sylora_dev_only'" >/dev/null

echo "==> Applying database migrations"
DATABASE_URL="postgresql://sylora:sylora_dev_only@127.0.0.1:5432/sylora" \
  node scripts/migrate.mjs

echo "==> install complete"
