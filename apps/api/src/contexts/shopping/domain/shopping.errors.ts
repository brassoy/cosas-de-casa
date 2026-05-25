/**
 * Errores de dominio del contexto `shopping`.
 *
 * Son TS puro: NO conocen HTTP ni Nest. La capa de interfaz los traduce a
 * códigos de estado. Cada uno lleva un `code` estable (para el cliente) y un
 * mensaje en español de España (tuteo) listo para mostrar en la UI.
 */
export abstract class ShoppingDomainError extends Error {
  abstract readonly code: string;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** La lista solicitada no existe. */
export class ListNotFoundError extends ShoppingDomainError {
  readonly code = 'LIST_NOT_FOUND';
  constructor() {
    super('La lista no existe.');
  }
}

/** El ítem solicitado no existe. */
export class ItemNotFoundError extends ShoppingDomainError {
  readonly code = 'ITEM_NOT_FOUND';
  constructor() {
    super('El artículo no existe.');
  }
}

/** Se intenta borrar la lista principal (MAIN), lo que no está permitido. */
export class CannotDeleteMainListError extends ShoppingDomainError {
  readonly code = 'CANNOT_DELETE_MAIN_LIST';
  constructor() {
    super('No puedes eliminar la lista principal de la familia.');
  }
}

/** Ya existe una lista MAIN para esta familia (invariante única). */
export class MainListAlreadyExistsError extends ShoppingDomainError {
  readonly code = 'MAIN_LIST_ALREADY_EXISTS';
  constructor() {
    super('Esta familia ya tiene una lista principal.');
  }
}

/** El nombre del ítem no puede estar vacío. */
export class ItemNameEmptyError extends ShoppingDomainError {
  readonly code = 'ITEM_NAME_EMPTY';
  constructor() {
    super('El nombre del artículo no puede estar vacío.');
  }
}

/** El usuario no pertenece a la familia de la lista. */
export class NotListFamilyMemberError extends ShoppingDomainError {
  readonly code = 'NOT_LIST_FAMILY_MEMBER';
  constructor() {
    super('No perteneces a la familia de esta lista.');
  }
}
