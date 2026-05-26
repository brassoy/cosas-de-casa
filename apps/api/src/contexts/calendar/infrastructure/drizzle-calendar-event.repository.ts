import { and, between, eq, inArray } from 'drizzle-orm';
import type { DatabaseExecutor } from '../../../db/db.types';
import { calendarEvents, eventAttendees } from '../../../db/schema';
import type { CalendarEvent } from '../domain/calendar-event';
import type { CalendarEventRepository, ListEventsFilter } from '../domain/ports/calendar-event.repository';
import { CalendarMapper } from './calendar.mapper';

/** Adaptador Drizzle de {@link CalendarEventRepository}. */
export class DrizzleCalendarEventRepository implements CalendarEventRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  async create(event: CalendarEvent): Promise<void> {
    await this.db.insert(calendarEvents).values({
      id: event.id,
      familyId: event.familyId,
      title: event.title,
      description: event.description ?? undefined,
      location: event.location ?? undefined,
      startsAt: event.startsAt,
      endsAt: event.endsAt ?? undefined,
      allDay: event.allDay,
      recurrenceRule: event.recurrenceRule ?? undefined,
      createdBy: event.createdBy ?? undefined,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    });

    if (event.attendeeIds.length > 0) {
      await this.db.insert(eventAttendees).values(
        event.attendeeIds.map((userId) => ({ eventId: event.id, userId })),
      );
    }
  }

  async findById(eventId: string): Promise<CalendarEvent | null> {
    const rows = await this.db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.id, eventId))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    const attendeeRows = await this.db
      .select()
      .from(eventAttendees)
      .where(eq(eventAttendees.eventId, eventId));

    return CalendarMapper.toEvent(row, CalendarMapper.extractAttendeeIds(attendeeRows));
  }

  async findByFamilyInRange(familyId: string, filter: ListEventsFilter): Promise<CalendarEvent[]> {
    const eventRows = await this.db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.familyId, familyId),
          between(calendarEvents.startsAt, filter.from, filter.to),
        ),
      )
      .orderBy(calendarEvents.startsAt);

    if (eventRows.length === 0) return [];

    const eventIds = eventRows.map((r) => r.id);
    const allAttendees = await this.db
      .select()
      .from(eventAttendees)
      .where(inArray(eventAttendees.eventId, eventIds));

    return eventRows.map((row) => {
      const attendeeIds = allAttendees
        .filter((a) => a.eventId === row.id)
        .map((a) => a.userId);
      return CalendarMapper.toEvent(row, attendeeIds);
    });
  }

  async update(event: CalendarEvent): Promise<void> {
    await this.db
      .update(calendarEvents)
      .set({
        title: event.title,
        description: event.description ?? null,
        location: event.location ?? null,
        startsAt: event.startsAt,
        endsAt: event.endsAt ?? null,
        allDay: event.allDay,
        recurrenceRule: event.recurrenceRule ?? null,
        updatedAt: event.updatedAt,
      })
      .where(eq(calendarEvents.id, event.id));
  }

  async deleteById(eventId: string): Promise<void> {
    await this.db.delete(calendarEvents).where(eq(calendarEvents.id, eventId));
  }

  async setAttendees(eventId: string, attendeeIds: string[]): Promise<void> {
    await this.db.delete(eventAttendees).where(eq(eventAttendees.eventId, eventId));

    if (attendeeIds.length > 0) {
      await this.db.insert(eventAttendees).values(
        attendeeIds.map((userId) => ({ eventId, userId })),
      );
    }
  }
}
