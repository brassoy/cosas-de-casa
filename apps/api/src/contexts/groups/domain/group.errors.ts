/**
 * Errores de dominio del contexto `groups`.
 *
 * Son TS puro: NO conocen HTTP ni Nest. La capa de interfaz los traduce a
 * códigos de estado. Cada uno lleva un `code` estable (para el cliente) y un
 * mensaje en español de España (tuteo) listo para mostrar en la UI.
 */
export abstract class GroupDomainError extends Error {
  abstract readonly code: string;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** La peña solicitada no existe. */
export class GroupNotFoundError extends GroupDomainError {
  readonly code = 'GROUP_NOT_FOUND';
  constructor() {
    super('La peña no existe.');
  }
}

/** El usuario no pertenece a la peña sobre la que opera. */
export class NotAGroupMemberError extends GroupDomainError {
  readonly code = 'NOT_A_GROUP_MEMBER';
  constructor() {
    super('No perteneces a esta peña.');
  }
}

/** La operación requiere rol OWNER y el usuario no lo tiene. */
export class NotAGroupOwnerError extends GroupDomainError {
  readonly code = 'NOT_A_GROUP_OWNER';
  constructor() {
    super('Solo el propietario puede hacer esto.');
  }
}

/** Se intenta dejar sin OWNER a la peña (debe quedar al menos uno). */
export class LastGroupOwnerError extends GroupDomainError {
  readonly code = 'LAST_GROUP_OWNER';
  constructor() {
    super('No puedes salir: eres el único propietario. Antes traspasa la propiedad.');
  }
}

/** El usuario ya es miembro de la peña. */
export class AlreadyGroupMemberError extends GroupDomainError {
  readonly code = 'ALREADY_GROUP_MEMBER';
  constructor() {
    super('Ya formas parte de esta peña.');
  }
}

/** El código de invitación no es válido, ha caducado o ya se ha usado. */
export class InvalidGroupJoinPinError extends GroupDomainError {
  readonly code = 'INVALID_GROUP_JOIN_PIN';
  constructor() {
    super('El código no es válido o ha caducado.');
  }
}
