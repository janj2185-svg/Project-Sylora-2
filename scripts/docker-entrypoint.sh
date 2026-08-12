#!/bin/sh
# Production entrypoint: fix persistent data volume ownership, then drop to non-root.
# Named Docker volumes mount as root:root by default — never make the tree world-writable.
set -eu

DATA_DIR="${SYLORA_DATA_DIR:-/app/data}"
mkdir -p "$DATA_DIR"

if [ "$(id -u)" = "0" ]; then
  # Ensure sylora can read/write atomic sylora.json / sylora.json.tmp
  chown -R sylora:sylora "$DATA_DIR"
  chmod 755 "$DATA_DIR"
  # Restrictive perms on JSON store files if present (owner rw, group/other none)
  find "$DATA_DIR" -maxdepth 1 -type f \( -name 'sylora.json' -o -name 'sylora.json.tmp' -o -name 'sylora-*.json' \) \
    -exec chown sylora:sylora {} \; \
    -exec chmod 600 {} \; 2>/dev/null || true
  exec su-exec sylora "$0" "$@"
fi

if [ ! -w "$DATA_DIR" ]; then
  echo "[SYLORA] FATAL: data directory not writable by $(id -un): $DATA_DIR" >&2
  echo "[SYLORA] Fix volume ownership (entrypoint should chown as root) — refusing to start." >&2
  exit 1
fi

exec "$@"
