export const FRIDGE_ID_GENERATOR = Symbol('FRIDGE_ID_GENERATOR');

/** Puerto de generación de identificadores para el contexto fridge. */
export interface FridgeIdGenerator {
  generate(): string;
}
