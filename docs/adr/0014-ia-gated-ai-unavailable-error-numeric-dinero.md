# ADR-0014: Capa de IA gated — puertos con AiUnavailableError, HTTP 503 y degradación elegante; dinero como numeric nunca float

**Fecha:** 2026-05-26
**Estado:** Aceptado

## Contexto y problema

Tres contextos usan IA (MiniMax a través del SDK Anthropic): `ai` (extracción de voz/items),
`menu` (sugerencia de menú) y `budget` (OCR de tickets). La IA es un servicio externo que
puede no estar disponible (sin saldo, sin conexión, rate limit). Además, el contexto `budget`
maneja importes monetarios que no pueden perder precisión.

## Opciones consideradas

### Degradación de la IA

1. **Propagar el error HTTP del proveedor** tal cual — el cliente recibe un 500 o un error
   críptico de MiniMax.
2. **Puerto gated con error de dominio específico** (`AiUnavailableError` / `MenuAiUnavailableError`)
   → el filtro de errores lo convierte en HTTP 503 con mensaje legible; el cliente muestra un
   aviso y permite alta manual.

### Dinero en base de datos

1. **`float` / `double precision`** — sencillo pero sujeto a errores de representación
   en punto flotante (0.1 + 0.2 = 0.30000000000004).
2. **`numeric` de PostgreSQL** (precisión exacta) almacenado y transportado como `string`
   en el dominio y los DTOs.

## Decisión

**IA gated**: cada puerto de IA (`MenuSuggestionPort`, `ReceiptOcrPort`) tiene como contrato
explícito en su JSDoc que DEBE lanzar el error de indisponibilidad correspondiente cuando la IA
falla. Los adaptadores (`MinimaxMenuSuggestionAdapter`, `MinimaxReceiptOcrAdapter`) capturan
todos los errores del SDK, detectan mensajes de balance/auth/rate y los mapean al error de
dominio. El filtro de errores de cada contexto convierte ese error en HTTP 503 con cuerpo
`{ message: "Servicio de IA no disponible. Puedes añadir los datos manualmente." }`.

Consecuencia UX: el endpoint de extracción de ticket y el de sugerencia de menú devuelven 503
cuando la IA no está disponible. El cliente muestra el formulario manual en lugar de un error
genérico.

**Dinero como `numeric`/`string`**: los campos `total`, `unit_price` y `line_total` en
`receipts` y `receipt_lines` son de tipo `numeric` en PostgreSQL. Drizzle los devuelve como
`string`. El dominio (`Receipt`, `ReceiptLine`) los almacena como `string` y hace `parseFloat`
solo para validar que no son negativos. Los DTOs transportan los importes como `number`
(para JSON estándar) pero con exactitud garantizada por el tipo `numeric` en la fuente.

## Consecuencias

**A favor**

- El dominio no sabe qué proveedor de IA se usa: solo conoce el puerto y su contrato de error.
- Cambiar de MiniMax a otro proveedor (OpenAI, Anthropic directo) solo requiere un nuevo
  adaptador; el dominio y los casos de uso no cambian.
- HTTP 503 es semánticamente correcto para "servicio externo temporalmente no disponible" y
  permite que el cliente distinga entre error propio y error de dependencia.
- `numeric` en PostgreSQL tiene hasta 131072 dígitos antes del punto decimal; no hay pérdida
  de precisión con importes monetarios reales.
- El rate limiter del controller de OCR (5 req/min) reduce el coste de llamadas a la IA.

**En contra / trade-offs**

- El error de dominio `AiUnavailableError` no está en un paquete compartido: cada contexto
  define el suyo propio (`MenuAiUnavailableError`, `AiUnavailableError` en budget). Si se
  necesita un comportamiento unificado, habría que factorizarlo a `@cosasdecasa/contracts`
  o a un shared kernel.
- Transportar importes como `string` en el dominio y `number` en DTOs requiere conversión
  explícita en el presenter (`String(body.total)`, `Number(row.total)`). Un descuido puede
  reintroducir el float.

## Notas de implementación

- Los adaptadores detectan los mensajes de error de balance/auth con una lista de
  palabras clave (`'balance'`, `'credit'`, `'quota'`, `'rate'`, `'auth'`, etc.) para no
  depender de códigos de error concretos del proveedor.
- El endpoint `POST /families/:familyId/receipts/extract` tiene un `RateLimitGuard` de
  5 req/min para limitar el coste en producción.
- El endpoint `POST /families/:familyId/menu/suggest` tiene el mismo guard con la misma
  configuración.
- En dev con MiniMax sin saldo, los adaptadores lanzan `AiUnavailableError` inmediatamente,
  lo que permite probar el flujo de degradación sin consumir créditos.
