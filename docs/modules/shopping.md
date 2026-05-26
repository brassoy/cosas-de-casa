# Módulo: shopping (listas de la compra)

## Responsabilidad

Gestionar las listas de la compra de una familia: crear listas personalizadas, añadir,
editar y eliminar artículos, marcarlos como comprados y añadir comentarios sobre ellos.
El flujo de adición integra dedup semántico del contexto `ai` para evitar duplicados.

## Agregados y entidades

| Clase | Tipo | Descripción |
|---|---|---|
| `ShoppingList` | Aggregate root | Lista de la compra con nombre y tipo (`MAIN` / `CUSTOM`) |
| `ShoppingItem` | Entidad | Artículo con nombre, cantidad, unidad, estado y posición |
| `ItemComment` | Entidad | Comentario inmutable asociado a un artículo |

**Tipos de lista**: `MAIN` — lista principal de la familia, existe siempre y no puede borrarse
(invariante protegida en `ShoppingList.assertDeletable`). `CUSTOM` — lista personalizada creada
por un miembro.

**Provisioning perezoso**: si la familia no tiene aún lista `MAIN`, `EnsureAndListListsUseCase`
la crea en el momento del primer `GET /families/:familyId/lists`. El dominio garantiza que solo
puede existir una lista `MAIN` por familia (`MainListAlreadyExistsError`).

## Endpoints principales

| Verbo | Ruta | Descripción |
|---|---|---|
| GET | `/families/:familyId/lists` | Listar listas (crea la MAIN si no existe) |
| POST | `/families/:familyId/lists` | Crear lista personalizada |
| GET | `/lists/:listId` | Obtener lista con todos sus artículos |
| POST | `/lists/:listId/items` | Añadir artículo (con dedup semántico) |
| DELETE | `/lists/:listId` | Eliminar lista personalizada |
| PATCH | `/items/:itemId` | Editar artículo (patch parcial) |
| DELETE | `/items/:itemId` | Eliminar artículo |
| GET | `/items/:itemId/comments` | Listar comentarios de un artículo |
| POST | `/items/:itemId/comments` | Añadir comentario a un artículo |

## Casos de uso

### `EnsureAndListListsUseCase`

Devuelve todas las listas de la familia; si no existe la `MAIN`, la crea antes de responder
(provisioning perezoso).

- **Endpoint**: `GET /families/:familyId/lists` · **Autorización**: `JwtAuthGuard` +
  `FamilyScopeGuard` (miembro de la familia).
- **Entrada**: `familyId` (UUID, param de ruta), `actingUserId` (del JWT).
- **Salida**: `ShoppingList[]` → `ShoppingListSummaryDto[]`.
- **Reglas/invariantes**: si no hay lista `MAIN`, se crea usando `ShoppingList.createMain`
  (que pasando `null` como lista existente garantiza que no se duplique a nivel de dominio;
  el repositorio tiene además un índice parcial único en BD como respaldo).
- **Errores**: ningún error de dominio propio; `MainListAlreadyExistsError` solo puede
  surgir si se rompe el invariante de BD (race condition extrema).

---

### `CreateCustomListUseCase`

Crea una lista de tipo `CUSTOM` para la familia.

- **Endpoint**: `POST /families/:familyId/lists` · **Autorización**: `JwtAuthGuard` +
  `FamilyScopeGuard` (miembro de la familia).
- **Entrada**:
  - `name` — string, 1–100 caracteres, requerido (DTO: `CreateListDto`; Zod: `CreateListInputSchema`).
  - `familyId` (param de ruta), `actingUserId` (del JWT).
- **Salida**: `ShoppingList` → `ShoppingListSummaryDto`.
- **Reglas/invariantes**: se puede crear cualquier número de listas `CUSTOM`.
  El nombre se recorta con `trim()` antes de llegar al caso de uso.
- **Errores**: ningún error de dominio propio en el caso de uso (la validación de nombre vacío
  la haría `ShoppingItem.create`, no aplica aquí).

---

### `GetListWithItemsUseCase`

Carga una lista junto con todos sus artículos.

- **Endpoint**: `GET /lists/:listId` · **Autorización**: `JwtAuthGuard` + `ListScopeGuard`
  (el guard verifica que el usuario sea miembro de la familia de esa lista).
- **Entrada**: `listId` (UUID, param de ruta).
- **Salida**: `{ list: ShoppingList, items: ShoppingItem[] }` → `ListWithItemsDto`.
- **Reglas/invariantes**: ninguna más allá de la existencia de la lista.
- **Errores**: `ListNotFoundError` → HTTP 404.

---

### `AddItemUseCase` (con orquestación de dedup en el controller)

Crea un nuevo `ShoppingItem` en la lista. Nota: el flujo completo de adición lo orquesta
`ShoppingListsController.addItemToList`, que envuelve este caso de uso con el dedup semántico
del contexto `ai` y la actualización del catálogo.

**Flujo completo del controller** (`POST /lists/:listId/items`):
1. Carga la lista para obtener el `familyId` (necesario para acotar el catálogo).
2. Llama a `DedupCheckUseCase` → decisión `ADD_NEW | AUTO_MERGE | SUGGEST`.
3. Si la decisión es `SUGGEST` y el body no incluye `forceAdd: true`, devuelve
   inmediatamente `{ decision: 'SUGGEST', candidates }` sin crear el artículo.
4. En cualquier otro caso (`ADD_NEW`, `AUTO_MERGE`, o `SUGGEST` con `forceAdd: true`)
   llama a `AddItemUseCase.execute`.
5. Llama a `UpsertCatalogItemUseCase` en fire-and-forget (no bloquea la respuesta;
   el fallo se registra en log pero no revierte la adición del artículo).

- **Endpoint**: `POST /lists/:listId/items` · **Autorización**: `JwtAuthGuard` +
  `ListScopeGuard` (miembro de la familia).
- **Entrada** (DTO: `AddItemDto`; Zod: `AddItemInputSchema`):
  - `name` — string, 1–200 caracteres, requerido. Se recorta con `trim()`.
  - `quantity` — number, positivo, opcional.
  - `unit` — string, máx. 50 caracteres, opcional.
  - `description` — string, máx. 500 caracteres, opcional.
  - `purchaseLink` — URL, opcional.
  - `forceAdd` — boolean, opcional. Si `true`, omite el bloqueo por `SUGGEST`.
- **Salida**: `ShoppingItem` → `AddItemResultDto` (`{ decision, item?, candidates? }`).
- **Reglas/invariantes**: el nombre del artículo no puede estar vacío tras el `trim()`
  (lanzado en `ShoppingItem.create` → `ItemNameEmptyError`). La lista debe existir.
- **Errores**:
  - `ListNotFoundError` → HTTP 404 (tanto en el guard como en el caso de uso).
  - `ItemNameEmptyError` → HTTP 422.

---

### `UpdateItemUseCase`

Edita campos de un artículo existente (patch parcial). Permite también invertir el estado
`checked` de forma explícita.

- **Endpoint**: `PATCH /items/:itemId` · **Autorización**: `JwtAuthGuard` +
  `ItemScopeGuard` (el guard verifica que el usuario sea miembro de la familia del artículo,
  recorriendo ítem → lista → familia).
- **Entrada** (DTO: `UpdateItemDto`; Zod: `UpdateItemInputSchema`): todos los campos opcionales:
  - `name` — string, 1–200 caracteres.
  - `quantity` — number positivo o `null`.
  - `unit` — string máx. 50 o `null`.
  - `description` — string máx. 500 o `null`.
  - `purchaseLink` — URL o `null`.
  - `checked` — boolean.
  - `position` — entero positivo o `null`.
- **Salida**: `ShoppingItem` → `ShoppingItemDto`.
- **Reglas/invariantes**: si `checked` viene en el patch y difiere del estado actual,
  se llama a `item.toggleChecked(now)` antes del `item.update(...)`. Si `name` se envía
  vacío (solo espacios), `item.update` lanza `ItemNameEmptyError`.
- **Errores**:
  - `ItemNotFoundError` → HTTP 404.
  - `ItemNameEmptyError` → HTTP 422.

---

### `DeleteItemUseCase`

Elimina un artículo de una lista.

- **Endpoint**: `DELETE /items/:itemId` · **Autorización**: `JwtAuthGuard` +
  `ItemScopeGuard`.
- **Entrada**: `itemId` (UUID, param de ruta).
- **Salida**: `void` → HTTP 204.
- **Reglas/invariantes**: el artículo debe existir.
- **Errores**: `ItemNotFoundError` → HTTP 404.

---

### `DeleteCustomListUseCase`

Elimina una lista de tipo `CUSTOM`. La lista `MAIN` no puede borrarse.

- **Endpoint**: `DELETE /lists/:listId` · **Autorización**: `JwtAuthGuard` +
  `ListScopeGuard`.
- **Entrada**: `listId` (UUID, param de ruta).
- **Salida**: `void` → HTTP 204.
- **Reglas/invariantes**: `list.assertDeletable()` lanza `CannotDeleteMainListError` si
  la lista es de tipo `MAIN`.
- **Errores**:
  - `ListNotFoundError` → HTTP 404.
  - `CannotDeleteMainListError` → HTTP 409.

---

### `AddCommentUseCase`

Añade un comentario a un artículo. Los comentarios son inmutables una vez creados.

- **Endpoint**: `POST /items/:itemId/comments` · **Autorización**: `JwtAuthGuard` +
  `ItemScopeGuard`.
- **Entrada** (DTO: `AddCommentDto`; Zod: `AddCommentInputSchema`):
  - `body` — string, 1–1000 caracteres, requerido.
- **Salida**: `ItemComment` → `ItemCommentDto`.
- **Reglas/invariantes**: el artículo debe existir. El `authorId` proviene del JWT
  (campo `actingUserId`); puede ser `null` si el usuario se ha eliminado.
- **Errores**: `ItemNotFoundError` → HTTP 404.

---

### `ListCommentsUseCase`

Devuelve todos los comentarios de un artículo.

- **Endpoint**: `GET /items/:itemId/comments` · **Autorización**: `JwtAuthGuard` +
  `ItemScopeGuard`.
- **Entrada**: `itemId` (UUID, param de ruta).
- **Salida**: `ItemComment[]` → `ItemCommentDto[]`.
- **Reglas/invariantes**: el artículo debe existir.
- **Errores**: `ItemNotFoundError` → HTTP 404.

## Puertos y adaptadores

| Puerto | Implementación | Rol |
|---|---|---|
| `ShoppingListRepository` | `DrizzleShoppingListRepository` | Persistencia de listas |
| `ShoppingItemRepository` | `DrizzleShoppingItemRepository` | Persistencia de artículos |
| `ItemCommentRepository` | `DrizzleItemCommentRepository` | Persistencia de comentarios |
| `ShoppingClock` | Reloj del sistema | Inyección de tiempo |
| `ShoppingIdGenerator` | UUID v4 | Generación de identificadores |

## Decisiones locales

- La lista `MAIN` se provisiona de forma perezosa: no se crea en el alta de familia sino
  en el primer `GET /families/:familyId/lists`. Ver ADR-0006.
- El dedup semántico no vive en `AddItemUseCase` sino que lo orquesta el controller, que
  también dispara `UpsertCatalogItemUseCase` en fire-and-forget. El caso de uso puro es
  intencionadamente ignorante del dedup para mantenerlo testeable en aislamiento. Ver ADR-0007.
- `forceAdd: true` en el body permite al usuario confirmar la adición pese a un `SUGGEST`,
  sin necesidad de un segundo endpoint.
- `ShoppingListsController` importa `DedupCheckUseCase` y `UpsertCatalogItemUseCase` del
  contexto `ai` (dependencia unidireccional `shopping → ai`).
- `GenerateListFromMenuUseCase` del contexto `menu` importa `AddItemUseCase` de este contexto
  (dependencia unidireccional `menu → shopping`).
- `ToggleItemCheckedUseCase` existe como caso de uso independiente, aunque el controller de
  ítems no lo expone directamente: el toggle se hace a través del `PATCH /items/:itemId`
  enviando `{ checked: true/false }`.
