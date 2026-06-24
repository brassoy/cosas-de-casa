export const MENU_CLOCK = Symbol('MENU_CLOCK');

/** Puerto de reloj para el contexto menu. */
export interface MenuClock {
  now(): Date;
}
