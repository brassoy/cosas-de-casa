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
| GET | `/fridge-items/:itemId` | Obtener ítem |
| PATCH | `/fridge-items/:itemId` | Editar ítem |
| DELETE | `/fridge-items/:itemId` | Eliminar ítem |
| POST | `/fridge-items/:itemId/eat` | Consumir cantidad |
| POST | `/fridge-items/:itemId/freeze` | Mover al congelador |
| POST | `/fridge-items/:itemId/throw` | Tirar ítem (desperdiciar) |

> El caso de uso `GetExpiringSoonUseCase` (ítems que caducan pronto) **no** tiene endpoint HTTP:
> lo consume internamente el cron de notificaciones. Ver su ficha más abajo.

## Casos de uso

### `AddFridgeItemUseCase`
Añade un nuevo producto al inventario de la nevera/despensa de una familia.
- **Endpoint**: `POST /families/:familyId/fridge` · **Autorización**: `JwtAuthGuard` + `FamilyScopeGuard` (miembro de la familia).
- **Entrada**: `name` string 1–200 (requerido); `quantity` string numérico positivo (opcional); `unit` string 0–50 (opcional); `location` enum `FRIDGE|FREEZER|PANTRY` (opcional, por defecto `FRIDGE`); `expiryDate` ISO 8601 (opcional).
- **Salida**: `FridgeItem` → `FridgeItemDto`.
- **Reglas/invariantes**: el nombre se recorta y no puede quedar vacío. Si `quantity` se indica, debe ser un número positivo (validado por `IsNumberString` en el DTO y por `validateQuantity` en el dominio). `location` por defecto es `FRIDGE`.
- **Errores**: `FridgeItemNameEmptyError` → 422 · `FridgeItemInvalidQuantityError` → 422.

---

### `ListFridgeItemsUseCase`
Devuelve todos los ítems de la nevera de una familia, ordenados por fecha de caducidad ascendente (nulos al final).
- **Endpoint**: `GET /families/:familyId/fridge` · **Autorización**: `JwtAuthGuard` + `FamilyScopeGuard` (miembro de la familia).
- **Entrada**: `familyId` UUID v4 (path param).
- **Salida**: `FridgeItem[]` → `FridgeItemDto[]`.
- **Reglas/invariantes**: el orden lo aplica el repositorio (`findByFamily`). No admite filtros adicionales.
- **Errores**: ninguno de dominio propio.

---

### `GetFridgeItemUseCase`
Obtiene un ítem de nevera por su identificador.
- **Endpoint**: `GET /fridge-items/:itemId` · **Autorización**: `JwtAuthGuard` + `FridgeItemScopeGuard` (miembro de la familia del ítem).
- **Entrada**: `itemId` UUID v4 (path param).
- **Salida**: `FridgeItem` → `FridgeItemDto`.
- **Reglas/invariantes**: el `FridgeItemScopeGuard` valida existencia y membresía antes de invocar el caso de uso.
- **Errores**: `FridgeItemNotFoundError` → 404.

---

### `UpdateFridgeItemUseCase`
Aplica un patch parcial sobre los campos editables de un ítem.
- **Endpoint**: `PATCH /fridge-items/:itemId` · **Autorización**: `JwtAuthGuard` + `FridgeItemScopeGuard` (miembro de la familia del ítem).
- **Entrada**: `name` string 1–200 (opcional); `quantity` string numérico o `null` (opcional); `unit` string 0–50 o `null` (opcional); `location` enum `FRIDGE|FREEZER|PANTRY` (opcional); `expiryDate` ISO 8601 o `null` (opcional).
- **Salida**: `FridgeItem` → `FridgeItemDto`.
- **Reglas/invariantes**: si `quantity` no es `null`, debe ser positiva. Pasar `null` en `quantity` o `unit` borra el valor. `location` no admite `null` (si no se envía, no cambia).
- **Errores**: `FridgeItemNotFoundError` → 404 · `FridgeItemNameEmptyError` → 422 · `FridgeItemInvalidQuantityError` → 422.

---

### `DeleteFridgeItemUseCase`
Elimina un ítem del inventario.
- **Endpoint**: `DELETE /fridge-items/:itemId` · **Autorización**: `JwtAuthGuard` + `FridgeItemScopeGuard` (miembro de la familia del ítem).
- **Entrada**: `itemId` UUID v4 (path param).
- **Salida**: `void` (HTTP 204).
- **Reglas/invariantes**: verifica existencia antes de eliminar.
- **Errores**: `FridgeItemNotFoundError` → 404.

---

### `EatFridgeItemUseCase`
Consume parte o todo un ítem. Si la cantidad resultante es 0 o el ítem no tiene cantidad, lo elimina del inventario.
- **Endpoint**: `POST /fridge-items/:itemId/eat` · **Autorización**: `JwtAuthGuard` + `FridgeItemScopeGuard` (miembro de la familia del ítem).
- **Entrada**: `amount` string numérico positivo (opcional). Si se omite, el ítem se elimina directamente.
- **Salida**: `{ deleted: boolean; itemId: string }` (HTTP 200).
- **Reglas/invariantes**:
  - Si el ítem no tiene `quantity` registrada → se elimina (`deleted: true`).
  - Si `amount` se omite → se elimina (`deleted: true`).
  - Si `amount` > `quantity` actual → error de cantidad insuficiente.
  - Si la cantidad restante es ≤ 0 → se elimina (`deleted: true`).
  - En caso contrario → se actualiza `quantity` y devuelve `deleted: false`.
- **Errores**: `FridgeItemNotFoundError` → 404 · `FridgeItemInvalidQuantityError` → 422 · `FridgeItemInsufficientQuantityError` → 409.

---

### `ThrowFridgeItemUseCase`
Tira un ítem (desperdicio), eliminándolo del inventario.
- **Endpoint**: `POST /fridge-items/:itemId/throw` · **Autorización**: `JwtAuthGuard` + `FridgeItemScopeGuard` (miembro de la familia del ítem).
- **Entrada**: `itemId` UUID v4 (path param; sin body).
- **Salida**: `void` (HTTP 204).
- **Reglas/invariantes**: semánticamente distinto de `DeleteFridgeItemUseCase` (representa desperdicio, no eliminación manual). La eliminación física es idéntica; la distinción está en la intención y podrá alimentar estadísticas en el futuro.
- **Errores**: `FridgeItemNotFoundError` → 404.

---

### `FreezeFridgeItemUseCase`
Mueve un ítem al congelador cambiando su `location` a `FREEZER`.
- **Endpoint**: `POST /fridge-items/:itemId/freeze` · **Autorización**: `JwtAuthGuard` + `FridgeItemScopeGuard` (miembro de la familia del ítem).
- **Entrada**: `itemId` UUID v4 (path param; sin body).
- **Salida**: `FridgeItem` → `FridgeItemDto` (HTTP 200).
- **Reglas/invariantes**: no hay restricción sobre la `location` actual antes de congelar (se puede congelar un ítem ya en `FREEZER` — la operación es idempotente en términos de estado).
- **Errores**: `FridgeItemNotFoundError` → 404.

---

### `GetExpiringSoonUseCase`
Obtiene los ítems que caducan en los próximos N días. Interno al módulo: está registrado como provider pero **no está expuesto en el controller** (sin endpoint HTTP en este momento). Lo consume el cron de notificaciones (`ExpiryReminderService`) del contexto `notifications`.
- **Endpoint**: Interno (no expone endpoint HTTP; lo consume el cron de notificaciones).
- **Entrada**: `familyId` string; `days` número (por defecto `2`).
- **Salida**: `FridgeItem[]`.
- **Reglas/invariantes**: delega en `FridgeItemRepository.findExpiringSoon(familyId, days)`. El valor por defecto de `days` es 2.
- **Errores**: ninguno de dominio propio.

## Puertos y adaptadores

| Puerto | Implementación | Rol |
|---|---|---|
| `FridgeItemRepository` | `DrizzleFridgeItemRepository` | Persistencia |
| `Clock` | `SystemClock` | Inyección de tiempo |
| `IdGenerator` | `UuidIdGenerator` | Generación de UUIDs |

**Método clave del repositorio**: `findExpiringSoon(familyId, daysAhead)` lo usa el cron de
notificaciones (`ExpiryReminderService`).

## Decisiones locales

- La `expiryDate` se almacena como `date` de PostgreSQL (cadena YYYY-MM-DD), no como
  timestamp, para evitar problemas de zona horaria. Ver ADR-0010.
- El `FridgeItemScopeGuard` verifica que el ítem existe y pertenece a la familia del usuario.
- `fridge` es una dependencia del contexto `notifications` (cron) y del contexto `menu`
  (sugerencia basada en contenido de la nevera); ninguno de ellos crea el acoplamiento inverso.
