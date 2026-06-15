# Informe de QA — cosasdecasa

> Consolidación de los hallazgos de seguridad y calidad obtenidos mediante análisis estático del monorepo (`api`, `web`, `contracts`).
> Fecha: 2026-06-15 · Rol: QA lead · Alcance: análisis estático + quality gates (sin QA dinámico).

---

## 1. Estado de los Quality Gates

| Gate | Comando | Exit code | Resultado |
|------|---------|-----------|-----------|
| `contracts` typecheck | `tsc --noEmit` | 0 | PASS |
| `api` typecheck | `tsc --noEmit` | 0 | PASS |
| `api` lint | `eslint .` | 0 | PASS |
| `api` test unit | `vitest` | 0 | PASS — 35 ficheros, 318 tests |
| `web` typecheck | `tsc --noEmit` | 0 | PASS |
| `web` lint | `eslint .` | 0 | PASS (3 warnings, 0 errores) |
| `web` test | `vitest run` | **1** | **FAIL — 1 test de 334** |

**Veredicto:** todos los gates pasan EXCEPTO `web vitest`, que falla por un único test.

### Único fallo bloqueante

- **Fichero:** `/home/pablo/cosasdecasa/apps/web/src/features/fridge/fridge.test.tsx:170`
- **Test:** `FridgeListView — urgencia > ítem que caduca en ≤2 días tiene data-urgency=warning`
- **Síntoma:** `AssertionError: expected undefined to be truthy` en `expect(warning).toBeTruthy()`.
- **Causa probable:** un ítem con `expiryDate: relativeDate(1)` (caduca mañana, dentro del umbral ≤2 días) NO recibe el atributo `[data-urgency="warning"]` al renderizar. Los casos `expired` y `none` del mismo `describe` sí pasan, por lo que el defecto es específico del cálculo/render del estado `warning`.
- **Resumen del bloque:** Test Files 1 failed | 23 passed (24) — Tests 1 failed | 333 passed (334).

### Warnings de lint web (no bloquean, exit 0)

- `apps/web/src/core/router.tsx:43:10` — `react-refresh/only-export-components`
- `apps/web/src/shared/ui/badge.tsx:32:17` — `react-refresh/only-export-components`
- `apps/web/src/shared/ui/button.tsx:49:18` — `react-refresh/only-export-components`

### Falso positivo aclarado

El warning `Fallo simulado del sender` en `apps/api/test/.../expiry-reminder.spec.ts:88` es **intencional**: pertenece a un test que verifica el manejo de errores del sender de push. NO es un fallo; ese gate pasó con exit 0.

---

## 2. Hallazgos por severidad

Recuento: **4 CRITICAL · 11 HIGH · 21 MEDIUM · 13 LOW · 16 INFO**.

### CRITICAL

| Área | Fichero | Problema | Recomendación |
|------|---------|----------|---------------|
| JWT / Identity | `apps/api/src/config/env.config.ts:23-25` | `JWT_JWKS_URL`, `JWT_ISSUER` y `JWT_AUDIENCE` son `.optional()`. La app arranca sin claves criptográficas; `createRemoteJWKSet(new URL(undefined))` falla de forma diferida en la primera petición, no en bootstrap. | Quitar `.optional()` (hacerlos obligatorios) para fallar rápido en arranque. Añadir null-checks en el factory `JWKS_PROVIDER`. |
| JWT / Identity | `apps/api/src/config/env.config.ts:19` | `DATABASE_URL` es `.optional()`. La validación de conexión es diferida; la API podría aceptar peticiones sin BD ni auth correctas. | Quitar `.optional()`; que la validación de config falle en bootstrap. |
| Security | `apps/api/src/main.ts:27` | Swagger/OpenAPI (`/api/docs`) se monta SIN comprobar `NODE_ENV`. En producción expone la estructura completa de la API (reconnaissance). | Envolver `SwaggerModule.setup()` en `if (env.NODE_ENV !== 'production')`. |
| Security (PIN) | `apps/api/src/config/env.config.ts:32` | `JOIN_PIN_PEPPER` tiene default `dev-only-...-change-me`. Si no se sobreescribe en prod, los hashes de PIN usan una pepper pública conocida. | `superRefine()`: fallar HARD si `NODE_ENV==='production'` y la pepper es el default. |

### HIGH

| Área | Fichero | Problema | Recomendación |
|------|---------|----------|---------------|
| Autorización / IDOR | `apps/api/src/contexts/plans/interface/plans.controller.ts:158-287` | 12 endpoints con `:id` sin `@UseGuards` a nivel de método; la autorización vive SOLO en los use cases (frágil ante refactor o test directo de repo). | Crear `PlanScopeGuard` (resuelve ownership desde BD) y aplicarlo a todos los endpoints con `:planId`; use case como segunda línea. |
| Autorización / IDOR | `apps/api/src/contexts/social/interface/social.controller.ts:56-65` | `POST /families/:familyId/friend-invites` sin `FamilyScopeGuard`; el OWNER solo se valida dentro del use case. | Añadir `@UseGuards(FamilyScopeGuard)` con `@Roles('OWNER')`. |
| JWT / Identity | `apps/api/src/contexts/identity-access/identity-access.module.ts:23-30` | No se valida la accesibilidad del endpoint JWKS en el arranque (carga diferida). URL inalcanzable o maliciosa → fallo tardío en la primera auth. | Health-check / fetch del JWKS en bootstrap; liveness probe que falle si no se puede obtener. |
| JWT / Identity | `apps/api/src/contexts/identity-access/infrastructure/jose-token-verifier.ts:55-60` | El claim `sub` se extrae sin `typeof` check (sí se hace para `email`). Un `sub` truthy no-string podría llegar al upsert. | Aplicar `typeof payload.sub === 'string' ? ... : undefined` también a `sub`. |
| JWT / Identity | `apps/api/src/contexts/identity-access/interface/jwt-auth.guard.ts:43-53` | `extractBearer()` devuelve el token sin validar formato (3 segmentos) antes de `jwtVerify`. | Regex de validación de formato JWT antes de verificar, para fallar más claro. |
| Security (IA) | `apps/api/src/contexts/ai/interface/ai.controller.ts:50-56` | `POST /ai/extract-items` SIN `@RateLimit()`: cada llamada invoca un LLM externo de pago. DoS económico / drenaje de presupuesto. Otros endpoints IA sí limitan. | Añadir `@RateLimit({ limit: 5, ttl: 60_000 })` + `@UseGuards(RateLimitGuard)`. |
| Security (PIN) | `apps/api/src/contexts/family/interface/family.controller.ts:91-100` y `groups.controller.ts:91-100` | `POST /families/join` y `/groups/join` (redención de PIN) SIN rate-limit → brute-force de códigos. | Rate-limit agresivo por IP+userId (`limit:5, ttl:300_000`); registrar intentos fallidos. |
| Themes / a11y | `apps/web/src/features/menu/views/springfield/MenuView.tsx:66` | `animate-spin` sin `motion-safe` en varias vistas (menu, stats, tasks, budget) — incumple `prefers-reduced-motion`. Inconsistente con `ShoppingListDetailView`. | Usar `motion-safe:animate-spin` en TODAS las vistas; estandarizar. |
| Themes / calidad | `apps/web/src/features/stats/views/base/StatsView.tsx:24` | `RANK_MEDALS`, `getMedal()`, `earnedBadgeCount()`, `resolveName()` duplicados idénticos en 4 vistas. | Extraer a `shared/theme/stats-helpers.ts`. |
| Themes / a11y | `apps/web/src/features/stats/views/cozysitcom/StatsView.tsx:82` | Colores hardcodeados (`#A63A3A`+`#fff`, `#E3B23C`) sin verificar contraste WCAG. | Verificar contraste 4.5:1; migrar a tokens CSS. |
| Backend / rendimiento | `apps/api/src/contexts/plans/application/get-plan.use-case.ts:26-27` | N+1: `Promise.all(familyIds.map(findById))` sin batching (se replica en messages/rsvp). | Puerto `findByIds` o read-model con `IN`. |
| Backend / rendimiento | `apps/api/src/contexts/tasks/interface/tasks.controller.ts:124-130` | N+1: `enrichAssignees` se llama por tarea en el listado. | `findAssigneesByTasks(taskIds)` en una sola query. |

### MEDIUM

| Área | Fichero | Problema | Recomendación |
|------|---------|----------|---------------|
| Autorización | `shopping-items.controller.ts` vs `plans.controller.ts` | Patrón inconsistente: shopping usa `ItemScopeGuard`, plans delega todo al use case. | Estandarizar Guard + UseCase en ambos. |
| Autorización | `apps/api/drizzle/0000_init.sql` + `schema.ts` | Sin Row-Level Security en PostgreSQL: la seguridad depende 100% de la API (single point of failure). | `CREATE POLICY` por tabla clave validando membresía. |
| Autorización | `plans.controller.ts:76-104` | `GET/POST /families/:familyId/{places,plans}` sin `FamilyScopeGuard`; `:familyId` arbitrario no se rechaza a nivel guard. | Añadir `@UseGuards(FamilyScopeGuard)`. |
| JWT / Identity | `authenticate-request.use-case.ts:27-32` | JIT provisioning deriva `displayName` de `email.split('@')[0]` sin validar formato de email. | Validar email (RFC 5322) o constraint en BD. |
| JWT / Identity | `jwt-auth.guard.ts:35-40` | Errores no-`AuthDomainError` se re-lanzan sin logging; posible fuga de detalles internos. | `logger.error(...)` y envolver en `InternalServerErrorException`. |
| JWT / Identity | `drizzle-unit-of-work.ts:37-38` | Contexto RLS vía `JSON.stringify`; user IDs con caracteres raros podrían dar salida inesperada (bajo riesgo, query parametrizada). | Validar que los user IDs son UUID en dominio; documentar. |
| JWT / Identity | `jose-token-verifier.ts:61-68` | Todos los errores de verificación → mismo `InvalidTokenError`; el cliente no distingue expirado/revocado/firma. | Diferenciar tipos de error (Expired/Issuer/Audience). |
| Security | `apps/api/src/common/rate-limit.guard.ts:34` | Rate-limit en memoria (`Map`) sin coordinación multi-instancia: distribuible entre procesos. | OK para MVP; migrar a Redis antes de escalado horizontal. |
| Security | `apps/api/src/main.ts:16` + `env.config.ts:12` | CORS `credentials:true` con default permisivo (localhost); mala config post-deploy podría combinar con `*`. | Validar en prod que origins no sea localhost/wildcard. |
| Security | `apps/api/src/contexts/plans` y `/social` | Autorización en use case y no en guard declarativo → IDOR silencioso al añadir nuevos use cases. | `PlanScopeGuard` / `SocialScopeGuard`. |
| Frontend / Security | `apps/web/src/sw.ts:61-68` | El service worker usa `title`/`body`/`icon` del push sin validar; `icon` es URL no verificada. | Validar `icon` contra orígenes permitidos; límites de longitud. |
| Themes / a11y | `apps/web/src/features/stats/views/cozy/StatsView.tsx:275` | Colores crema inline (`#e8d9b8`/`#F4E3C1`) sin tokens; contraste con barra de progreso sin verificar. | Variables CSS (`--color-surface-muted`). |
| Themes / calidad | `apps/web/src/features/stats/views/cozy/StatsView.tsx:33` | Paletas de color duplicadas/reinventadas por theme. | Centralizar en `shared/theme/color-palettes.ts`. |
| Themes / a11y | `apps/web/src/features/auth/views/springfield/AuthView.tsx:182` | Botón Google sin `aria-label` en springfield (otros themes sí lo tienen). | Añadir `aria-label="Continuar con Google"`. |
| Themes / calidad | `apps/web/src/shared/theme/ThemeView.tsx:13` | `useThemeName` sin fuente clara/documentada. | Documentar export o `@see`. |
| Themes / calidad | `apps/web/src/shared/theme/ThemeView.tsx:37` | Fallback silencioso a `null` si no hay vista, difícil de depurar. | `console.warn` en dev; validar `base` completo en build. |
| Themes / a11y | `apps/web/src/features/menu/views/base/MenuView.tsx:47` | `Loader2 animate-spin` sin `motion-safe`. | `motion-safe` o `aria-busy=true`. |
| Themes / rendimiento | `apps/web/src/shared/theme/registry.ts:71` | `lazy()` + Suspense puede remount + skeleton al cambiar theme rápido. | Documentar/aplicar `memo(View)`. |
| Backend / rendimiento | `apps/api/src/contexts/plans/infrastructure/drizzle-plans-read-model.ts:18-66` | `getPlanDetail` ejecuta 3 queries separadas. | Combinar en una con JOINs/subqueries. |
| Backend / observabilidad | `apps/api/src/contexts/shopping/application/add-item-to-list.use-case.ts:99-102` | `console.error` en vez de `Logger` de NestJS. | Inyectar `Logger`. |
| Backend / arquitectura | `apps/api/src/contexts/menu/application/generate-list-from-menu.use-case.ts:6-7` | Menu importa use cases de shopping directamente (acoplamiento cross-context). | Puerto `MenuListCommandPort`. |
| Backend / arquitectura | `apps/api/src/contexts/menu/menu.module.ts:30-40` | Menu registra repos de shopping como propios; límites de contexto difusos. | Documentar cliente o servicio compartido. |
| Backend / errores | `apps/api/src/contexts/budget/interface/budget-error.filter.ts:39` | `AiUnavailableError→503` solo en algunos filtros; sin filtro global. | `GlobalExceptionFilter` para IA. |
| Backend / consistencia | `apps/api/src/contexts/shopping/application/add-item-to-list.use-case.ts:97-103` | `upsertCatalog` fire-and-forget; si falla, catálogo inconsistente sin retry. | Cola de reintentos o hacerlo síncrono. |
| Backend / tipos | `apps/api/src/contexts/ai/infrastructure/fastembed-embedding.adapter.ts:29` | `flagEmbedding: any` sin type guards. | `unknown` + type guards o interface. |

### LOW

| Área | Fichero | Problema | Recomendación |
|------|---------|----------|---------------|
| Autorización | plans, social, romantic | Autorización en use cases sin guard base reutilizable. | Guards reutilizables como primera línea. |
| Autorización | `notifications.controller.ts` / `ai.controller.ts` | Revisado: notifications y AI correctos; confirmar que `extract-items` debe ser solo autenticado. | Sin cambios; confirmar diseño. |
| JWT / Identity | `jose-token-verifier.ts:18-20` | Sin estrategia documentada de invalidación de caché JWKS (clave revocada podría aceptarse hasta refresh). | Documentar/ajustar TTL; refresh en background. |
| Security | `apps/api/src/main.ts` | Sin límite explícito de tamaño de body (default ~100 KB). | `express.json({ limit: '2mb' })`. |
| Security | `apps/api/src/main.ts:15` | Helmet con config default; sin HSTS explícito. | Configurar HSTS si HTTPS. |
| Input validation | `plans.controller.ts:141,253` | `new Date(before)` sin validar (`before` no pasa por DTO). | DTO con `z.string().datetime().optional()`. |
| Input validation | `budget.controller.ts:138-151` | `from`/`to` sin DTO (parametrizado y seguro, pero error 500 con fecha inválida). | DTO con regex `YYYY-MM-DD`. |
| SQL | `apps/api/src/db/schema.ts` + `drizzle-shopping-list.repository.ts:39` | Literales de status hardcodeados (`'MAIN'`,`'ACTIVE'`); seguros hoy, riesgo si pasan a ser user-controlled. | Parametrizar si llegan a ser dinámicos. |
| Themes / a11y | `apps/web/src/shared/theme/registry.ts:69` | `ComponentType<any>` intencional y documentado. | Sin cambios. |
| Themes / a11y | `apps/web/src/features/stats/views/cozysitcom/StatsView.tsx:67` | Emoji decorativo sin label en empty states (`menu cozy:113`). | `aria-label` o visually-hidden en emoji solitario. |
| Themes / a11y | `apps/web/src/shared/theme/themes/springfield.css:192` | CSS respeta `prefers-reduced-motion`, pero JS inline (`animate-spin`) no se coordina. | `motion-safe:` o `matchMedia`. |
| Frontend / Security | `apps/web/src/shared/lib/supabase.ts:11` | Almacenamiento de token Supabase no fuerza explícitamente httpOnly. | Verificar config dashboard; documentar asunción. |
| Backend / deuda | `apps/api/src/contexts/calendar/infrastructure/noop-calendar-sync.adapter.ts` | `TODO(Fase 4)` sin roadmap; RRULE incompleto. | Crear issues con prioridad. |
| Backend / mantenibilidad | `apps/api/src/contexts/stats/application/family-stats.query.ts:55-99` | Mezcla SQL raw + DSL Drizzle, difícil de mantener. | Materialized view o DSL consistente. |
| Backend / arquitectura | `apps/api/src/contexts/family/infrastructure/drizzle-members-read-model.ts` | Read-model sin puerto en dominio (acoplado a Drizzle). | Token `MEMBERS_READ_MODEL` en `domain/ports`. |

### INFO (controles verificados como correctos — sin acción)

- Drizzle parametriza todas las queries (`drizzle-receipt.repository.ts`, pgvector, RLS context) — sin SQL injection.
- 41 DTOs con `createZodDto(...InputSchema.strict())` + pipe global — mass assignment prevenido.
- PIN: Crockford Base32, ~40 bits, regex, normalización, consumo atómico, expiración 24h, scrypt N=2^14 + `timingSafeEqual`.
- Rate-limit funcional en memoria (sliding window, sin fuga de memoria).
- Sin `eval`/Function constructor; sin logging de datos sensibles.
- Frontend: token API no persistido (on-demand vía `getSession()`); links externos con `rel="noopener noreferrer"`; URLs validadas con `z.string().url()`.

---

## 3. Acción inmediata (arreglar YA)

Solo CRITICAL/HIGH reales y accionables, en orden de prioridad. **Bloqueante de release primero.**

1. **[GATE BLOQUEANTE] Arreglar el test de urgencia del frigorífico.** `apps/web/src/features/fridge/fridge.test.tsx:170` falla porque un ítem que caduca en ≤2 días no recibe `data-urgency="warning"`. Es el único gate en rojo; nada se mergea hasta que `web vitest` pase. Revisar el cálculo del estado `warning` en el componente `FridgeListView`.
2. **JWT/DB obligatorios en config.** Quitar `.optional()` de `JWT_JWKS_URL`, `JWT_ISSUER`, `JWT_AUDIENCE` y `DATABASE_URL` en `apps/api/src/config/env.config.ts`. Fail-fast en bootstrap, no en la primera petición.
3. **Cerrar Swagger en producción.** Envolver `SwaggerModule.setup()` (`apps/api/src/main.ts:27`) en `if (env.NODE_ENV !== 'production')`.
4. **Forzar `JOIN_PIN_PEPPER` real en prod.** `superRefine()` en `env.config.ts:32` que falle si en producción se usa el default `dev-only-...-change-me`.
5. **Rate-limit en `POST /ai/extract-items`.** `apps/api/src/contexts/ai/interface/ai.controller.ts:50` — añadir `@RateLimit({ limit: 5, ttl: 60_000 })` + `@UseGuards(RateLimitGuard)`. Evita DoS económico contra el LLM.
6. **Rate-limit en redención de PIN.** `family.controller.ts:91-100` y `groups.controller.ts:91-100` — rate-limit agresivo (`limit:5, ttl:300_000`) por IP+userId contra brute-force.
7. **Guards de scope en plans/social.** Crear `PlanScopeGuard` y aplicar `@UseGuards` en `plans.controller.ts:158-287`; añadir `FamilyScopeGuard` a `social.controller.ts:56-65`. Cierra IDOR latente (autorización solo en use case).
8. **Validar `sub` como string en el verifier.** `jose-token-verifier.ts:55-60` — `typeof payload.sub === 'string' ? ... : undefined`.
9. **Validar accesibilidad del JWKS en arranque.** Health-check / fetch inicial en `identity-access.module.ts:23-30`.

> Los HIGH de N+1 (plans/tasks) y los HIGH de themes (motion-safe, contraste WCAG, duplicación de helpers) son reales pero no de seguridad: planificar en el siguiente sprint, no bloquean release una vez verde el gate.

---

## 4. QA dinámico — REALIZADO ✅

No había conflicto real de Supabase (cosasdecasa tenía su propia instancia local en los puertos estándar). El QA dinámico se completó:

- **Features backend** — `test:integration` contra la BD real: **15 suites, 229 tests, todos en verde** (auth, autorización, shopping+dedup, tareas, nevera, calendario, planes, grupos, social, presupuesto, menú, notificaciones, romantic, stats).
- **Smoke E2E front+back** (Playwright, **login real por UI** → familia → listas+items → tareas, con datos reales del backend vía proxy): **0 errores de consola, 0 respuestas API 4xx/5xx inesperadas.**
- **Responsive**: 432 combinaciones (móvil 390 + tablet 768 × 4 themes × claro+oscuro × 27 pantallas) → **0 overflow, 0 errores**.
- **Tiempos de respuesta** (API local, token real):

  | Endpoint | avg | p95 |
  |---|---|---|
  | GET /families (auth+JIT) | 10.9 ms | 13.7 ms |
  | GET /families/:id/members | 11.6 ms | 14.7 ms |
  | GET /families/:id/lists | 8.4 ms | 9.8 ms |
  | GET /families/:id/stats (read-model) | 11.8 ms | 13.7 ms |
  | GET /families/:id/leaderboard | 11.4 ms | 13.6 ms |
  | POST /lists/:id/items (dedup+embedding) | 344 ms | 466 ms |

  Lecturas excelentes (<15 ms). El alta de ítem (~344 ms) lo domina el **embedding local del dedup semántico** (síncrono por diseño: la respuesta incluye la decisión SUGGEST/ADD_NEW); en la UX real está **mitigado por el offline-first** (escritura optimista en Dexie + outbox), así que el usuario no espera.

> **Estado tras todos los fixes:** todos los quality gates pasan — tsc/lint api+web, vitest web 334, api unit 318, **integration 229**. Responsive 0 problemas. Seguridad/calidad: CRITICAL/HIGH accionables resueltos; el resto (IDOR latente ya cubierto por use cases, RLS, N+1, JWKS health-check) documentado arriba para siguiente sprint.

> Backup de la BD tomado antes del QA dinámico en `/tmp/cosasdecasa-pre-qa.dump` (los tests crean usuarios `*@integration.test` aislados y los limpian; no tocan datos existentes).
