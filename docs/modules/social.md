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
| POST | `/families/:familyId/friend-invite` | Generar PIN de invitación de amistad |
| POST | `/families/:familyId/friend-invite/redeem` | Canjear PIN y crear vínculo |
| GET | `/families/:familyId/friends` | Listar familias amigas |
| DELETE | `/families/:familyId/friends/:otherFamilyId` | Eliminar vínculo |

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
