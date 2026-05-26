/**
 * Errores de dominio del contexto `calendar`.
 *
 * Son TS puro: NO conocen HTTP ni Nest. La capa de interfaz los traduce a
 * códigos de estado. Cada uno lleva un `code` estable para el cliente y un
 * mensaje en español de España (tuteo) listo para mostrar en la UI.
 */
export abstract class CalendarDomainError extends Error {
  abstract readonly code: string;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** El evento solicitado no existe. */
export class CalendarEventNotFoundError extends CalendarDomainError {
  readonly code = 'CALENDAR_EVENT_NOT_FOUND';
  constructor() {
    super('El evento no existe.');
  }
}

/** El usuario no pertenece a la familia del evento. */
export class NotCalendarFamilyMemberError extends CalendarDomainError {
  readonly code = 'NOT_CALENDAR_FAMILY_MEMBER';
  constructor() {
    super('No perteneces a la familia de este evento.');
  }
}

/** El título del evento no puede estar vacío. */
export class CalendarEventTitleEmptyError extends CalendarDomainError {
  readonly code = 'CALENDAR_EVENT_TITLE_EMPTY';
  constructor() {
    super('El título del evento no puede estar vacío.');
  }
}

/** ends_at debe ser mayor o igual que starts_at. */
export class CalendarEventInvalidRangeError extends CalendarDomainError {
  readonly code = 'CALENDAR_EVENT_INVALID_RANGE';
  constructor() {
    super('La fecha de fin debe ser posterior o igual a la de inicio.');
  }
}

/**
 * Evento all_day con horas en starts_at/ends_at que no son medianoche.
 * Advertencia relajada — no bloqueante en esta versión.
 */
export class CalendarEventAllDayInconsistentError extends CalendarDomainError {
  readonly code = 'CALENDAR_EVENT_ALL_DAY_INCONSISTENT';
  constructor() {
    super('Un evento de día completo no debería tener hora en starts_at o ends_at.');
  }
}
