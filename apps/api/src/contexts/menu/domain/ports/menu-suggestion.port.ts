export interface MenuDish {
  name: string;
  description?: string;
  usesFromFridge: string[];
  missingIngredients: string[];
}

export interface SuggestMenuResult {
  dishes: MenuDish[];
}

/**
 * Puerto de dominio para sugerencia de menú.
 *
 * El adaptador recibe los ítems de la nevera y el número de platos deseados
 * y devuelve sugerencias de menú con ingredientes disponibles y los que faltan.
 *
 * Si la IA no está disponible, DEBE lanzar {@link MenuAiUnavailableError}.
 */
export interface MenuSuggestionPort {
  suggest(fridgeItems: string[], dishCount: number): Promise<SuggestMenuResult>;
}

export const MENU_SUGGESTION_PORT = Symbol('MenuSuggestionPort');
