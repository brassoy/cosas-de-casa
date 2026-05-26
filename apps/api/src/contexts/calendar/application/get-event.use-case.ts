import { Inject, Injectable } from '@nestjs/common';
import { CalendarEvent } from '../domain/calendar-event';
import { CalendarEventNotFoundError } from '../domain/calendar.errors';
import {
  CALENDAR_EVENT_REPOSITORY,
  type CalendarEventRepository,
} from '../domain/ports/calendar-event.repository';

export interface GetEventQuery {
  eventId: string;
}

@Injectable()
export class GetEventUseCase {
  constructor(
    @Inject(CALENDAR_EVENT_REPOSITORY)
    private readonly events: CalendarEventRepository,
  ) {}

  async execute(query: GetEventQuery): Promise<CalendarEvent> {
    const event = await this.events.findById(query.eventId);
    if (!event) throw new CalendarEventNotFoundError();
    return event;
  }
}
