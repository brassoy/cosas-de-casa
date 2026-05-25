export const CLOCK = Symbol('CLOCK');

/** Puerto de reloj: aísla `Date.now()` para poder fijar el tiempo en tests. */
export interface Clock {
  now(): Date;
}
