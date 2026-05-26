import type { CalendarEvent } from '../calendar-event';

export interface ListEventsFilter {
  /** Incluir eventos que comiencen DESDE esta fecha (inclusive). */
  from: Date;
  /** Incluir eventos que comiencen HASTA esta fecha (inclusive). */
  to: Date;
}

export interface CalendarEventRepository {
  create(event: CalendarEvent): Promise<void>;
  findById(eventId: string): Promise<CalendarEvent | null>;
  /** Devuelve los eventos de la familia cuyo starts_at cae en [from, to]. */
  findByFamilyInRange(familyId: string, filter: ListEventsFilter): Promise<CalendarEvent[]>;
  update(event: CalendarEvent): Promise<void>;
  deleteById(eventId: string): Promise<void>;
  setAttendees(eventId: string, attendeeIds: string[]): Promise<void>;
}

export const CALENDAR_EVENT_REPOSITORY = Symbol('CALENDAR_EVENT_REPOSITORY');
