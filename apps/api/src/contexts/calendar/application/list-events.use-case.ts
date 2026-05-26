import { Inject, Injectable } from '@nestjs/common';
import { CalendarEvent } from '../domain/calendar-event';
import {
  CALENDAR_EVENT_REPOSITORY,
  type CalendarEventRepository,
} from '../domain/ports/calendar-event.repository';
import { expandRecurrence } from './recurrence-expander';

export interface ListEventsQuery {
  familyId: string;
  from: Date;
  to: Date;
}

@Injectable()
export class ListEventsUseCase {
  constructor(
    @Inject(CALENDAR_EVENT_REPOSITORY)
    private readonly events: CalendarEventRepository,
  ) {}

  async execute(query: ListEventsQuery): Promise<CalendarEvent[]> {
    const base = await this.events.findByFamilyInRange(query.familyId, {
      from: query.from,
      to: query.to,
    });

    // Para eventos recurrentes, expandimos las ocurrencias en el rango.
    // Los eventos no recurrentes se devuelven tal cual.
    const expanded: CalendarEvent[] = [];
    for (const ev of base) {
      if (ev.recurrenceRule) {
        const occurrences = expandRecurrence(ev, query.from, query.to);
        expanded.push(...occurrences);
      } else {
        expanded.push(ev);
      }
    }

    // Ordenar por fecha de inicio
    expanded.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
    return expanded;
  }
}
