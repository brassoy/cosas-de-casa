export const ID_GENERATOR = Symbol('ID_GENERATOR');

/** Puerto de generación de identificadores (UUID v4) para los aggregates. */
export interface IdGenerator {
  generate(): string;
}
