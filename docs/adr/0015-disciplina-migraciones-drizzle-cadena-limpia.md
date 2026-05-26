# ADR-0015: Disciplina de migraciones Drizzle — cadena limpia, un solo propietario de schema por fase

**Fecha:** 2026-05-26
**Estado:** Aceptado

## Contexto y problema

Drizzle Kit genera migraciones incrementales (journal). Si varios agentes o ramas modifican
`schema.ts` en paralelo y ejecutan `drizzle-kit generate` de forma independiente, los
snapshots del journal se desincronizán y la cadena de migraciones queda corrupta: las
migraciones resultantes pueden ser incoherentes, incompletas o contradictorias.

En las fases 2-4 el schema creció considerablemente (nuevas tablas para tasks, fridge,
notifications, stats, groups, social, plans, calendar, romantic, menu, budget). Hubo momentos
en que el journal acumuló snapshots parciales de fases anteriores que producían errores al
aplicar.

## Opciones consideradas

1. **Mantener el journal incremental** y ser muy disciplinados con el merge.
2. **Regenerar la cadena desde una base limpia** en cada fase: una única migración
   acumulativa que representa el estado completo del schema al final de esa fase, con
   snapshots coherentes.

## Decisión

Cada fase termina con un schema completo y coherente. Si el journal presenta incoherencias
(snapshots huérfanos, referencias a tablas que se renombraron), se regenera la cadena:

1. Se borra el directorio `drizzle/` (migraciones y snapshots previos).
2. Se ejecuta `drizzle-kit generate` **una sola vez** sobre el `schema.ts` completo.
3. El resultado es una única migración SQL que crea todas las tablas del estado actual.
4. En la base de datos de desarrollo se hace un `drop schema public cascade` + re-aplicación.
5. En producción, si ya hay datos, la migración acumulativa se aplica como si fuera la primera
   vez (solo cuando el historial de producción también se reinicia; para migraciones
   incrementales sobre datos existentes, se usan migraciones incrementales normales).

**Regla de oro: un solo agente/dueño del schema por fase.** Ningún subagente toca `schema.ts`
mientras otro ya está generando una migración. El coordinador serializa las modificaciones
de schema.

## Consecuencias

**A favor**

- El journal nunca tiene snapshots contradictorios ni referencias rotas.
- Una sola migración SQL por fase es fácil de revisar e integrar en CI.
- `drizzle-kit generate` siempre tiene un estado de partida limpio.

**En contra / trade-offs**

- Si hay datos en producción y se regenera la cadena, hay que aplicar la migración acumulativa
  como un "squash" equivalente a las anteriores; requiere cuidado para no perder datos.
- Perder el journal incremental significa perder el historial fino de cambios de schema (cada
  `ALTER TABLE` individual). Se acepta porque el historial de git del `schema.ts` cubre eso.
- En equipos grandes con múltiples ramas activas esta disciplina es más difícil de mantener;
  se necesitaría un proceso de squash de migraciones consensuado.

## Notas de implementación

- `apps/api/drizzle/` contiene las migraciones. El snapshot `_journal.json` lista las
  migraciones en orden; si se regenera, hay una sola entrada.
- `drizzle-kit generate` lee `apps/api/drizzle.config.ts` para saber dónde está el schema
  y dónde escribir las migraciones.
- `drizzle-kit migrate` (o `drizzle-kit push` en dev) aplica las migraciones pendientes.
- Las migraciones que añaden extensiones PostgreSQL (`CREATE EXTENSION vector`,
  `CREATE EXTENSION "uuid-ossp"`) hay que incluirlas manualmente en el SQL generado:
  Drizzle Kit no las genera automáticamente.
- Nunca editar el SQL de una migración ya aplicada en producción; si hay un error, se crea
  una migración nueva que lo corrige.
