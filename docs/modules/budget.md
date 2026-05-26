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
