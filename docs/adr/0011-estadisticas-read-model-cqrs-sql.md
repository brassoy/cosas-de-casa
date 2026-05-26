# ADR-0011: Estadísticas y gamificación como read model CQRS por agregación SQL

**Fecha:** 2026-05-26
**Estado:** Aceptado

## Contexto y problema

Queremos mostrar un dashboard de puntos, rachas y logros (badges) por miembro de familia.
Los datos que alimentan ese dashboard ya existen en las tablas de los otros contextos
(shopping_items, tasks, task_assignees, fridge_items). La pregunta es cómo materiializarlos.

## Opciones consideradas

1. **Tabla de proyección dedicada** — un servicio escucha eventos de dominio y mantiene
   contadores pre-calculados en una tabla `member_stats`. Las lecturas son O(1).
2. **Read model por agregación SQL** — cada petición al endpoint de stats lanza consultas
   SQL agregadas sobre las tablas existentes. Sin tabla adicional.
3. **Cálculo en el frontend** — el frontend descarga todos los ítems y calcula los contadores
   localmente.

## Decisión

Se eligió la opción 2. El `FamilyStatsQuery` (en `stats/application/`) es un servicio de solo
lectura que inyecta el conector Drizzle y ejecuta SQL puro (`db.execute(sql\`...\``) y queries
Drizzle tipadas). No hay tabla de proyección, no hay eventos de dominio, no hay estado
compartido entre contextos a través de puertos.

La lógica de puntos (regla: +1 por ítem de lista, +5 por tarea completada, +1 por ítem de
nevera) y los logros (badges) están implementados como funciones puras exportadas
(`computeBadges`) que los tests unitarios verifican sin base de datos.

## Consecuencias

**A favor**

- Sin infraestructura adicional: no hace falta bus de eventos ni proceso de proyección.
- Los contadores siempre son exactos (no hay lag de proyección).
- Fácil de cambiar las reglas de puntuación: se edita una función pura y se re-ejecuta la
  query; no hay proyecciones desincronizadas que reconstruir.
- Los tests de `computeBadges` son unitarios puros, sin I/O.

**En contra / trade-offs**

- Si el número de familias/miembros crece significativamente, estas queries pueden volverse
  lentas. La solución obvia es añadir la tabla de proyección en el futuro.
- El read model viola el principio de que los contextos no se acceden directamente entre sí:
  `stats` lee directamente de las tablas de `shopping`, `tasks` y `fridge`. Se acepta como
  una excepción documentada al patrón hexagonal estricto, válida para aggregados de lectura
  donde la alternativa (eventos + proyección) tiene un coste desproporcionado en el MVP.
- `currentStreak` está fijado a 0 en esta versión; calcular días consecutivos requeriría una
  query de ventana temporal más costosa que se pospone.

## Notas de implementación

- El contexto `stats` no tiene capa de dominio propia ni repositorio: es solo
  `application/family-stats.query.ts` + `interface/stats.controller.ts` + módulo.
- Las queries usan SQL raw para los casos con subqueries complejas (tareas completadas por
  asignados) y Drizzle tipado para las consultas simples (fridge_items por creador).
- Para el leaderboard, el controller ordena el array de `MemberStatsDto` por `points` desc
  antes de responder; no hay query adicional.
