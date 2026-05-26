export interface CalendarIdGenerator {
  generate(): string;
}

export const CALENDAR_ID_GENERATOR = Symbol('CALENDAR_ID_GENERATOR');
