export const SHOPPING_ID_GENERATOR = Symbol('SHOPPING_ID_GENERATOR');

/** Puerto de generación de identificadores para el contexto shopping. */
export interface ShoppingIdGenerator {
  generate(): string;
}
