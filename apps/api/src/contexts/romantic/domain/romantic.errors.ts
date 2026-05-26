/**
 * Errores de dominio del contexto `romantic`.
 *
 * TS puro: sin HTTP ni Nest. La capa de interfaz los traduce a códigos HTTP.
 * Mensajes en español de España (tuteo).
 */
export abstract class RomanticDomainError extends Error {
  abstract readonly code: string;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** El usuario o el partner no pertenecen a la familia. */
export class NotFamilyMemberError extends RomanticDomainError {
  readonly code = 'ROMANTIC_NOT_FAMILY_MEMBER';
  constructor() {
    super('Ambos miembros de la pareja deben pertenecer a la familia.');
  }
}

/** El usuario ya tiene pareja en esta familia. */
export class AlreadyInCoupleError extends RomanticDomainError {
  readonly code = 'ROMANTIC_ALREADY_IN_COUPLE';
  constructor() {
    super('Ya perteneces a una pareja en esta familia.');
  }
}

/** El partner ya tiene pareja en esta familia. */
export class PartnerAlreadyInCoupleError extends RomanticDomainError {
  readonly code = 'ROMANTIC_PARTNER_ALREADY_IN_COUPLE';
  constructor() {
    super('El otro miembro ya pertenece a una pareja en esta familia.');
  }
}

/** El usuario no puede emparejarse consigo mismo. */
export class CannotCoupleWithSelfError extends RomanticDomainError {
  readonly code = 'ROMANTIC_CANNOT_COUPLE_WITH_SELF';
  constructor() {
    super('No puedes crear una pareja contigo mismo.');
  }
}

/** La pareja solicitada no existe. */
export class CoupleNotFoundError extends RomanticDomainError {
  readonly code = 'ROMANTIC_COUPLE_NOT_FOUND';
  constructor() {
    super('La pareja no existe.');
  }
}

/** El usuario no pertenece a la pareja. */
export class NotCoupleMemberError extends RomanticDomainError {
  readonly code = 'ROMANTIC_NOT_COUPLE_MEMBER';
  constructor() {
    super('No perteneces a esta pareja.');
  }
}

/** El reto indicado no existe en el catálogo. */
export class ChallengeNotFoundError extends RomanticDomainError {
  readonly code = 'ROMANTIC_CHALLENGE_NOT_FOUND';
  constructor(key: string) {
    super(`El reto "${key}" no existe en el catálogo.`);
  }
}

/** El reto ya está registrado para esta pareja. */
export class ChallengeAlreadyExistsError extends RomanticDomainError {
  readonly code = 'ROMANTIC_CHALLENGE_ALREADY_EXISTS';
  constructor() {
    super('Este reto ya está en tu lista de pareja.');
  }
}

/** La nota tiene el cuerpo vacío. */
export class CoupleNoteBodyEmptyError extends RomanticDomainError {
  readonly code = 'ROMANTIC_NOTE_BODY_EMPTY';
  constructor() {
    super('El mensaje no puede estar vacío.');
  }
}
