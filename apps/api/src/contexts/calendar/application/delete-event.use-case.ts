import { Inject, Injectable } from '@nestjs/common';
import { CalendarEventNotFoundError } from '../domain/calendar.errors';
import {
  CALENDAR_EVENT_REPOSITORY,
  type CalendarEventRepository,
} from '../domain/ports/calendar-event.repository';

export interface DeleteEventCommand {
  eventId: string;
}

@Injectable()
export class DeleteEventUseCase {
  constructor(
    @Inject(CALENDAR_EVENT_REPOSITORY)
    private readonly events: CalendarEventRepository,
  ) {}

  async execute(cmd: DeleteEventCommand): Promise<void> {
    const event = await this.events.findById(cmd.eventId);
    if (!event) throw new CalendarEventNotFoundError();
    await this.events.deleteById(cmd.eventId);
  }
}
