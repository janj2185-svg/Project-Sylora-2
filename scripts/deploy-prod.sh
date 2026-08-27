#!/usr/bin/env sh
# Production helper for the getsylora.com VPS — also usable as a local dry-run.
set -eu
ROOT="${1:-.}"
MODE="${2:-deploy}" # deploy | dry-run
EXPECTED_SHA="${3:-${SYLORA_EXPECTED_RELEASE_SHA:-}}"
PUBLIC_BASE_URL="${SYLORA_PUBLIC_BASE_URL:-https://getsylora.com}"
cd "$ROOT"

full_sha() {
  [ "${#1}" -eq 40 ] || return 1
  case "$1" in *[!0-9a-fA-F]*) return 1 ;; esac
  return 0
}

export_release() {
  SYLORA_RELEASE_SHA="$1"
  SYLORA_RELEASE_REF="$2"
  SYLORA_RELEASED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  export SYLORA_RELEASE_SHA SYLORA_RELEASE_REF SYLORA_RELEASED_AT
}

wait_ready() {
  i=0
  while [ "$i" -lt 45 ]; do
    if curl -fsS "http://127.0.0.1:8787/api/ready" >/dev/null 2>&1; then
      return 0
    fi
    i=$((i + 1))
    sleep 2
  done
  return 1
}

verify_release() {
  docker compose exec -T sylora node scripts/verify-release.mjs "$@"
}

if [ "$MODE" = "dry-run" ]; then
  echo "[dry-run] validating compose + health locally"
  release_sha="$(git rev-parse HEAD)"
  full_sha "$release_sha" || { echo "[dry-run] cannot resolve a full release SHA" >&2; exit 1; }
  export_release "$release_sha" "dry-run"
  docker compose config -q
  docker compose up -d --build
  wait_ready || { echo "[dry-run] /api/ready not ready in time" >&2; exit 1; }
  verify_release http://127.0.0.1:8787 "$release_sha" 15
  echo "[dry-run] readiness and exact release identity OK"
  exit 0
fi

if [ "$MODE" != "deploy" ]; then
  echo "Unknown mode: $MODE (expected deploy or dry-run)" >&2
  exit 2
fi
if ! command -v docker >/dev/null 2>&1 || [ ! -f compose.yaml ]; then
  echo "Docker Compose and compose.yaml are required for an atomic verified deploy." >&2
  exit 1
fi
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Tracked production worktree changes detected; refusing to overwrite them." >&2
  exit 1
fi
if [ -z "$EXPECTED_SHA" ]; then
  echo "Deploy requires the explicitly approved full 40-character main commit SHA." >&2
  exit 2
fi
if ! full_sha "$EXPECTED_SHA"; then
  echo "Expected release SHA must be the full 40-character commit." >&2
  exit 2
fi

previous_sha="$(git rev-parse HEAD)"
previous_ref="$(git symbolic-ref --quiet --short HEAD || printf '%s' detached)"
if [ "$previous_ref" != "main" ]; then
  echo "Production worktree must be on main before deploy; observed $previous_ref." >&2
  exit 1
fi
git_dir="$(git rev-parse --git-dir)"
current_release_file="$git_dir/sylora-production-current"
previous_release_file="$git_dir/sylora-production-previous"
if [ -f "$current_release_file" ]; then
  rollback_sha="$(tr -d '\r\n' < "$current_release_file")"
  full_sha "$rollback_sha" || { echo "Stored production SHA is invalid; refusing an unsafe deploy." >&2; exit 1; }
  git cat-file -e "$rollback_sha^{commit}" 2>/dev/null || { echo "Stored production commit is unavailable locally." >&2; exit 1; }
else
  rollback_sha="$previous_sha"
  printf '%s\n' "$rollback_sha" > "$current_release_file"
fi
git fetch origin main
target_sha="$(git rev-parse origin/main)"
full_sha "$target_sha" || { echo "Could not resolve origin/main to a full commit." >&2; exit 1; }
if [ "$target_sha" != "$(printf '%s' "$EXPECTED_SHA" | tr 'A-F' 'a-f')" ]; then
  echo "origin/main is $target_sha, not explicitly approved $EXPECTED_SHA; refusing deploy." >&2
  exit 1
fi

git switch main
git merge --ff-only origin/main
[ "$(git rev-parse HEAD)" = "$target_sha" ] || { echo "Local main does not match origin/main." >&2; exit 1; }
export_release "$target_sha" "main"
docker compose config -q

rollback() {
  echo "Deploy verification failed; attempting application rollback to $rollback_sha." >&2
  git switch --detach "$rollback_sha"
  export_release "$rollback_sha" "rollback"
  if docker compose up -d --build && wait_ready; then
    echo "Application rollback is ready at $rollback_sha. Database migrations were not reversed." >&2
  else
    echo "Automatic application rollback also failed; inspect docker compose logs immediately." >&2
  fi
  git switch main >/dev/null 2>&1 || true
}

if ! docker compose up -d --build; then
  rollback
  exit 1
fi
if ! wait_ready; then
  rollback
  exit 1
fi
if ! verify_release http://127.0.0.1:8787 "$target_sha" 20; then
  rollback
  exit 1
fi
if ! verify_release "$PUBLIC_BASE_URL" "$target_sha" 90; then
  rollback
  exit 1
fi

cp "$current_release_file" "$previous_release_file"
printf '%s\n' "$target_sha" > "$current_release_file"
echo "Deploy complete: $PUBLIC_BASE_URL serves exact release $target_sha."
