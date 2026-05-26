# Módulo: stats (estadísticas y gamificación)

## Responsabilidad

Proporcionar un dashboard de actividad y puntuación por miembro de familia. No escribe datos;
es un módulo de solo lectura que agrega sobre las tablas de otros contextos.

## Estructura

No hay capa de dominio propia ni repositorio. El módulo consiste en:

- `FamilyStatsQuery` — servicio de aplicación con SQL de agregación directa.
- `StatsController` — expone los endpoints.
- `StatsModule` — registro NestJS.

## Endpoints principales

| Verbo | Ruta | Descripción |
|---|---|---|
| GET | `/families/:familyId/stats` | Dashboard completo de la familia |
| GET | `/families/:familyId/stats/leaderboard` | Ranking de miembros por puntos |

## Lógica de puntuación

| Acción | Puntos |
|---|---|
| Ítem añadido a lista de la compra | +1 |
| Tarea completada (creada o asignada) | +5 |
| Ítem de nevera añadido | +1 |

## Logros (badges)

| ID | Requisito |
|---|---|
| `first_item` | ≥1 ítem en lista |
| `shopper_10` | ≥10 ítems en lista |
| `first_task` | ≥1 tarea completada |
| `task_master` | ≥5 tareas completadas |
| `fridge_keeper` | ≥5 ítems de nevera añadidos |
| `points_50` | ≥50 puntos |

La función `computeBadges` es pura y se testea de forma unitaria sin base de datos.

## Casos de uso (consultas de lectura)

### `FamilyStatsQuery.getStats`
Devuelve el dashboard completo de actividad de la familia: totales globales y estadísticas por miembro con puntos y logros.
- **Endpoint**: `GET /families/:familyId/stats` · **Autorización**: `JwtAuthGuard` + `FamilyScopeGuard` (miembro de la familia).
- **Entrada**: `familyId` UUID v4 (path param).
- **Salida**: `StatsDto` — familyId, totalShoppingItemsAdded, totalTasksCompleted, totalFridgeItemsAdded, members[]: cada `MemberStatsDto` incluye userId, displayName, email, shoppingItemsAdded, tasksCompleted, fridgeItemsAdded, points, currentStreak (fijo en 0 en esta versión), badges[].
- **Reglas/invariantes**: agregación SQL directa sobre `shopping_items`, `tasks`/`task_assignees` y `fridge_items`. Las tareas se cuentan una vez por usuario aunque el usuario sea a la vez creador y asignado (`COUNT(DISTINCT task_id)` con `UNION ALL`). Los logros se calculan en memoria con la función pura `computeBadges`.
- **Errores**: ninguno de dominio propio.

---

### `FamilyStatsQuery.getMemberStats` (usado vía `getLeaderboard`)
Devuelve el ranking de miembros de la familia ordenado por puntos descendentes.
- **Endpoint**: `GET /families/:familyId/leaderboard` · **Autorización**: `JwtAuthGuard` + `FamilyScopeGuard` (miembro de la familia).
- **Entrada**: `familyId` UUID v4 (path param).
- **Salida**: `LeaderboardEntryDto[]` — ordenado por `points` desc; cada entrada incluye rank, userId, displayName, email, points, badges[].
- **Reglas/invariantes**: el ordenamiento y la asignación de `rank` se hacen en memoria sobre el resultado de `getMemberStats`.
- **Errores**: ninguno de dominio propio.

---

## Decisiones locales

- Read model CQRS por agregación SQL: sin tabla de proyección. Ver ADR-0011.
- `currentStreak` está fijado a 0 en esta versión (pospuesto).
- Las queries sobre `tasks` usan `UNION ALL` para contar tanto las tareas creadas como las
  asignadas al usuario sin duplicar.
- `FamilyStatsQuery` accede directamente a tablas de otros contextos; es una excepción
  documentada al principio de no-acceso directo entre contextos.
