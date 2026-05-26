# Módulo: plans (planes de actividad)

## Responsabilidad

Organizar salidas y actividades entre familias y/o peñas: proponer, confirmar, invitar
participantes, gestionar RSVP, adjuntar ubicación y chatear sobre el plan.

## Agregados y entidades

| Clase | Tipo | Descripción |
|---|---|---|
| `Plan` | Aggregate root | Actividad con título, lugar, fecha, participantes y estado |
| `PlanMessage` | Entidad | Mensaje del chat del plan |
| `SavedPlace` | Entidad | Lugar guardado por la familia (nombre, dirección, coords) |

**Estado del plan**: `proposed → confirmed → cancelled`.

**Participantes**: cada participante tiene un RSVP (`going`, `maybe`, `declined`). El creador
queda como `going` automáticamente.

**Compartición**: un plan puede compartirse con familias amigas y/o peñas. Un usuario accede
al plan si su familia es `ownerFamilyId` o está en `sharedWithFamilyIds`.

## Endpoints principales

| Verbo | Ruta | Descripción |
|---|---|---|
| POST | `/families/:familyId/plans` | Crear plan |
| GET | `/families/:familyId/plans` | Listar planes accesibles |
| GET | `/plans/:planId` | Obtener plan (con participantes y compartición) |
| PATCH | `/plans/:planId` | Editar plan |
| DELETE | `/plans/:planId` | Eliminar plan |
| POST | `/plans/:planId/rsvp` | Establecer RSVP del usuario |
| POST | `/plans/:planId/share` | Compartir con familia/peña |
| POST | `/plans/:planId/messages` | Enviar mensaje al chat |
| GET | `/plans/:planId/messages` | Listar mensajes (paginación cursor por `before`) |
| POST | `/families/:familyId/places` | Crear lugar guardado |
| GET | `/families/:familyId/places` | Listar lugares guardados |
| DELETE | `/places/:placeId` | Eliminar lugar guardado |

## Casos de uso

### `CreatePlanUseCase`
Crea un plan de actividad para una familia y, opcionalmente, guarda el lugar asociado como lugar favorito.
- **Endpoint**: `POST /families/:familyId/plans` · **Autorización**: `JwtAuthGuard` — el usuario autenticado debe ser miembro de la familia (`ownerFamilyId`).
- **Entrada**: `title` string 1–200 (obligatorio); `description` string ≤ 2000 (opcional); `place` objeto `{name: 1–200, address: ≤ 500, lat: number, lng: number}` (opcional); `savePlace` boolean (opcional, guarda el lugar como favorito si hay datos de lugar); `scheduledAt` ISO 8601 (opcional).
- **Salida**: `Plan` → `PlanDto` con todos los campos del plan, participantes y familias con acceso. El creador queda añadido como participante con RSVP `going`.
- **Reglas/invariantes**: el usuario debe ser miembro de la familia indicada. El plan se crea siempre en estado `proposed`. Si `savePlace === true` y se incluye un objeto `place`, se crea adicionalmente un `SavedPlace` para la familia.
- **Errores**: `PlanFamilyMemberError` → 403.

### `ListPlansUseCase`
Lista todos los planes a los que tiene acceso una familia (propios y compartidos por familias amigas).
- **Endpoint**: `GET /families/:familyId/plans` · **Autorización**: `JwtAuthGuard` — el usuario debe ser miembro de la familia.
- **Entrada**: `familyId` UUID (param de ruta).
- **Salida**: `Plan[]` → `PlanSummaryDto[]` con id, título, fecha, nombre del lugar, familia propietaria, estado y número de participantes.
- **Reglas/invariantes**: se devuelven tanto los planes cuyo `ownerFamilyId` coincide como los compartidos con la familia (tabla `plan_shares`).
- **Errores**: `PlanFamilyMemberError` → 403.

### `GetPlanUseCase`
Devuelve el detalle completo de un plan, incluyendo participantes con sus `displayName` y la lista de familias con las que está compartido.
- **Endpoint**: `GET /plans/:planId` · **Autorización**: `JwtAuthGuard` — el usuario debe pertenecer a alguna de las familias con acceso al plan (propietaria o en `sharedWithFamilyIds`).
- **Entrada**: `planId` UUID (param de ruta).
- **Salida**: `PlanDetailView` → `PlanDto` con participantes enriquecidos (`displayName` obtenido mediante join con `app_users` en el read model; si el perfil no tiene nombre se usa `userId` como fallback).
- **Reglas/invariantes**: el acceso se comprueba contra todas las familias vinculadas al plan. Si el plan existe pero el usuario no tiene acceso, se lanza `PlanAccessDeniedError`.
- **Errores**: `PlanNotFoundError` → 404; `PlanAccessDeniedError` → 403.

### `UpdatePlanUseCase`
Edita los campos de un plan existente (patch parcial). Solo la familia propietaria puede modificarlo.
- **Endpoint**: `PATCH /plans/:planId` · **Autorización**: `JwtAuthGuard` — el usuario debe ser miembro de la familia propietaria (`ownerFamilyId`).
- **Entrada**: `title` string 1–200 (opcional); `description` string ≤ 2000 | null (opcional); `place` objeto `PlaceData` | null (opcional); `scheduledAt` ISO 8601 | null (opcional); `status` enum `proposed | confirmed | cancelled` (opcional).
- **Salida**: `Plan` actualizado → `PlanDto` (re-consulta el read model tras la edición).
- **Reglas/invariantes**: ningún campo es obligatorio; los campos ausentes no se modifican. `scheduledAt: null` borra la fecha del plan.
- **Errores**: `PlanNotFoundError` → 404; `PlanNotOwnedByFamilyError` → 403.

### `DeletePlanUseCase`
Elimina un plan de forma permanente. Solo la familia propietaria puede borrarlo.
- **Endpoint**: `DELETE /plans/:planId` · **Autorización**: `JwtAuthGuard` — el usuario debe ser miembro de la familia propietaria.
- **Entrada**: `planId` UUID (param de ruta).
- **Salida**: vacía (204 No Content).
- **Reglas/invariantes**: la eliminación es irreversible e incluye en cascada mensajes y registros de compartición (depende del esquema de base de datos).
- **Errores**: `PlanNotFoundError` → 404; `PlanNotOwnedByFamilyError` → 403.

### `SetRsvpUseCase`
Establece o actualiza la respuesta de asistencia (RSVP) del usuario autenticado a un plan.
- **Endpoint**: `POST /plans/:planId/rsvp` · **Autorización**: `JwtAuthGuard` — el usuario debe pertenecer a alguna familia con acceso al plan.
- **Entrada**: `status` enum `going | maybe | declined` (obligatorio).
- **Salida**: `Plan` → `PlanDto` actualizado (re-consulta el read model).
- **Reglas/invariantes**: si el usuario ya era participante, se actualiza su estado; si no, se añade como nuevo participante. La operación es upsert.
- **Errores**: `PlanNotFoundError` → 404; `PlanAccessDeniedError` → 403.

### `SharePlanUseCase`
Comparte un plan con una familia amiga para que sus miembros puedan verlo y hacer RSVP.
- **Endpoint**: `POST /plans/:planId/share` · **Autorización**: `JwtAuthGuard` — el usuario debe ser miembro de la familia propietaria.
- **Entrada**: `familyId` UUID de la familia destino (obligatorio).
- **Salida**: `Plan` → `PlanDto` actualizado con la lista `sharedWithFamilyIds` ampliada.
- **Reglas/invariantes**: las dos familias deben tener un vínculo de amistad activo (`FriendLinkRepository.areFriends`). Si el plan ya estaba compartido con esa familia se lanza `PlanAlreadySharedError` (no es idempotente).
- **Errores**: `PlanNotFoundError` → 404; `PlanNotOwnedByFamilyError` → 403; `PlansNotFriendsError` → 422; `PlanAlreadySharedError` → 422.

### `SendPlanMessageUseCase`
Envía un mensaje de texto al chat del plan y lo persiste. El `displayName` se deriva del contexto de autenticación, no de la tabla de mensajes.
- **Endpoint**: `POST /plans/:planId/messages` · **Autorización**: `JwtAuthGuard` — el usuario debe pertenecer a alguna familia con acceso al plan.
- **Entrada**: `body` string 1–2000 (obligatorio; el HTML se sanitiza antes de persistir).
- **Salida**: `PlanMessageWithUser` → `PlanMessageDto` (id, planId, userId, displayName, body, createdAt ISO 8601). El `displayName` se toma de `user.displayName` del JWT; si es nulo se usa `userId` como fallback.
- **Reglas/invariantes**: el cuerpo se sanitiza eliminando etiquetas HTML (`PlanMessage.sanitizeBody`). La tabla `plan_messages` no tiene columna `display_name`; el campo se construye en tiempo de ejecución (ver ADR-0013).
- **Errores**: `PlanNotFoundError` → 404; `PlanAccessDeniedError` → 403.

### `ListPlanMessagesUseCase`
Lista los mensajes del chat de un plan con paginación por cursor temporal.
- **Endpoint**: `GET /plans/:planId/messages` · **Autorización**: `JwtAuthGuard` — el usuario debe pertenecer a alguna familia con acceso al plan.
- **Entrada**: `planId` UUID (param de ruta); `before` ISO 8601 (query param opcional, cursor de paginación hacia atrás).
- **Salida**: `PlanMessageWithUser[]` → `PlanMessageDto[]`. Sin `before` devuelve los 50 mensajes más recientes; con `before` devuelve los 50 anteriores a esa marca temporal. El orden devuelto es ascendente (más antiguo primero).
- **Reglas/invariantes**: límite por defecto de 50 mensajes. El `displayName` se obtiene mediante join con `app_users` en el repositorio (`listWithUsers`); si el usuario no tiene nombre se devuelve `userId` como fallback en el presenter.
- **Errores**: `PlanNotFoundError` → 404; `PlanAccessDeniedError` → 403.

### `CreateSavedPlaceUseCase`
Crea un lugar favorito de la familia para reutilizarlo al crear planes.
- **Endpoint**: `POST /families/:familyId/places` · **Autorización**: `JwtAuthGuard` — el usuario debe ser miembro de la familia.
- **Entrada**: `name` string 1–200 (obligatorio); `address` string ≤ 500 (opcional); `lat` number (opcional); `lng` number (opcional).
- **Salida**: `SavedPlace` → `SavedPlaceDto` (id, name, address, lat, lng).
- **Reglas/invariantes**: el usuario debe ser miembro de la familia. Los campos de coordenadas y dirección son independientes; se pueden omitir todos.
- **Errores**: `PlanFamilyMemberError` → 403.

### `ListSavedPlacesUseCase`
Lista todos los lugares favoritos de una familia.
- **Endpoint**: `GET /families/:familyId/places` · **Autorización**: `JwtAuthGuard` — el usuario debe ser miembro de la familia.
- **Entrada**: `familyId` UUID (param de ruta).
- **Salida**: `SavedPlace[]` → `SavedPlaceDto[]`.
- **Reglas/invariantes**: solo se devuelven los lugares de la familia indicada.
- **Errores**: `PlanFamilyMemberError` → 403.

### `DeleteSavedPlaceUseCase`
Elimina un lugar favorito de la familia.
- **Endpoint**: `DELETE /places/:placeId` · **Autorización**: `JwtAuthGuard` — el usuario debe ser miembro de la familia propietaria del lugar.
- **Entrada**: `placeId` UUID (param de ruta).
- **Salida**: vacía (204 No Content).
- **Reglas/invariantes**: el lugar debe existir y el usuario debe ser miembro de la familia que lo creó.
- **Errores**: `SavedPlaceNotFoundError` → 404; `SavedPlaceAccessDeniedError` → 403.

## Puertos y adaptadores

| Puerto | Implementación | Rol |
|---|---|---|
| `PlanRepository` | `DrizzlePlanRepository` | Persistencia de planes |
| `PlanMessageRepository` | `DrizzlePlanMessageRepository` | Persistencia de mensajes |
| `SavedPlaceRepository` | `DrizzleSavedPlaceRepository` | Persistencia de lugares |
| `PlansReadModel` (aplicación) | `DrizzlePlansReadModel` | Vista detalle con participantes y displayName |

## Decisiones locales

- El read model `DrizzlePlansReadModel.getPlanDetail` hace join con `app_users` para incluir
  `displayName` de participantes. El tiempo real (Supabase Realtime) no incluye ese campo
  en los payloads de `plan_messages`; el frontend lo resuelve desde el caché de participantes.
  Ver ADR-0013.
- Los mensajes se listan en orden ascendente (más antiguo primero) aunque la query recupera
  en DESC; el repositorio invierte el array antes de devolver.
- La paginación de mensajes es por cursor (`before: Date`) para evitar offset en tablas grandes.
- Los `SavedPlace` son opcionales: el usuario puede añadir el lugar en texto libre o elegir
  uno guardado.
