# Módulo: menu (menú semanal con IA)

## Responsabilidad

Sugerir un menú semanal basado en el contenido de la nevera usando IA (MiniMax), e incorporar
los ingredientes que faltan a una lista de la compra.

## Estructura

No hay agregado propio. El módulo es una fachada sobre dos casos de uso:

1. `SuggestMenuUseCase` — lee la nevera y delega en el puerto de IA.
2. `GenerateListFromMenuUseCase` — añade una lista de ingredientes a una lista de la compra
   existente (o crea una nueva CUSTOM llamada "Menú").

## Endpoints principales

| Verbo | Ruta | Descripción |
|---|---|---|
| POST | `/families/:familyId/menu/suggest` | Sugerir menú (IA, 5 req/min) |
| POST | `/families/:familyId/menu/to-list` | Añadir ingredientes del menú a la lista |

## Casos de uso

### `SuggestMenuUseCase`

Sugiere un menú semanal basado en el contenido actual de la nevera, delegando la generación
en el puerto de IA (MiniMax).

- **Endpoint**: `POST /families/:familyId/menu/suggest` · **Autorización**: `JwtAuthGuard` +
  `FamilyScopeGuard` (miembro de la familia) + `RateLimitGuard` (5 peticiones/minuto).
- **Entrada** (DTO: `SuggestMenuDto`; Zod: `SuggestMenuInputSchema`):
  - `dishCount` — entero, 1–14, opcional (por defecto 5).
  - `familyId` (param de ruta).
- **Salida**: `SuggestMenuResult` → `MenuSuggestionDto` (`{ dishes: MenuDish[] }`).
  Cada plato incluye `name`, `description?`, `usesFromFridge: string[]` y
  `missingIngredients: string[]`.
- **Reglas/invariantes**: el caso de uso lee todos los ítems de nevera de la familia
  con `FridgeItemRepository.findByFamily`. Si la nevera está vacía, el prompt instruye
  a la IA a sugerir platos con ingredientes básicos. El `dishCount` mínimo es 1 y máximo 14;
  si no se envía, el valor por defecto es 5.
- **Errores**: `MenuAiUnavailableError` → HTTP 503 (lanzado por el adaptador si MiniMax no
  devuelve el bloque `tool_use` esperado).

---

### `GenerateListFromMenuUseCase`

Añade una lista de ingredientes a una lista de la compra existente o a la lista `MAIN`
de la familia. No usa IA; es 100% funcional.

- **Endpoint**: `POST /families/:familyId/menu/to-list` · **Autorización**: `JwtAuthGuard` +
  `FamilyScopeGuard` (miembro de la familia).
- **Entrada** (DTO: `MenuToListDto`; Zod: `MenuToListInputSchema`):
  - `ingredients` — array de strings no vacíos, mínimo 1, máximo 100, requerido.
  - `listId` — UUID de la lista destino, opcional. Si no se proporciona o la lista
    no pertenece a la familia, se usa la lista `MAIN` (creándola si no existe via
    `EnsureAndListListsUseCase`).
- **Salida**: `GenerateListFromMenuResult` → `MenuToListResultDto`
  (`{ listId, listName, itemsAdded, ingredients }`).
- **Reglas/invariantes**: cada ingrediente se recorta con `trim()` antes de pasarlo a
  `AddItemUseCase`; los ingredientes vacíos tras el trim se omiten. El caso de uso
  reutiliza `AddItemUseCase` del contexto `shopping` directamente (sin dedup: se llama
  `AddItemUseCase.execute` en bucle, no el flujo con dedup del controller de shopping).
  Si `listId` se envía pero la lista no existe o pertenece a otra familia, el caso de uso
  lo ignora silenciosamente y usa la `MAIN`.
- **Errores**: ningún error de dominio de `menu` en este caso de uso; los errores de
  `AddItemUseCase` (p. ej. `ItemNameEmptyError`) pueden propagarse si el ingredient llega
  vacío, aunque el `trim()` + filtro previo lo previene en la práctica.

## Puertos y adaptadores

| Puerto | Implementación | Rol |
|---|---|---|
| `MenuSuggestionPort` | `MinimaxMenuSuggestionAdapter` | Llamada a MiniMax vía SDK Anthropic |
| `FridgeItemRepository` | `DrizzleFridgeItemRepository` | Leer contenido de nevera |

## Decisiones locales

- Si la IA no está disponible, el adaptador lanza `MenuAiUnavailableError` → HTTP 503.
  El cliente muestra un aviso y permite al usuario introducir el menú manualmente. Ver ADR-0014.
- El endpoint de sugerencia tiene `RateLimitGuard` de 5 req/min para limitar el coste.
- El adaptador usa `tool_choice` forzado (`suggest_menu`) para obtener salida estructurada;
  si MiniMax no devuelve el bloque `tool_use`, se lanza el error de indisponibilidad.
- Si la nevera está vacía, el prompt indica a la IA que sugiera platos con ingredientes básicos.
- `menu → fridge` es una dependencia de lectura aceptada; `menu → shopping` vía
  `CreateCustomListUseCase` es la misma dependencia unidireccional que `tasks → shopping`.
