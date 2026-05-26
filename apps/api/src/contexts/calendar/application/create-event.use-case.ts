import { Inject, Injectable } from '@nestjs/common';
import { CalendarEvent } from '../domain/calendar-event';
import {
  CALENDAR_EVENT_REPOSITORY,
  type CalendarEventRepository,
} from '../domain/ports/calendar-event.repository';
import { CALENDAR_CLOCK, type CalendarClock } from './ports/clock';
import { CALENDAR_ID_GENERATOR, type CalendarIdGenerator } from './ports/id-generator';

export interface CreateEventCommand {
  familyId: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: Date;
  endsAt?: Date | null;
  allDay?: boolean;
  recurrenceRule?: string | null;
  createdBy: string;
  attendeeIds?: string[];
}

@Injectable()
export class CreateEventUseCase {
  constructor(
    @Inject(CALENDAR_EVENT_REPOSITORY)
    private readonly events: CalendarEventRepository,
    @Inject(CALENDAR_CLOCK) private readonly clock: CalendarClock,
    @Inject(CALENDAR_ID_GENERATOR) private readonly ids: CalendarIdGenerator,
  ) {}

  async execute(cmd: CreateEventCommand): Promise<CalendarEvent> {
    const event = CalendarEvent.create({
      id: this.ids.generate(),
      familyId: cmd.familyId,
      title: cmd.title,
      description: cmd.description,
      location: cmd.location,
      startsAt: cmd.startsAt,
      endsAt: cmd.endsAt,
      allDay: cmd.allDay,
      recurrenceRule: cmd.recurrenceRule,
      createdBy: cmd.createdBy,
      attendeeIds: cmd.attendeeIds,
      now: this.clock.now(),
    });

    await this.events.create(event);
    return event;
  }
}
