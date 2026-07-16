/**
 * Errores de dominio del contexto `routines`.
 *
 * Son TS puro: NO conocen HTTP ni Nest. La capa de interfaz los traduce a
 * códigos de estado. Cada uno lleva un `code` estable para el cliente y un
 * mensaje en español de España (tuteo) listo para mostrar en la UI.
 */
export abstract class RoutineDomainError extends Error {
  abstract readonly code: string;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** La rutina solicitada no existe. */
export class RoutineNotFoundError extends RoutineDomainError {
  readonly code = 'ROUTINE_NOT_FOUND';
  constructor() {
    super('La rutina no existe.');
  }
}

/** El item del catálogo solicitado no existe. */
export class RoutineItemNotFoundError extends RoutineDomainError {
  readonly code = 'ROUTINE_ITEM_NOT_FOUND';
  constructor() {
    super('El item de rutina no existe.');
  }
}

/** La asignación solicitada no existe en la rutina. */
export class RoutineAssignmentNotFoundError extends RoutineDomainError {
  readonly code = 'ROUTINE_ASSIGNMENT_NOT_FOUND';
  constructor() {
    super('La asignación no existe.');
  }
}

/** La incidencia solicitada no existe. */
export class RoutineIncidentNotFoundError extends RoutineDomainError {
  readonly code = 'ROUTINE_INCIDENT_NOT_FOUND';
  constructor() {
    super('La incidencia no existe.');
  }
}

/** Ya hay una rutina de la familia que solapa esas fechas. */
export class RoutineOverlapError extends RoutineDomainError {
  readonly code = 'ROUTINE_OVERLAP';
  constructor() {
    super('Ya existe una rutina que solapa esa semana.');
  }
}

/** La fecha de inicio no es una fecha de calendario válida. */
export class InvalidRoutineDateError extends RoutineDomainError {
  readonly code = 'INVALID_ROUTINE_DATE';
  constructor() {
    super('La fecha de inicio de la rutina no es válida.');
  }
}

/** La ventana horaria no es válida (formato HH:mm y inicio ≠ fin). */
export class InvalidTimeWindowError extends RoutineDomainError {
  readonly code = 'INVALID_TIME_WINDOW';
  constructor() {
    super('La ventana horaria no es válida: usa HH:mm y horas distintas.');
  }
}

/** El día está fuera de la semana de la rutina (0..6). */
export class DayIndexOutOfRangeError extends RoutineDomainError {
  readonly code = 'DAY_INDEX_OUT_OF_RANGE';
  constructor() {
    super('El día indicado está fuera de la semana de la rutina.');
  }
}

/** El item no forma parte de la selección de la rutina. */
export class ItemNotSelectedError extends RoutineDomainError {
  readonly code = 'ITEM_NOT_SELECTED';
  constructor() {
    super('El item no está seleccionado en esta rutina.');
  }
}

/** El item ya tiene una asignación en ese día. */
export class DuplicateAssignmentError extends RoutineDomainError {
  readonly code = 'DUPLICATE_ASSIGNMENT';
  constructor() {
    super('El item ya está asignado a ese día.');
  }
}

/** Los minutos perdidos superan la duración planificada de la asignación. */
export class LostMinutesExceedPlannedError extends RoutineDomainError {
  readonly code = 'LOST_MINUTES_EXCEED_PLANNED';
  constructor() {
    super('Los minutos perdidos no pueden superar la duración planificada.');
  }
}

/** El nombre del item no puede estar vacío. */
export class RoutineItemNameEmptyError extends RoutineDomainError {
  readonly code = 'ROUTINE_ITEM_NAME_EMPTY';
  constructor() {
    super('El nombre del item no puede estar vacío.');
  }
}

/** El objetivo de veces por semana debe ser un entero entre 1 y 7. */
export class InvalidTargetError extends RoutineDomainError {
  readonly code = 'INVALID_TARGET';
  constructor() {
    super('El objetivo semanal debe estar entre 1 y 7 veces.');
  }
}

/** La descripción de la incidencia no puede estar vacía. */
export class IncidentDescriptionEmptyError extends RoutineDomainError {
  readonly code = 'INCIDENT_DESCRIPTION_EMPTY';
  constructor() {
    super('La descripción de la incidencia no puede estar vacía.');
  }
}

/** No se puede seleccionar un item archivado para una rutina nueva. */
export class RoutineItemArchivedError extends RoutineDomainError {
  readonly code = 'ROUTINE_ITEM_ARCHIVED';
  constructor() {
    super('El item está archivado: restáuralo para usarlo en una rutina.');
  }
}
