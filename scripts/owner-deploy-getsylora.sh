#!/usr/bin/env sh
# ONE owner action on the getsylora.com VPS (/opt/sylora).
# Safe: backup metadata → pull verified tip → compose up (keeps volumes) → smoke.
# Does NOT deploy stale main. Does NOT wipe data / force-push / reset --hard.
set -eu
ROOT="${1:-/opt/sylora}"
export SYLORA_DEPLOY_REF="${SYLORA_DEPLOY_REF:-cursor/sylora-live-ecosystem-34a2}"
export SMOKE_BASE="${SMOKE_BASE:-https://getsylora.com}"
export EXPECTED_CACHE_HINT="${EXPECTED_CACHE_HINT:-20260811}"

cd "$ROOT"
# Prefer the full deploy helper once it exists on disk; otherwise bootstrap pull then re-run.
if [ -x ./scripts/deploy-prod.sh ]; then
  exec ./scripts/deploy-prod.sh "$ROOT" deploy
fi

echo "[owner-deploy] scripts/deploy-prod.sh missing — fetching verified tip first"
git fetch origin "$SYLORA_DEPLOY_REF" || git fetch origin
git checkout -B "$SYLORA_DEPLOY_REF" "origin/$SYLORA_DEPLOY_REF" 2>/dev/null \
  || { git checkout "$SYLORA_DEPLOY_REF"; git pull --ff-only origin "$SYLORA_DEPLOY_REF"; }
exec ./scripts/deploy-prod.sh "$ROOT" deploy
