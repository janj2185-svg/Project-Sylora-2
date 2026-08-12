#!/bin/sh
# Production entrypoint: fix persistent data volume ownership, then drop to non-root.
# Named Docker volumes mount as root:root by default — never make the tree world-writable.
set -eu

DATA_DIR="${SYLORA_DATA_DIR:-/app/data}"
mkdir -p "$DATA_DIR" "$DATA_DIR/media"

if [ "$(id -u)" = "0" ]; then
  # Ensure sylora can read/write atomic sylora.json / sylora.json.tmp
  chown -R sylora:sylora "$DATA_DIR"
  chmod 755 "$DATA_DIR"
  find "$DATA_DIR" -maxdepth 1 -type f \( -name 'sylora.json' -o -name 'sylora.json.tmp' -o -name 'sylora-*.json' \) \
    -exec chown sylora:sylora {} \; \
    -exec chmod 600 {} \; 2>/dev/null || true
  exec su-exec sylora "$0" "$@"
fi

if [ ! -w "$DATA_DIR" ]; then
  echo "[SYLORA] FATAL: data directory not writable by $(id -un) uid=$(id -u): $DATA_DIR" >&2
  echo "[SYLORA] Fix volume ownership (entrypoint should chown as root) — refusing to start." >&2
  ls -lad "$DATA_DIR" >&2 || true
  exit 1
fi

# Prove atomic write path works before Node boots (catches EACCES early with a clear message)
tmp="$DATA_DIR/.entrypoint-write-test.$$"
if ! ( : >"$tmp" ) 2>/dev/null; then
  echo "[SYLORA] FATAL: cannot create files in $DATA_DIR as $(id -un) — Store.save would hit EACCES" >&2
  ls -lad "$DATA_DIR" >&2 || true
  exit 1
fi
rm -f "$tmp"

exec "$@"
