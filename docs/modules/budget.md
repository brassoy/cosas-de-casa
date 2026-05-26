# Módulo: budget (presupuesto y tickets de compra)

## Responsabilidad

Registrar los gastos del hogar mediante tickets de compra (manuales o por OCR con IA) y
obtener resúmenes de gasto por categoría y periodo.

## Agregados y entidades

| Clase | Tipo | Descripción |
|---|---|---|
| `Receipt` | Aggregate root | Ticket de compra con comercio, fecha, total, moneda y líneas |
| `ReceiptLine` | Value object | Línea del ticket (descripción, cantidad, precio, categoría) |

**Categorías de gasto** (`SpendCategory`): `groceries`, `household`, `dining_out`, `leisure`,
`other`.

**Estado del ticket** (`ReceiptStatus`): `draft` (extraído por IA, pendiente de confirmar) o
`confirmed` (creado manualmente o confirmado por el usuario).

**Importes como `string`/`numeric`**: `total`, `unitPrice` y `lineTotal` se almacenan como
`numeric` en PostgreSQL y se transportan como `string` en el dominio. Ver ADR-0014.

## Endpoints principales

| Verbo | Ruta | Descripción |
|---|---|---|
| POST | `/families/:familyId/receipts/extract` | OCR de ticket con IA (5 req/min) |
| POST | `/families/:familyId/receipts` | Crear ticket manualmente |
| GET | `/families/:familyId/receipts` | Listar resúmenes de tickets |
| GET | `/families/:familyId/spend-summary` | Resumen de gasto por categoría y mes |
| GET | `/receipts/:receiptId` | Obtener ticket completo con líneas |
| PATCH | `/receipts/:receiptId` | Editar ticket (incluye reemplazo de líneas) |
| DELETE | `/receipts/:receiptId` | Eliminar ticket |

## Casos de uso

### `ExtractReceiptUseCase`
Extrae los datos de un ticket de compra a partir de una imagen en base64, usando OCR con IA (MiniMax vía SDK Anthropic).
- **Endpoint**: `POST /families/:familyId/receipts/extract` · **Autorización**: `JwtAuthGuard` + `FamilyScopeGuard` (miembro de la familia) + `RateLimitGuard` (5 req/min).
- **Entrada**: `imageBase64` string no vacío, máx. 4 000 000 chars (~3 MB en binario); JPEG o PNG.
- **Salida**: `ExtractReceiptResult` → `ExtractReceiptResponse` (merchant, purchasedAt, total, currency, lines — todos opcionales excepto `lines[]`).
- **Reglas/invariantes**: el límite de 5 peticiones por minuto está aplicado en el propio endpoint (`@RateLimit`), no en la familia en su conjunto. El cliente comprime la imagen antes de enviarla.
- **Errores**: `AiUnavailableError` → 503.

---

### `CreateReceiptUseCase`
Crea un ticket de compra de forma manual (con o sin líneas) y lo persiste con estado `confirmed`.
- **Endpoint**: `POST /families/:familyId/receipts` · **Autorización**: `JwtAuthGuard` + `FamilyScopeGuard` (miembro de la familia).
- **Entrada**: `merchant` string máx. 200 (opcional); `purchasedAt` string ISO date YYYY-MM-DD (requerido); `total` number ≥ 0 (requerido); `currency` string máx. 3, por defecto `EUR` (opcional); `imagePath` string (opcional); `lines[]` (opcional): cada línea lleva `description` 1–300, `quantity` number > 0, `unitPrice` number ≥ 0, `lineTotal` number ≥ 0, `category` enum `SpendCategory`.
- **Salida**: `Receipt` → `ReceiptDto` (con `lines[]`, `createdBy`, `createdAt`). El controlador convierte `total` y campos monetarios de `number` a `string` antes de pasar el comando al caso de uso (ADR-0014).
- **Reglas/invariantes**: `total` se almacena como `numeric` (string en dominio); no puede ser negativo. Cada `lineTotal` tampoco puede ser negativo. El estado inicial es siempre `confirmed`.
- **Errores**: `ReceiptInvalidTotalError` → 422 · `ReceiptLineTotalNegativeError` → 422.

---

### `ListReceiptsUseCase`
Devuelve el listado de resúmenes de tickets de una familia (sin líneas).
- **Endpoint**: `GET /families/:familyId/receipts` · **Autorización**: `JwtAuthGuard` + `FamilyScopeGuard` (miembro de la familia).
- **Entrada**: `familyId` UUID v4 (path param).
- **Salida**: `Receipt[]` → `ReceiptSummaryDto[]` (id, merchant, purchasedAt, total, currency, status, lineCount). Sin paginación en esta versión.
- **Reglas/invariantes**: ninguna adicional; devuelve todos los tickets de la familia sin filtros.
- **Errores**: ninguno de dominio propio.

---

### `GetSpendSummaryUseCase`
Agrega el gasto de una familia en un rango de fechas, desglosado por categoría y por mes.
- **Endpoint**: `GET /families/:familyId/spend-summary` · **Autorización**: `JwtAuthGuard` + `FamilyScopeGuard` (miembro de la familia).
- **Entrada** (query params): `from` string YYYY-MM-DD (opcional, defecto `0001-01-01`); `to` string YYYY-MM-DD (opcional, defecto `9999-12-31`). Sin rango equivale a todo el histórico.
- **Salida**: `SpendSummaryRow` → `SpendSummaryDto` (total, currency, byCategory[], byMonth[]). La agregación SQL está en el repositorio.
- **Reglas/invariantes**: los valores monetarios del repositorio llegan como `string` (`numeric` de PG) y el presenter los convierte con `parseFloat` antes de devolverlos como `number` al contrato.
- **Errores**: ninguno de dominio propio.

---

### `GetReceiptUseCase`
Obtiene un ticket completo con todas sus líneas.
- **Endpoint**: `GET /receipts/:receiptId` · **Autorización**: `JwtAuthGuard` + `ReceiptScopeGuard` (miembro de la familia propietaria del ticket).
- **Entrada**: `receiptId` UUID v4 (path param).
- **Salida**: `Receipt` → `ReceiptDto` (con `lines[]` completas).
- **Reglas/invariantes**: `ReceiptScopeGuard` verifica existencia del ticket y membresía antes de invocar el caso de uso.
- **Errores**: `ReceiptNotFoundError` → 404.

---

### `UpdateReceiptUseCase`
Aplica un patch parcial sobre un ticket. Si se incluye `lines`, reemplaza completamente las líneas existentes.
- **Endpoint**: `PATCH /receipts/:receiptId` · **Autorización**: `JwtAuthGuard` + `ReceiptScopeGuard` (miembro de la familia propietaria del ticket).
- **Entrada**: `merchant` string máx. 200 (opcional); `purchasedAt` ISO date (opcional); `total` number ≥ 0 (opcional); `currency` string máx. 3 (opcional); `status` enum `draft|confirmed` (opcional); `imagePath` string (opcional); `lines[]` (opcional): igual que en creación pero con `id` UUID opcional para preservar líneas existentes.
- **Salida**: `Receipt` → `ReceiptDto` actualizado.
- **Reglas/invariantes**: si `lines` se incluye en el cuerpo, la operación es un reemplazo completo (no merge de líneas individuales). Las líneas con `id` conocido preservan su UUID.
- **Errores**: `ReceiptNotFoundError` → 404 · `ReceiptInvalidTotalError` → 422 · `ReceiptLineTotalNegativeError` → 422.

---

### `DeleteReceiptUseCase`
Elimina un ticket de compra (y en cascada sus líneas).
- **Endpoint**: `DELETE /receipts/:receiptId` · **Autorización**: `JwtAuthGuard` + `ReceiptScopeGuard` (miembro de la familia propietaria del ticket).
- **Entrada**: `receiptId` UUID v4 (path param).
- **Salida**: `void` (HTTP 204).
- **Reglas/invariantes**: ninguna adicional; la existencia ya la verifica el caso de uso antes de delegar al repositorio.
- **Errores**: `ReceiptNotFoundError` → 404.

---

## Puertos y adaptadores

| Puerto | Implementación | Rol |
|---|---|---|
| `ReceiptRepository` | `DrizzleReceiptRepository` | Persistencia de tickets y líneas |
| `ReceiptOcrPort` | `MinimaxReceiptOcrAdapter` | OCR de imagen vía MiniMax (SDK Anthropic) |
| `Clock` | `SystemClock` | Inyección de tiempo |
| `IdGenerator` | `UuidIdGenerator` | Generación de UUIDs |

## Decisiones locales

- Si la IA no está disponible, `ReceiptOcrPort` lanza `AiUnavailableError` → HTTP 503.
  El endpoint de extracción devuelve 503 y el cliente muestra el formulario manual. Ver ADR-0014.
- El adaptador de OCR recibe la imagen como base64 en el cuerpo de la petición; la
  compresión es responsabilidad del cliente antes de enviar.
- `GetSpendSummaryUseCase` agrupa los tickets por categoría y mes en el periodo indicado;
  la lógica de agregación está en el repositorio con SQL de agrupación.
- `ReceiptScopeGuard` verifica que el ticket pertenece a la familia del usuario.
- Las líneas se reemplazan completamente en `updateReceipt` (no hay patch de línea
  individual); simplifica la implementación al coste de re-crear todas las líneas.
