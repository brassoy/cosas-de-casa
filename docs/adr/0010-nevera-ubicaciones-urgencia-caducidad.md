# ADR-0010: Nevera — ubicaciones (FRIDGE/FREEZER/PANTRY) y urgencia de caducidad

**Fecha:** 2026-05-26
**Estado:** Aceptado

## Contexto y problema

El contexto `fridge` gestiona los alimentos del hogar. Una nevera real tiene zonas con
comportamientos distintos: la zona de refrigeración, el congelador y la despensa. Tratar todo
como un único contenedor obliga al usuario a distinguir manualmente qué está frío y qué no.

Además, la detección de caducidad próxima (para avisos push y para la sugerencia de menú) no
debe estar en el frontend; tiene que ser una capacidad del dominio.

## Opciones consideradas

### Ubicaciones

1. **Campo de texto libre** — el usuario escribe "nevera", "congelador", etc.
2. **Enumerado `FridgeLocation`** con valores fijos (`FRIDGE`, `FREEZER`, `PANTRY`).

### Urgencia de caducidad

1. **Calcular la urgencia en el frontend** según la fecha que devuelve el backend.
2. **Exponer un repositorio/query específico** `findExpiringSoon(familyId, daysAhead)` en el
   puerto de dominio, que el backend usa tanto en el cron de notificaciones como en el endpoint
   de nevera.

## Decisión

Se usa el enumerado `FridgeLocation = 'FRIDGE' | 'FREEZER' | 'PANTRY'`. El valor por defecto
al crear un ítem sin ubicación explícita es `'FRIDGE'`.

La acción de dominio `freeze(now)` cambia la ubicación a `FREEZER` directamente desde el
agregado `FridgeItem`, sin necesidad de pasar un patch genérico.

La consulta `findExpiringSoon(familyId, daysAhead)` vive en el puerto
`FridgeItemRepository`. El servicio cron (`ExpiryReminderService`) lo llama con `daysAhead=2`
para buscar ítems que caducan en las próximas 48 horas. El endpoint
`GET /families/:familyId/fridge/expiring-soon` lo expone al frontend.

La cantidad se almacena como `string` numérico (p. ej. `"2.500"`) para evitar pérdida de
precisión con floats en JavaScript/PostgreSQL; la entidad hace `parseFloat` solo para
aritmética puntual y vuelve a serializar a string con precisión fija.

## Consecuencias

**A favor**

- El enumerado evita inconsistencias de texto libre y permite traducir etiquetas en el frontend.
- La acción `freeze()` expresa la intención de negocio mejor que un update genérico de campo.
- `findExpiringSoon` centraliza la lógica de ventana temporal; el cron y el endpoint comparten
  exactamente el mismo criterio.
- Almacenar cantidades como string evita el clásico bug de `0.1 + 0.2 ≠ 0.3`.

**En contra / trade-offs**

- El enumerado de tres valores puede quedarse corto si aparecen nuevas zonas (p. ej. bodega,
  armario de limpieza). Añadir un valor al enum es un cambio de schema no destructivo, pero
  requiere migración.
- Parsear y volver a serializar la cantidad en cada operación aritmética es levemente menos
  eficiente que usar `number`; irrelevante a esta escala.

## Notas de implementación

- `FridgeItem.eat(amount, now)` devuelve `boolean`: `true` si el ítem debe eliminarse (cantidad
  resultante ≤ 0 o sin cantidad), `false` si sigue existiendo. El caso de uso decide si borrar
  o actualizar según ese valor.
- `FridgeItem.throw_(now)` marca el timestamp de la operación pero la eliminación física la
  hace el caso de uso; se separan la intención de dominio y la persistencia.
- La tabla `fridge_items` tiene `expiry_date` como `date` de PostgreSQL (cadena YYYY-MM-DD),
  no como timestamp, para evitar problemas de zona horaria en comparaciones de fechas.
