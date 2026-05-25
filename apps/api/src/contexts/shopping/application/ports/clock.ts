export const SHOPPING_CLOCK = Symbol('SHOPPING_CLOCK');

/** Puerto de reloj para el contexto shopping. */
export interface ShoppingClock {
  now(): Date;
}
