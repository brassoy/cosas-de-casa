/**
 * Errores de dominio del contexto `tasks`.
 *
 * Son TS puro: NO conocen HTTP ni Nest. La capa de interfaz los traduce a
 * códigos de estado. Cada uno lleva un `code` estable para el cliente y un
 * mensaje en español de España (tuteo) listo para mostrar en la UI.
 */
export abstract class TaskDomainError extends Error {
  abstract readonly code: string;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** La tarea solicitada no existe. */
export class TaskNotFoundError extends TaskDomainError {
  readonly code = 'TASK_NOT_FOUND';
  constructor() {
    super('La tarea no existe.');
  }
}

/** El usuario no pertenece a la familia de la tarea. */
export class NotTaskFamilyMemberError extends TaskDomainError {
  readonly code = 'NOT_TASK_FAMILY_MEMBER';
  constructor() {
    super('No perteneces a la familia de esta tarea.');
  }
}

/** El título de la tarea no puede estar vacío. */
export class TaskTitleEmptyError extends TaskDomainError {
  readonly code = 'TASK_TITLE_EMPTY';
  constructor() {
    super('El título de la tarea no puede estar vacío.');
  }
}

/** La transición de estado solicitada no está permitida. */
export class InvalidTaskTransitionError extends TaskDomainError {
  readonly code = 'INVALID_TASK_TRANSITION';
  constructor(from: string, to: string) {
    super(`No se puede cambiar el estado de '${from}' a '${to}'.`);
  }
}

/** La foto solicitada no existe. */
export class TaskPhotoNotFoundError extends TaskDomainError {
  readonly code = 'TASK_PHOTO_NOT_FOUND';
  constructor() {
    super('La foto de la tarea no existe.');
  }
}
