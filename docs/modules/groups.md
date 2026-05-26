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
