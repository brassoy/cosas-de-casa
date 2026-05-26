# Módulo: tasks (tareas domésticas)

## Responsabilidad

Gestionar las tareas del hogar: crear, asignar, seguir el estado y adjuntar fotos que
documenten el trabajo. Permite además generar una lista de la compra a partir de una tarea.

## Agregados y entidades

| Clase | Tipo | Descripción |
|---|---|---|
| `Task` | Aggregate root | Tarea con título, descripción, fechas y estado |
| `TaskPhoto` | Entidad | Referencia a una imagen en Supabase Storage |

**Estado de tarea**: `OPEN → IN_PROGRESS → DONE` (transiciones bidireccionales excepto que
`DONE` puede volver a `OPEN` o `IN_PROGRESS` para reapertura). La matriz de transiciones
válidas está en `domain/task.ts`.

**Asignados**: si no se especifican al crear la tarea, el creador queda como único asignado
(invariante de dominio protegida en `Task.create`).

## Endpoints principales

| Verbo | Ruta | Descripción |
|---|---|---|
| POST | `/families/:familyId/tasks` | Crear tarea |
| GET | `/families/:familyId/tasks` | Listar tareas (filtros: status, assigneeId) |
| GET | `/tasks/:taskId` | Obtener tarea |
| PATCH | `/tasks/:taskId` | Editar tarea (patch parcial) |
| DELETE | `/tasks/:taskId` | Eliminar tarea |
| PATCH | `/tasks/:taskId/assignees` | Reemplazar asignados |
| POST | `/tasks/:taskId/photos` | Registrar foto (storagePath del bucket) |
| DELETE | `/tasks/:taskId/photos/:photoId` | Eliminar foto |
| POST | `/tasks/:taskId/generate-list` | Crear lista CUSTOM de la compra |

## Puertos y adaptadores

| Puerto | Implementación | Rol |
|---|---|---|
| `TaskRepository` | `DrizzleTaskRepository` | Persistencia de tareas |
| `TaskPhotoRepository` | `DrizzleTaskPhotoRepository` | Persistencia de fotos (solo storagePath) |
| `Clock` | `SystemClock` | Inyección de tiempo |
| `IdGenerator` | `UuidIdGenerator` | Generación de UUIDs |

**Read model**: `TaskAssigneesReadModel` enriquece la lista de `assigneeIds` con `displayName`
y `email` desde `app_users` para los DTOs de respuesta.

## Decisiones locales

- Las fotos no pasan por el proceso Node: el cliente las sube directamente a Supabase Storage
  (bucket `task-photos`) y solo registra la `storagePath` via API. Ver ADR-0009.
- `GenerateListFromTaskUseCase` importa `CreateCustomListUseCase` del contexto `shopping`
  (dependencia unidireccional `tasks → shopping`). Ver ADR-0009.
- El `TaskScopeGuard` verifica que la tarea existe y que el usuario autenticado pertenece a
  la familia de esa tarea antes de cualquier operación sobre `/:taskId`.
