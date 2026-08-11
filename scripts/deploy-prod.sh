#!/usr/bin/env sh
# Run on the getsylora.com VPS after merging to main.
set -eu
ROOT="${1:-.}"
cd "$ROOT"
git fetch origin main
git checkout main
git pull --ff-only origin main
if command -v docker >/dev/null 2>&1 && [ -f compose.yaml ]; then
  docker compose up -d --build
elif command -v npm >/dev/null 2>&1; then
  npm ci --omit=dev
  node scripts/migrate.mjs || true
  echo "Code updated. Restart the Node process (systemd/pm2) if it did not auto-reload."
else
  echo "No docker/npm found. Pulled main; restart the app manually."
fi
echo "Expected cache bust: ?v=20260811-avatar3"
echo "Hard refresh on phone after deploy."
