#!/usr/bin/env bash
# =============================================================================
# Cosas de Casa — redeploy (lo llama el workflow de CI por SSH tras push a main)
# =============================================================================
# Aplica en el droplet las imágenes que YA están cargadas: dump de seguridad,
# migraciones, publicación de la web y reinicio de la pila. Idempotente. NO toca
# secretos ni el .env. Para el primer despliegue (directorios, secretos, .env,
# init de Supabase) usa bootstrap.sh, no esto.
#
# NO LO LLAMES A MANO EN EL CASO NORMAL: lo invoca deploy-from-local.sh por SSH
# después de construir las imágenes en tu máquina y cargarlas aquí. Ejecutarlo
# suelto solo re-aplica lo que ya hay (útil para reiniciar la pila o re-migrar).
#
# RIGHT-SIZING 2026-08: este script YA NO COMPILA NADA.
#   Antes hacía `dc build api` + `pnpm build --filter @cosasdecasa/web` aquí
#   mismo, en producción. Eso pedía varios GB de RAM y era el motivo real de que
#   el droplet tuviera que ser de 4 GB. Ahora construye tu máquina y las imágenes
#   llegan por `docker save | ssh docker load`, sin registro de por medio.
#   Si vuelves a meter un build en este script, el droplet de 1 GB se muere.
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

# Imágenes locales (las carga deploy-from-local.sh). Sin registro, sin login.
export API_IMAGE="${API_IMAGE:-cosasdecasa-api:latest}"
export WEB_IMAGE="${WEB_IMAGE:-cosasdecasa-web:latest}"

docker image inspect "$API_IMAGE" >/dev/null 2>&1 || {
  log "ERROR: falta la imagen $API_IMAGE en este droplet."
  log "       Este droplet no compila. Lanza deploy-from-local.sh desde tu máquina."
  exit 1
}

cd "$STACK_DIR"
dc() { docker compose --env-file "$ENV_FILE" -f docker-compose.prod.yml "$@"; }

# --- 1. Dump de seguridad ANTES de tocar nada --------------------------------
# Sin block volume, el dato vive en el disco de arranque. Un dump previo a cada
# despliegue cuesta segundos (la base son ~63 MB) y te salva de una migración
# Drizzle que salga mal. Se conservan los 7 últimos.
if dc ps --status running --services 2>/dev/null | grep -qx db; then
  mkdir -p "$DATA_DIR/backups"
  STAMP=$(date +%Y%m%d-%H%M%S)
  log "Dump previo al despliegue → backups/pre-deploy-$STAMP.sql.gz"
  dc exec -T db pg_dumpall -U supabase_admin | gzip >"$DATA_DIR/backups/pre-deploy-$STAMP.sql.gz"
  ls -1t "$DATA_DIR"/backups/pre-deploy-*.sql.gz 2>/dev/null | tail -n +8 | xargs -r rm -f
fi

# --- 2. Postgres arriba -------------------------------------------------------
log "Asegurando Postgres arriba..."
dc up -d --wait db

# --- 3. Migraciones Drizzle ---------------------------------------------------
# Corren dentro de la imagen de la API, que lleva el workspace y drizzle-kit.
log "Aplicando migraciones Drizzle..."
dc run --rm --no-deps api sh -c "cd /repo && pnpm --filter @cosasdecasa/api db:migrate"

# --- 4. Publicar la web estática ----------------------------------------------
# La imagen de la web solo contiene /dist (la construyó CI con las VITE_*
# horneadas). Volcado atómico vía directorio temporal: si el `docker cp` falla a
# medias, Caddy nunca llega a servir un dist mutilado.
log "Publicando la web estática desde $WEB_IMAGE..."
cid=$(docker create "$WEB_IMAGE")
rm -rf "$DATA_DIR/web.new"
mkdir -p "$DATA_DIR/web.new"
docker cp "$cid:/dist/." "$DATA_DIR/web.new/"
docker rm -f "$cid" >/dev/null
rm -rf "$DATA_DIR/web.old"
[ -d "$DATA_DIR/web" ] && mv "$DATA_DIR/web" "$DATA_DIR/web.old"
mv "$DATA_DIR/web.new" "$DATA_DIR/web"
rm -rf "$DATA_DIR/web.old"

# --- 5. Levantar la pila con las imágenes nuevas ------------------------------
log "Reiniciando la pila..."
dc up -d --remove-orphans

# --- 6. Migraciones SQL de Supabase (buckets de Storage + RLS) ----------------
# DESPUÉS de levantar la pila: insertan en storage.buckets, que crea storage-api
# al arrancar (igual que el paso 10 del bootstrap). Son idempotentes (on conflict
# / drop policy if exists), así que re-aplicarlas en cada redeploy es seguro.
log "Esperando a que storage tenga su schema (storage.buckets)..."
for _ in $(seq 1 40); do
  [ "$(dc exec -T db psql -U supabase_admin -d postgres -tAc "select to_regclass('storage.buckets') is not null" 2>/dev/null)" = "t" ] && break
  sleep 3
done
log "Aplicando supabase/migrations/*.sql (idempotentes)..."
for f in "$REPO_DIR"/supabase/migrations/*.sql; do
  [ -e "$f" ] || continue
  log "  → $(basename "$f")"
  dc exec -T db psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 <"$f"
done

# --- 7. Higiene de disco ------------------------------------------------------
# 25 GB no perdonan: sin esto, las imágenes de cada despliegue se acumulan hasta
# llenar el disco (en el droplet viejo llegaron a 11,6 GB solo de caché de build).
log "Limpiando imágenes y capas huérfanas..."
docker image prune -af --filter "until=168h" >/dev/null 2>&1 || true
docker builder prune -af >/dev/null 2>&1 || true

log "Redeploy completado."
log "Disco:";   df -h / | tail -1
log "Memoria:"; free -m | sed -n 2p
