# ADR-0008: Notificaciones push con web-push (VAPID) + cron de @nestjs/schedule, sin Redis/BullMQ en el MVP

**Fecha:** 2026-05-26
**Estado:** Aceptado

## Contexto y problema

El plan original de las fases intermedias contemplaba Redis + BullMQ para gestionar una cola
de trabajos asíncronos y poder enviar notificaciones push (recordatorios de caducidad, tareas
urgentes) de forma fiable. En el MVP necesitamos que los dispositivos reciban alertas diarias
sin montar infraestructura adicional de cola.

## Opciones consideradas

1. **Redis + BullMQ** — cola de trabajos con reintentos automáticos, backoff, dead-letter queue
   y visibilidad del estado de cada job.
2. **@nestjs/schedule (cron) + web-push directo** — el proceso NestJS dispara un `@Cron` diario
   a las 08:00 UTC y llama directamente al adaptador VAPID; si un envío falla, lo registra y
   continúa.

## Decisión

Se eligió la opción 2 para el MVP. El `ExpiryReminderService` usa `@Cron('0 8 * * *')` y el
adaptador `WebpushNotificationSenderAdapter` que llama a la librería `web-push` con las claves
VAPID configuradas en variables de entorno (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
`VAPID_SUBJECT`).

La desviación respecto al plan se documenta de forma explícita: Redis/BullMQ **queda pospuesto**,
no eliminado. La razón es economía de complejidad en el MVP: un proceso Node de instancia única
puede mantener tareas cron sin infraestructura externa, y las notificaciones fallidas se
registran como warnings sin bloquear el flujo.

## Consecuencias

**A favor**

- Cero infraestructura adicional: no hace falta Redis en local ni en producción para el MVP.
- Despliegue más sencillo; un solo contenedor o proceso.
- `@nestjs/schedule` es oficial de NestJS, bien testeado y sin dependencias externas en el scheduler.
- Tolerancia a fallos: `Promise.allSettled` en el sender itera los targets; un endpoint
  expirado no rompe el resto del lote.
- En dev/test sin claves VAPID, el módulo inyecta un stub no-op para no romper el arranque.

**En contra / trade-offs**

- Sin reintentos automáticos: si el proceso muere justo durante el cron, ese día no se reintenta.
- Con múltiples réplicas del proceso, el cron se dispararía en cada réplica (se puede mitigar con
  un lock de base de datos, pero no se implementó en el MVP).
- Sin visibilidad de jobs: no hay dashboard de BullMQ para ver el historial de ejecuciones.
- Redis/BullMQ sigue siendo la ruta correcta cuando el producto escale o necesite workers
  independientes para tareas costosas (OCR, embeddings en batch).

## Notas de implementación

- `ExpiryReminderService.processReminders()` está extraído del método del cron para poder
  invocarlo directamente en tests sin depender del scheduler.
- El cron requiere que `ScheduleModule.forRoot()` esté registrado en `AppModule`.
- Las claves VAPID se generan con `npx web-push generate-vapid-keys` y se guardan en `.env`.
- La ruta de deuda técnica para Redis: añadir `BullModule`, mover `ExpiryReminderService` a
  un producer y crear un worker separado.
