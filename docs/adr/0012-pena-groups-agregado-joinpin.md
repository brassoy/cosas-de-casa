# ADR-0012: Peña (groups) como agregado distinto de family, reutilizando el patrón JoinPin

**Fecha:** 2026-05-26
**Estado:** Aceptado

## Contexto y problema

El modelo de familia (contexto `family`) agrupa a las personas que comparten hogar. Sin
embargo, los usuarios quieren coordinarse también con grupos de amigos que no comparten
domicilio: la cuadrilla de amigos para organizar salidas, el grupo de padres del colegio, etc.

La pregunta de diseño es: ¿es una "peña" simplemente una familia de segundo tipo, o un
agregado propio con semántica diferente?

## Opciones consideradas

1. **Reutilizar el agregado `Family`** con un tipo distinto (`type: 'group'`) — menos código,
   pero la familia tiene semántica de hogar (compartir nevera, lista de la compra, presupuesto)
   que no aplica a grupos de amigos.
2. **Nuevo agregado `Group`** en el contexto `groups`, con su propio dominio, roles y PIN de
   invitación — más código, pero semántica limpia y sin cargo cognitivo sobre qué operaciones
   aplican a cada tipo.

## Decisión

Se creó el contexto `groups` con el agregado `Group`. Los roles son `OWNER` y `MEMBER` (enum
`GroupRole`). El mecanismo de invitación reutiliza el mismo **patrón JoinPin** que `family`
(ADR-0005): un código de un solo uso con TTL de 24 horas, estado `ACTIVE → CONSUMED/REVOKED`,
y transición atómica en la base de datos (`UPDATE ... WHERE status='ACTIVE' RETURNING`).

**Cuándo usar peña vs familias amigas (contexto `social`):**

- `groups` → grupo de personas que comparten una identidad de grupo (cuadrilla, club, equipo).
  Tienen nombre, descripción e imagen de grupo. Los planes (`plans`) se pueden compartir con
  grupos.
- `social` (familias amigas) → vínculo bidireccional entre dos familias para compartir planes.
  No tiene nombre de grupo; es una relación entre hogares.

## Consecuencias

**A favor**

- El dominio de `Group` no arrastra las invariantes de `Family` (no hay comprobación de
  miembro de hogar, no hay lista de la compra, etc.).
- El patrón JoinPin es reutilizable sin duplicar código de dominio: `GroupJoinPin` y
  `FamilyJoinPin` son entidades separadas pero con la misma máquina de estados.
- La invariante del último propietario (`LastGroupOwnerError`) protege que no quede un grupo
  sin owner si el único owner abandona.
- Roles explícitos permiten en el futuro añadir `ADMIN` sin romper la semántica de `OWNER`.

**En contra / trade-offs**

- Dos contextos separados (family + groups) que implementan patrones similares (membership,
  join pin): hay algo de código paralelo. Se acepta porque la semántica es distinta.
- Un usuario puede pertenecer a múltiples peñas y a una sola familia; la lógica de
  autorización es diferente en cada caso.

## Notas de implementación

- `Group.removeMember` devuelve la `GroupMembership` eliminada para que el repositorio
  ejecute el `DELETE` por id sin necesidad de re-buscar.
- Se usa `UnitOfWork` (patrón transaccional) en `JoinGroupByPinUseCase` para que el
  `CONSUME` del PIN y la inserción del membership sean atómicos.
- El read model `DrizzleGroupMembersReadModel` enriquece la lista de miembros con
  `displayName` y `email` desde `app_users` sin pasar por el repositorio de usuarios.
