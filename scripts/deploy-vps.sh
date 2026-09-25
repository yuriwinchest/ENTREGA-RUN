#!/usr/bin/env bash
set -euo pipefail

DEPLOY_SHA="${1:?Informe o SHA do commit}"
if [[ ! "$DEPLOY_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo 'SHA de deploy inválido' >&2
  exit 1
fi

APP_DIR=/opt/entregas-run
BACKUP_DIR="$APP_DIR/backups"
COMPOSE_FILE="$APP_DIR/docker-compose.yml"
SERVICE=entregas-run-web
SHORT_SHA="${DEPLOY_SHA:0:12}"
IMAGE="entregas-run:release-$SHORT_SHA"
ROLLBACK_IMAGE="entregas-run:rollback-$SHORT_SHA"
BUILD_DIR="$(mktemp -d /tmp/entregas-run-build.XXXXXXXX)"
OVERRIDE_FILE="$(mktemp /tmp/entregas-run-compose.XXXXXXXX.yml)"
LOCK_FILE="$APP_DIR/.deploy.lock"
DEPLOY_STARTED=0
DEPLOY_OK=0
PREVIOUS_IMAGE=''

cleanup() {
  status=$?
  trap - EXIT
  if [[ "$DEPLOY_STARTED" == 1 && "$DEPLOY_OK" != 1 ]]; then
    echo 'Healthcheck falhou; restaurando a imagem anterior.' >&2
    if [[ -n "$PREVIOUS_IMAGE" ]]; then
      cat > "$OVERRIDE_FILE" <<EOF
services:
  $SERVICE:
    image: $ROLLBACK_IMAGE
EOF
      docker compose -f "$COMPOSE_FILE" -f "$OVERRIDE_FILE" up -d --no-build --no-deps "$SERVICE" || true
      restored=0
      for attempt in $(seq 1 20); do
        if curl --silent --fail --max-time 5 http://127.0.0.1:3050/api/health >/dev/null; then
          restored=1
          break
        fi
        sleep 2
      done
      [[ "$restored" == 1 ]] || echo 'Rollback executado; verificar saúde do serviço imediatamente.' >&2
    fi
  fi
  git -C "$APP_DIR" worktree remove --force "$BUILD_DIR" >/dev/null 2>&1 || true
  [[ -f "$OVERRIDE_FILE" ]] && rm -f -- "$OVERRIDE_FILE"
  [[ -d "$BUILD_DIR" ]] && rmdir -- "$BUILD_DIR" 2>/dev/null || true
  exit "$status"
}
trap cleanup EXIT

cd "$APP_DIR"
exec 9>"$LOCK_FILE"
flock -n 9 || { echo 'Outro deploy está em andamento.' >&2; exit 1; }

[[ -f "$COMPOSE_FILE" && -f .env && -f data/users.json ]] || {
  echo 'Configuração, .env ou cadastro de usuários ausente; deploy cancelado.' >&2
  exit 1
}
grep -q '^ADMIN_PASSWORD=.' .env || { echo 'ADMIN_PASSWORD não configurado; deploy cancelado.' >&2; exit 1; }
docker inspect "$SERVICE" >/dev/null
curl --silent --fail --max-time 5 http://127.0.0.1:3050/api/health >/dev/null || {
  echo 'Serviço atual sem saúde; deploy cancelado.' >&2
  exit 1
}

DISK_USED="$(df -P "$APP_DIR" | awk 'NR==2 {gsub(/%/, "", $5); print $5}')"
[[ "$DISK_USED" =~ ^[0-9]+$ && "$DISK_USED" -lt 80 ]] || {
  echo 'Disco acima do limite operacional; deploy cancelado.' >&2
  exit 1
}

umask 077
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/users-before-$SHORT_SHA-$(date -u +%Y%m%dT%H%M%SZ).tar.gz"
tar -C "$APP_DIR" -czf "$BACKUP_FILE" data/users.json
tar -tzf "$BACKUP_FILE" >/dev/null
echo 'Snapshot local do cadastro de usuários verificado.'

git fetch --quiet origin main
git cat-file -e "$DEPLOY_SHA^{commit}"
git worktree add --detach "$BUILD_DIR" "$DEPLOY_SHA" >/dev/null
docker build -t "$IMAGE" "$BUILD_DIR"

PREVIOUS_IMAGE="$(docker inspect -f '{{.Image}}' "$SERVICE")"
docker tag "$PREVIOUS_IMAGE" "$ROLLBACK_IMAGE"
cat > "$OVERRIDE_FILE" <<EOF
services:
  $SERVICE:
    image: $IMAGE
EOF
DEPLOY_STARTED=1
docker compose -f "$COMPOSE_FILE" -f "$OVERRIDE_FILE" up -d --no-build --no-deps "$SERVICE"
[[ "$(docker inspect -f '{{.Image}}' "$SERVICE")" == "$(docker image inspect -f '{{.Id}}' "$IMAGE")" ]] || {
  echo 'Container não está usando a imagem candidata.' >&2
  exit 1
}

for attempt in $(seq 1 20); do
  if curl --silent --fail --max-time 5 http://127.0.0.1:3050/api/health >/dev/null; then
    DEPLOY_OK=1
    echo "Deploy $SHORT_SHA saudável na tentativa $attempt."
    break
  fi
  sleep 2
done
[[ "$DEPLOY_OK" == 1 ]] || { echo 'Healthcheck não ficou saudável.' >&2; exit 1; }
