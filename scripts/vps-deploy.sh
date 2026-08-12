#!/usr/bin/env sh
# One short entrypoint for VPS (/opt/sylora). No multiline paste required.
# Usage: ./scripts/vps-deploy.sh
set -eu
cd "$(dirname "$0")/.."
export SYLORA_DEPLOY_REF="${SYLORA_DEPLOY_REF:-cursor/sylora-live-ecosystem-34a2}"
export SYLORA_MIN_COMMIT="${SYLORA_MIN_COMMIT:-3172cf5c3c0d254360d321b998a46bdca39d62fb}"
export SMOKE_BASE="${SMOKE_BASE:-https://getsylora.com}"
export EXPECTED_CACHE_HINT="${EXPECTED_CACHE_HINT:-20260812}"
case "$SYLORA_DEPLOY_REF" in main|master) echo "REFUSING main/master"; exit 2 ;; esac
[ -z "$(git status --porcelain)" ] || { echo "REFUSING dirty worktree"; git status --porcelain; exit 2; }
git fetch origin "$SYLORA_DEPLOY_REF"
git checkout -B "$SYLORA_DEPLOY_REF" "origin/$SYLORA_DEPLOY_REF"
git merge-base --is-ancestor "$SYLORA_MIN_COMMIT" HEAD
case "$(git rev-parse --abbrev-ref HEAD)" in main|master) echo "REFUSING landed on main"; exit 2 ;; esac
exec ./scripts/deploy-prod.sh "$(pwd)" deploy
