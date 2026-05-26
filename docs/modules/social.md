# Módulo: social (familias amigas)

## Responsabilidad

Gestionar vínculos de amistad entre familias para poder compartir planes. Una familia amiga
es una relación bidireccional entre dos hogares, no un grupo con nombre propio. Ver
distinción con `groups` en ADR-0012.

## Entidades

| Clase | Tipo | Descripción |
|---|---|---|
| `FriendLink` | Entidad | Vínculo bidireccional entre dos familias |
| `FriendInvitePin` | Entidad | PIN de invitación de un solo uso (reutiliza el patrón JoinPin) |

**Normalización del par**: `FriendLink` siempre almacena el par con `familyAId < familyBId`
(orden lexicográfico UUID) para garantizar unicidad con una sola restricción
`UNIQUE(familyA, familyB)`. La función `FriendLink.normalizedPair(fa, fb)` devuelve el par
ordenado.

## Endpoints principales

| Verbo | Ruta | Descripción |
|---|---|---|
| POST | `/families/:familyId/friend-invites` | Generar PIN de invitación de amistad |
| POST | `/friends/redeem` | Canjear PIN y crear vínculo |
| GET | `/families/:familyId/friends` | Listar familias amigas |
| DELETE | `/friends/:linkId` | Eliminar vínculo |

## Casos de uso

### `GenerateFriendInviteUseCase`
Genera un PIN de invitación de amistad para una familia (solo `OWNER`). Revoca el PIN activo previo y emite uno nuevo; el código en claro se devuelve una única vez.
- **Endpoint**: `POST /families/:familyId/friend-invites` · **Autorización**: `JwtAuthGuard` (el caso de uso comprueba internamente que el usuario es `OWNER` de la familia indicada).
- **Entrada**: `familyId` en la ruta (UUID).
- **Salida**: `FriendInviteResponse` — `{ code: string (8 chars Crockford Base32), expiresAt: string (ISO 8601) }`.
- **Reglas/invariantes**: solo el `OWNER` puede generar invitaciones; la revocación del PIN previo y la inserción del nuevo no son atómicas en esta implementación (se hacen en dos operaciones separadas sobre `FriendInvitePinRepository`, a diferencia de los contextos `family` y `groups` que usan UoW).
- **Errores**: `NotFamilyMemberError` → 403 · `NotFamilyOwnerError` → 403.

### `RedeemFriendInviteUseCase`
Canjea un PIN de invitación de amistad y crea el vínculo bidireccional entre la familia emisora y la familia del usuario que canjea. Idempotente: si las familias ya son amigas, devuelve el vínculo existente.
- **Endpoint**: `POST /friends/redeem` · **Autorización**: `JwtAuthGuard` (cualquier miembro de la familia indicada en `familyId`).
- **Entrada**: `code` (string, 8 chars Crockford Base32) · `familyId` (UUID de la familia que acepta la amistad).
- **Salida**: `FriendFamilyDto` (linkId, familyId de la familia amiga, familyName, familyImageUrl?, since).
- **Reglas/invariantes**: el usuario debe pertenecer a la familia indicada en `familyId`; no se permite auto-amistad (`SelfFriendshipError`); el consumo del PIN es atómico (UoW); si las familias ya son amigas, se devuelve el vínculo existente (`created: false`). El `FriendLink` se almacena con el par normalizado `(familyAId < familyBId)` para garantizar unicidad.
- **Errores**: `NotFamilyMemberError` → 403 · `InvalidFriendInvitePinError` → 422 · `SelfFriendshipError` → 422 · `AlreadyFriendsError` → 409.

### `ListFriendFamiliesUseCase`
Lista las familias amigas de una familia, enriquecidas con nombre e imagen (read model).
- **Endpoint**: `GET /families/:familyId/friends` · **Autorización**: `JwtAuthGuard` (cualquier miembro de la familia).
- **Entrada**: `familyId` en la ruta (UUID).
- **Salida**: `FriendFamilyView[]` → `FriendFamilyDto[]` (linkId, familyId, familyName, familyImageUrl?, since).
- **Reglas/invariantes**: el solicitante debe ser miembro de la familia; el read model une `friend_links` con `families` para obtener nombre e imagen de la familia amiga.
- **Errores**: `NotFamilyMemberError` → 403.

### `RemoveFriendFamilyUseCase`
Elimina un vínculo de amistad entre dos familias. Puede hacerlo cualquier miembro de cualquiera de las dos familias implicadas.
- **Endpoint**: `DELETE /friends/:linkId` · **Autorización**: `JwtAuthGuard` (cualquier miembro de alguna de las dos familias del vínculo).
- **Entrada**: `linkId` en la ruta (UUID del vínculo).
- **Salida**: 204 No Content.
- **Reglas/invariantes**: el vínculo debe existir; el usuario debe ser miembro de al menos una de las dos familias vinculadas (se comprueban las dos familias en paralelo).
- **Errores**: `FriendLinkNotFoundError` → 404 · `NotFamilyMemberError` → 403.

## Puertos y adaptadores

| Puerto | Implementación | Rol |
|---|---|---|
| `FriendInvitePinRepository` | `DrizzleFriendInvitePinRepository` | Persistencia de PINs |
| `FriendLinkRepository` | `DrizzleFriendLinkRepository` | Persistencia de vínculos |
| `SocialReadModel` (aplicación) | `DrizzleSocialReadModel` | Familias amigas enriquecidas |
| `UnitOfWork` (aplicación) | `DrizzleSocialUnitOfWork` | Atomicidad al canjear PIN |

## Decisiones locales

- El PIN de amistad reutiliza el patrón JoinPin (ADR-0005 y ADR-0012): estado
  `ACTIVE → CONSUMED/REVOKED`, TTL de 24 h, transición atómica.
- Al canjear el PIN, el `UnitOfWork` garantiza que el consume del PIN y la creación del
  `FriendLink` son atómicos.
- `SocialReadModel` devuelve las familias amigas con nombre e imagen; no pasa por el
  repositorio de `Family` del contexto `family`.
