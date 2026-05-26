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
| POST | `/families/:familyId/calendar/events` | Crear evento |
| GET | `/families/:familyId/calendar/events` | Listar eventos en rango (from/to) con expansión de recurrencia |
| GET | `/calendar/events/:eventId` | Obtener evento |
| PATCH | `/calendar/events/:eventId` | Editar evento |
| DELETE | `/calendar/events/:eventId` | Eliminar evento |
| PATCH | `/calendar/events/:eventId/attendees` | Reemplazar asistentes |

## Casos de uso

### `CreateEventUseCase`
Crea un nuevo evento de calendario para una familia, validando las invariantes de título y rango de fechas.
- **Endpoint**: `POST /families/:familyId/calendar/events` · **Autorización**: `JwtAuthGuard` + `FamilyScopeGuard` — el usuario autenticado debe ser miembro de la familia.
- **Entrada**: `title` string 1–200 (obligatorio); `description` string ≤ 2000 (opcional); `location` string ≤ 500 (opcional); `startsAt` ISO 8601 strict (obligatorio); `endsAt` ISO 8601 strict (opcional); `allDay` boolean (opcional, por defecto `false`); `recurrenceRule` string RRULE ≤ 500 (opcional); `attendeeIds` UUID[] (opcional; si se omite, el creador queda como único asistente).
- **Salida**: `CalendarEvent` → `CalendarEventDto` (id, familyId, title, description, location, startsAt, endsAt, allDay, recurrenceRule, createdBy, attendees, createdAt, updatedAt).
- **Reglas/invariantes**: el título se recorta con `trim()` antes de validar que no esté vacío. `endsAt` debe ser `≥ startsAt` si se proporciona. Si `attendeeIds` se omite, se usa `[createdBy]` como lista inicial de asistentes.
- **Errores**: `CalendarEventTitleEmptyError` → 422; `CalendarEventInvalidRangeError` → 422.

### `ListEventsUseCase`
Lista los eventos de una familia en un rango de fechas, expandiendo las ocurrencias de los eventos recurrentes de forma virtual.
- **Endpoint**: `GET /families/:familyId/calendar/events` · **Autorización**: `JwtAuthGuard` + `FamilyScopeGuard` — el usuario debe ser miembro de la familia.
- **Entrada**: `from` ISO 8601 strict (query param, obligatorio); `to` ISO 8601 strict (query param, obligatorio).
- **Salida**: `CalendarEvent[]` → `CalendarEventDto[]`, ordenados ascendentemente por `startsAt`. Las ocurrencias de eventos recurrentes se expanden con `recurrence-expander.ts`; sus ids tienen el formato `<eventId>_occ_<n>` y no están persistidas.
- **Reglas/invariantes**: la expansión de recurrencia soporta `DAILY`, `WEEKLY` y `MONTHLY` con `INTERVAL`, `UNTIL` y `COUNT`. Reglas complejas (`BYDAY`, `EXDATE`, `YEARLY`) se almacenan pero la ocurrencia base se devuelve tal cual sin expandir.
- **Errores**: sin errores de dominio propios (los errores de guard se resuelven antes).

### `GetEventUseCase`
Devuelve el detalle de un evento de calendario por su identificador.
- **Endpoint**: `GET /calendar/events/:eventId` · **Autorización**: `JwtAuthGuard` + `EventScopeGuard` — el guard carga el evento, obtiene su `familyId` y verifica que el usuario sea miembro de esa familia.
- **Entrada**: `eventId` UUID (param de ruta).
- **Salida**: `CalendarEvent` → `CalendarEventDto`.
- **Reglas/invariantes**: `EventScopeGuard` lanza `NotFoundException` si el evento no existe antes de llegar al use case; el use case lo relanza como `CalendarEventNotFoundError` si la carga posterior falla.
- **Errores**: `CalendarEventNotFoundError` → 404.

### `UpdateEventUseCase`
Edita los campos de un evento existente mediante patch parcial. Los campos ausentes no se modifican.
- **Endpoint**: `PATCH /calendar/events/:eventId` · **Autorización**: `JwtAuthGuard` + `EventScopeGuard` — el usuario debe ser miembro de la familia propietaria del evento.
- **Entrada**: `title` string 1–200 (opcional); `description` string ≤ 2000 | null (opcional); `location` string ≤ 500 | null (opcional); `startsAt` ISO 8601 strict (opcional); `endsAt` ISO 8601 strict | null (opcional); `allDay` boolean (opcional); `recurrenceRule` string ≤ 500 | null (opcional).
- **Salida**: `CalendarEvent` actualizado → `CalendarEventDto`.
- **Reglas/invariantes**: si `title` se envía, se aplica `trim()` y se valida que no quede vacío. La combinación final de `(startsAt, endsAt)` — mezclando valores existentes con el patch — debe cumplir `endsAt ≥ startsAt`.
- **Errores**: `CalendarEventNotFoundError` → 404; `CalendarEventTitleEmptyError` → 422; `CalendarEventInvalidRangeError` → 422.

### `DeleteEventUseCase`
Elimina un evento de calendario de forma permanente.
- **Endpoint**: `DELETE /calendar/events/:eventId` · **Autorización**: `JwtAuthGuard` + `EventScopeGuard` — el usuario debe ser miembro de la familia propietaria.
- **Entrada**: `eventId` UUID (param de ruta).
- **Salida**: vacía (204 No Content).
- **Reglas/invariantes**: la eliminación es irreversible. No existe mecanismo de eliminación selectiva de ocurrencias recurrentes (requeriría el modelo de excepción de ocurrencia, no implementado).
- **Errores**: `CalendarEventNotFoundError` → 404.

### `SetAttendeesUseCase`
Reemplaza la lista completa de asistentes de un evento. No es un patch incremental: la lista enviada sustituye la anterior.
- **Endpoint**: `PATCH /calendar/events/:eventId/attendees` · **Autorización**: `JwtAuthGuard` + `EventScopeGuard` — el usuario debe ser miembro de la familia propietaria.
- **Entrada**: `attendeeIds` UUID[] (obligatorio; puede ser un array vacío para eliminar todos los asistentes).
- **Salida**: `CalendarEvent` actualizado → `CalendarEventDto` con la nueva lista `attendees`.
- **Reglas/invariantes**: la operación sobreescribe completamente `attendeeIds`. Enviar `[]` deja el evento sin asistentes (comportamiento permitido por `ArrayMinSize(0)`).
- **Errores**: `CalendarEventNotFoundError` → 404.

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
