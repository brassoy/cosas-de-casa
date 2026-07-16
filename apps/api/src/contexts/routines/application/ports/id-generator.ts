export const ROUTINES_ID_GENERATOR = Symbol('ROUTINES_ID_GENERATOR');

/** Puerto de generación de identificadores para el contexto routines. */
export interface RoutinesIdGenerator {
  generate(): string;
}
