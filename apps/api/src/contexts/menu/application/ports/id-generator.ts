export const MENU_ID_GENERATOR = Symbol('MENU_ID_GENERATOR');

/** Puerto de generación de identificadores para el contexto menu. */
export interface MenuIdGenerator {
  generate(): string;
}
