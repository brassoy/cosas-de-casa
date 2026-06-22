#!/usr/bin/env bash
# =============================================================================
# Cosas de Casa — redeploy (lo llama el workflow de CI por SSH tras push a main)
# =============================================================================
# Reconstruye la API y la web con el código nuevo, aplica migraciones y reinicia
# la pila. Idempotente. NO toca secretos ni el .env (se respetan); el `git pull`
# lo hace el workflow ANTES de llamar a este script. Para el primer despliegue
# (volumen, secretos, .env, init de Supabase) usa bootstrap.sh, no esto.
# =============================================================================
set -euo pipefail

REPO_DIR=/opt/cosasdecasa
STACK_DIR="$REPO_DIR/deploy/digitalocean/stack"
DATA_DIR=/mnt/cosasdecasa-data
ENV_FILE="$REPO_DIR/.env"

log() { echo "[cosasdecasa-redeploy] $*"; }
[ -f "$ENV_FILE" ] || {
  log "ERROR: falta $ENV_FILE — corre antes el bootstrap inicial (bootstrap.sh)."
  exit 1
}

cd "$STACK_DIR"
dc() { docker compose --env-file "$ENV_FILE" -f docker-compose.prod.yml "$@"; }

log "Reconstruyendo la imagen de la API..."
dc build api

log "Asegurando Postgres arriba..."
dc up -d --wait db

log "Aplicando migraciones Drizzle..."
dc run --rm --no-deps api sh -c "cd /repo && pnpm --filter @cosasdecasa/api db:migrate"

log "Aplicando supabase/migrations/*.sql (idempotentes)..."
for f in "$REPO_DIR"/supabase/migrations/*.sql; do
  [ -e "$f" ] || continue
  log "  → $(basename "$f")"
  dc exec -T db psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 <"$f"
done

log "Reconstruyendo la web estática (hornea las VITE_* del .env)..."
dc run --rm --no-deps --env-file "$ENV_FILE" -v "$DATA_DIR/web:/out" \
  api sh -c "cd /repo && pnpm build --filter @cosasdecasa/web... && rm -rf /out/* && cp -r apps/web/dist/. /out/"

log "Reiniciando la pila con las imágenes nuevas..."
dc up -d

log "Redeploy completado."
