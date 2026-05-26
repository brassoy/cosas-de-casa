import {
  CalendarEventTitleEmptyError,
  CalendarEventInvalidRangeError,
} from './calendar.errors';

export interface CalendarEventProps {
  id: string;
  familyId: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: Date;
  endsAt: Date | null;
  allDay: boolean;
  /** RRULE iCal (p.ej. FREQ=WEEKLY;BYDAY=MO;UNTIL=20261231T000000Z). Null si no es recurrente. */
  recurrenceRule: string | null;
  createdBy: string | null;
  attendeeIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface NewCalendarEventParams {
  id: string;
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
  now: Date;
}

export interface UpdateCalendarEventPatch {
  title?: string;
  description?: string | null;
  location?: string | null;
  startsAt?: Date;
  endsAt?: Date | null;
  allDay?: boolean;
  recurrenceRule?: string | null;
}

/**
 * Aggregate CalendarEvent.
 *
 * Invariantes:
 * - El título no puede estar vacío.
 * - Si ends_at está presente, debe ser >= starts_at.
 */
export class CalendarEvent {
  readonly id: string;
  readonly familyId: string;
  private _title: string;
  private _description: string | null;
  private _location: string | null;
  private _startsAt: Date;
  private _endsAt: Date | null;
  private _allDay: boolean;
  private _recurrenceRule: string | null;
  readonly createdBy: string | null;
  private _attendeeIds: string[];
  readonly createdAt: Date;
  private _updatedAt: Date;

  constructor(props: CalendarEventProps) {
    this.id = props.id;
    this.familyId = props.familyId;
    this._title = props.title;
    this._description = props.description;
    this._location = props.location;
    this._startsAt = props.startsAt;
    this._endsAt = props.endsAt;
    this._allDay = props.allDay;
    this._recurrenceRule = props.recurrenceRule;
    this.createdBy = props.createdBy;
    this._attendeeIds = [...props.attendeeIds];
    this.createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  get title(): string { return this._title; }
  get description(): string | null { return this._description; }
  get location(): string | null { return this._location; }
  get startsAt(): Date { return this._startsAt; }
  get endsAt(): Date | null { return this._endsAt; }
  get allDay(): boolean { return this._allDay; }
  get recurrenceRule(): string | null { return this._recurrenceRule; }
  get attendeeIds(): string[] { return [...this._attendeeIds]; }
  get updatedAt(): Date { return this._updatedAt; }

  /** Crea un evento nuevo validando invariantes. */
  static create(params: NewCalendarEventParams): CalendarEvent {
    const trimmed = params.title.trim();
    if (!trimmed) {
      throw new CalendarEventTitleEmptyError();
    }

    const endsAt = params.endsAt ?? null;
    if (endsAt !== null && endsAt < params.startsAt) {
      throw new CalendarEventInvalidRangeError();
    }

    return new CalendarEvent({
      id: params.id,
      familyId: params.familyId,
      title: trimmed,
      description: params.description ?? null,
      location: params.location ?? null,
      startsAt: params.startsAt,
      endsAt,
      allDay: params.allDay ?? false,
      recurrenceRule: params.recurrenceRule ?? null,
      createdBy: params.createdBy,
      attendeeIds: params.attendeeIds ?? [params.createdBy],
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  /** Actualiza campos editables (patch parcial). */
  update(patch: UpdateCalendarEventPatch, now: Date): void {
    const newTitle =
      patch.title !== undefined ? patch.title.trim() : this._title;
    if (!newTitle) throw new CalendarEventTitleEmptyError();

    const newStartsAt =
      patch.startsAt !== undefined ? patch.startsAt : this._startsAt;
    const newEndsAt =
      patch.endsAt !== undefined ? patch.endsAt : this._endsAt;

    if (newEndsAt !== null && newEndsAt < newStartsAt) {
      throw new CalendarEventInvalidRangeError();
    }

    this._title = newTitle;
    if (patch.description !== undefined) this._description = patch.description;
    if (patch.location !== undefined) this._location = patch.location;
    this._startsAt = newStartsAt;
    this._endsAt = newEndsAt;
    if (patch.allDay !== undefined) this._allDay = patch.allDay;
    if (patch.recurrenceRule !== undefined) this._recurrenceRule = patch.recurrenceRule;
    this._updatedAt = now;
  }

  /** Reemplaza la lista de asistentes. */
  setAttendees(attendeeIds: string[], now: Date): void {
    this._attendeeIds = [...attendeeIds];
    this._updatedAt = now;
  }
}
