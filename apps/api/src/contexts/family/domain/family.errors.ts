/**
 * Errores de dominio del contexto `family`.
 *
 * Son TS puro: NO conocen HTTP ni Nest. La capa de interfaz los traduce a
 * códigos de estado. Cada uno lleva un `code` estable (para el cliente) y un
 * mensaje en español de España (tuteo) listo para mostrar en la UI.
 */
export abstract class FamilyDomainError extends Error {
  abstract readonly code: string;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** La familia solicitada no existe. */
export class FamilyNotFoundError extends FamilyDomainError {
  readonly code = 'FAMILY_NOT_FOUND';
  constructor() {
    super('La familia no existe.');
  }
}

/** El usuario no pertenece a la familia sobre la que opera. */
export class NotAMemberError extends FamilyDomainError {
  readonly code = 'NOT_A_MEMBER';
  constructor() {
    super('No perteneces a esta familia.');
  }
}

/** La operación requiere rol OWNER y el usuario no lo tiene. */
export class NotAnOwnerError extends FamilyDomainError {
  readonly code = 'NOT_AN_OWNER';
  constructor() {
    super('Solo el propietario puede hacer esto.');
  }
}

/** Se intenta dejar sin OWNER a la familia (debe quedar al menos uno). */
export class LastOwnerError extends FamilyDomainError {
  readonly code = 'LAST_OWNER';
  constructor() {
    super('No puedes salir: eres el único propietario. Antes traspasa la propiedad.');
  }
}

/** El usuario ya es miembro de la familia. */
export class AlreadyMemberError extends FamilyDomainError {
  readonly code = 'ALREADY_MEMBER';
  constructor() {
    super('Ya formas parte de esta familia.');
  }
}

/** El código de invitación no es válido, ha caducado o ya se ha usado. */
export class InvalidJoinPinError extends FamilyDomainError {
  readonly code = 'INVALID_JOIN_PIN';
  constructor() {
    super('El código no es válido o ha caducado.');
  }
}
