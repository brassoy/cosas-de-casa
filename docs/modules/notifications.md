# Módulo: notifications (notificaciones push)

## Responsabilidad

Gestionar las suscripciones Web Push de los dispositivos y enviar notificaciones proactivas
(recordatorios diarios de caducidad de nevera y tareas urgentes).

## Entidades

| Clase | Tipo | Descripción |
|---|---|---|
| `PushSubscription` | Entidad | Registro de un dispositivo suscrito (endpoint + claves VAPID) |

## Endpoints principales

| Verbo | Ruta | Descripción |
|---|---|---|
| POST | `/families/:familyId/notifications/subscribe` | Suscribir un dispositivo |
| DELETE | `/families/:familyId/notifications/subscribe` | Desuscribir el dispositivo actual |

## Casos de uso

### `SubscribePushUseCase`
Registra (o actualiza) la suscripción Web Push de un dispositivo para una familia.
- **Endpoint**: `POST /families/:familyId/notifications/subscribe` · **Autorización**: `JwtAuthGuard` + `FamilyScopeGuard` (miembro de la familia).
- **Entrada**: `endpoint` URL válida (requerida); `keys.p256dh` string no vacío (requerido); `keys.auth` string no vacío (requerido).
- **Salida**: `{ id: string }` — UUID de la suscripción creada.
- **Reglas/invariantes**: si el endpoint ya existe, la operación lo actualiza (upsert). El `id`, `userId` y `createdAt` los genera el controlador (no el caso de uso) antes de construir el comando.
- **Errores**: ninguno de dominio propio.

---

### `UnsubscribePushUseCase`
Elimina la suscripción Web Push de un endpoint concreto.
- **Endpoint**: `DELETE /families/:familyId/notifications/subscribe` · **Autorización**: `JwtAuthGuard` + `FamilyScopeGuard` (miembro de la familia).
- **Entrada**: `endpoint` URL válida (requerida) — identifica de forma única la suscripción a borrar.
- **Salida**: `void` (HTTP 204).
- **Reglas/invariantes**: si el endpoint no existe, la operación es silenciosa (no error).
- **Errores**: ninguno de dominio propio.

---

## Servicio cron

`ExpiryReminderService` se ejecuta diariamente a las **08:00 UTC** (`@Cron('0 8 * * *')`):

1. Obtiene todas las familias con suscripciones activas.
2. Para cada familia:
   - Busca ítems de nevera que caducan en ≤2 días → push de aviso de caducidad.
   - Busca tareas no completadas con `deadlineDate` hoy o mañana → push de tareas urgentes.
3. Los errores de envío individuales se registran como warnings; no interrumpen el lote.

## Puertos y adaptadores

| Puerto | Implementación | Rol |
|---|---|---|
| `PushSubscriptionRepository` | `DrizzlePushSubscriptionRepository` | Persistencia de suscripciones |
| `NotificationSenderPort` | `WebpushNotificationSenderAdapter` | Envío VAPID con `web-push` |
| `Clock` | `SystemClock` | Inyección de tiempo |
| `IdGenerator` | `UuidIdGenerator` | Generación de UUIDs |

## Decisiones locales

- Sin Redis/BullMQ en el MVP: el cron corre en el proceso NestJS. Ver ADR-0008.
- Si las variables VAPID no están configuradas (dev/test), el módulo inyecta un stub no-op
  en lugar del adaptador real para no romper el arranque.
- El módulo importa directamente los repositorios de `fridge` y `tasks` para el cron;
  no pasa por los casos de uso de esos contextos (lectura directa de repositorio, aceptable
  para un aggregado de notificación).
- `processReminders()` está extraído del handler del cron para poder invocarlo en tests
  sin depender del scheduler de NestJS.
