# Tiempo real con Supabase Realtime

→ Decisión de referencia: ADR-0013 (Realtime y gotcha de display_name).

## Qué es Supabase Realtime

Supabase Realtime usa la replicación lógica de PostgreSQL para detectar cambios en tablas
y enviarlos a los clientes suscritos a través de WebSockets. No hay código adicional en el
backend; es infraestructura de la plataforma.

El cliente se suscribe a cambios en una tabla concreta con un filtro:

```typescript
supabase
  .channel('plan-messages:abc-123')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'plan_messages',
    filter: 'plan_id=eq.abc-123',
  }, (payload) => {
    // payload.new contiene el row insertado
    addMessageToList(payload.new);
  })
  .subscribe();
```

## El payload que llega

El payload de Realtime contiene exactamente los campos de la tabla suscrita. Nada más.
Si la tabla tiene una columna `user_id` pero no `display_name`, el payload no incluirá
`display_name`, aunque esa información exista en otra tabla.

**Este es el gotcha central**: los campos calculados o que vienen de joins NO están en el
payload.

## El problema concreto: mensajes del plan

La tabla `plan_messages` tiene `user_id`, `body` y `created_at`. El `display_name` del
usuario vive en `app_users`. Cuando llega un mensaje nuevo por Realtime, el cliente tiene
el `user_id` pero no el nombre para mostrarlo.

**Solución adoptada:**

1. Cuando el usuario abre el detalle de un plan, el cliente llama al endpoint
   `GET /plans/:planId` que devuelve la lista de participantes con `displayName` incluido
   (via `DrizzlePlansReadModel` que hace el join con `app_users`).
2. El cliente guarda esos participantes en caché local.
3. Cuando llega un mensaje nuevo por Realtime, el cliente busca el `user_id` en ese caché.
4. Si el `user_id` no está en el caché (alguien se unió al plan después de que el cliente
   lo cargó), se lanza un refetch del detalle del plan para actualizar el caché.

## Regla general para Realtime en este proyecto

Antes de suscribirte a una tabla con Realtime, pregúntate:
- ¿Qué campos del payload necesito mostrar?
- ¿Todos esos campos están en la tabla, o algunos vienen de un join?

Si necesitas campos de otros tables, cárgalos previamente en caché o planifica el refetch.

## Seguridad

La RLS (Row Level Security) de Supabase se aplica también a los eventos de Realtime:
un cliente solo recibe cambios para los rows que tiene permiso de leer. No es necesario
filtrar manualmente en el cliente.

## Canales y nombres

Usa nombres de canal descriptivos y únicos por recurso:
- `plan-messages:<planId>`
- `fridge:<familyId>`
- `tasks:<familyId>`

Esto evita que un cliente reciba eventos de la familia de otro usuario si por algún motivo
los canales se cruzan.
