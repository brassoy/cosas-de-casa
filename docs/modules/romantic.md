# Módulo: romantic (rincón de pareja)

## Responsabilidad

Espacio privado dentro de una familia para la pareja: notas compartidas, retos de actividades
y el botón de "maldad" (notificación push divertida al partner).

## Agregados y entidades

| Clase | Tipo | Descripción |
|---|---|---|
| `Couple` | Aggregate root | Par de usuarios en el contexto de una familia |
| `CoupleNote` | Entidad | Nota escrita por uno de los miembros de la pareja |
| `CoupleChallenge` | Entidad | Estado de un reto del catálogo para esta pareja |

**Invariante de `Couple`**: los dos miembros deben ser distintos (`CannotCoupleWithSelfError`).
El par `(familyId, userA, userB)` es único (también reforzado por la BD).

**Privacidad**: el `CoupleScopeGuard` verifica `couple.isMember(userId)` antes de cualquier
operación sobre `/:coupleId`. Solo los dos miembros acceden a sus notas y retos.

## Endpoints principales

| Verbo | Ruta | Descripción |
|---|---|---|
| POST | `/families/:familyId/couple` | Crear pareja en la familia |
| GET | `/families/:familyId/couple` | Obtener la pareja del usuario autenticado |
| POST | `/couples/:coupleId/notes` | Añadir nota de pareja |
| GET | `/couples/:coupleId/notes` | Listar notas |
| POST | `/couples/:coupleId/challenges` | Añadir reto del catálogo |
| GET | `/couples/:coupleId/challenges` | Listar retos |
| POST | `/couples/:coupleId/challenges/done` | Marcar reto como completado |
| POST | `/couples/:coupleId/mischief` | Enviar notificación push divertida al partner |

## Casos de uso

### `CreateCoupleUseCase`
Crea una pareja entre dos miembros de la misma familia y la persiste.
- **Endpoint**: `POST /families/:familyId/couple` · **Autorización**: `JwtAuthGuard` + `FamilyScopeGuard` (el solicitante debe ser miembro de la familia).
- **Entrada**: `partnerUserId` UUID v4 (requerido) — el otro miembro de la pareja.
- **Salida**: `Couple` → `CoupleDto` (id, familyId, userA, userB, createdAt ISO).
- **Reglas/invariantes**: ambos usuarios deben ser miembros de la familia; ninguno puede ya pertenecer a una pareja en esa familia; los dos miembros deben ser distintos entre sí. `userA` es quien realiza la petición; `userB` es el partner.
- **Errores**: `NotFamilyMemberError` → 403 · `AlreadyInCoupleError` → 409 · `PartnerAlreadyInCoupleError` → 409 · `CannotCoupleWithSelfError` → 422.

---

### `GetMyCoupleUseCase`
Obtiene la pareja del usuario autenticado dentro de una familia.
- **Endpoint**: `GET /families/:familyId/couple` · **Autorización**: `JwtAuthGuard` + `FamilyScopeGuard` (miembro de la familia).
- **Entrada**: `familyId` UUID v4 (path param); `userId` extraído del token JWT.
- **Salida**: `Couple` → `CoupleDto`.
- **Reglas/invariantes**: devuelve la pareja en la que el usuario es `userA` o `userB` dentro de esa familia.
- **Errores**: `CoupleNotFoundError` → 404.

---

### `CreateCoupleNoteUseCase`
Añade una nota escrita al espacio de notas de la pareja.
- **Endpoint**: `POST /couples/:coupleId/notes` · **Autorización**: `JwtAuthGuard` + `CoupleScopeGuard` (solo los dos miembros de la pareja, no el resto de la familia).
- **Entrada**: `body` string 1–2000 (requerido).
- **Salida**: `CoupleNote` → `CoupleNoteDto` (id, coupleId, authorId, body, createdAt ISO).
- **Reglas/invariantes**: el cuerpo de la nota no puede quedar vacío ni superar 2000 caracteres.
- **Errores**: `CoupleNoteBodyEmptyError` → 422.

---

### `ListCoupleNotesUseCase`
Devuelve las notas de la pareja en orden cronológico.
- **Endpoint**: `GET /couples/:coupleId/notes` · **Autorización**: `JwtAuthGuard` + `CoupleScopeGuard` (solo los dos miembros de la pareja).
- **Entrada**: `coupleId` UUID v4 (path param).
- **Salida**: `CoupleNote[]` → `CoupleNoteDto[]`.
- **Reglas/invariantes**: ninguna adicional; solo los miembros de la pareja pueden ver las notas (no el resto de la familia).
- **Errores**: ninguno de dominio propio.

---

### `AddChallengeUseCase`
Añade un reto del catálogo estático a la lista de la pareja.
- **Endpoint**: `POST /couples/:coupleId/challenges` · **Autorización**: `JwtAuthGuard` + `CoupleScopeGuard` (solo los dos miembros de la pareja).
- **Entrada**: `challengeKey` string no vacío — clave del catálogo en `challenge-catalog.ts`.
- **Salida**: `CoupleChallenge` → `CoupleChallengeDto` (id, coupleId, challengeKey, description expandida del catálogo, done, doneAt).
- **Reglas/invariantes**: la clave debe existir en `CHALLENGE_CATALOG_MAP`; cada pareja solo puede tener una vez el mismo reto.
- **Errores**: `ChallengeNotFoundError` → 404 · `ChallengeAlreadyExistsError` → 409.

---

### `ListChallengesUseCase`
Devuelve los retos activos e históricos de la pareja.
- **Endpoint**: `GET /couples/:coupleId/challenges` · **Autorización**: `JwtAuthGuard` + `CoupleScopeGuard` (solo los dos miembros de la pareja).
- **Entrada**: `coupleId` UUID v4 (path param).
- **Salida**: `CoupleChallenge[]` → `CoupleChallengeDto[]`.
- **Reglas/invariantes**: ninguna adicional.
- **Errores**: ninguno de dominio propio.

---

### `MarkChallengeDoneUseCase`
Marca un reto de la pareja como completado.
- **Endpoint**: `POST /couples/:coupleId/challenges/done` · **Autorización**: `JwtAuthGuard` + `CoupleScopeGuard` (solo los dos miembros de la pareja).
- **Entrada**: `challengeKey` string no vacío — debe coincidir con un reto ya añadido por la pareja.
- **Salida**: `CoupleChallenge` → `CoupleChallengeDto` (con `done: true` y `doneAt` ISO).
- **Reglas/invariantes**: el reto debe existir en la lista de la pareja (no solo en el catálogo).
- **Errores**: `ChallengeNotFoundError` → 404.

---

### `DoMischiefUseCase`
Envía una notificación push divertida al partner de la pareja («hacer maldad»).
- **Endpoint**: `POST /couples/:coupleId/mischief` · **Autorización**: `JwtAuthGuard` + `CoupleScopeGuard` (solo los dos miembros de la pareja).
- **Entrada**: `coupleId` UUID v4 (path param); `senderId` extraído del token JWT.
- **Salida**: `void` (HTTP 204).
- **Reglas/invariantes**: solo recibe la notificación el partner (no el remitente). Si el partner no tiene suscripciones push registradas, la operación no hace nada y no devuelve error. La frase se elige aleatoriamente de `mischief-phrases.ts`. Reutiliza `NotificationSenderPort` del contexto `notifications`.
- **Errores**: `CoupleNotFoundError` → 404.

---

## Puertos y adaptadores

| Puerto | Implementación | Rol |
|---|---|---|
| `CoupleRepository` | `DrizzleCoupleRepository` | Persistencia de parejas |
| `CoupleNoteRepository` | `DrizzleCoupleNoteRepository` | Persistencia de notas |
| `CoupleChallengeRepository` | `DrizzleCoupleChallengeRepository` | Persistencia de retos |
| `Clock` | `SystemClock` | Inyección de tiempo |
| `IdGenerator` | `UuidIdGenerator` | Generación de UUIDs |

## Decisiones locales

- El catálogo de retos (`challenge-catalog.ts`) es un array estático en el dominio, no una
  tabla de base de datos. Para el MVP es suficiente; se puede migrar a tabla configurable
  en el futuro.
- `DoMischiefUseCase` usa el `NotificationSenderPort` del contexto `notifications` para
  enviar la notificación push; la frase se elige aleatoriamente de `mischief-phrases.ts`.
- La pareja almacena `userA` (creador) y `userB` (partner), pero la privacidad se basa en
  pertenecer al par independientemente del rol.
