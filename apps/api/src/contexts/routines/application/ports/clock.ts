export const ROUTINES_CLOCK = Symbol('ROUTINES_CLOCK');

/** Puerto de reloj para el contexto routines. */
export interface RoutinesClock {
  now(): Date;
}
