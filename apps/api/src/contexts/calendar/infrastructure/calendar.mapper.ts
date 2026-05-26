import type { CalendarEventRow, EventAttendeeRow } from '../../../db/schema';
import { CalendarEvent } from '../domain/calendar-event';

/** Traduce filas de BD a entidades de dominio. */
export const CalendarMapper = {
  toEvent(row: CalendarEventRow, attendeeIds: string[]): CalendarEvent {
    return new CalendarEvent({
      id: row.id,
      familyId: row.familyId,
      title: row.title,
      description: row.description ?? null,
      location: row.location ?? null,
      startsAt: row.startsAt,
      endsAt: row.endsAt ?? null,
      allDay: row.allDay,
      recurrenceRule: row.recurrenceRule ?? null,
      createdBy: row.createdBy ?? null,
      attendeeIds,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  },

  extractAttendeeIds(rows: EventAttendeeRow[]): string[] {
    return rows.map((r) => r.userId);
  },
};
