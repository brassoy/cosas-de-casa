import type { CalendarEventDto, EventAttendeeDto } from '@cosasdecasa/contracts';
import type { CalendarEvent } from '../domain/calendar-event';

/** Traduce entidades de dominio a DTOs del contrato público. */
export const CalendarPresenter = {
  toEventDto(event: CalendarEvent): CalendarEventDto {
    return {
      id: event.id,
      familyId: event.familyId,
      title: event.title,
      description: event.description,
      location: event.location,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt?.toISOString() ?? null,
      allDay: event.allDay,
      recurrenceRule: event.recurrenceRule,
      createdBy: event.createdBy,
      attendees: event.attendeeIds.map((userId) => ({ userId })),
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    };
  },

  toAttendeeDto(userId: string): EventAttendeeDto {
    return { userId };
  },
};
