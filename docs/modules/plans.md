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
| POST | `/families/:familyId/saved-places` | Crear lugar guardado |
| GET | `/families/:familyId/saved-places` | Listar lugares guardados |
| DELETE | `/saved-places/:placeId` | Eliminar lugar guardado |

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
