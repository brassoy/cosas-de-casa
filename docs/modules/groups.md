# Módulo: groups (peñas)

## Responsabilidad

Gestionar grupos de personas que no comparten hogar: cuadrillas de amigos, equipos, clubs.
Los planes de actividad se pueden compartir con peñas. Ver distinción peña vs familias amigas
en ADR-0012.

## Agregados y entidades

| Clase | Tipo | Descripción |
|---|---|---|
| `Group` | Aggregate root | Peña con nombre, descripción, imagen y membresías |
| `GroupMembership` | Entidad | Pertenencia de un usuario a una peña con su rol |
| `GroupJoinPin` | Entidad | PIN de invitación de un solo uso (TTL 24 h) |

**Roles**: `OWNER` y `MEMBER`. Siempre debe existir al menos un `OWNER`
(`LastGroupOwnerError` si el único owner intenta salir).

**Máquina de estados del PIN**: `ACTIVE → CONSUMED` (al unirse) o `ACTIVE → REVOKED`
(al generar uno nuevo). La transición a `CONSUMED` es atómica en la BD
(`UPDATE ... WHERE status='ACTIVE' RETURNING`).

## Endpoints principales

| Verbo | Ruta | Descripción |
|---|---|---|
| POST | `/groups` | Crear peña |
| GET | `/groups` | Listar mis peñas |
| GET | `/groups/:groupId/members` | Listar miembros |
| POST | `/groups/:groupId/join-pin` | Generar PIN de invitación |
| DELETE | `/groups/:groupId/join-pin` | Revocar PIN activo |
| POST | `/groups/join` | Unirse con PIN |
| DELETE | `/groups/:groupId/members/me` | Abandonar peña |

## Casos de uso

### `CreateGroupUseCase`
Crea una peña nueva y asigna al creador el rol `OWNER` de forma atómica (UnitOfWork).
- **Endpoint**: `POST /groups` · **Autorización**: `JwtAuthGuard` (cualquier usuario autenticado).
- **Entrada**: `name` (string, 1–100 chars, obligatorio) · `description` (string, ≤500 chars, opcional) · `imageUrl` (URL válida, opcional).
- **Salida**: aggregate `Group` → `GroupSummaryDto` (id, name, description, imageUrl, role del creador = `OWNER`, updatedAt, createdAt).
- **Reglas/invariantes**: el creador queda automáticamente como único `OWNER`; peña y membership inicial se persisten en la misma transacción.
- **Errores**: ningún error de dominio propio; fallos de validación devuelven 400 (class-validator).

### `ListMyGroupsUseCase`
Devuelve todas las peñas a las que pertenece el usuario autenticado.
- **Endpoint**: `GET /groups` · **Autorización**: `JwtAuthGuard` (cualquier usuario autenticado).
- **Entrada**: sin body; el `actingUserId` sale del JWT.
- **Salida**: `Group[]` → `GroupSummaryDto[]` (un resumen por peña, con el rol del usuario en cada una).
- **Reglas/invariantes**: ninguna; consulta de solo lectura sin precondiciones de dominio.
- **Errores**: ninguno de dominio.

### `JoinGroupByPinUseCase`
Canjea un PIN de invitación y añade al usuario como `MEMBER` de la peña correspondiente.
- **Endpoint**: `POST /groups/join` · **Autorización**: `JwtAuthGuard` (cualquier usuario autenticado).
- **Entrada**: `code` (string, exactamente 8 caracteres Crockford Base32: `[0-9ABCDEFGHJKMNPQRSTVWXYZ]`, normalizado a mayúsculas).
- **Salida**: `{ groupId: string; joined: boolean }` — `joined: false` si el usuario ya era miembro (idempotente a nivel de membership, `INSERT … ON CONFLICT DO NOTHING`).
- **Reglas/invariantes**: el consumo del PIN es atómico (`UPDATE … WHERE status='ACTIVE' RETURNING`); dos peticiones concurrentes con el mismo código solo tienen éxito una vez.
- **Errores**: `InvalidGroupJoinPinError` → 422 (código inválido, caducado o ya consumido).

### `GenerateGroupJoinPinUseCase`
Genera un nuevo PIN de invitación para una peña (solo `OWNER`). Revoca el PIN `ACTIVE` previo si lo hay y emite el nuevo en la misma transacción; el código en claro se devuelve una única vez.
- **Endpoint**: `POST /groups/:id/join-pins` · **Autorización**: `JwtAuthGuard` + `GroupScopeGuard` + `@GroupRoles('OWNER')`.
- **Entrada**: `groupId` en la ruta (UUID, parámetro `:id`).
- **Salida**: `GenerateGroupPinResponse` — `{ code: string (8 chars), expiresAt: string (ISO 8601) }`.
- **Reglas/invariantes**: solo el `OWNER` puede generar PINs; máximo un PIN `ACTIVE` por peña; la revocación del previo y la inserción del nuevo son atómicas. TTL por defecto: 24 horas.
- **Errores**: `GroupNotFoundError` → 404 · `NotAGroupOwnerError` → 403.

### `RevokeActiveGroupPinUseCase`
Revoca el PIN activo de una peña sin emitir uno nuevo. Idempotente: si no hay PIN activo devuelve `revoked: 0` sin error.
- **Endpoint**: `DELETE /groups/:id/join-pins/active` · **Autorización**: `JwtAuthGuard` + `GroupScopeGuard` + `@GroupRoles('OWNER')`.
- **Entrada**: `groupId` en la ruta (UUID, parámetro `:id`).
- **Salida**: 204 No Content.
- **Reglas/invariantes**: solo el `OWNER` puede revocar PINs.
- **Errores**: `GroupNotFoundError` → 404 · `NotAGroupOwnerError` → 403.

### `ListGroupMembersUseCase`
Lista los miembros de una peña enriquecidos con `displayName` desde `app_users` (read model).
- **Endpoint**: `GET /groups/:id/members` · **Autorización**: `JwtAuthGuard` + `GroupScopeGuard` (cualquier miembro).
- **Entrada**: `groupId` en la ruta (UUID, parámetro `:id`).
- **Salida**: `GroupMemberView[]` → `GroupMemberDto[]` (userId, displayName, role, joinedAt). Si un usuario no tiene `displayName`, el presenter devuelve `'Sin nombre'`.
- **Reglas/invariantes**: el solicitante debe ser miembro; se comprueba tanto en el aggregate (`group.isMember`) como en `GroupScopeGuard`.
- **Errores**: `GroupNotFoundError` → 404 · `NotAGroupMemberError` → 403.

### `LeaveGroupUseCase`
Saca al usuario autenticado de una peña. Protege la invariante del último OWNER.
- **Endpoint**: `DELETE /groups/:id/members/me` · **Autorización**: `JwtAuthGuard` + `GroupScopeGuard` (cualquier miembro).
- **Entrada**: `groupId` en la ruta (UUID, parámetro `:id`).
- **Salida**: 204 No Content.
- **Reglas/invariantes**: si el usuario es el único `OWNER` de la peña, no puede salir (`LastGroupOwnerError`). La membership se borra en transacción.
- **Errores**: `GroupNotFoundError` → 404 · `NotAGroupMemberError` → 403 · `LastGroupOwnerError` → 409.

## Puertos y adaptadores

| Puerto | Implementación | Rol |
|---|---|---|
| `GroupRepository` | `DrizzleGroupRepository` | Persistencia de peñas |
| `GroupMembershipRepository` | `DrizzleGroupMembershipRepository` | Persistencia de membresías |
| `GroupJoinPinRepository` | `DrizzleGroupJoinPinRepository` | Persistencia de PINs |
| `GroupMembersReadModel` (aplicación) | `DrizzleGroupMembersReadModel` | Miembros enriquecidos con datos de usuario |
| `UnitOfWork` (aplicación) | `DrizzleGroupUnitOfWork` | Transaccionalidad en join-by-pin |

## Decisiones locales

- El `UnitOfWork` garantiza que el consume del PIN y la inserción del membership sean
  atómicos (si falla la inserción, el PIN no se consume). Ver ADR-0012.
- Los miembros se enriquecen con `displayName`/`email` a través del read model, no del
  repositorio de `Group`.
- `GroupScopeGuard` verifica membresía antes de cualquier operación que requiera pertenecer
  a la peña.
