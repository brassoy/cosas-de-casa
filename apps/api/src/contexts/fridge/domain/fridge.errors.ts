/**
 * Errores de dominio del contexto `fridge`.
 *
 * Son TS puro: NO conocen HTTP ni Nest. La capa de interfaz los traduce a
 * códigos de estado. Cada uno lleva un `code` estable para el cliente y un
 * mensaje en español de España (tuteo) listo para mostrar en la UI.
 */
export abstract class FridgeDomainError extends Error {
  abstract readonly code: string;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** El ítem solicitado no existe. */
export class FridgeItemNotFoundError extends FridgeDomainError {
  readonly code = 'FRIDGE_ITEM_NOT_FOUND';
  constructor() {
    super('El ítem no existe.');
  }
}

/** El usuario no pertenece a la familia del ítem. */
export class NotFridgeFamilyMemberError extends FridgeDomainError {
  readonly code = 'NOT_FRIDGE_FAMILY_MEMBER';
  constructor() {
    super('No perteneces a la familia de este ítem.');
  }
}

/** El nombre del ítem no puede estar vacío. */
export class FridgeItemNameEmptyError extends FridgeDomainError {
  readonly code = 'FRIDGE_ITEM_NAME_EMPTY';
  constructor() {
    super('El nombre del ítem no puede estar vacío.');
  }
}

/** La cantidad a consumir es mayor que la disponible. */
export class FridgeItemInsufficientQuantityError extends FridgeDomainError {
  readonly code = 'FRIDGE_ITEM_INSUFFICIENT_QUANTITY';
  constructor(available: string, requested: string) {
    super(`Cantidad insuficiente: disponible ${available}, solicitado ${requested}.`);
  }
}

/** La cantidad indicada no es válida (debe ser positiva). */
export class FridgeItemInvalidQuantityError extends FridgeDomainError {
  readonly code = 'FRIDGE_ITEM_INVALID_QUANTITY';
  constructor() {
    super('La cantidad debe ser un número positivo.');
  }
}
