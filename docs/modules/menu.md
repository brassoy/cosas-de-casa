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
