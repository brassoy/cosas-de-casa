#!/usr/bin/env bash
# =============================================================================
# Cosas de Casa — bootstrap de producción (corre en el droplet, lo lanza cloud-init)
# =============================================================================
# Idempotente en lo razonable: los secretos se generan una vez y se persisten en
# el volumen; si /opt/cosasdecasa/.env ya existe NO se pisa (respeta ajustes
# manuales de SMTP/IA/push). Relánzalo a mano con:
#   bash /opt/cosasdecasa/deploy/digitalocean/stack/bootstrap.sh
# =============================================================================
set -euo pipefail

REPO_DIR=/opt/cosasdecasa
STACK_DIR="$REPO_DIR/deploy/digitalocean/stack"
DATA_DIR=/mnt/cosasdecasa-data
SECRETS_FILE="$DATA_DIR/secrets.env"
ENV_FILE="$REPO_DIR/.env"

log() { echo "[cosasdecasa-bootstrap] $*"; }

# --- 1. Cargar valores inyectados por Terraform (cloud-init) ------------------
# shellcheck disable=SC1091
set -a
. /opt/cosasdecasa-deploy.env
set +a
: "${APP_DOMAIN:?falta APP_DOMAIN}" "${ACME_EMAIL:?falta ACME_EMAIL}" "${DATA_DEVICE:?falta DATA_DEVICE}"

# --- 2. Montar el block volume de datos --------------------------------------
log "Esperando el device de datos $DATA_DEVICE ..."
for _ in $(seq 1 30); do [ -b "$DATA_DEVICE" ] && break; sleep 2; done
[ -b "$DATA_DEVICE" ] || {
  log "ERROR: el device $DATA_DEVICE no apareció"
  exit 1
}

mkdir -p "$DATA_DIR"
if ! mountpoint -q "$DATA_DIR"; then
  log "Montando $DATA_DEVICE en $DATA_DIR"
  mount -o defaults,nofail,discard "$DATA_DEVICE" "$DATA_DIR"
fi
grep -q "$DATA_DIR" /etc/fstab || echo "$DATA_DEVICE $DATA_DIR ext4 defaults,nofail,discard 0 0" >>/etc/fstab

# Subdirectorios persistentes.
mkdir -p "$DATA_DIR"/{db,db-init,storage,kong,caddy/data,caddy/config,web}
# Storage (supabase/storage-api) corre como uid 1000 en su imagen.
chown -R 1000:1000 "$DATA_DIR/storage" 2>/dev/null || true

# --- 2.5 Swap: CLAVE en un droplet con build pesado --------------------------
# El `pnpm build` de la web (Vite) y el build de la imagen de la API son
# hambrientos; sin swap el OOM killer puede matar el primer deploy a mitad.
if ! swapon --show 2>/dev/null | grep -q /swapfile; then
  log "Creando 4G de swap (CLAVE en un droplet de 4GB: evita OOM en los builds)..."
  fallocate -l 4G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=4096
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >>/etc/fstab
fi

# --- 3. Secretos estables (se generan una vez, se reutilizan en re-runs) ------
# JWT_SECRET firma TODOS los JWT de Supabase (HS256). De él derivamos ANON_KEY y
# SERVICE_ROLE_KEY (los JWT estándar de Supabase con role anon / service_role).
# Si re-firmáramos en cada run, invalidaríamos las sesiones y las keys del build
# de la web ya horneado — por eso se generan UNA vez y se persisten.
if [ ! -f "$SECRETS_FILE" ]; then
  log "Generando secretos por primera vez en $SECRETS_FILE"
  umask 077
  cat >"$SECRETS_FILE" <<EOF
POSTGRES_PASSWORD=$(openssl rand -hex 24)
JWT_SECRET=$(openssl rand -hex 32)
SECRET_KEY_BASE=$(openssl rand -hex 32)
JOIN_PIN_PEPPER=$(openssl rand -hex 24)
EOF
fi
# shellcheck disable=SC1090
set -a
. "$SECRETS_FILE"
set +a

# --- 3.5 Derivar ANON_KEY y SERVICE_ROLE_KEY firmando JWT HS256 ---------------
# Construye un JWT { "role": <rol>, "iss": "supabase", "iat", "exp" } firmado
# HS256 con JWT_SECRET — exactamente las keys "legacy" que espera Supabase
# self-hosted (Kong/Storage/Realtime las validan como API keys).
b64url() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }
sign_supabase_jwt() {
  local role="$1"
  local iat exp header payload signing_input sig
  iat=$(date +%s)
  exp=$((iat + 3650 * 24 * 3600)) # ~10 años (las keys de servicio no rotan a menudo)
  header='{"alg":"HS256","typ":"JWT"}'
  payload="{\"role\":\"${role}\",\"iss\":\"supabase\",\"iat\":${iat},\"exp\":${exp}}"
  signing_input="$(printf '%s' "$header" | b64url).$(printf '%s' "$payload" | b64url)"
  sig=$(printf '%s' "$signing_input" | openssl dgst -binary -sha256 -hmac "$JWT_SECRET" | b64url)
  printf '%s.%s' "$signing_input" "$sig"
}
ANON_KEY=$(sign_supabase_jwt anon)
SERVICE_ROLE_KEY=$(sign_supabase_jwt service_role)
export ANON_KEY SERVICE_ROLE_KEY

# Constantes de la pila
POSTGRES_DB=postgres
JWT_EXP=3600
export POSTGRES_DB JWT_EXP

# --- 4. Renderizar la config de Supabase (Kong + init SQL) -------------------
# Kong: config declarativa con las keys ya sustituidas (consumers anon/service_role
# por API key) y las rutas /auth /rest /realtime /storage.
cat >"$DATA_DIR/kong/kong.yml" <<EOF
_format_version: "2.1"
_transform: true

consumers:
  - username: anon
    keyauth_credentials:
      - key: ${ANON_KEY}
  - username: service_role
    keyauth_credentials:
      - key: ${SERVICE_ROLE_KEY}

acls:
  - consumer: anon
    group: anon
  - consumer: service_role
    group: admin

services:
  - name: auth-v1
    url: http://auth:9999/
    routes:
      - name: auth-v1-all
        strip_path: true
        paths: ["/auth/v1/"]
    plugins:
      - name: cors

  - name: rest-v1
    url: http://rest:3000/
    routes:
      - name: rest-v1-all
        strip_path: true
        paths: ["/rest/v1/"]
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: true
      - name: acl
        config:
          hide_groups_header: true
          allow: ["admin", "anon"]

  - name: realtime-v1-ws
    url: http://realtime-dev.supabase-realtime:4000/socket
    protocol: ws
    routes:
      - name: realtime-v1-ws
        strip_path: true
        paths: ["/realtime/v1/"]
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false
      - name: acl
        config:
          hide_groups_header: true
          allow: ["admin", "anon"]

  - name: storage-v1
    url: http://storage:5000/
    routes:
      - name: storage-v1-all
        strip_path: true
        paths: ["/storage/v1/"]
    plugins:
      - name: cors
EOF

# Init SQL del primer arranque de Postgres. La imagen supabase/postgres ya crea
# los roles base (anon, authenticated, service_role, authenticator,
# supabase_admin, supabase_auth_admin, supabase_storage_admin, ...). Aquí solo
# fijamos SUS contraseñas a POSTGRES_PASSWORD para que GoTrue/PostgREST/Storage/
# Realtime puedan conectarse, y aseguramos la publicación de Realtime.
# (Solo corre si el directorio de datos está vacío: primer boot.)
cat >"$DATA_DIR/db-init/00-roles-passwords.sql" <<EOF
ALTER USER authenticator WITH PASSWORD '${POSTGRES_PASSWORD}';
ALTER USER supabase_auth_admin WITH PASSWORD '${POSTGRES_PASSWORD}';
ALTER USER supabase_storage_admin WITH PASSWORD '${POSTGRES_PASSWORD}';
ALTER USER supabase_admin WITH PASSWORD '${POSTGRES_PASSWORD}';
DO \$\$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_functions_admin') THEN
    EXECUTE 'ALTER USER supabase_functions_admin WITH PASSWORD ' || quote_literal('${POSTGRES_PASSWORD}');
  END IF;
END
\$\$;
EOF
cat >"$DATA_DIR/db-init/01-realtime-publication.sql" <<'EOF'
-- La publicación supabase_realtime debe existir antes de que las migraciones
-- del repo (drizzle/0001,0003,0005,0006) añadan tablas a ella.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;
EOF

# Los lee el usuario `postgres` DENTRO del contenedor de la imagen. Con el umask
# 077 de la generación de secretos quedarían 600 root (y `cat >` sobre un fichero
# que ya existe NO recalcula permisos), de modo que el init daría
# "Permission denied" y los roles se quedarían sin contraseña. 644 explícito.
chmod 644 "$DATA_DIR/db-init/"*.sql

# --- 5. Renderizar /opt/cosasdecasa/.env (solo si no existe) ------------------
# Un único .env sirve a:
#   - docker compose (interpola POSTGRES_PASSWORD, JWT_SECRET, ANON_KEY, ...).
#   - la API NestJS (env_file): valida el entorno con Zod al arrancar.
#   - el build de la web (las VITE_* se HORNEAN en `pnpm build`, así que deben
#     estar ANTES del build).
#
# JWT de la API: GoTrue self-hosted firma los tokens en HS256 con JWT_SECRET. La
# API verifica en modo SIMÉTRICO con ese mismo secreto (SUPABASE_JWT_SECRET) — lo
# detecta automáticamente y no usa JWKS. El issuer/audience deben casar con
# GOTRUE_JWT_ISSUER (https://APP_DOMAIN/auth/v1) y GOTRUE_JWT_AUD (authenticated)
# del compose, cosa que aquí garantizamos.
if [ ! -f "$ENV_FILE" ]; then
  log "Renderizando $ENV_FILE"
  umask 077
  cat >"$ENV_FILE" <<EOF
# ── Compose / Supabase self-hosted ───────────────────────────────────────────
APP_DOMAIN=${APP_DOMAIN}
ACME_EMAIL=${ACME_EMAIL}
POSTGRES_DB=${POSTGRES_DB}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
JWT_SECRET=${JWT_SECRET}
JWT_EXP=${JWT_EXP}
SECRET_KEY_BASE=${SECRET_KEY_BASE}
ANON_KEY=${ANON_KEY}
SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}

# SMTP de GoTrue (opcional; vacío = sin envío real, autoconfirm activado):
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_ADMIN_EMAIL=no-reply@${APP_DOMAIN}

# ── API NestJS (apps/api — validado por Zod en env.config.ts) ────────────────
NODE_ENV=production
API_PORT=3000
API_CORS_ORIGINS=https://${APP_DOMAIN}
# La API conecta con ESTE rol directamente (Pool de pg en db.module.ts, sin
# SET ROLE). Por eso NO vale `authenticator`: es el rol de switching de PostgREST,
# sin privilegios propios, y daría "permission denied for schema public" tanto al
# migrar como en runtime. Usamos `postgres` (rol dueño de la app en Supabase),
# igual que en local. Nota: a nivel de conexión NO respeta RLS; la autorización
# fina la hacen los scope guards de la API.
DATABASE_URL=postgres://postgres:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
SUPABASE_URL=https://${APP_DOMAIN}
SUPABASE_PUBLISHABLE_KEY=${ANON_KEY}
SUPABASE_SECRET_KEY=${SERVICE_ROLE_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
# Verificación del Bearer en HS256 con el secreto compartido de Supabase. La API
# lo detecta (SUPABASE_JWT_SECRET presente) y verifica en modo simétrico; issuer y
# audience casan con GOTRUE_JWT_ISSUER / GOTRUE_JWT_AUD del compose.
SUPABASE_JWT_SECRET=${JWT_SECRET}
JWT_ISSUER=https://${APP_DOMAIN}/auth/v1
JWT_AUDIENCE=authenticated
JOIN_PIN_PEPPER=${JOIN_PIN_PEPPER}

# IA MiniMax (opcional; sin esto la extracción por IA degrada a 503):
MINIMAX_BASE_URL=
MINIMAX_API_KEY=
MINIMAX_MODEL=

# Web Push / VAPID (opcional; sin esto las notificaciones push se omiten):
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:${ACME_EMAIL}

# ── WEB (apps/web — VITE_*, SE HORNEAN EN EL BUILD: deben ir ANTES de pnpm build) ─
VITE_API_URL=https://${APP_DOMAIN}
VITE_SUPABASE_URL=https://${APP_DOMAIN}
VITE_SUPABASE_ANON_KEY=${ANON_KEY}
VITE_GOOGLE_MAPS_API_KEY=
VITE_VAPID_PUBLIC_KEY=
EOF
else
  log "$ENV_FILE ya existe — lo respeto (no piso ajustes manuales)"
fi

# --- 6. Build de imágenes + arranque de la base ------------------------------
cd "$STACK_DIR"
dc() { docker compose --env-file "$ENV_FILE" -f docker-compose.prod.yml "$@"; }

log "Construyendo la imagen de la API (monorepo + turbo; tarda)..."
dc build api

log "Levantando Postgres y esperando a que esté sano..."
dc up -d --wait db

# --- 7. Migraciones ----------------------------------------------------------
# 7a. Migraciones Drizzle del repo (esquema de la app + publicación de Realtime).
#     Se ejecutan con drizzle-kit (devDep) DENTRO de la imagen de la API, que
#     comparte la red docker con `db`. drizzle-kit lee DATABASE_URL del .env raíz.
log "Aplicando migraciones Drizzle (pnpm --filter @cosasdecasa/api db:migrate)..."
dc run --rm --no-deps \
  -e DATABASE_URL="postgres://postgres:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}" \
  api sh -c "cd /repo && pnpm --filter @cosasdecasa/api db:migrate"

# 7b. (Las migraciones SQL de Supabase —buckets de Storage + RLS— se aplican en
#      el PASO 10, DESPUÉS de levantar la pila: insertan en storage.buckets, una
#      tabla que NO existe hasta que el servicio storage-api migra al arrancar.)

# --- 8. Build de la web estática (hornea las VITE_* del .env) -----------------
# Construimos dentro de la imagen de la API (tiene pnpm y todo el workspace) y
# copiamos apps/web/dist al volumen que sirve Caddy (/mnt/cosasdecasa-data/web).
log "Construyendo la web estática (pnpm build --filter @cosasdecasa/web)..."
# --env-file NO es flag de `compose run` (ya va a nivel global en dc()); las
# VITE_* del build salen del env_file del servicio api (/opt/cosasdecasa/.env).
dc run --rm --no-deps \
  -v "$DATA_DIR/web:/out" \
  api sh -c "cd /repo && pnpm build --filter @cosasdecasa/web... && rm -rf /out/* && cp -r apps/web/dist/. /out/"

# --- 9. Levantar la pila completa --------------------------------------------
log "Levantando la pila completa..."
dc up -d

# --- 10. Migraciones SQL de Supabase (buckets de Storage + RLS) ---------------
# storage.buckets la crea storage-api con sus propias migraciones al arrancar;
# por eso esperamos a que el schema exista ANTES de insertar los buckets
# (task-photos/avatars) y sus políticas RLS.
log "Esperando a que storage-api cree su schema (storage.buckets)..."
for _ in $(seq 1 40); do
  [ "$(dc exec -T db psql -U supabase_admin -d "$POSTGRES_DB" -tAc "select to_regclass('storage.buckets') is not null" 2>/dev/null)" = "t" ] && break
  sleep 3
done
log "Aplicando supabase/migrations/*.sql (buckets task-photos/avatars + RLS)..."
for f in "$REPO_DIR"/supabase/migrations/*.sql; do
  [ -e "$f" ] || continue
  log "  → $(basename "$f")"
  dc exec -T db psql -U supabase_admin -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 <"$f"
done

log "LISTO. Comprueba: https://${APP_DOMAIN}  (Caddy emite el TLS con el DNS ya apuntando)."
log "Pendiente post-deploy (ver README): VITE_GOOGLE_MAPS_API_KEY restringida por referrer,"
log "y claves MiniMax/VAPID si quieres extracción por IA y notificaciones push."
