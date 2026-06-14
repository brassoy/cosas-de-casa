/**
 * Contrato de props de las pantallas de la feature `menu`.
 *
 * Una interface por pantalla. El contrato es el del componente base del kit
 * (Lovable `MenuPage`) reconciliado con los DTOs reales de
 * `@cosasdecasa/contracts`:
 *
 *  - El kit usaba un tipo local `Dish`; aquí se usa `MenuDishDto` real.
 *  - `suggestion` es `MenuSuggestionDto | null` (la respuesta de
 *    `useSuggestMenu`), no un objeto ad-hoc `{ dishes }`.
 *  - Se conservan los flags que la lógica real del container necesita:
 *    `aiUnavailable` (IA 503), `error`, `addedOk` (confirmación de
 *    añadido a la lista).
 *  - Se separan dos estados de carga porque el container tiene dos mutaciones
 *    distintas: `isLoading` (sugerir) e `isAdding` (añadir a la lista). El kit
 *    base solo tenía `isLoading`; ampliamos el contrato para no perder la
 *    funcionalidad del botón "Añadir a la lista".
 *
 * Presentacional puro: solo props in / callbacks out.
 */

import type { MenuSuggestionDto } from '../contracts';

export interface MenuViewProps {
  /** Última sugerencia recibida de la IA (o null si aún no se pidió). */
  suggestion?: MenuSuggestionDto | null;
  /** La mutación de sugerir está en curso. */
  isLoading?: boolean;
  /** La mutación de añadir a la lista está en curso. */
  isAdding?: boolean;
  /** El backend devolvió 503: la IA no está disponible. */
  aiUnavailable?: boolean;
  /** Mensaje de error genérico (fallo distinto al 503). */
  error?: string | null;
  /** Se añadieron correctamente los ingredientes a la lista. */
  addedOk?: boolean;
  /** Ingredientes faltantes actualmente seleccionados. */
  selected: string[];
  /** Alterna la selección de un ingrediente faltante. */
  onToggleIngredient: (name: string) => void;
  /** Pide una nueva sugerencia de menú. */
  onSuggest: () => void;
  /** Añade los ingredientes seleccionados a la lista de la compra. */
  onAddToList: () => void;
}
