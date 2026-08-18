#!/usr/bin/env bash
# =============================================================================
# Cosas de Casa — migración de datos entre droplets (right-sizing 2026-08)
# =============================================================================
# Copia el estado completo de producción del droplet VIEJO al NUEVO y deja la
# pila levantada y verificada. NO toca el droplet viejo más allá de pararlo, y
# NO reasigna la reserved IP: eso lo haces tú al final, cuando hayas comprobado
# que el nuevo responde (ver el runbook en ../README.md).
#
# Uso:
#   ./migrate-to-new-droplet.sh <ip-vieja> <ip-nueva> [clave-ssh]
#
# ── POR QUÉ COPIA EN FRÍO Y NO UN pg_dump ───────────────────────────────────
# La base son 63 MB y el directorio de datos entero 77 MB. Copiar los ficheros
# con Postgres PARADO es consistente por construcción y preserva TODO de una vez:
# roles y sus contraseñas, el schema `_realtime` con sus migraciones Ecto, los
# objetos de Storage, los certificados ya emitidos por Caddy y `secrets.env`.
# Un pg_dumpall obligaría a reconciliar a mano los roles de Supabase (cuyas
# contraseñas salen de POSTGRES_PASSWORD) contra los que crea la imagen al
# inicializarse. Más pasos, más superficie de error, y para nada: el corte extra
# de una copia en frío de 77 MB son segundos.
# Requisito: MISMA versión de imagen de Postgres en ambos lados (se verifica).
#
# ── LO QUE NO PUEDE PERDERSE ────────────────────────────────────────────────
# `secrets.env` contiene JWT_SECRET. De él se derivan ANON_KEY y
# SERVICE_ROLE_KEY, y el ANON_KEY va HORNEADO en el bundle de la web. Perderlo o
# regenerarlo invalida todas las sesiones activas Y rompe la web ya publicada
# hasta que se reconstruya con la clave nueva. Por eso se copia verbatim y el
# script verifica al final que el JWT_SECRET coincide en ambos lados.
# =============================================================================
set -euo pipefail

OLD_IP="${1:?Uso: $0 <ip-vieja> <ip-nueva> [clave-ssh]}"
NEW_IP="${2:?Uso: $0 <ip-vieja> <ip-nueva> [clave-ssh]}"
SSH_KEY="${3:-$HOME/.ssh/id_ed25519}"

DATA_DIR=/mnt/cosasdecasa-data
STACK=/opt/cosasdecasa/deploy/digitalocean/stack

SSH_OPTS=(-i "$SSH_KEY" -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15)
old() { ssh "${SSH_OPTS[@]}" "root@$OLD_IP" "$@"; }
new() { ssh "${SSH_OPTS[@]}" "root@$NEW_IP" "$@"; }

c_ok=$'\e[32m'; c_warn=$'\e[33m'; c_err=$'\e[31m'; c_off=$'\e[0m'
log()  { echo "${c_ok}[migrate]${c_off} $*"; }
warn() { echo "${c_warn}[migrate] $*${c_off}"; }
die()  { echo "${c_err}[migrate] ERROR: $*${c_off}" >&2; exit 1; }

###############################################################################
# 0. Comprobaciones previas — antes de parar NADA
###############################################################################
log "Comprobando acceso a ambos droplets..."
old 'true' 2>/dev/null || die "no puedo entrar por SSH en el viejo ($OLD_IP)"
new 'true' 2>/dev/null || die "no puedo entrar por SSH en el nuevo ($NEW_IP)"

log "Verificando que el droplet nuevo ya pasó por el bootstrap..."
new "test -d $DATA_DIR && test -f /opt/cosasdecasa/.env" \
  || die "el droplet nuevo no ha completado el bootstrap. Mira /var/log/cosasdecasa-bootstrap.log y espera a que termine."

log "Verificando que las versiones de Postgres coinciden..."
PG_OLD=$(old "rg -o 'supabase/postgres:[0-9.]+' $STACK/docker-compose.prod.yml | head -1" 2>/dev/null \
       || old "grep -o 'supabase/postgres:[0-9.]*' $STACK/docker-compose.prod.yml | head -1")
PG_NEW=$(new "grep -o 'supabase/postgres:[0-9.]*' $STACK/docker-compose.prod.yml | head -1")
[ "$PG_OLD" = "$PG_NEW" ] || die "versiones de Postgres distintas: viejo=$PG_OLD nuevo=$PG_NEW. Una copia física entre versiones distintas NO arranca."
log "  ambos en $PG_OLD ✓"

SIZE=$(old "du -sh $DATA_DIR | cut -f1")
log "Datos a migrar: $SIZE"

FREE=$(new "df -BM --output=avail / | tail -1 | tr -dc '0-9'")
log "Espacio libre en el nuevo: ${FREE} MB"
[ "$FREE" -gt 2048 ] || die "quedan menos de 2 GB libres en el droplet nuevo"

echo
warn "A PARTIR DE AQUÍ HAY CORTE DE SERVICIO (se para la pila del droplet viejo)."
warn "Viejo: $OLD_IP   →   Nuevo: $NEW_IP   ($SIZE de datos)"
read -rp "¿Continuar? escribe 'migrar': " confirm
[ "$confirm" = "migrar" ] || die "cancelado por el usuario"

###############################################################################
# 1. Dump lógico de seguridad (cinturón además de los tirantes)
###############################################################################
# La copia en frío es el mecanismo real. Esto es la red por si la copia sale mal
# y hay que reconstruir sobre una base recién inicializada.
STAMP=$(date +%Y%m%d-%H%M%S)
log "Dump lógico de seguridad (con la pila aún viva)..."
old "cd $STACK && docker compose --env-file /opt/cosasdecasa/.env -f docker-compose.prod.yml \
     exec -T db pg_dumpall -U supabase_admin | gzip > /root/pre-migracion-$STAMP.sql.gz"
old "ls -lh /root/pre-migracion-$STAMP.sql.gz"
log "  guardado en el droplet viejo: /root/pre-migracion-$STAMP.sql.gz"

###############################################################################
# 2. Parar ambas pilas — el corte empieza aquí
###############################################################################
log "Parando la pila del droplet NUEVO..."
new "cd $STACK && docker compose --env-file /opt/cosasdecasa/.env -f docker-compose.prod.yml down" || true

log "Parando la pila del droplet VIEJO (empieza el corte)..."
old "cd $STACK && docker compose --env-file /opt/cosasdecasa/.env -f docker-compose.prod.yml down"
old "docker stop pasarola-review 2>/dev/null || true"

###############################################################################
# 3. Copia de los datos — Postgres parado en ambos lados
###############################################################################
# Se copia directo viejo→nuevo (no pasa por la máquina del admin): menos saltos,
# menos tiempo de corte. Requiere que el viejo pueda entrar por SSH en el nuevo,
# así que le prestamos la clave del admin durante la copia y la borramos después.
log "Preparando canal de copia directo entre droplets..."
TMP_KEY=$(mktemp); trap 'rm -f "$TMP_KEY"' EXIT
cp "$SSH_KEY" "$TMP_KEY"
scp "${SSH_OPTS[@]}" -q "$TMP_KEY" "root@$OLD_IP:/root/.migrate_key"
old "chmod 600 /root/.migrate_key"

log "Copiando $DATA_DIR (viejo → nuevo)..."
old "rsync -aHAX --delete --info=progress2 \
      -e 'ssh -i /root/.migrate_key -o StrictHostKeyChecking=accept-new' \
      $DATA_DIR/ root@$NEW_IP:$DATA_DIR/"

log "Copiando pasarola-review..."
old "rsync -aHAX --delete \
      -e 'ssh -i /root/.migrate_key -o StrictHostKeyChecking=accept-new' \
      /opt/pasarola-review/ root@$NEW_IP:/opt/pasarola-review/ 2>/dev/null || true"

log "Copiando el dump de seguridad al nuevo..."
old "scp -i /root/.migrate_key -o StrictHostKeyChecking=accept-new \
      /root/pre-migracion-$STAMP.sql.gz root@$NEW_IP:$DATA_DIR/backups/ || true"

###############################################################################
# 3.5 Transferir la imagen de la API entre droplets
###############################################################################
# El droplet nuevo no compila, así que necesita la imagen ya construida. No hace
# falta reconstruirla ni subirla desde casa: EL DROPLET VIEJO YA LA TIENE, y el
# tráfico entre droplets de la misma región va por la red interna del centro de
# datos (Gbps), no por tu línea de subida. Son ~2,9 GB que viajan en un par de
# minutos en vez de en una hora.
#
# Las imágenes de Supabase (postgres, kong, gotrue, realtime, storage…) NO se
# transfieren: son públicas de Docker Hub y el nuevo se las baja solo al hacer
# `up`. Y el dist de la web tampoco: viaja dentro del rsync de datos, en
# $DATA_DIR/web.
log "Transfiriendo la imagen de la API (viejo → nuevo, por red interna)..."
old "docker save cosasdecasa-api:latest | gzip -1 | \
     ssh -i /root/.migrate_key -o StrictHostKeyChecking=accept-new root@$NEW_IP 'gunzip | docker load'"
log "Retirando la clave prestada del droplet viejo..."
old "shred -u /root/.migrate_key 2>/dev/null || rm -f /root/.migrate_key"

new "docker image inspect cosasdecasa-api:latest >/dev/null 2>&1" \
  || die "la imagen de la API no llegó al droplet nuevo"
log "  imagen presente en el nuevo ✓"

###############################################################################
# 4. Regenerar el .env del nuevo a partir de los secretos VIEJOS
###############################################################################
# El bootstrap del droplet nuevo generó su propio secrets.env y su .env con un
# JWT_SECRET distinto. Al copiar el secrets.env viejo en el paso 3, ese .env
# quedó desincronizado: apunta a claves que ya no son las de la base.
#
# bootstrap.sh respeta un .env existente a propósito (para no pisar ajustes
# manuales de SMTP/IA/push), así que hay que borrarlo para que lo regenere — y
# lo regenerará a partir del secrets.env que acabamos de copiar, es decir, con
# el JWT_SECRET, ANON_KEY y SERVICE_ROLE_KEY ORIGINALES.
log "Regenerando /opt/cosasdecasa/.env desde los secretos migrados..."
new "cp /opt/cosasdecasa/.env /root/.env.generado-en-bootstrap 2>/dev/null || true"
new "rm -f /opt/cosasdecasa/.env"

log "Relanzando bootstrap.sh en el nuevo (idempotente; reutiliza secrets.env)..."
new "chmod +x $STACK/bootstrap.sh && $STACK/bootstrap.sh 2>&1 | tail -25"

###############################################################################
# 5. Verificación — no damos por buena la migración sin comprobarla
###############################################################################
echo
log "═══ VERIFICACIÓN ═══"

# 5a. El JWT_SECRET debe ser EXACTAMENTE el mismo. Si no, las sesiones mueren y
#     el ANON_KEY horneado en la web deja de validar.
J_OLD=$(old "grep '^JWT_SECRET=' $DATA_DIR/secrets.env | sha256sum | cut -c1-16")
J_NEW=$(new "grep '^JWT_SECRET=' $DATA_DIR/secrets.env | sha256sum | cut -c1-16")
if [ "$J_OLD" = "$J_NEW" ]; then
  log "JWT_SECRET idéntico (huella $J_NEW) ✓  — las sesiones y el ANON_KEY siguen valiendo"
else
  die "JWT_SECRET DISTINTO (viejo=$J_OLD nuevo=$J_NEW). Las sesiones y la web horneada se romperían. NO reasignes la IP."
fi

# 5b. Conteo de filas en las tablas de negocio: la prueba de que el dato llegó.
log "Comparando conteos de filas..."
COUNT_SQL="select count(*) from app_user"
for t in app_user family shopping_list; do
  A=$(old "cd $STACK && docker compose --env-file /opt/cosasdecasa/.env -f docker-compose.prod.yml up -d db >/dev/null 2>&1; sleep 5; docker compose --env-file /opt/cosasdecasa/.env -f docker-compose.prod.yml exec -T db psql -U postgres -d postgres -tAc 'select count(*) from \"$t\"' 2>/dev/null" || echo "n/a")
  B=$(new "cd $STACK && docker compose --env-file /opt/cosasdecasa/.env -f docker-compose.prod.yml exec -T db psql -U postgres -d postgres -tAc 'select count(*) from \"$t\"' 2>/dev/null" || echo "n/a")
  if [ "$A" = "$B" ]; then log "  $t: $A = $B ✓"; else warn "  $t: viejo=$A nuevo=$B ✗ REVISAR"; fi
done

# 5c. Salud de la pila y consumo real — el número que motivó toda la operación.
echo
log "Estado de la pila en el droplet nuevo:"
new "cd $STACK && docker compose --env-file /opt/cosasdecasa/.env -f docker-compose.prod.yml ps --format 'table {{.Service}}\t{{.Status}}'"
echo
log "Memoria en el droplet nuevo:"
new "free -m | head -2; echo; docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}'"
echo
log "Disco:"; new "df -h / | tail -1"

# 5d. La app responde por HTTP (sin TLS todavía: el DNS aún apunta al viejo).
echo
log "Probando la app por IP directa (Host: el dominio real)..."
DOMAIN=$(new "grep '^APP_DOMAIN=' /opt/cosasdecasa/.env | cut -d= -f2")
CODE=$(new "curl -s -o /dev/null -w '%{http_code}' -H 'Host: $DOMAIN' http://localhost/ || echo 000")
[ "$CODE" = "200" ] && log "  la web responde 200 ✓" || warn "  la web devolvió $CODE (revisa 'docker compose logs caddy api')"

cat <<FIN

${c_ok}═══════════════════════════════════════════════════════════════${c_off}
 DATOS MIGRADOS. El droplet viejo sigue INTACTO y parado.
${c_ok}═══════════════════════════════════════════════════════════════${c_off}

 Te falta el paso que hace el cambio visible — reasignar la reserved IP:

   doctl compute reserved-ip-action assign <RESERVED_IP> <ID_DROPLET_NUEVO>

 o en Terraform, tras reconciliar el state (ver README):

   terraform apply

 Cuando la IP apunte al nuevo, Caddy ya tiene los certificados migrados, así
 que el TLS funciona desde el primer request — no hay que reemitir nada.

 ROLLBACK (mientras no borres el viejo): reasigna la IP al droplet viejo y
 levanta su pila con:
   ssh root@$OLD_IP 'cd $STACK && docker compose --env-file /opt/cosasdecasa/.env -f docker-compose.prod.yml up -d'

 NO borres el droplet viejo hasta que lleves al menos un día con el nuevo
 sirviendo sin incidencias.

 A partir de aquí, para desplegar cambios de código usa (desde tu máquina):
   deploy/digitalocean/stack/deploy-from-local.sh $NEW_IP
FIN
