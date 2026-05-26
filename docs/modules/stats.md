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

## Decisiones locales

- Read model CQRS por agregación SQL: sin tabla de proyección. Ver ADR-0011.
- `currentStreak` está fijado a 0 en esta versión (pospuesto).
- Las queries sobre `tasks` usan `UNION ALL` para contar tanto las tareas creadas como las
  asignadas al usuario sin duplicar.
- `FamilyStatsQuery` accede directamente a tablas de otros contextos; es una excepción
  documentada al principio de no-acceso directo entre contextos.
