import { Inject, Injectable } from '@nestjs/common';
import { CalendarEvent } from '../domain/calendar-event';
import { CalendarEventNotFoundError } from '../domain/calendar.errors';
import {
  CALENDAR_EVENT_REPOSITORY,
  type CalendarEventRepository,
} from '../domain/ports/calendar-event.repository';
import { CALENDAR_CLOCK, type CalendarClock } from './ports/clock';

export interface UpdateEventCommand {
  eventId: string;
  title?: string;
  description?: string | null;
  location?: string | null;
  startsAt?: Date;
  endsAt?: Date | null;
  allDay?: boolean;
  recurrenceRule?: string | null;
}

@Injectable()
export class UpdateEventUseCase {
  constructor(
    @Inject(CALENDAR_EVENT_REPOSITORY)
    private readonly events: CalendarEventRepository,
    @Inject(CALENDAR_CLOCK) private readonly clock: CalendarClock,
  ) {}

  async execute(cmd: UpdateEventCommand): Promise<CalendarEvent> {
    const event = await this.events.findById(cmd.eventId);
    if (!event) throw new CalendarEventNotFoundError();

    event.update({
      title: cmd.title,
      description: cmd.description,
      location: cmd.location,
      startsAt: cmd.startsAt,
      endsAt: cmd.endsAt,
      allDay: cmd.allDay,
      recurrenceRule: cmd.recurrenceRule,
    }, this.clock.now());

    await this.events.update(event);
    return event;
  }
}
