# Auditoría de seguridad de endpoints

Revisión de la postura de seguridad de la API (`apps/api`). Auditoría **estática** (lectura de
código): autenticación, autorización, validación, rate limiting, secretos y hashing. La
verificación **activa** (tests de intrusión / IDOR ejecutables) queda como paso siguiente — ver
[Para cerrar](#para-cerrar-verificación-activa).

## Resumen ejecutivo

**La postura es sólida.** Autenticación delegada en Supabase con JWT asimétrico, autorización
sistemática por *scope guards* que atan cada recurso a su familia, validación global estricta y
secretos fuera del código. No se ha encontrado ningún IDOR explotable por lectura de código.

Lo que hay que mirar son matices, no agujeros:

| Severidad | Hallazgos |
|---|---|
| 🟠 Media | 3 — rate limit ausente en `/ai/extract-items`, pepper de PIN con default en prod, autorización en use case (no guard) en plans/social |
| 🟡 Baja | 3 — CORS con `credentials`, tamaño de body sin límite, rate limit en memoria (no multi-instancia) |
| ✅ Fortalezas | auth asimétrica, guards de ownership, validación whitelist, secretos por entorno, scrypt + `timingSafeEqual` |

---

## 1. Superficie de endpoints

Todos los endpoints cuelgan del prefijo global `/api/v1` (`main.ts:16`). El mapa completo está en
[`../casos-de-uso.md`](../casos-de-uso.md). **Solo `GET /health` es público**; el resto exige
`JwtAuthGuard`.

## 2. Autenticación

JWT **asimétrico (ES256)** verificado contra el **JWKS remoto de Supabase** (`JoseTokenVerifier`):

- Verifica firma, `issuer` y `audience` con `jose:jwtVerify`. Las claves de firma **no viven en la
  API** (se descargan y cachean del JWKS de Supabase) → no hay secreto de firma que filtrar.
- El token viaja en `Authorization: Bearer <jwt>`.
- Aprovisionamiento *just-in-time*: `AuthenticateRequestUseCase` hace upsert del usuario en
  `app_users` (sub, email, displayName) en cada request autenticada.

**Veredicto**: fuerte. Es el modelo correcto para delegar identidad en Supabase (ADR-0004).

## 3. Autorización (el corazón: IDOR)

Enforcement **primario** en `FamilyScopeGuard` (`family/interface/family-scope.guard.ts`), que se
ejecuta tras `JwtAuthGuard`:

```ts
const family = await this.families.findById(familyId);   // 404 si no existe
const membership = family.membershipOf(user.id);          // 403 si no eres miembro
if (requiredRoles?.length && !requiredRoles.includes(membership.role)) // 403 @Roles('OWNER')
```

Cada recurso con id propio tiene un *scope guard* que **remonta el recurso hasta su familia** antes
de tocar nada:

| Guard | Contexto | Ata… |
|---|---|---|
| `FamilyScopeGuard` | family (compartido por budget, calendar, fridge, menu, notifications, stats, ai…) | `:familyId` → membresía |
| `ListScopeGuard` / `ItemScopeGuard` | shopping | lista/ítem → familia |
| `TaskScopeGuard` | tasks | tarea → familia |
| `ReceiptScopeGuard` | budget | ticket → familia |
| `EventScopeGuard` | calendar | evento → familia |
| `FridgeItemScopeGuard` | fridge | ítem → familia |
| `GroupScopeGuard` | groups | peña → membresía (con `@GroupRoles`) |
| `CoupleScopeGuard` | romantic | **solo los 2 miembros de la pareja** (privacidad estricta, no toda la familia) |

**No se detectó IDOR**: cada operación sobre un `:id` ajeno se rechaza con 403 antes de llegar al
caso de uso.

### 🟠 Matiz importante: dos patrones de autorización conviven

`plans` y `social` **no tienen scope guard declarativo** — la verificación de acceso vive **dentro
del caso de uso** (p. ej. `PlanAccessDeniedError`, `NotFamilyOwnerError`). Funciona hoy, pero es más
frágil: un guard declarativo es imposible de olvidar; una comprobación dentro del use case se puede
omitir al añadir un caso de uso nuevo, y ahí aparecería un IDOR.

**Recomendación**: o bien un `PlanScopeGuard`/equivalente, o bien un test de autorización
obligatorio por cada caso de uso de `plans`/`social`.

## 4. Validación de entrada

`ValidationPipe` global con la configuración correcta (`main.ts:17`):

```ts
new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })
```

- `whitelist` descarta propiedades no declaradas; `forbidNonWhitelisted` lanza 400 si las hay.
- `ParseUUIDPipe` en los params `:id`.
- DTOs con `class-validator`. **Caveat ya documentado** en [`contratos.md`](./contratos.md): conviven
  dos fuentes de verdad (DTO vs Zod), y los DTOs a veces eran más laxos que el contrato. Los casos de
  validación más permisiva de la cuenta se corrigieron (regex de PIN, UUID, cantidad).

## 5. Rate limiting

`RateLimitGuard` (`common/rate-limit.guard.ts`): contador deslizante en memoria por `userId+endpoint`,
default 5 req/60 s, lanza 429. **Solo actúa donde se anota con `@RateLimit()`**.

Anotados hoy: `POST /families/:familyId/receipts/extract` (OCR) y `POST /families/:familyId/menu/suggest`.

### 🟠 Hallazgo: `POST /ai/extract-items` sin rate limit

Es un endpoint que llama a un LLM externo (coste por petición) y **no tiene `@RateLimit()`**. Un
usuario autenticado puede martillearlo → coste y posible DoS del proveedor de IA. Los otros endpoints
de IA caros sí están limitados.

**Recomendación**: añadir `@RateLimit({ limit: …, ttl: … })` y validar el tamaño de `phrase` en su DTO.

## 6. Configuración

| Aspecto | Estado | Nota |
|---|---|---|
| Helmet | ✅ activo (`main.ts:14`) | cabeceras de seguridad por defecto |
| CORS | ⚠️ `origin: API_CORS_ORIGINS, credentials: true` | default `127.0.0.1:5173`. **Con `credentials:true`, `API_CORS_ORIGINS` NUNCA debe ser `*`** |
| Prefijo | ✅ `api/v1` global | |
| Tamaño de body | 🟡 no explícito | usa el default de Express (~100 kb). Las fotos van directas a Storage, así que no es crítico, pero conviene fijarlo |
| HTTPS | ℹ️ delegado al reverse proxy | esperado en producción |
| Swagger | ✅ en `/api/docs` con Bearer auth | (documentación incompleta: ver buenas-prácticas) |

## 7. Secretos

`env.config.ts` valida el entorno con **Zod y *fail-fast*** (si falta algo crítico, la API no
levanta). Nada hardcodeado; todo por `process.env`.

### 🟠 Hallazgo: `JOIN_PIN_PEPPER` con valor por defecto

```ts
JOIN_PIN_PEPPER: z.string().min(16).default('dev-only-join-pin-pepper-change-me')
```

El pepper de los PIN tiene un default para dev. Si llega a producción sin sobrescribir, el pepper es
**público y conocido**, debilitando los hashes de PIN ante una filtración de la tabla.

**Recomendación**: exigir que NO sea el default cuando `NODE_ENV === 'production'` (un `superRefine`
en el schema que falle si coinciden).

## 8. Hashing de PIN

PINs de invitación con **scrypt** (`ScryptHasher`): `N=2^14`, `keylen=32`, pepper determinista (permite
buscar por `code_hash`), comparación con **`timingSafeEqual`** (sin *timing attacks*). Generación con
`crypto.randomBytes` (CSPRNG). No hay contraseñas de usuario tradicionales (las gestiona Supabase).

**Veredicto**: correcto para PINs efímeros.

---

## Tabla de hallazgos

| # | Severidad | Hallazgo | Ubicación | Remediación |
|---|---|---|---|---|
| S1 | 🟠 Media | `/ai/extract-items` sin rate limit | `ai.controller.ts` | `@RateLimit()` + límite de tamaño en `phrase` |
| S2 | 🟠 Media | `JOIN_PIN_PEPPER` default puede llegar a prod | `env.config.ts:32` | fallar si es el default y `NODE_ENV=production` |
| S3 | 🟠 Media | Autorización en use case (no guard) en plans/social | `plans/`, `social/` | scope guard o test de autz por caso de uso |
| S4 | 🟡 Baja | CORS `credentials:true` | `main.ts:15` | garantizar que `API_CORS_ORIGINS` nunca sea `*` |
| S5 | 🟡 Baja | Tamaño de body sin límite explícito | `main.ts` | fijar `express.json({ limit })` |
| S6 | 🟡 Baja | Rate limit en memoria (no multi-instancia) | `rate-limit.guard.ts` | Redis si se escala horizontalmente (ADR-0008) |

## Para cerrar: verificación activa

Esta auditoría es **estática**. Para cerrarla con evidencia ejecutable falta lo que se propone en
[`tests-cobertura.md`](./tests-cobertura.md): **tests de IDOR** que, con el token de un usuario de la
familia A, intenten leer/escribir recursos de la familia B y comprueben que reciben 403/404. Es la
prueba definitiva de que los *scope guards* hacen su trabajo — y la red que protege a `plans`/`social`,
donde la autorización no es declarativa.
