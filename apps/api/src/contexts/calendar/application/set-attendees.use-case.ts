import { Inject, Injectable } from '@nestjs/common';
import { CalendarEvent } from '../domain/calendar-event';
import { CalendarEventNotFoundError } from '../domain/calendar.errors';
import {
  CALENDAR_EVENT_REPOSITORY,
  type CalendarEventRepository,
} from '../domain/ports/calendar-event.repository';
import { CALENDAR_CLOCK, type CalendarClock } from './ports/clock';

export interface SetAttendeesCommand {
  eventId: string;
  attendeeIds: string[];
}

@Injectable()
export class SetAttendeesUseCase {
  constructor(
    @Inject(CALENDAR_EVENT_REPOSITORY)
    private readonly events: CalendarEventRepository,
    @Inject(CALENDAR_CLOCK) private readonly clock: CalendarClock,
  ) {}

  async execute(cmd: SetAttendeesCommand): Promise<CalendarEvent> {
    const event = await this.events.findById(cmd.eventId);
    if (!event) throw new CalendarEventNotFoundError();

    event.setAttendees(cmd.attendeeIds, this.clock.now());
    await this.events.setAttendees(cmd.eventId, cmd.attendeeIds);
    return event;
  }
}
