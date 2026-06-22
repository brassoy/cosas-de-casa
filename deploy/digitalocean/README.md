# Despliegue de Cosas de Casa en DigitalOcean (Terraform + 1 droplet)

Infraestructura como código para levantar **Cosas de Casa** en **un único droplet** de
DigitalOcean, con **Caddy** terminando TLS, la PWA + la API NestJS + **Supabase self-hosted**
en Docker Compose, y los datos en un **block volume**.

> Es un v1 _all-in-one_: barato y rápido de levantar, sin alta disponibilidad. Para producción
> seria mira la sección [Endurecer / siguientes pasos](#8-endurecer--siguientes-pasos).
> El JWT se verifica en **HS256** (Supabase self-hosted); ya está resuelto en el código y testeado — ver [§9](#9-verificación-del-jwt-hs256-resuelto-en-el-código). Lo único sin probar contra un droplet real es la pila Supabase arrancando entera.

---

## 1. Arquitectura

```
                          Internet
                             │  443 (HTTPS / WSS)
                       ┌─────▼─────┐
                       │   Caddy   │  TLS automático (Let's Encrypt)
                       └─────┬─────┘
        reparte por ruta (mismo dominio):
   /api/*  │   /auth/* /rest/* /realtime/* /storage/*  │  resto
        ┌──▼──┐            ┌──▼──┐                   ┌──▼───────┐
        │ API │            │ Kong│ (gateway)         │ web (PWA │
        │Nest │            └──┬──┘                   │ estática)│
        └──┬──┘     ┌────────┼────────┬─────────┐   └──────────┘
           │     ┌──▼──┐ ┌───▼───┐ ┌──▼─────┐ ┌─▼────────┐
           │     │auth │ │ rest  │ │realtime│ │ storage  │──imgproxy
           │     │gotrue│ │pgrest│ └────────┘ └──────────┘
           │     └──┬──┘ └───┬───┘                │
           └────────┴────────┴────────┬───────────┘  + postgres-meta
                                  ┌────▼─────┐
                                  │ postgres │  (RLS; la API usa un rol normal)
                                  └──────────┘
        └────────── /mnt/cosasdecasa-data (block volume) ──────────┘
```

Solo **Caddy** publica puertos (80/443). Todo lo demás vive en la red docker interna.
**Realtime no necesita subdominio aparte**: va por Kong en el mismo dominio (`/realtime/*`).

---

## 2. Prerequisitos

| Necesitas | Para qué |
|---|---|
| Cuenta DO + **API token** | Provider de Terraform |
| `terraform` >= 1.6 (u `opentofu`) | Ejecutar el IaC |
| Un **dominio** | TLS, cookies de Auth y el origen único de la API/Supabase |
| **Deploy key** SSH (read-only) del repo | El droplet clona el código |
| **Clave SSH** personal | Entrar al droplet |
| **Email** para ACME | Let's Encrypt |
| (post-deploy) **Google Maps API key**, claves MiniMax/VAPID | Mapa de planes, IA y push |

**DNS (por defecto `manage_dns = false`):** crea a mano **un** A record — `app_domain`
(p.ej. `casa.tudominio.com`) — apuntando a la `reserved_ip` del output. Solo pon
`manage_dns = true` si delegas los nameservers de **exactamente** `app_domain` a
`ns1/2/3.digitalocean.com`.

**Deploy key:**
```bash
ssh-keygen -t ed25519 -f cosasdecasa_deploy -N ""
# Sube cosasdecasa_deploy.pub a GitHub → repo → Settings → Deploy keys (read-only)
# Pega el contenido de cosasdecasa_deploy (privada) en git_deploy_private_key del tfvars
```

---

## 3. Estructura

```
deploy/digitalocean/
├── README.md                  ← este archivo
├── terraform/
│   ├── providers.tf           proveedor + backend (state)
│   ├── variables.tf           todas las variables
│   ├── main.tf                droplet, volumen, VPC, firewall, reserved IP, DNS
│   ├── cloud-init.yaml.tftpl  primer boot (instala docker, clona, lanza bootstrap)
│   ├── outputs.tf             IPs, URLs, siguientes pasos
│   └── terraform.tfvars.example
└── stack/
    ├── Dockerfile.api          imagen de la API (monorepo + turbo build)
    ├── docker-compose.prod.yml la pila: Caddy + API + Supabase self-hosted
    ├── Caddyfile               TLS + reparto por ruta + estáticos de la web
    ├── env.prod.example        plantilla del .env (referencia)
    └── bootstrap.sh            monta volumen, genera secretos/keys, build, migra, levanta
```

---

## 4. Desplegar

```bash
cd deploy/digitalocean/terraform
cp terraform.tfvars.example terraform.tfvars   # rellena tus valores
terraform init
terraform plan
terraform apply
```

El `apply` crea el droplet y arranca el `cloud-init`. **El primer boot tarda ~10-20 min**
(se construyen las imágenes de Supabase + la API NestJS y se hace el build estático de la web).
Sigue el progreso:

```bash
ssh root@<reserved_ip> 'tail -f /var/log/cosasdecasa-bootstrap.log'
```

Cuando el log diga `LISTO`, comprueba `https://<tu-dominio>`.

> ⚠️ Caddy solo emite el certificado cuando el **DNS ya resuelve** al droplet.
> Mientras ajustas el DNS puedes usar el `acme_ca` de staging (comentado en el `Caddyfile`)
> para no gastar rate limits de Let's Encrypt.

### Qué pasa en el primer boot (bootstrap.sh)

1. Monta el block volume en `/mnt/cosasdecasa-data` y crea 2G de swap.
2. **Genera una vez** y persiste `POSTGRES_PASSWORD`, `JWT_SECRET`, `SECRET_KEY_BASE` y
   `JOIN_PIN_PEPPER` en `/mnt/cosasdecasa-data/secrets.env`.
3. **Deriva `ANON_KEY` y `SERVICE_ROLE_KEY`** firmando JWT HS256 estándar de Supabase
   (`{ role: anon }` / `{ role: service_role }`) con el `JWT_SECRET`.
4. Renderiza el `kong.yml` (consumers/rutas) y el init SQL de Postgres (fija las contraseñas
   de los roles `authenticator`/`supabase_auth_admin`/`supabase_storage_admin`/… y crea la
   publicación `supabase_realtime`).
5. Renderiza `/opt/cosasdecasa/.env` (API + `VITE_*` para el build de la web).
6. Construye la imagen de la API, levanta Postgres, aplica **migraciones Drizzle del repo**
   (`pnpm --filter @cosasdecasa/api db:migrate`) y las **SQL de `supabase/migrations/*`**
   (buckets `task-photos`/`avatars` + RLS).
7. Construye la **web estática** (`pnpm build`, horneando las `VITE_*`) en el dir que sirve Caddy.
8. Levanta la pila completa.

---

## 5. Post-deploy (obligatorio)

### 5.1 Restringe la Google Maps API key

`VITE_GOOGLE_MAPS_API_KEY` se hornea en el bundle de la web y, por tanto, **es pública** (la
ve cualquiera en el navegador). Eso es normal en una SPA, pero DEBES **restringirla por
referrer HTTP** en la consola de Google Cloud a `https://casa.tudominio.com/*` (y limitar las
APIs habilitadas a Maps JavaScript / Places). Sin esa restricción, cualquiera puede usar tu key.

Tras rellenarla en `/opt/cosasdecasa/.env`, **rehaz el build de la web** (ver §7).

### 5.2 IA (MiniMax) y Web Push (VAPID) — opcionales

Sin `MINIMAX_*` la extracción de artículos por IA degrada a **HTTP 503** (gated por diseño,
ADR 0014). Sin `VAPID_*` las notificaciones push se omiten. Rellénalas en `/opt/cosasdecasa/.env`;
las `VAPID_PUBLIC_KEY`/`VITE_VAPID_PUBLIC_KEY` deben coincidir y la web hay que **rebuildearla**.

### 5.3 Verificación del JWT (§9): ya resuelta (HS256), no requiere ajuste

### Checklist
- [ ] DNS apunta a la reserved IP y Caddy emitió el cert
- [ ] `https://<dominio>` carga la PWA
- [ ] Login funciona (Auth/GoTrue) — la API valida el JWT en HS256 (ver §9)
- [ ] Realtime (nevera/tareas/chat) actualiza en vivo
- [ ] Google Maps key restringida por referrer
- [ ] MiniMax/VAPID rellenadas (si las usas) y web rebuildeada

---

## 6. Tamaño y costes

- **Droplet `s-4vcpu-8gb`** (4 vCPU / 8 GB), región **`fra1`**, imagen `ubuntu-24-04-x64`
  — mismo tipo/importe que la referencia HADARA.
- **Block volume 50 GB** (Postgres + Storage + Caddy + secretos).
- **Reserved IP** (asignada): gratis.

Consulta los precios actuales de DigitalOcean para el total mensual.

---

## 7. Operar

**Inspeccionar la DB** (sin exponer Postgres): túnel SSH y `docker exec -it cosasdecasa_db psql -U supabase_admin postgres`.

**Actualizar el código desplegado:**
```bash
ssh root@<ip>
cd /opt/cosasdecasa && git pull
cd deploy/digitalocean/stack
dc() { docker compose --env-file /opt/cosasdecasa/.env -f docker-compose.prod.yml "$@"; }
dc build api
dc run --rm --no-deps api sh -c "cd /repo && pnpm --filter @cosasdecasa/api db:migrate"
# Rebuild de la web (re-hornea las VITE_* del .env):
dc run --rm --no-deps --env-file /opt/cosasdecasa/.env -v /mnt/cosasdecasa-data/web:/out \
  api sh -c "cd /repo && pnpm build --filter @cosasdecasa/web... && rm -rf /out/* && cp -r apps/web/dist/. /out/"
dc up -d
```

**Auto-deploy (CI/CD).** El workflow `.github/workflows/ci.yml` despliega en cada **push a `main`**
y SOLO si pasa la calidad (lint/tipos/tests unitarios): entra por SSH al droplet, hace
`git reset --hard origin/main` y corre `deploy/digitalocean/stack/redeploy.sh` (rebuild API+web,
migra, reinicia). Para activarlo:

1. **Clave de CI** (ya contemplada en Terraform): `ssh-keygen -t ed25519 -f cosasdecasa_ci -N ""`,
   pon `cosasdecasa_ci.pub` en `ci_deploy_pubkey` del tfvars → el droplet la autoriza en el `apply`.
2. **Secrets del repo** (GitHub → Settings → Secrets and variables → Actions):
   - `DEPLOY_HOST` = la `reserved_ip` del output de Terraform.
   - `DEPLOY_SSH_KEY` = el contenido de la clave **privada** `cosasdecasa_ci`.
3. Cada push a `main` re-despliega solo. (En PR no se ejecuta; si faltan los secrets, el job falla.)

> El **primer** despliegue lo hace `terraform apply` (cloud-init → `bootstrap.sh`). El auto-deploy
> cubre las **actualizaciones** posteriores con `redeploy.sh` (no re-toca secretos ni el `.env`).

**Backups:** lo crítico vive en `/mnt/cosasdecasa-data` (Postgres, Storage, secretos).
Activa **snapshots automáticos del volumen** en DO y/o un `pg_dump` programado a Spaces.

---

## 8. Endurecer / siguientes pasos

- **Imagen inmutable de la web/API:** publicar en **DOCR** (DigitalOcean Container Registry)
  en vez de construir en el droplet. Despliegues atómicos y reproducibles.
- **Postgres gestionado:** mover a **DO Managed Postgres** (backups + failover) — implica
  separar Supabase de la base, no trivial con self-hosting.
- **State remoto cifrado:** backend S3 en Spaces (ver `providers.tf`). El state contiene la deploy key.
- **Secretos:** el `user_data` queda en los metadatos del droplet y en el state — protégelos.
- **Studio + analytics:** este stack **no** incluye Supabase Studio ni el logflare/analytics del
  compose oficial (no hacen falta para servir la app). Añádelos si quieres panel de administración.

---

## 9. Verificación del JWT: HS256 (resuelto en el código)

Este despliegue self-hosted verifica el `Authorization: Bearer` en **HS256** (secreto compartido),
que es como firma GoTrue self-hosted. Ya está **implementado**, no requiere ajustes manuales:

- La API (`apps/api/src/contexts/identity-access/infrastructure/jose-token-verifier.ts`) soporta
  **dos modos** y elige según el entorno: si está `SUPABASE_JWT_SECRET` → verifica **HS256** con
  ese secreto; si no → **JWKS asimétrico** (`JWT_JWKS_URL`, que usan Supabase Cloud y el CLI local).
  En ambos casos valida issuer + audience y restringe los algoritmos. Cubierto por tests unitarios
  (`jose-token-verifier.spec.ts`).
- El bootstrap escribe en el `.env` de la API `SUPABASE_JWT_SECRET=${JWT_SECRET}` (el MISMO secreto
  con el que firma GoTrue, vía `GOTRUE_JWT_SECRET`), y `JWT_ISSUER` / `JWT_AUDIENCE` que casan con
  `GOTRUE_JWT_ISSUER` (`https://<dominio>/auth/v1`) y `GOTRUE_JWT_AUD` (`authenticated`) del compose.

Así, los access tokens que emite GoTrue se validan en la API directamente. En local y en Supabase
Cloud NO se define `SUPABASE_JWT_SECRET`, de modo que la API sigue usando JWKS asimétrico como
siempre (sin cambios para el desarrollo).

> **Alternativa (Auth gestionado):** si prefieres no self-hostear el Auth, apunta `SUPABASE_URL` /
> `VITE_SUPABASE_*` y `JWT_JWKS_URL` a un proyecto de **Supabase Cloud** (deja `SUPABASE_JWT_SECRET`
> vacío) y self-hostea solo el resto. La API funcionaría en modo JWKS sin tocar nada.

> **Nota:** lo que NO he podido probar es la pila Supabase self-hosted entera contra un droplet
> real (Kong/GoTrue/Realtime/Storage arrancando juntos). La verificación del JWT en sí está
> resuelta y testeada en la API; si algo falla en el primer arranque, suele ser de la pila Supabase
> (revisa `docker compose logs`), no del modo HS256.
