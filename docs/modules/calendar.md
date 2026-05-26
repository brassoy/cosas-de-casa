# Módulo: calendar (calendario familiar)

## Responsabilidad

Gestionar eventos del calendario familiar: fechas importantes, citas, recordatorios y eventos
recurrentes. Incluye un expansor de recurrencia básico para RRULE iCal.

## Agregados y entidades

| Clase | Tipo | Descripción |
|---|---|---|
| `CalendarEvent` | Aggregate root | Evento con título, rango de tiempo, asistentes y regla de recurrencia |

**Invariantes**:
- El título no puede estar vacío.
- Si `endsAt` está presente, debe ser `≥ startsAt`.

**Recurrencia**: el campo `recurrenceRule` almacena una RRULE iCal
(p. ej. `FREQ=WEEKLY;BYDAY=MO;UNTIL=20261231T000000Z`). El expansor
`recurrence-expander.ts` soporta `DAILY`, `WEEKLY`, `MONTHLY` con `INTERVAL`, `UNTIL` y
`COUNT`. Reglas complejas (`BYDAY`, `EXDATE`, `YEARLY`) no se expanden; se almacenan pero
el evento base se devuelve tal cual. La integración completa de rrule.js queda para una fase
posterior (hay un TODO en el código).

## Endpoints principales

| Verbo | Ruta | Descripción |
|---|---|---|
| POST | `/families/:familyId/events` | Crear evento |
| GET | `/families/:familyId/events` | Listar eventos en rango (from/to) con expansión de recurrencia |
| GET | `/events/:eventId` | Obtener evento |
| PATCH | `/events/:eventId` | Editar evento |
| DELETE | `/events/:eventId` | Eliminar evento |
| PATCH | `/events/:eventId/attendees` | Reemplazar asistentes |

## Puertos y adaptadores

| Puerto | Implementación | Rol |
|---|---|---|
| `CalendarEventRepository` | `DrizzleCalendarEventRepository` | Persistencia |
| `CalendarSyncPort` | `NoopCalendarSyncAdapter` | Sincronización con calendarios externos (pendiente) |
| `Clock` | `SystemClock` | Inyección de tiempo |
| `IdGenerator` | `UuidIdGenerator` | Generación de UUIDs |

## Decisiones locales

- La expansión de ocurrencias es virtual: las ocurrencias generadas tienen id compuesto
  (`<eventId>_occ_<n>`) y no se persisten. Si un usuario edita una ocurrencia concreta,
  esa funcionalidad requiere el modelo "excepción de ocurrencia" (no implementado).
- El `NoopCalendarSyncAdapter` existe para que el puerto esté definido y sea sustituible
  por un adaptador de Google Calendar / iCal sin tocar la capa de aplicación.
- `EventScopeGuard` verifica que el evento pertenece a la familia del usuario antes de
  cualquier operación sobre `/:eventId`.
