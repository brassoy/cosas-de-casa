# Documentación — Cosas de Casa

Aquí vive el **porqué** del proyecto, no solo el cómo.

- `didactica/` — cómo procedemos y el razonamiento detrás de cada decisión. Empieza por `00-como-procedemos.md`.
- `adr/` — Architecture Decision Records: una decisión por archivo (contexto, opciones, decisión, consecuencias).
- `modules/` — documentación por contexto de dominio.
- `roadmap/` — fases y unidades de trabajo.
- `infra/` — puesta en marcha local y gestión de secretos.

## Mapa rápido

- ¿Cómo trabajamos y por qué? → `didactica/00-como-procedemos.md`.
- Decisiones de arquitectura → `adr/` (empezando por `0001`).

## ADRs

| # | Título |
|---|---|
| 0001 | Monorepo con pnpm workspaces + Turborepo |
| 0002 | Backend NestJS hexagonal |
| 0003 | Supabase como infraestructura |
| 0004 | Auth Supabase JWT/JWKS |
| 0005 | PIN de invitación y autorización |
| 0006 | Offline-first en listas |
| 0007 | Dedup semántico y voz |
| 0008 | Notificaciones push VAPID + cron, sin Redis en el MVP |
| 0009 | Tareas: dependencia tasks→shopping y fotos por Storage |
| 0010 | Nevera: ubicaciones y urgencia de caducidad |
| 0011 | Estadísticas como read model CQRS por agregación SQL |
| 0012 | Peña (groups) como agregado distinto, patrón JoinPin |
| 0013 | Tiempo real con Supabase Realtime y gotcha de display_name |
| 0014 | IA gated: AiUnavailableError, HTTP 503 y dinero como numeric |
| 0015 | Disciplina de migraciones Drizzle: cadena limpia |

## Módulos documentados

`tasks` · `fridge` · `notifications` · `stats` · `calendar` · `romantic` · `groups` · `social` · `plans` · `menu` · `budget`

## Guías didácticas (patrones transversales)

| Fichero | Tema |
|---|---|
| `00-como-procedemos.md` | Filosofía del proyecto y ciclo de trabajo |
| `01-arquitectura-hexagonal-por-contexto.md` | Hexagonal: dominio, puertos, adaptadores |
| `02-read-models-cqrs.md` | Read models y separación lectura/escritura |
| `03-servicios-gated-degradacion-ia.md` | Puertos de IA, AiUnavailableError y HTTP 503 |
| `04-tiempo-real-supabase-realtime.md` | postgres_changes y el gotcha de campos derivados |
| `05-disciplina-migraciones-drizzle.md` | Cadena limpia, un solo propietario de schema |
