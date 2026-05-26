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
| POST | `/families/:familyId/push-subscriptions` | Suscribir un dispositivo |
| DELETE | `/families/:familyId/push-subscriptions` | Desuscribir el dispositivo actual |

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
