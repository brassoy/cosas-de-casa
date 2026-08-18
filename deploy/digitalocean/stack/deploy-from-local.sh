#!/usr/bin/env bash
# =============================================================================
# Cosas de Casa — despliegue desde la máquina del desarrollador
# =============================================================================
# Construye las imágenes AQUÍ y las carga en el droplet por SSH. Sin registro,
# sin CI, sin credenciales que custodiar.
#
#   ./deploy-from-local.sh <ip-droplet> [clave-ssh]
#
# ── POR QUÉ ASÍ ─────────────────────────────────────────────────────────────
# El droplet tiene 1 GB de RAM: no puede compilar el monorepo (Vite + turbo +
# tsc piden varios GB). El build tiene que ocurrir fuera, y una máquina de
# desarrollo con Docker es un build server perfectamente bueno para esto —
# bastante mejor que el droplet, de hecho.
#
# Frente a montar un registro (GHCR y compañía): menos piezas, cero credenciales
# en el droplet, y —lo importante— las VITE_* se leen del .env REAL del droplet
# justo antes de construir, así que el ANON_KEY horneado en el bundle no puede
# desincronizarse del JWT_SECRET que firma los tokens. Con variables duplicadas
# en un CI, esa desincronización es cuestión de tiempo.
#
# ── LO QUE HACE ─────────────────────────────────────────────────────────────
#   1. Lee las VITE_* del droplet (fuente de verdad).
#   2. Construye cosasdecasa-api:latest desde el monorepo.
#   3. Construye la web DENTRO de esa imagen (ya trae pnpm y el workspace) y la
#      empaqueta en cosasdecasa-web:latest.
#   4. Transfiere solo lo que haya cambiado (compara IDs antes de enviar).
#   5. Lanza redeploy.sh en el droplet (dump + migrar + publicar web + up).
# =============================================================================
set -euo pipefail

DROPLET="${1:?Uso: $0 <ip-droplet> [clave-ssh]}"
SSH_KEY="${2:-$HOME/.ssh/id_ed25519}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
API_IMAGE=cosasdecasa-api:latest
WEB_IMAGE=cosasdecasa-web:latest

SSH_OPTS=(-i "$SSH_KEY" -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15)
remote() { ssh "${SSH_OPTS[@]}" "root@$DROPLET" "$@"; }

c_ok=$'\e[32m'; c_dim=$'\e[2m'; c_warn=$'\e[33m'; c_err=$'\e[31m'; c_off=$'\e[0m'
log()  { echo "${c_ok}[deploy]${c_off} $*"; }
warn() { echo "${c_warn}[deploy] $*${c_off}"; }
die()  { echo "${c_err}[deploy] ERROR: $*${c_off}" >&2; exit 1; }

###############################################################################
# 0. Docker local
###############################################################################
# En WSL sin integración de Docker Desktop, `docker` no está en el PATH pero el
# binario de Windows sí es accesible y habla con el mismo daemon.
if ! command -v docker >/dev/null 2>&1; then
  DD_BIN="/mnt/c/Program Files/Docker/Docker/resources/bin"
  [ -x "$DD_BIN/docker" ] && export PATH="$PATH:$DD_BIN"
fi
command -v docker >/dev/null 2>&1 || die "no encuentro docker en esta máquina"
docker version --format '{{.Server.Version}}' >/dev/null 2>&1 \
  || die "el daemon de Docker no responde (¿Docker Desktop arrancado?)"
log "Docker local: $(docker version --format '{{.Server.Version}}')"

remote 'true' 2>/dev/null || die "no puedo entrar por SSH en $DROPLET"
remote 'test -f /opt/cosasdecasa/.env' \
  || die "el droplet no tiene /opt/cosasdecasa/.env — ¿terminó el bootstrap?"

###############################################################################
# 1. Las VITE_* salen del droplet, no de un fichero local
###############################################################################
# Se hornean en el bundle, así que tienen que ser las que de verdad rigen allí.
# En particular VITE_SUPABASE_ANON_KEY, que se deriva del JWT_SECRET del droplet:
# si horneáramos otra, la web no autenticaría contra Supabase.
log "Leyendo las VITE_* del droplet (fuente de verdad)..."
VITE_ENV=$(remote "grep -E '^VITE_[A-Z_]+=' /opt/cosasdecasa/.env" || true)
[ -n "$VITE_ENV" ] || die "no encontré variables VITE_* en el .env del droplet"

BUILD_ENV_ARGS=()
while IFS= read -r line; do
  [ -n "$line" ] && BUILD_ENV_ARGS+=(-e "$line")
done <<<"$VITE_ENV"
echo "${c_dim}$(echo "$VITE_ENV" | sed -E 's/(ANON_KEY|API_KEY)=(.{12}).*/\1=\2…(recortado)/')${c_off}"

###############################################################################
# 2. Construir la imagen de la API
###############################################################################
# --platform linux/amd64: el droplet es amd64. Si algún día construyes desde un
#   Mac con Apple Silicon, sin esta bandera saldría una imagen arm64 que en el
#   droplet falla con "exec format error".
# --provenance=false --sbom=false: buildx, por defecto, produce una *manifest
#   list* con adjuntos de atestación. Eso es útil publicando en un registro, pero
#   aquí rompe el `docker save | docker load`: el destino recibe un índice
#   multi-plataforma en vez de una imagen y no resuelve el tag. Con estas dos
#   banderas sale una imagen sencilla, que es lo que necesitamos.
log "Construyendo $API_IMAGE (monorepo completo; la primera vez tarda)..."
docker build \
  --platform linux/amd64 \
  --provenance=false --sbom=false \
  -f "$REPO_ROOT/deploy/digitalocean/stack/Dockerfile.api" \
  -t "$API_IMAGE" \
  "$REPO_ROOT"
log "  $(docker images --format '{{.Size}}' "$API_IMAGE" | head -1)"

###############################################################################
# 3. Construir la web dentro de esa imagen
###############################################################################
# La imagen de la API ya trae pnpm, el workspace entero y las deps instaladas:
# es el sitio natural para compilar la web sin depender de que esta máquina
# tenga la versión correcta de Node/pnpm ni el node_modules al día.
log "Construyendo la web (hornea las VITE_* del droplet)..."
BUILD_CTX=$(mktemp -d); trap 'rm -rf "$BUILD_CTX"' EXIT
mkdir -p "$BUILD_CTX/dist"

docker run --rm "${BUILD_ENV_ARGS[@]}" \
  -v "$BUILD_CTX/dist:/out" \
  "$API_IMAGE" \
  sh -c "cd /repo && pnpm build --filter @cosasdecasa/web... >/dev/null 2>&1 && cp -r apps/web/dist/. /out/" \
  || die "falló el build de la web (reintenta sin '>/dev/null' en el script para ver el error)"

[ -f "$BUILD_CTX/dist/index.html" ] || die "el build de la web no produjo index.html"
log "  dist: $(du -sh "$BUILD_CTX/dist" | cut -f1)"

cp "$REPO_ROOT/deploy/digitalocean/stack/Dockerfile.web" "$BUILD_CTX/Dockerfile"
docker build --platform linux/amd64 --provenance=false --sbom=false \
  -t "$WEB_IMAGE" "$BUILD_CTX" >/dev/null
log "Empaquetada $WEB_IMAGE"

###############################################################################
# 4. Transferir — solo lo que haya cambiado
###############################################################################
# `docker save` envía la imagen ENTERA siempre, así que antes comparamos IDs: si
# el droplet ya tiene exactamente esta imagen, nos ahorramos el viaje. La de la
# API son ~2,9 GB en crudo y en la mayoría de despliegues no cambia.
transferir() {
  local img="$1" local_id remote_id
  local_id=$(docker image inspect --format '{{.Id}}' "$img")
  remote_id=$(remote "docker image inspect --format '{{.Id}}' $img 2>/dev/null" || echo "")
  if [ "$local_id" = "$remote_id" ]; then
    log "$img ya está idéntica en el droplet — no se transfiere ✓"
    return 0
  fi
  log "Transfiriendo $img (comprimido sobre la marcha; puede tardar)..."
  docker save "$img" | gzip -1 | remote 'gunzip | docker load'
}
transferir "$API_IMAGE"
transferir "$WEB_IMAGE"

###############################################################################
# 5. Desplegar
###############################################################################
# El droplet necesita el código del repo por el compose, el Caddyfile, los
# scripts y las migraciones SQL de Supabase — no para compilar.
log "Actualizando el repo del droplet y desplegando..."
remote 'set -e
  cd /opt/cosasdecasa
  git fetch --depth 1 origin main && git reset --hard origin/main
  chmod +x deploy/digitalocean/stack/redeploy.sh
  deploy/digitalocean/stack/redeploy.sh'

###############################################################################
# 6. Verificar
###############################################################################
echo
log "═══ ESTADO ═══"
remote 'cd /opt/cosasdecasa/deploy/digitalocean/stack &&
  docker compose --env-file /opt/cosasdecasa/.env -f docker-compose.prod.yml ps --format "table {{.Service}}\t{{.Status}}"'
echo
remote 'free -m | sed -n 1,2p; echo; df -h / | tail -1'

DOMAIN=$(remote "grep '^APP_DOMAIN=' /opt/cosasdecasa/.env | cut -d= -f2")
CODE=$(remote "curl -s -o /dev/null -w '%{http_code}' -H 'Host: $DOMAIN' http://localhost/" || echo 000)
echo
[ "$CODE" = "200" ] && log "La web responde 200 ✓" \
                    || warn "La web devolvió $CODE — revisa: ssh root@$DROPLET 'cd /opt/cosasdecasa/deploy/digitalocean/stack && docker compose --env-file /opt/cosasdecasa/.env -f docker-compose.prod.yml logs --tail 50 caddy api'"
log "Despliegue completado."
