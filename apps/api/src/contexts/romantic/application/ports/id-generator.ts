export const ROMANTIC_ID_GENERATOR = Symbol('ROMANTIC_ID_GENERATOR');

export interface RomanticIdGenerator {
  generate(): string;
}
