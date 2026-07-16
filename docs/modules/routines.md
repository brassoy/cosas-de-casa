# Módulo: routines (rutinas semanales)

## Responsabilidad

Planificar la semana de la familia con rutinas: una rutina cubre **7 días consecutivos
empezando en cualquier día** (martes → lunes, por ejemplo). La familia mantiene un
**catálogo de items** reutilizables (con emoji, regla de frecuencia y ventana horaria por
defecto, y tags) que cada semana se seleccionan y se distribuyen en un kanban de 7 días.
Incumplir la regla está permitido pero queda **registrado**; sobre cada asignación se
pueden abrir **incidencias** con minutos perdidos que se descuentan del tiempo real. El
módulo expone además el resumen por rutina (tiempos por item y por tag) y estadísticas
globales filtrables por fechas. Las asignaciones se proyectan en el calendario como
**eventos virtuales de solo lectura** (overlay en la web; no se crean filas en
`calendar_events`).

## Agregados y entidades

| Clase | Tipo | Descripción |
|---|---|---|
| `RoutineItem` | Aggregate root | Item del catálogo: nombre, `targetTimesPerWeek` (1..7), ventana por defecto, tags, soft-archive |
| `Routine` | Aggregate root | Semana concreta (`startDate`..+6) que contiene selections, assignments e incidents |
| `RoutineSelection` | Hijo de `Routine` | Item elegido con **snapshot** del target (el cumplimiento queda registrado aunque el catálogo cambie) |
| `RoutineAssignment` | Hijo de `Routine` | Item colocado en un día (`dayIndex` 0..6) con ventana horaria y `durationMinutes` |
| `RoutineIncident` | Hijo de `Routine` | Incumplimiento sobre una asignación, con `lostMinutes` opcional |

**Invariantes clave**:

- Las rutinas de una familia **no pueden solaparse** (`RoutineOverlapError` → 409). Se
  valida en `CreateRoutineUseCase` vía `findOverlapping`; el unique
  `(family_id, start_date)` es solo un backstop.
- Máximo **una asignación por (item, día)** (`DuplicateAssignmentError` → 409).
- La ventana horaria "HH:mm" **puede cruzar medianoche**: `"22:00"→"12:00"` dura 840
  minutos. La duración la calcula SOLO el agregado (`(end−start+1440)%1440`,
  inicio == fin inválido) y se persiste denormalizada para el read model.
- `lostMinutes` de una incidencia nunca supera la duración planificada de su asignación
  (tampoco al encoger la ventana después).
- El **cumplimiento nunca se almacena**: se deriva de `assignedCount >= target` (snapshot).
- Borrar un item del catálogo referenciado por rutinas lo **archiva** (`archivedAt`); las
  FKs de selections/assignments son `ON DELETE RESTRICT` para proteger el histórico. Un
  item archivado puede seguir seleccionado en rutinas existentes pero no añadirse a nuevas.

## Endpoints principales

| Verbo | Ruta | Descripción |
|---|---|---|
| POST | `/families/:familyId/routine-items` | Crear item del catálogo |
| GET | `/families/:familyId/routine-items` | Listar catálogo (`includeArchived=true` opcional) |
| PATCH | `/routine-items/:itemId` | Editar item (incluye `archived` true/false) |
| DELETE | `/routine-items/:itemId` | Borrar item (archiva si está en uso) |
| POST | `/families/:familyId/routines` | Crear rutina (con `itemIds` o `duplicateFromRoutineId`) |
| GET | `/families/:familyId/routines` | Listar rutinas (ligero; `from`/`to` opcionales) |
| GET | `/families/:familyId/routines/detailed` | Rutinas hidratadas (overlay del calendario) |
| GET | `/families/:familyId/routines/stats` | Estadísticas globales (`from`/`to` opcionales) |
| GET | `/routines/:routineId` | Obtener rutina hidratada |
| PATCH | `/routines/:routineId` | Editar etiqueta (startDate inmutable) |
| DELETE | `/routines/:routineId` | Eliminar rutina |
| PUT | `/routines/:routineId/items` | Reemplazar selección de items |
| GET | `/routines/:routineId/summary` | Resumen de tiempos y cumplimiento |
| POST | `/routines/:routineId/assignments` | Asignar item a un día (ventana por defecto si se omite) |
| PATCH | `/routines/:routineId/assignments/:assignmentId` | Mover de día / ajustar ventana |
| DELETE | `/routines/:routineId/assignments/:assignmentId` | Quitar asignación (incidencias en cascada) |
| POST | `/routines/:routineId/assignments/:assignmentId/incidents` | Abrir incidencia |
| DELETE | `/routines/:routineId/incidents/:incidentId` | Eliminar incidencia |

**Autorización**: `JwtAuthGuard` global del controller + `FamilyScopeGuard` en rutas con
`:familyId`, `RoutineScopeGuard` en rutas con `:routineId` y `RoutineItemScopeGuard` en
rutas con `:itemId` (patrón recurso → familia → `isMember`).

## Decisiones de diseño

- **Duplicar la última rutina** (`duplicateFromRoutineId`): copia selección (con sus
  snapshots) y asignaciones con ids nuevos; las incidencias NO se copian.
- **Resumen por rutina en memoria** (`computeRoutineSummary`, función pura testeada): una
  rutina son 7 días y pocos items, no necesita SQL. Las **estadísticas globales** sí son
  read model CQRS por agregación SQL (`RoutineStatsQuery`, ADR-0011); el agregado por tag
  se deriva en TS del agregado por item (tags como `text[]` en `routine_items`).
- **`save` con diff de hijos** (`DrizzleRoutineRepository`): insert/update/delete por id;
  nunca delete+reinsert de asignaciones (cambiarían de id y las incidencias colgarían).
- **Sin realtime en v1**: la web refresca por invalidación tras cada mutación propia. Si
  se quiere kanban colaborativo en vivo, añadir migración idempotente estilo
  `0007_realtime_calendar_events.sql`.
- **Overlay del calendario (web)**: `features/routines/lib/calendarOverlay.ts` proyecta
  las asignaciones como `CalendarEventDto` con id sintético `routine_<assignmentId>`
  (nunca colisiona con UUIDs ni con las ocurrencias `_occ_N`); al abrirlas, el container
  del calendario navega a la rutina. Cada día cubierto por una rutina lleva un ring sutil
  con dos colores alternos (`routineRingClass`, compartido por las 4 vistas de theme).
- **Kanban (web)**: `@dnd-kit/core` (primera librería DnD de la app) con `PointerSensor`
  + `TouchSensor` (delay para no romper el scroll móvil) y **tap-para-asignar** como
  alternativa táctil. El movimiento de asignaciones es optimista con rollback.

## Tablas

`routine_items`, `routines`, `routine_selections` (PK compuesta), `routine_assignments`,
`routine_incidents` — migración `0012_slow_cardiac.sql`. Sin RLS (autorización en guards,
como el resto de la app).

## Tests

- Dominio: `domain/routine.spec.ts`, `domain/routine-item.spec.ts` (medianoche, solape de
  fechas, cascadas, lostMinutes).
- Aplicación: `application/routine-use-cases.spec.ts` (fakes de ports por constructor;
  snapshot de targets, duplicado, archivado, resumen).
- Integración: `test/integration/routines.spec.ts` (flujo completo HTTP contra Supabase
  local; recuerda que `test/support/app-factory.ts` cablea este contexto A MANO).
