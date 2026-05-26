# ADR-0013: Tiempo real con Supabase Realtime (postgres_changes) y gotcha de campos derivados

**Fecha:** 2026-05-26
**Estado:** Aceptado

## Contexto y problema

El chat de planes (`plan_messages`) y otras tablas deben actualizarse en el frontend sin que
el usuario tenga que hacer pull manualmente. Necesitamos un canal de tiempo real.

El sistema ya usa Supabase (ADR-0003), que expone Supabase Realtime basado en la replicación
lógica de PostgreSQL. La pregunta es cómo estructurar la suscripción y qué datos llegan en
el payload.

## Opciones consideradas

1. **WebSockets propios en NestJS** — máximo control, pero requiere gestionar conexiones,
   salas y reconexión desde cero.
2. **Supabase Realtime (`postgres_changes`)** — suscripción directa a cambios de tabla
   desde el cliente. El cliente recibe el row insertado/actualizado/eliminado en tiempo real.

## Decisión

Se usa Supabase Realtime con el canal `postgres_changes` directamente desde el frontend.
El patrón en el cliente es:

```
supabase
  .channel('plan-messages:<planId>')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'plan_messages',
    filter: `plan_id=eq.<planId>`,
  }, (payload) => { /* añadir mensaje a la lista */ })
  .subscribe()
```

### Gotcha: `plan_messages` no tiene `display_name`

La tabla `plan_messages` guarda `user_id`, `body` y `created_at`, pero **no** `display_name`
(ese campo vive en `app_users`). El payload de Realtime lleva solo los campos de la tabla
suscrita; los campos derivados de joins no están disponibles.

**Solución adoptada:** cuando llega un evento INSERT de `plan_messages`, el cliente:
1. Intenta resolver el `display_name` desde el caché local de participantes del plan
   (que se cargó al abrir el detalle del plan vía el read model `DrizzlePlansReadModel`).
2. Si el `user_id` del mensaje no está en el caché (caso raro: alguien entró al plan tras
   la carga inicial), lanza un refetch de participantes como respaldo.

## Consecuencias

**A favor**

- Sin código de WebSocket en el backend: Supabase gestiona la infraestructura de tiempo real.
- La latencia es la de PostgreSQL → Supabase Realtime → cliente, típicamente <300 ms.
- La RLS de Supabase se aplica a los cambios de Realtime: un cliente solo recibe filas
  para las que tiene permiso de lectura.

**En contra / trade-offs**

- El payload de Realtime es el row de la tabla, sin joins. Cualquier campo derivado de otra
  tabla (display_name, avatar) hay que resolverlo en el cliente.
- Si se añaden campos calculados o vistas, Realtime no los incluye automáticamente.
- La lógica de "resolver display_name desde el caché + refetch de respaldo" es código de
  cliente que hay que mantener.
- Realtime tiene un límite de canales simultáneos por proyecto en los planes gratuitos
  de Supabase.

## Notas de implementación

- Los mensajes del backend se insertan vía `DrizzlePlanMessageRepository.insert()`. Supabase
  Realtime los captura automáticamente por replicación lógica.
- El read model `DrizzlePlansReadModel.getPlanDetail()` devuelve `participants[]` con
  `displayName` incluido; el frontend los cachea para resolver nombres en mensajes nuevos.
- Para otras tablas (fridge_items, tasks, calendar_events), se aplica el mismo patrón de
  suscripción por `family_id`.
