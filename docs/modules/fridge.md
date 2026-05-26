# Módulo: fridge (nevera / despensa)

## Responsabilidad

Registrar y gestionar los alimentos del hogar: saber qué hay, dónde está y cuándo caduca.
Alimenta el sistema de notificaciones (recordatorios de caducidad) y la sugerencia de menú.

## Agregados y entidades

| Clase | Tipo | Descripción |
|---|---|---|
| `FridgeItem` | Entidad (aggregate) | Un producto con nombre, cantidad, ubicación y fecha de caducidad |

**Ubicaciones** (`FridgeLocation`): `FRIDGE` (nevera), `FREEZER` (congelador), `PANTRY`
(despensa). Por defecto `FRIDGE`.

**Acciones de dominio:**
- `eat(amount, now)` — consume parte del ítem; devuelve `true` si hay que eliminarlo.
- `freeze(now)` — mueve el ítem al congelador.
- `throw_(now)` — marca intención de tirar (la eliminación física la hace el caso de uso).
- `update(patch, now)` — patch parcial de campos editables.

**Cantidad**: almacenada como `string` numérico para evitar pérdida de precisión. Ver ADR-0010.

## Endpoints principales

| Verbo | Ruta | Descripción |
|---|---|---|
| POST | `/families/:familyId/fridge` | Añadir ítem |
| GET | `/families/:familyId/fridge` | Listar ítems |
| GET | `/families/:familyId/fridge/expiring-soon` | Ítems que caducan en ≤N días |
| GET | `/fridge/:itemId` | Obtener ítem |
| PATCH | `/fridge/:itemId` | Editar ítem |
| DELETE | `/fridge/:itemId` | Eliminar ítem |
| POST | `/fridge/:itemId/eat` | Consumir cantidad |
| POST | `/fridge/:itemId/freeze` | Mover al congelador |
| POST | `/fridge/:itemId/throw` | Tirar ítem (desperdiciar) |

## Puertos y adaptadores

| Puerto | Implementación | Rol |
|---|---|---|
| `FridgeItemRepository` | `DrizzleFridgeItemRepository` | Persistencia |
| `Clock` | `SystemClock` | Inyección de tiempo |
| `IdGenerator` | `UuidIdGenerator` | Generación de UUIDs |

**Método clave del repositorio**: `findExpiringSoon(familyId, daysAhead)` lo usa el cron de
notificaciones (`ExpiryReminderService`) y el endpoint de caducidad próxima.

## Decisiones locales

- La `expiryDate` se almacena como `date` de PostgreSQL (cadena YYYY-MM-DD), no como
  timestamp, para evitar problemas de zona horaria. Ver ADR-0010.
- El `FridgeItemScopeGuard` verifica que el ítem existe y pertenece a la familia del usuario.
- `fridge` es una dependencia del contexto `notifications` (cron) y del contexto `menu`
  (sugerencia basada en contenido de la nevera); ninguno de ellos crea el acoplamiento inverso.
