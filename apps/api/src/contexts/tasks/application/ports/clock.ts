export const TASKS_CLOCK = Symbol('TASKS_CLOCK');

/** Puerto de reloj para el contexto tasks. */
export interface TasksClock {
  now(): Date;
}
