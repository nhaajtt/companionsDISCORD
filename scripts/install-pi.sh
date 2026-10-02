#!/bin/sh
# One-command installer for the companion bots on a Raspberry Pi (Raspberry Pi OS, Debian, Kali) or any Debian-based Linux box.
#
#   curl -fsSL https://raw.githubusercontent.com/nhaajtt/companionsDISCORD/main/scripts/install-pi.sh | sh
#   sh scripts/install-pi.sh [--timer] [--yes] [--dry-run]
#
# It installs Docker and git, fetches the project into ~/companionsDISCORD, asks for the bot tokens, starts the bots and
# optionally installs the daily auto-update timer. It never overwrites an existing .env and is safe to run again.
# It can sit next to musiDISCORD on the same machine: the two projects share nothing at runtime.
#
# Flags:   --timer     install the daily auto-update systemd timer
#          --yes       don't ask questions (reads COMPANION_TOKENS and COMPANION_TIMEZONE from the environment)
#          --dry-run   print what would be done without changing anything
set -eu

REPO_URL="${REPO_URL:-https://github.com/nhaajtt/companionsDISCORD.git}"
TARGET_DIR="${TARGET_DIR:-$HOME/companionsDISCORD}"
WANT_TIMER=ask
ASSUME_YES=0
DRY_RUN=0

for arg in "$@"; do
  case "$arg" in
    --timer) WANT_TIMER=yes ;;
    --yes|-y) ASSUME_YES=1; [ "$WANT_TIMER" = ask ] && WANT_TIMER=yes ;;
    --dry-run) DRY_RUN=1 ;;
    -h|--help) sed -n '2,13p' "$0"; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done

say() { printf '\n==> %s\n' "$*"; }
run() {
  if [ "$DRY_RUN" = 1 ]; then printf '[dry-run] %s\n' "$*"; else "$@"; fi
}

# Questions come from the terminal even when the script itself is piped into sh
if [ -t 0 ]; then TTY=/dev/stdin; elif [ -r /dev/tty ]; then TTY=/dev/tty; else TTY=""; fi

ask() { # ask "Question" default -> sets REPLY
  if [ "$ASSUME_YES" = 1 ] || [ -z "$TTY" ]; then REPLY="$2"; return; fi
  printf '%s ' "$1" >&2
  read -r REPLY < "$TTY" || REPLY=""
  [ -n "$REPLY" ] || REPLY="$2"
}

ask_secret() { # like ask, but nothing is echoed
  if [ "$ASSUME_YES" = 1 ] || [ -z "$TTY" ]; then REPLY="$2"; return; fi
  printf '%s ' "$1" >&2
  stty -echo < "$TTY" 2>/dev/null || true
  read -r REPLY < "$TTY" || REPLY=""
  stty echo < "$TTY" 2>/dev/null || true
  printf '\n' >&2
  [ -n "$REPLY" ] || REPLY="$2"
}

yes_no() { # yes_no "Question [y/N]" default(y|n) -> returns 0 for yes
  ask "$1" "$2"
  case "$REPLY" in [Yy]*) return 0 ;; *) return 1 ;; esac
}

USER="${USER:-$(id -un)}"

# Dry runs skip these checks so the script can be previewed on any machine
if [ "$DRY_RUN" = 0 ]; then
  [ "$(uname -s)" = Linux ] || { echo "This installer is for Linux (a Raspberry Pi or similar)." >&2; exit 1; }
  [ "$(id -u)" -ne 0 ] || { echo "Run this as your normal user, not root (it uses sudo when needed)." >&2; exit 1; }
  command -v sudo >/dev/null 2>&1 || { echo "sudo is required." >&2; exit 1; }
  command -v apt-get >/dev/null 2>&1 || { echo "This installer needs apt (Debian, Raspberry Pi OS, Ubuntu, Kali)." >&2; exit 1; }
fi

# ---------------------------------------------------------------- packages

say "Installing Docker and git"
NEED=""
command -v docker >/dev/null 2>&1 || NEED="$NEED docker.io"
command -v git >/dev/null 2>&1 || NEED="$NEED git"
if [ -n "$NEED" ]; then
  run sudo apt-get update
  # shellcheck disable=SC2086
  run sudo apt-get install -y $NEED
fi

if ! docker compose version >/dev/null 2>&1 && ! sudo docker compose version >/dev/null 2>&1; then
  run sudo apt-get install -y docker-compose-v2 \
    || run sudo apt-get install -y docker-compose-plugin \
    || { echo "Could not install Docker Compose v2. Install it by hand and run this again." >&2; exit 1; }
fi

run sudo systemctl enable --now docker

# If the user is not in the docker group yet (fresh install), use sudo for this run
DOCKER="docker"
if [ "$DRY_RUN" = 0 ] && ! docker info >/dev/null 2>&1; then DOCKER="sudo docker"; fi
if ! id -nG "$USER" | tr ' ' '\n' | grep -qx docker; then
  run sudo usermod -aG docker "$USER"
  echo "Added $USER to the docker group (takes effect the next time you log in)."
fi

# ---------------------------------------------------------------- project files

if [ -f docker-compose.yml ] && [ -f src/runtime.js ]; then
  TARGET_DIR="$(pwd)"
elif [ -d "$TARGET_DIR/.git" ]; then
  say "Updating $TARGET_DIR"
  run git -C "$TARGET_DIR" pull --ff-only
else
  say "Downloading the project to $TARGET_DIR"
  run git clone "$REPO_URL" "$TARGET_DIR"
fi
if [ "$DRY_RUN" = 0 ]; then cd "$TARGET_DIR"; fi

# ---------------------------------------------------------------- .env

set_env() { # set_env KEY VALUE: replace the KEY= line of .env, or append it
  [ "$DRY_RUN" = 1 ] && { printf '[dry-run] set %s in .env\n' "$1"; return; }
  grep -v "^$1=" .env > .env.tmp || true
  printf '%s=%s\n' "$1" "$2" >> .env.tmp
  mv .env.tmp .env
}

if [ -f .env ] && grep -Eq '^COMPANION_TOKENS=.+' .env; then
  say "Keeping the existing .env"
else
  say "Configuring the companions"
  echo "Create 2 to 10 applications at https://discord.com/developers/applications, add a Bot to each, and copy each bot token."
  TOKENS="${COMPANION_TOKENS:-}"
  while [ -z "$TOKENS" ]; do
    ask_secret "Bot tokens, separated by commas (hidden):" ""
    TOKENS="$REPLY"
    [ -n "$TOKENS" ] || { [ -n "$TTY" ] && [ "$ASSUME_YES" = 0 ] || { echo "COMPANION_TOKENS is required." >&2; exit 1; }; }
  done
  COUNT=$(printf '%s' "$TOKENS" | tr ',' '\n' | grep -c .)
  [ "$COUNT" -ge 2 ] || { echo "At least two tokens are needed (got $COUNT)." >&2; exit 1; }
  ask "Time zone [Asia/Ho_Chi_Minh]:" "${COMPANION_TIMEZONE:-Asia/Ho_Chi_Minh}"
  ZONE="$REPLY"

  if [ "$DRY_RUN" = 0 ] && [ ! -f .env ]; then cp .env.example .env; fi
  set_env COMPANION_TOKENS "$TOKENS"
  set_env COMPANION_TIMEZONE "$ZONE"
  [ "$DRY_RUN" = 1 ] || chmod 600 .env
fi

# ---------------------------------------------------------------- start

say "Building and starting the companions (the first build takes a few minutes)"
run $DOCKER compose up -d --build

# ---------------------------------------------------------------- timer

if [ "$WANT_TIMER" = ask ]; then
  if yes_no "Install the daily automatic update? [Y/n]" y; then WANT_TIMER=yes; else WANT_TIMER=no; fi
fi
if [ "$WANT_TIMER" = yes ]; then
  say "Installing the auto-update timer"
  for ext in service timer; do
    src="deploy/pi/companionsdiscord-update.$ext"
    if [ "$DRY_RUN" = 1 ]; then
      printf '[dry-run] install %s as /etc/systemd/system/companionsdiscord-update.%s\n' "$src" "$ext"
    else
      sed "s#__USER__#$USER#g; s#__DIR__#$PWD#g" "$src" | sudo tee "/etc/systemd/system/companionsdiscord-update.$ext" >/dev/null
    fi
  done
  run sudo systemctl daemon-reload
  run sudo systemctl enable --now companionsdiscord-update.timer
fi

# ---------------------------------------------------------------- done

say "Done"
echo "Invite every bot to your server (link and permissions are in $TARGET_DIR/.env.example), then run in Discord:"
echo "  /companions setup channel:#your-channel"
echo "Logs:  $DOCKER compose logs -f"
exit 0
