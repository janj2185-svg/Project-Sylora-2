#!/usr/bin/env sh
# Production helper for getsylora.com (/opt/sylora) — also usable as a local dry-run.
# NEVER: git reset --hard, force-push, or delete local backup commits without analysis.
set -eu
ROOT="${1:-.}"
MODE="${2:-deploy}" # deploy | dry-run | backup
cd "$ROOT"

backup_tree() {
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  backup_dir="${ROOT}/.deploy-backup-${stamp}"
  mkdir -p "$backup_dir"
  if [ -d .git ]; then
    git rev-parse HEAD >"$backup_dir/HEAD.txt" || true
    git status --short >"$backup_dir/status.txt" || true
  fi
  if [ -f .env.local ]; then
    # copy metadata only — never echo secrets
    wc -c .env.local >"$backup_dir/env.local.size.txt"
  fi
  echo "[backup] wrote $backup_dir (no secrets printed)"
}

if [ "$MODE" = "backup" ]; then
  backup_tree
  exit 0
fi

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

backup_tree
git fetch origin main
git checkout main
git pull --ff-only origin main
if command -v docker >/dev/null 2>&1 && [ -f compose.yaml ]; then
  docker compose up -d --build
  curl -fsS "http://127.0.0.1:8787/api/ready"
  echo
  echo "Deploy complete on ${ROOT}. Hard refresh clients. Verify https://getsylora.com"
else
  echo "Docker/compose not found. Pulled main; restart the Node process manually." >&2
  exit 1
fi
