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

## Casos de uso

### `CreateTaskUseCase`
Crea una nueva tarea doméstica para una familia y la persiste con estado inicial `OPEN`.
- **Endpoint**: `POST /families/:familyId/tasks` · **Autorización**: `JwtAuthGuard` + `FamilyScopeGuard` (miembro de la familia).
- **Entrada**: `title` string 1–200 (requerido); `description` string 0–2000 (opcional); `recommendedDate` ISO 8601 (opcional); `deadlineDate` ISO 8601 (opcional); `assigneeIds` array de UUID v4 (opcional — si se omite, el creador queda como único asignado).
- **Salida**: `Task` → `TaskDto` (con `assignees: TaskAssigneeDto[]` enriquecidos desde `app_users` y `photos: TaskPhotoDto[]`).
- **Reglas/invariantes**: el título se recorta y no puede quedar vacío tras el trim. Si `assigneeIds` está vacío o ausente, se asigna automáticamente al `createdBy`. El estado inicial es siempre `OPEN`.
- **Errores**: `TaskTitleEmptyError` → 422.

---

### `ListTasksUseCase`
Devuelve todas las tareas de una familia, con filtros opcionales por estado y asignado.
- **Endpoint**: `GET /families/:familyId/tasks` · **Autorización**: `JwtAuthGuard` + `FamilyScopeGuard` (miembro de la familia).
- **Entrada** (query params): `status` enum `OPEN|IN_PROGRESS|DONE` (opcional); `assigneeId` UUID v4 (opcional).
- **Salida**: `Task[]` → `TaskDto[]` (cada uno enriquecido con asignados y fotos).
- **Reglas/invariantes**: sin filtros devuelve todas las tareas de la familia. Los filtros se aplican en la capa de repositorio (`ListTasksFilter`).
- **Errores**: ninguno de dominio propio (la autorización la rechaza el guard con 403/404 estándar de NestJS).

---

### `GetTaskUseCase`
Obtiene una tarea por su identificador.
- **Endpoint**: `GET /tasks/:taskId` · **Autorización**: `JwtAuthGuard` + `TaskScopeGuard` (miembro de la familia de la tarea).
- **Entrada**: `taskId` UUID v4 (path param).
- **Salida**: `Task` → `TaskDto`.
- **Reglas/invariantes**: el `TaskScopeGuard` valida existencia del ítem y membresía antes de invocar el caso de uso.
- **Errores**: `TaskNotFoundError` → 404.

---

### `UpdateTaskUseCase`
Aplica un patch parcial sobre los campos editables de una tarea.
- **Endpoint**: `PATCH /tasks/:taskId` · **Autorización**: `JwtAuthGuard` + `TaskScopeGuard` (miembro de la familia de la tarea).
- **Entrada**: `title` string 1–200 (opcional); `description` string 0–2000 o `null` (opcional); `status` enum `OPEN|IN_PROGRESS|DONE` (opcional); `recommendedDate` ISO 8601 o `null` (opcional); `deadlineDate` ISO 8601 o `null` (opcional).
- **Salida**: `Task` → `TaskDto`.
- **Reglas/invariantes**: las transiciones de estado siguen la matriz `VALID_TRANSITIONS`:
  - `OPEN` → `IN_PROGRESS`, `DONE`
  - `IN_PROGRESS` → `OPEN`, `DONE`
  - `DONE` → `OPEN`, `IN_PROGRESS`
  Las tres transiciones inversas están permitidas en dominio (reapertura incluida). El título se recorta y no puede quedar vacío.
- **Errores**: `TaskNotFoundError` → 404 · `InvalidTaskTransitionError` → 409 · `TaskTitleEmptyError` → 422.

---

### `DeleteTaskUseCase`
Elimina una tarea (y en cascada sus asignados y fotos en base de datos).
- **Endpoint**: `DELETE /tasks/:taskId` · **Autorización**: `JwtAuthGuard` + `TaskScopeGuard` (miembro de la familia de la tarea).
- **Entrada**: `taskId` UUID v4 (path param).
- **Salida**: `void` (HTTP 204).
- **Reglas/invariantes**: ninguna adicional; la existencia ya la verifica el caso de uso.
- **Errores**: `TaskNotFoundError` → 404.

---

### `SetAssigneesUseCase`
Reemplaza completamente la lista de asignados de una tarea.
- **Endpoint**: `PATCH /tasks/:taskId/assignees` · **Autorización**: `JwtAuthGuard` + `TaskScopeGuard` (miembro de la familia de la tarea).
- **Entrada**: `assigneeIds` array de UUID v4 con al menos un elemento (requerido).
- **Salida**: `Task` → `TaskDto` con la nueva lista de asignados enriquecida.
- **Reglas/invariantes**: la operación es un replace completo (no merge). Actualiza `updatedAt` en la tarea y reemplaza las filas en `task_assignees`.
- **Errores**: `TaskNotFoundError` → 404.

---

### `AddTaskPhotoUseCase`
Registra en base de datos la ruta de una foto ya subida al bucket `task-photos` de Supabase Storage.
- **Endpoint**: `POST /tasks/:taskId/photos` · **Autorización**: `JwtAuthGuard` + `TaskScopeGuard` (miembro de la familia de la tarea).
- **Entrada**: `storagePath` string 1–500 (requerido).
- **Salida**: la respuesta devuelve el `TaskDto` completo de la tarea (incluye la nueva foto en `photos[]`).
- **Reglas/invariantes**: el cliente sube el archivo directamente a Supabase Storage (ADR-0009) y después llama a este endpoint con la ruta resultante. El caso de uso no accede al archivo.
- **Errores**: `TaskNotFoundError` → 404.

---

### `RemoveTaskPhotoUseCase`
Elimina el registro de una foto de tarea.
- **Endpoint**: `DELETE /tasks/:taskId/photos/:photoId` · **Autorización**: `JwtAuthGuard` + `TaskScopeGuard` (miembro de la familia de la tarea).
- **Entrada**: `photoId` UUID v4 (path param; `taskId` solo se usa en el guard).
- **Salida**: `void` (HTTP 204).
- **Reglas/invariantes**: solo borra el registro en base de datos; el archivo en Supabase Storage no se elimina desde esta capa (ADR-0009).
- **Errores**: `TaskPhotoNotFoundError` → 404.

---

### `GenerateListFromTaskUseCase`
Crea una lista de la compra de tipo `CUSTOM` cuyo nombre es el título de la tarea. Delega en `CreateCustomListUseCase` del contexto `shopping` (dependencia unidireccional `tasks → shopping`).
- **Endpoint**: `POST /tasks/:taskId/generate-list` · **Autorización**: `JwtAuthGuard` + `TaskScopeGuard` (miembro de la familia de la tarea).
- **Entrada**: `taskId` UUID v4 (path param); `actingUserId` se extrae del token JWT.
- **Salida**: `ShoppingList` → `ShoppingListSummaryDto` (usando `ShoppingPresenter.toListSummaryDto`).
- **Reglas/invariantes**: la lista se crea en el contexto `shopping` con `familyId` y `name` obtenidos de la tarea. El nombre coincide exactamente con `task.title`.
- **Errores**: `TaskNotFoundError` → 404.

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
