export interface CalendarClock {
  now(): Date;
}

export const CALENDAR_CLOCK = Symbol('CALENDAR_CLOCK');
