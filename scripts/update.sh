#!/bin/sh
# Self-update from GitHub (run on the host, e.g. from a systemd timer):
#   fetch new commits -> accept fast-forward only -> rebuild -> check the container stays up -> roll back to the old version on failure.
# The container has no healthcheck, so "healthy" here means: running, and not restarting, after a short wait.
set -eu
cd "$(dirname "$0")/.."

CONTAINER="${COMPANIONS_CONTAINER:-companionsdiscord}"
WAIT_SECONDS="${UPDATE_WAIT_SECONDS:-45}"

exec 9>"${TMPDIR:-/tmp}/companionsdiscord-update.lock"
if ! flock -n 9; then
  echo "Another update is already running, skipping."
  exit 0
fi

stable() {
  sleep "$WAIT_SECONDS"
  state=$(docker inspect -f '{{.State.Running}} {{.RestartCount}}' "$CONTAINER" 2>/dev/null || echo "false 99")
  [ "$state" = "true 0" ]
}

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "There are uncommitted changes in the working directory, not updating."
  exit 1
fi

branch=$(git rev-parse --abbrev-ref HEAD)
old=$(git rev-parse HEAD)
git fetch --quiet origin "$branch"
new=$(git rev-parse "origin/$branch")

if [ "$old" = "$new" ]; then
  echo "Already up to date ($(git rev-parse --short HEAD))."
  exit 0
fi

git merge --ff-only "origin/$branch"
echo "Updating $(git rev-parse --short "$old") -> $(git rev-parse --short "$new")"

docker compose up -d --build
if stable; then
  echo "Update complete: now on $(git rev-parse --short "$new")."
  exit 0
fi

echo "Version $(git rev-parse --short "$new") did not stay up, rolling back to $(git rev-parse --short "$old")."
git reset --hard "$old"
docker compose up -d --build
if stable; then
  echo "Rolled back to the old version, the companions are running normally."
else
  echo "Rolled back, but the container is still not stable; check:  docker compose logs --tail 50"
fi
exit 1
