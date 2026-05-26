# Módulo: ai (inteligencia artificial transversal)

## Responsabilidad

Proporcionar capacidades de IA a otros contextos: extracción de artículos de la compra
a partir de lenguaje natural, deduplicación semántica basada en embeddings y catálogo de
artículos frecuentes por familia. Es un módulo de soporte; no tiene agregado de dominio
propio.

## Agregados y entidades

| Clase | Tipo | Descripción |
|---|---|---|
| `CatalogItemData` | Value object (puerto) | Artículo del catálogo con embedding, atributos normalizados y frecuencia |

No hay aggregate root. La unidad de persistencia es el `CatalogItem` (tabla Drizzle), accedido
exclusivamente a través del puerto `CatalogItemRepository`.

**Normalización**: `item-normalizer.ts` transforma el nombre introducido por el usuario
(ej. `"2 cajas de leche entera"`) en un nombre normalizado (`"leche"`) y un mapa de atributos
(`{ cantidad: "2", envase: "caja", grasa: "entera" }`). La normalización se aplica antes de
generar el embedding y antes de cualquier búsqueda.

**Política de dedup** (`dedup-policy.ts`): combina similitud coseno (pgvector, family-scoped)
con compatibilidad de atributos para decidir entre tres resultados:
- `ADD_NEW` — sin solapamiento suficiente.
- `AUTO_MERGE` — similitud ≥ 0,92 y atributos compatibles.
- `SUGGEST` — similitud entre 0,82 y 0,92, o atributos conflictivos (ej. grasa entera ≠ desnatada).

**Fallback sin embedding**: si `fastembed` no puede generar el vector, el dedup cae a
búsqueda por nombre normalizado exacto + compatibilidad de atributos.

## Endpoints principales

| Verbo | Ruta | Descripción |
|---|---|---|
| POST | `/ai/extract-items` | Extraer artículos de una frase (IA) |
| POST | `/families/:familyId/catalog/dedup-check` | Comprobar dedup semántico en el catálogo de la familia |
| GET | `/families/:familyId/frequent-items` | Artículos más frecuentes del catálogo |

## Casos de uso

### `ExtractItemsUseCase`

Extrae una lista de nombres de artículos de la compra a partir de una frase en lenguaje natural.

- **Endpoint**: `POST /ai/extract-items` · **Autorización**: `JwtAuthGuard` (cualquier
  usuario autenticado; sin scope de familia).
- **Entrada** (DTO: `ExtractItemsDto`; Zod: `ExtractItemsInputSchema`):
  - `phrase` — string, 1–500 caracteres, requerido.
- **Salida**: `string[]` → `ExtractItemsResponse` (`{ items: string[] }`).
- **Reglas/invariantes**: delega íntegramente en el puerto `ItemExtractionPort`
  (`MinimaxItemExtractionAdapter`). El adaptador usa `tool_choice` forzado contra MiniMax;
  si la IA no responde con el bloque `tool_use` esperado, hace fallback a parseo de texto
  plano (el caso de uso nunca lanza error de indisponibilidad).
- **Errores**: no hay error de dominio específico para este caso de uso. Si el adaptador
  lanza (p. ej. timeout), el error asciende como HTTP 500 sin filtro de dominio específico.

---

### `DedupCheckUseCase`

Comprueba si un nombre de artículo ya existe o es muy similar a otro en el catálogo de la
familia. Solo consulta; no modifica el catálogo.

- **Endpoint**: `POST /families/:familyId/catalog/dedup-check` · **Autorización**:
  `JwtAuthGuard` + `FamilyScopeGuard` (miembro de la familia).
- **Uso interno**: también se llama directamente desde `ShoppingListsController` durante
  el flujo `POST /lists/:listId/items`, sin pasar por este endpoint.
- **Entrada** (DTO: `DedupCheckDto`; Zod: `DedupCheckInputSchema`):
  - `name` — string, 1–200 caracteres, requerido.
  - `familyId` (param de ruta cuando se usa vía endpoint).
- **Salida**: `DedupCheckResult` → `DedupCheckResponse` (`{ decision, normalizedName, candidates }`).
- **Reglas/invariantes**: si `EmbeddingPort.embed` devuelve `null` (fastembed en fallback),
  la búsqueda cambia a `findByNormalizedName` (exacta) en lugar de `findSimilar` (vectorial).
  La política devuelve siempre exactamente una de las tres decisiones.
- **Errores**: ningún error de dominio propio; el fallo del embeddor se gestiona
  internamente con el fallback.

---

### `GetFrequentItemsUseCase`

Devuelve los artículos más añadidos al catálogo de una familia, ordenados por frecuencia
descendente.

- **Endpoint**: `GET /families/:familyId/frequent-items?limit=10` · **Autorización**:
  `JwtAuthGuard` + `FamilyScopeGuard` (miembro de la familia).
- **Entrada**:
  - `familyId` (param de ruta).
  - `limit` — entero 1–50, por defecto 10 (query param). El controller aplica `Math.max(1, Math.min(parseInt(limitRaw, 10) || 10, 50))`.
- **Salida**: `CatalogItemData[]` → `FrequentItemDto[]`.
- **Reglas/invariantes**: el límite se coerciona al rango [1, 50] tanto en el controller
  como en el caso de uso (`Math.max(1, Math.min(command.limit, 50))`), lo que asegura
  que nunca se solicite más de 50 sin importar lo que pase el cliente.
- **Errores**: ningún error de dominio propio.

---

### `UpsertCatalogItemUseCase`

Crea o actualiza un artículo en el catálogo de la familia, incrementando su frecuencia.
No expone endpoint propio: es un caso de uso interno invocado en fire-and-forget desde
`ShoppingListsController` tras añadir un artículo a una lista.

- **Endpoint**: Interno (no expone endpoint).
- **Entrada**:
  - `familyId` — UUID.
  - `displayName` — nombre tal como lo introdujo el usuario (sin normalizar).
- **Salida**: `CatalogItemData` (ignorado por el caller en el flujo fire-and-forget).
- **Reglas/invariantes**: normaliza el nombre antes del upsert. Genera el embedding con
  `EmbeddingPort`; si el embeddor devuelve `null`, el `upsert` se llama con
  `embedding: null` (el artículo queda en catálogo pero no participa en búsqueda vectorial
  hasta la próxima actualización con embedding disponible).
- **Errores**: los fallos se capturan en el caller con `.catch()` y se registran en log;
  no se propagan al usuario.

## Puertos y adaptadores

| Puerto | Implementación | Rol |
|---|---|---|
| `EmbeddingPort` | `FastembedEmbeddingAdapter` | Genera embeddings locales (fastembed); devuelve `null` si no está listo |
| `ItemExtractionPort` | `MinimaxItemExtractionAdapter` | Extrae artículos de texto con MiniMax (tool_choice forzado) |
| `CatalogItemRepository` | `DrizzleCatalogItemRepository` | Persistencia del catálogo con pgvector (búsqueda por similitud coseno) |

## Decisiones locales

- El embedding se genera localmente con `fastembed` para no depender de una API externa
  en el camino crítico. Si el modelo no está descargado, devuelve `null` y el dedup degrada
  a búsqueda por nombre exacto. Ver ADR-0007.
- Los umbrales de similitud son: AUTO_MERGE ≥ 0,92; SUGGEST ∈ [0,82, 0,92); ADD_NEW < 0,82.
  Están definidos como constantes en `dedup-policy.ts`.
- La búsqueda de candidatos está acotada a `familyId` (no hay contaminación entre familias).
- `DedupCheckUseCase` se usa desde dos sitios: el endpoint propio y el controller de shopping.
  La duplicación de lógica en el controller es intencionada para evitar un servicio de aplicación
  transversal; la dependencia es directa e import tipado. Ver ADR-0007.
- Los servicios de IA son "gated": el adaptador de MiniMax lanza `AiUnavailableError` si la
  respuesta no es parseable. En `ExtractItemsUseCase` hay fallback a parseo de texto plano
  (no lanza). En el contexto `menu` no hay fallback. Ver ADR-0014.
