#!/usr/bin/env sh
# Production helper for the getsylora.com VPS — also usable as a local dry-run.
set -eu
ROOT="${1:-.}"
MODE="${2:-deploy}" # deploy | dry-run
cd "$ROOT"

if [ "$MODE" = "dry-run" ]; then
  echo "[dry-run] validating compose + health locally"
  docker compose config >/dev/null
  docker compose up -d --build
  i=0
  while [ "$i" -lt 30 ]; do
    if curl -fsS "http://127.0.0.1:8787/api/ready" >/dev/null 2>&1; then
      echo "[dry-run] /api/ready OK"
      exit 0
    fi
    i=$((i + 1))
    sleep 2
  done
  echo "[dry-run] /api/ready not ready in time" >&2
  exit 1
fi

git fetch origin main
git checkout main
git pull --ff-only origin main
if command -v docker >/dev/null 2>&1 && [ -f compose.yaml ]; then
  docker compose up -d --build
  curl -fsS "http://127.0.0.1:8787/api/ready"
  echo
  echo "Deploy complete. Hard refresh clients. Expected cache bust includes avatar3+."
else
  echo "Docker/compose not found. Pulled main; restart the Node process manually." >&2
  exit 1
fi
