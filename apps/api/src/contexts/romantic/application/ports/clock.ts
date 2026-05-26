export const ROMANTIC_CLOCK = Symbol('ROMANTIC_CLOCK');

export interface RomanticClock {
  now(): Date;
}
