#!/usr/bin/env bash
# Deploys (or updates) MarketPulse on the VM. Called by GitHub Actions over SSH; can also be run by hand:
#   cd ~/marketpulse && IMAGE_TAG=latest ./deploy.sh
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/marketpulse}"
cd "$APP_DIR"
COMPOSE="docker compose -f docker-compose.prod.yml"

green() { printf '\033[0;32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[1;33m%s\033[0m\n' "$*"; }
red() { printf '\033[0;31m%s\033[0m\n' "$*"; }

# 1. Settings -> .env (owner only). A value that is not provided keeps its previous value,
#    so the Adzuna keys already in ~/marketpulse/.env from the old setup keep working.
touch .env && chmod 600 .env
# Old .env files may have Windows line endings or a BOM, which compose would keep in the values.
sed -i 's/\r$//; 1s/^\xEF\xBB\xBF//' .env
set_env() {
  local key="$1" value="${2:-}"
  [ -z "$value" ] && return 0
  { grep -v "^${key}=" .env || true; printf '%s=%s\n' "$key" "$value"; } > .env.tmp
  mv .env.tmp .env && chmod 600 .env
}
env_get() { grep "^$1=" .env | tail -n1 | cut -d= -f2- | tr -d '"'"'"'\r' || true; }

set_env IMAGE_TAG "${IMAGE_TAG:-latest}"
set_env ADZUNA_APP_ID "${ADZUNA_APP_ID:-}"
set_env ADZUNA_APP_KEY "${ADZUNA_APP_KEY:-}"
set_env ADZUNA_DAILY_LIMIT "${ADZUNA_DAILY_LIMIT:-}"
set_env MARKETPULSE_BIND "${MARKETPULSE_BIND:-}"
for k in ADZUNA_APP_ID ADZUNA_APP_KEY; do
  [ -n "$(env_get $k)" ] || { red "$k is missing: add it as a GitHub secret or in $APP_DIR/.env"; exit 1; }
done

# Compose gives shell variables priority over .env, and GitHub passes missing secrets as empty
# strings: drop them from the environment so the values saved in .env are the ones used.
unset IMAGE_TAG ADZUNA_APP_ID ADZUNA_APP_KEY ADZUNA_DAILY_LIMIT MARKETPULSE_BIND

# 2. Registry login and shared network
if [ -n "${GHCR_TOKEN:-}" ]; then
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "${GHCR_USER:-anasserekysy}" --password-stdin >/dev/null
fi
docker network inspect web >/dev/null 2>&1 || { yellow "Creating Docker network web"; docker network create web >/dev/null; }

# 3. Pull first, so the running version stays up if the pull fails.
green "Pulling image (tag: $(env_get IMAGE_TAG))"
$COMPOSE pull

# The old setup ran nginx, api, client and redis containers; they are replaced by one container.
for c in marketpulse-nginx marketpulse-api marketpulse-client marketpulse-redis; do
  if docker inspect "$c" >/dev/null 2>&1; then yellow "Removing old container $c"; docker rm -f "$c" >/dev/null; fi
done

green "Starting MarketPulse"
$COMPOSE up -d --remove-orphans

# 4. Wait for the health endpoint, then reload the reverse proxy (picks up the new container IP).
BIND="$(env_get MARKETPULSE_BIND)"; BIND="${BIND:-127.0.0.1:5310}"
URL="http://${BIND%:*}:${BIND##*:}/api/health"; [ "${BIND%:*}" = "$BIND" ] && URL="http://127.0.0.1:${BIND}/api/health"
yellow "Waiting for $URL ..."
for i in $(seq 1 30); do
  if body=$(curl -fsS "$URL" 2>/dev/null); then
    green "MarketPulse is up (healthy after ~$((i * 3))s): $body"
    if docker inspect "${PROXY_CONTAINER:-reverse-proxy}" >/dev/null 2>&1; then
      docker exec "${PROXY_CONTAINER:-reverse-proxy}" nginx -t >/dev/null 2>&1 \
        && docker exec "${PROXY_CONTAINER:-reverse-proxy}" nginx -s reload >/dev/null 2>&1 \
        && green "Reverse proxy reloaded" || yellow "Could not reload the reverse proxy (check its config)"
    fi
    $COMPOSE ps
    docker image prune -f >/dev/null || true
    exit 0
  fi
  sleep 3
done

red "MarketPulse did not become healthy in time. Last logs:"
$COMPOSE logs --tail 80 marketpulse || true
exit 1
