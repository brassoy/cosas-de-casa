# Módulo: family (familias del hogar)

## Responsabilidad

Gestionar la creación y composición de los hogares (familias): crear una familia, invitar a
nuevos miembros mediante un código PIN de un solo uso, y gestionar la pertenencia (entrar y
salir). Es el contexto central del que dependen todos los demás contextos scoped a una familia.

## Agregados y entidades

| Clase | Tipo | Descripción |
|---|---|---|
| `Family` | Aggregate root | Hogar con nombre, descripción, imagen y lista de membresías |
| `Membership` | Entidad | Pertenencia de un usuario a una familia con su rol |
| `JoinPin` | Entidad | PIN de invitación de un solo uso (TTL 24 h, hash scrypt+pepper) |

**Roles**: `OWNER` y `MEMBER`. Siempre debe existir al menos un `OWNER`; el aggregate protege
esta invariante en `Family.removeMember` (lanza `LastOwnerError`).

**Máquina de estados del PIN**: `ACTIVE → CONSUMED` (al unirse con PIN) o `ACTIVE → REVOKED`
(al generar un PIN nuevo o revocar explícitamente). Máximo un PIN `ACTIVE` por familia
(índice único parcial en BD). La transición a `CONSUMED` es atómica en la BD mediante
`UPDATE ... WHERE status='ACTIVE' RETURNING`, lo que garantiza el single-use frente a
peticiones concurrentes.

## Endpoints principales

| Verbo | Ruta | Descripción |
|---|---|---|
| POST | `/families` | Crear una familia |
| GET | `/families` | Listar mis familias |
| POST | `/families/join` | Unirse con PIN de invitación |
| POST | `/families/:id/join-pins` | Generar PIN (solo OWNER) |
| DELETE | `/families/:id/join-pins/active` | Revocar PIN activo (solo OWNER) |
| GET | `/families/:id/members` | Listar miembros |
| DELETE | `/families/:id/members/me` | Salir de la familia |

## Casos de uso

### `CreateFamilyUseCase`
Crea una familia nueva y asigna al creador el rol `OWNER` de forma atómica (UnitOfWork).
- **Endpoint**: `POST /families` · **Autorización**: `JwtAuthGuard` (cualquier usuario autenticado).
- **Entrada**: `name` (string, 1–100 chars, obligatorio) · `description` (string, ≤500 chars, opcional) · `imageUrl` (URL válida, opcional).
- **Salida**: aggregate `Family` → `FamilySummaryDto` (id, name, description, imageUrl, role del creador = `OWNER`, updatedAt, createdAt).
- **Reglas/invariantes**: el creador queda automáticamente como único `OWNER`; nombre y membresía initial se persisten en la misma transacción.
- **Errores**: ningún error de dominio propio; fallos de validación devuelven 400 (class-validator).

### `ListMyFamiliesUseCase`
Devuelve todas las familias a las que pertenece el usuario autenticado.
- **Endpoint**: `GET /families` · **Autorización**: `JwtAuthGuard` (cualquier usuario autenticado).
- **Entrada**: sin body; el `actingUserId` sale del JWT.
- **Salida**: `Family[]` → `FamilySummaryDto[]` (un resumen por familia, con el rol del usuario en cada una).
- **Reglas/invariantes**: ninguna; consulta de solo lectura sin precondiciones de dominio.
- **Errores**: ninguno de dominio.

### `JoinFamilyByPinUseCase`
Canjea un PIN de invitación y añade al usuario como `MEMBER` de la familia correspondiente.
- **Endpoint**: `POST /families/join` · **Autorización**: `JwtAuthGuard` (cualquier usuario autenticado).
- **Entrada**: `code` (string, exactamente 8 caracteres Crockford Base32: `[0-9ABCDEFGHJKMNPQRSTVWXYZ]`, normalizado a mayúsculas).
- **Salida**: `{ familyId: string; joined: boolean }` — `joined: false` si el usuario ya era miembro (idempotente a nivel de membership).
- **Reglas/invariantes**: el consumo del PIN es atómico (`UPDATE … WHERE status='ACTIVE' AND NOT expired RETURNING`); si dos peticiones concurrentes usan el mismo código, solo una ve éxito. El PIN pasa a estado `CONSUMED` y no puede reutilizarse.
- **Errores**: `InvalidJoinPinError` → 422 (código inválido, caducado o ya consumido).

### `GenerateJoinPinUseCase`
Genera un nuevo PIN de invitación para una familia (solo `OWNER`). Revoca el PIN `ACTIVE` previo si lo hay y emite el nuevo en la misma transacción; el código en claro se devuelve una única vez.
- **Endpoint**: `POST /families/:id/join-pins` · **Autorización**: `JwtAuthGuard` + `FamilyScopeGuard` + `@Roles('OWNER')`.
- **Entrada**: `familyId` en la ruta (UUID).
- **Salida**: `GeneratePinResponse` — `{ code: string (8 chars), expiresAt: string (ISO 8601) }`. El hash scrypt+pepper se guarda en BD; el code en claro no se persiste.
- **Reglas/invariantes**: solo el `OWNER` puede generar PINs; como mucho existe un PIN `ACTIVE` por familia; la revocación del previo y la inserción del nuevo son atómicas. TTL por defecto: 24 horas.
- **Errores**: `FamilyNotFoundError` → 404 · `NotAnOwnerError` → 403.

### `RevokeActivePinUseCase`
Revoca el PIN activo de una familia sin emitir uno nuevo. Idempotente: si no hay PIN activo devuelve `revoked: 0` sin error.
- **Endpoint**: `DELETE /families/:id/join-pins/active` · **Autorización**: `JwtAuthGuard` + `FamilyScopeGuard` + `@Roles('OWNER')`.
- **Entrada**: `familyId` en la ruta (UUID).
- **Salida**: 204 No Content (el controller no devuelve body para este endpoint; internamente `{ revoked: number }`).
- **Reglas/invariantes**: solo el `OWNER` puede revocar PINs.
- **Errores**: `FamilyNotFoundError` → 404 · `NotAnOwnerError` → 403.

### `ListMembersUseCase`
Lista los miembros de una familia enriquecidos con `displayName` y `email` desde `app_users` (read model).
- **Endpoint**: `GET /families/:id/members` · **Autorización**: `JwtAuthGuard` + `FamilyScopeGuard` (cualquier miembro).
- **Entrada**: `familyId` en la ruta (UUID).
- **Salida**: `MemberView[]` → `MemberDto[]` (userId, displayName, role, joinedAt). Si un usuario no tiene `displayName`, el presenter devuelve `'Sin nombre'`.
- **Reglas/invariantes**: el solicitante debe ser miembro; la autorización se comprueba tanto en el aggregate (`family.isMember`) como en el `FamilyScopeGuard`.
- **Errores**: `FamilyNotFoundError` → 404 · `NotAMemberError` → 403.

### `LeaveFamilyUseCase`
Saca al usuario autenticado de una familia. Protege la invariante del último OWNER.
- **Endpoint**: `DELETE /families/:id/members/me` · **Autorización**: `JwtAuthGuard` + `FamilyScopeGuard` (cualquier miembro).
- **Entrada**: `familyId` en la ruta (UUID).
- **Salida**: 204 No Content.
- **Reglas/invariantes**: si el usuario es el único `OWNER` de la familia, no puede salir (`LastOwnerError`). La membership se borra en transacción.
- **Errores**: `FamilyNotFoundError` → 404 · `NotAMemberError` → 403 · `LastOwnerError` → 409.

## Puertos y adaptadores

| Puerto | Implementación | Rol |
|---|---|---|
| `FamilyRepository` | `DrizzleFamilyRepository` | Persistencia del aggregate `Family` con sus membresías |
| `JoinPinRepository` | `DrizzleJoinPinRepository` | Persistencia y consumo atómico de PINs |
| `MembershipRepository` | `DrizzleMembershipRepository` | Insert/delete de membresías |
| `MembersReadModel` (aplicación) | `DrizzleMembersReadModel` | Miembros enriquecidos con `displayName`/`email` de `app_users` |
| `UnitOfWork` (aplicación) | `DrizzleUnitOfWork` | Transaccionalidad (crear familia + membership, generate/revoke PIN, join) |
| `Clock` | `SystemClock` | Inyección de tiempo (testeable) |
| `IdGenerator` | `UuidIdGenerator` | Generación de UUIDs |
| `Hasher` | `ScryptHasher` | Hash scrypt + pepper para los PINs (determinista, un solo paso de sal fija) |
| `RandomBytes` | `CryptoRandomBytes` | 16 bytes de entropía para generar el código del PIN |

**Guard**: `FamilyScopeGuard` verifica membresía (y opcionalmente rol `OWNER`) antes de cualquier
operación sobre `/:id`. Se ejecuta siempre después de `JwtAuthGuard`.

**Error filter**: `DomainErrorFilter` captura todos los `FamilyDomainError` y los mapea a HTTP.

## Decisiones locales

- El hash del PIN es determinista (scrypt con pepper-as-salt fija) para poder localizar el registro
  por hash en el consumo atómico, sin salt aleatoria por fila. Ver ADR-0005.
- Un solo PIN `ACTIVE` por familia: el índice único parcial en BD es la segunda línea de defensa;
  el caso de uso revoca el anterior en la misma transacción.
- El código en claro (8 chars Crockford Base32) solo se devuelve una vez; en BD solo persiste el hash.
- `ListMembersUseCase` hace la comprobación de autorización en el aggregate (`family.isMember`) además
  del guard, siguiendo el principio de que el dominio es siempre la fuente de verdad.
