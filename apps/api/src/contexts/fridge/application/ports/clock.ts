export const FRIDGE_CLOCK = Symbol('FRIDGE_CLOCK');

/** Puerto de reloj para el contexto fridge. */
export interface FridgeClock {
  now(): Date;
}
