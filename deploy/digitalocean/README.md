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

**Right-sizing de 2026-08.** El dimensionamiento anterior (`s-2vcpu-4gb` + volumen
de 50 GB, ~$29/mes) estaba puesto para el pico de **compilación**, no para el de
**servicio**. Se midió producción y salió esto:

| Contenedor | RAM medida |
|---|---|
| `api` (NestJS) | 425,6 MB |
| `kong` | 80,7 MB |
| `meta` | 74,9 MB · *retirado, ver abajo* |
| `storage` | 73,8 MB |
| `db` (Postgres) | 50,2 MB |
| `realtime` | 49,6 MB |
| `caddy` | 32,3 MB |
| `auth` | 25,7 MB |
| `rest` | 13,0 MB |
| `imgproxy` | 9,5 MB |
| **Total** | **~837 MB** |

Y los **datos completos ocupaban 77 MB** en un volumen de 50 GB (0,15 % de uso):
`db` 63 MB, `web` 14 MB, `storage` 72 KB, `caddy` 120 KB, `secrets.env` 289 B.
La CPU estaba al **93 % idle** con load 0,19.

**Configuración actual:**

| Recurso | Valor | Coste |
|---|---|---|
| Droplet `s-1vcpu-1gb` | 1 vCPU / 1 GB / 25 GB, `fra1` | $6,00/mes |
| Backups de DO (+20 %) | disco de arranque completo | $1,20/mes |
| Block volume | **eliminado** | $0 |
| Reserved IP (asignada) | `139.59.205.14` | $0 |
| **Total** | | **~$7,20/mes** |

Antes: ~$29/mes. **Ahorro del 75 %.**

### Las tres condiciones que hacen viable 1 GB

No es solo cambiar el `droplet_size`. Bajar de máquina exigió tres cambios, y
**deshacer cualquiera de ellos rompe el droplet**:

1. **No se compila en producción.** Las imágenes se construyen en tu máquina y
   se cargan en el droplet por SSH (`docker save | ssh docker load`), sin
   registro de por medio. `pnpm build` (Vite + turbo + tsc) sobre este monorepo
   pedía varios GB de RAM — era el motivo real del droplet de 4 GB.
   Ver `stack/deploy-from-local.sh` y §7.
2. **El heap de la API está acotado.** `NODE_OPTIONS=--max-old-space-size=224`.
   V8 dimensiona su heap según la RAM que ve: en el droplet de 4 GB la API se
   comía 425 MB *porque podía*. Acotarlo la deja en ~220 MB sin coste de
   latencia (es I/O-bound, no memory-bound).
3. **`mem_limit` en todos los servicios.** Techos, no reservas: impiden que un
   servicio desbocado se lleve la pila por delante.

Además se retiró **`postgres-meta`** del arranque por defecto (`profiles: [studio]`):
nadie lo declaraba en `depends_on` y `kong.yml` no enruta hacia él — solo lo usa
Supabase Studio, que aquí no existe. Eran 75 MB para nadie.

### Lo que se pierde al quitar el block volume

Con volumen, destruir el droplet era barato: el dato sobrevivía fuera. Ahora
Postgres, Storage, los certificados de Caddy y `secrets.env` viven en el **disco
de arranque**. Destruir el droplet es destruir la base de datos.

Mitigaciones ya aplicadas:
- `prevent_destroy = true` en el droplet y en la reserved IP (`main.tf`).
- `ignore_changes = [user_data]`: el cloud-init solo importa en el primer
  arranque, y sin esto cualquier cambio en él forzaba un reemplazo del droplet.
- `enable_backups = true` (backups semanales de DO sobre el disco entero).
- Dump automático antes de cada despliegue, en `redeploy.sh`
  (`$DATA_DIR/backups/pre-deploy-*.sql.gz`, se guardan los 7 últimos).


---

## 7. Operar

**Inspeccionar la DB** (sin exponer Postgres): túnel SSH y `docker exec -it cosasdecasa_db psql -U supabase_admin postgres`.

**Actualizar el código desplegado.** Normalmente no tienes que hacer nada: un push
a `main` dispara el CI, que construye las imágenes y despliega solo. A mano:

```bash
ssh root@<ip>
cd /opt/cosasdecasa && git pull        # trae compose, Caddyfile, scripts y migraciones SQL
deploy/digitalocean/stack/redeploy.sh  # dump + pull + migrar + publicar web + up
```

**Rollback de código.** Vuelve al commit que quieras y redespliega: el script
reconstruye desde el árbol de trabajo, así que `git checkout <sha>` +
`deploy-from-local.sh <ip>` te deja esa versión en producción.

**Desplegar (desde tu máquina, con Docker arrancado):**

```bash
deploy/digitalocean/stack/deploy-from-local.sh <ip-droplet>
```

Eso es todo. El script construye la API y la web aquí, las carga en el droplet
por SSH y lanza el despliegue. **No hay CI de despliegue ni registro de
imágenes**: `.github/workflows/ci.yml` solo corre calidad (lint, tipos, tests).

Por qué así y no con GitHub Actions + GHCR:

- **Menos piezas.** Sin registro, sin credenciales en el droplet, sin secrets ni
  variables de repo que mantener.
- **El `ANON_KEY` no se puede desincronizar.** Las `VITE_*` se hornean en el
  bundle, y `VITE_SUPABASE_ANON_KEY` se deriva del `JWT_SECRET` que vive en el
  droplet. El script las lee del `.env` **real del droplet** justo antes de
  construir, así que siempre casan. Duplicadas como variables de un CI, la
  desincronización es cuestión de tiempo — y se manifiesta como "la web no
  autentica" sin ningún error que apunte a la causa.
- **Solo se transfiere lo que cambió.** El script compara el ID de cada imagen
  con la del droplet y se salta el envío si ya es idéntica. La imagen de la API
  son ~2,9 GB y en la mayoría de despliegues no cambia.

El coste es que los despliegues dependen de tu máquina. Para un proyecto
familiar con un único desarrollador, es un intercambio que sale a cuenta.

> **NUNCA** ejecutes `docker compose build` en el droplet. Construir el monorepo
> pide varios GB de RAM y en 1 GB se lleva la pila por delante. El bloque `build`
> del compose existe justo para que `deploy-from-local.sh` construya **en local**.


**Vigilar la RAM.** El margen en 1 GB es real (~640 MB de uso sobre 1024) pero no
es holgado. Si algo empieza a ir raro, mira aquí primero:

```bash
ssh root@<ip> 'free -m; docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}"'
```

Un contenedor pegado a su `mem_limit` con reinicios en `docker compose ps` es un
OOM kill: sube ese límite concreto (y baja otro) antes de subir de droplet.

**Backups.** Lo crítico vive en `/mnt/cosasdecasa-data` (Postgres, Storage,
secretos) y ahora está en el **disco de arranque**, no en un volumen aparte:

- **Backups de DO** (`enable_backups = true`): semanales, disco completo.
- **Dump pre-despliegue** automático en `redeploy.sh`: los 7 últimos en
  `/mnt/cosasdecasa-data/backups/`.
- **Pendiente recomendado**: un `pg_dump` nocturno a DO Spaces. Los dos anteriores
  viven en el mismo droplet que protegen — si lo pierdes entero, los pierdes con él.

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

---

## 10. Migrar a otro droplet sin perder datos (y sin cambiar de IP)

> ### ⚠️ ANTES DE NADA: no ejecutes `terraform apply` todavía
>
> Al eliminar `digitalocean_volume.data` del código, el recurso sigue vivo en el
> state. Un `terraform apply` sin más **destruye el volumen con la base de datos
> dentro**. Compruébalo tú mismo — `terraform plan` dice:
>
> ```
> digitalocean_volume.data will be destroyed
> Plan: 0 to add, 2 to change, 1 to destroy.
> ```
>
> El `terraform state rm` de la Fase 2 es lo que desactiva esa bomba: saca el
> volumen del state para que Terraform deje de creer que le pertenece. **No te
> saltes ese paso, y no hagas `apply` antes de llegar a él.**

El procedimiento que se usó en el right-sizing de 2026-08. Sirve igual para
cualquier cambio de máquina.

**Por qué NO vale un resize:** DigitalOcean permite subir de disco, nunca bajar.
De 80 GB a 25 GB solo se llega creando un droplet nuevo y migrando.

**Por qué la IP no cambia:** el DNS apunta a la **reserved IP**, no a la IP del
droplet. Cambiar de máquina es reasignar esa IP — segundos de corte, sin tocar
DNS ni esperar TTL. Los certificados de Caddy viajan en la copia de datos, así
que el TLS funciona desde el primer request en la máquina nueva.

### Orden obligatorio

Los builds tienen que salir del droplet **antes** de migrar. Un droplet de 1 GB
no puede compilar el monorepo, así que si migras primero, el primer deploy en la
máquina nueva muere por OOM y te quedas sin nada.

#### Fase 1 — Comprobar que el despliegue desde local funciona

Antes de cambiar de máquina, valida el mecanismo nuevo **contra el droplet viejo**,
que todavía tiene red de seguridad:

```bash
deploy/digitalocean/stack/deploy-from-local.sh <ip-vieja>
```

Si eso despliega bien, el flujo funciona. Si falla, falla aquí — donde no
duele.

#### Fase 2 — Crear el droplet nuevo

Terraform tiene un solo `digitalocean_droplet`. Para que cree el nuevo **sin
tocar el viejo**, se saca el viejo del state: sigue existiendo en DO, pero
Terraform deja de conocerlo y no puede destruirlo.

**Primero edita tu `terraform.tfvars`** (está gitignored; el `.example` ya trae los
valores nuevos):

```hcl
droplet_size   = "s-1vcpu-1gb"
enable_backups = true
# y BORRA la línea volume_size_gb: esa variable ya no existe
```

> **El orden importa.** Si cambias `droplet_size` *antes* del `state rm`, Terraform
> intentará un **resize in-place** del droplet actual — y DigitalOcean no reduce
> discos, así que de 80 GB a 25 GB no hay resize posible. Saca primero el droplet
> del state; entonces el `apply` crea uno nuevo en vez de intentar encoger el viejo.

```bash
cd deploy/digitalocean/terraform
cp terraform.tfstate terraform.tfstate.pre-migracion   # por si acaso

terraform state rm digitalocean_droplet.cosasdecasa
terraform state rm digitalocean_firewall.cosasdecasa
terraform state rm digitalocean_reserved_ip_assignment.cosasdecasa
terraform state rm digitalocean_volume.data            # el volumen ya no se declara

terraform plan     # debe crear droplet + firewall + assignment. NADA de destroy.
terraform apply
```

> El `plan` **no puede** contener ningún `destroy`. Si lo contiene, para: algo
> quedó en el state que no debía.

El cloud-init corre `bootstrap.sh`, que ahora solo hace `docker pull` (~3-5 min,
no los 20 de antes). Sigue el log:
`ssh root@<ip-nueva> 'tail -f /var/log/cosasdecasa-bootstrap.log'`

#### Fase 3 — Migrar los datos

```bash
deploy/digitalocean/stack/migrate-to-new-droplet.sh <ip-vieja> <ip-nueva>
```

El script para ambas pilas, hace un `pg_dumpall` de seguridad, copia
`/mnt/cosasdecasa-data` entero por `rsync` **directo entre droplets** (con
Postgres parado: consistente por construcción), **transfiere la imagen de la API
del viejo al nuevo**, regenera el `.env` del nuevo a partir del `secrets.env`
migrado, levanta la pila y verifica.

La imagen no hace falta reconstruirla ni subirla desde casa: el droplet viejo ya
la tiene, y el tráfico entre droplets de la misma región va por la **red interna
del centro de datos**. Son ~2,9 GB que viajan en un par de minutos en vez de en
una hora por tu línea de subida. El `dist` de la web tampoco se transfiere
aparte: viaja dentro del rsync de datos.

Copia en frío y no `pg_dump` porque con 77 MB de datos preserva de una vez los
roles con sus contraseñas, el schema `_realtime`, los objetos de Storage y los
certificados de Caddy — sin reconciliar nada a mano.

**La verificación crítica** que hace el script: que el `JWT_SECRET` sea idéntico
en ambos lados. De él se derivan `ANON_KEY` y `SERVICE_ROLE_KEY`; si cambia,
todas las sesiones se invalidan y la web ya publicada deja de autenticar. Si no
coincide, el script aborta y te dice que **no** reasignes la IP.

#### Fase 4 — Mover la IP (aquí se hace visible el cambio)

```bash
doctl compute reserved-ip-action assign <RESERVED_IP> <ID_DROPLET_NUEVO>
```

Comprueba: `curl -I https://<app_domain>`.

#### Fase 5 — Reconciliar Terraform y retirar el viejo

```bash
terraform plan   # debe salir limpio: el assignment ya apunta al droplet nuevo
```

**No borres el droplet viejo el mismo día.** Déjalo parado al menos 24 h. Mientras
exista, el rollback es reasignar la IP y levantar su pila.

A partir de aquí, para desplegar cambios de código:
`deploy/digitalocean/stack/deploy-from-local.sh <ip-nueva>`

Cuando estés seguro, bórralo desde la consola de DO junto con el volumen
`cosasdecasa-data` (es el que deja de costar $5/mes).

### Rollback

Mientras el droplet viejo exista:

```bash
doctl compute reserved-ip-action assign <RESERVED_IP> <ID_DROPLET_VIEJO>
ssh root@<ip-vieja> 'cd /opt/cosasdecasa/deploy/digitalocean/stack && \
  docker compose --env-file /opt/cosasdecasa/.env -f docker-compose.prod.yml up -d'
```

Se pierde lo escrito en el droplet nuevo desde el corte. Con una app familiar y
una ventana de minutos, en la práctica es nada — pero tenlo presente.
