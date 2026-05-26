/**
 * Errores de dominio del contexto `social` (familias amigas).
 */
export abstract class SocialDomainError extends Error {
  abstract readonly code: string;
  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class FriendInvitePinNotFoundError extends SocialDomainError {
  readonly code = 'FRIEND_INVITE_PIN_NOT_FOUND';
  constructor() {
    super('El código de invitación no existe, ha caducado o ya se ha usado.');
  }
}

export class InvalidFriendInvitePinError extends SocialDomainError {
  readonly code = 'INVALID_FRIEND_INVITE_PIN';
  constructor() {
    super('El código de invitación no es válido o ha caducado.');
  }
}

export class AlreadyFriendsError extends SocialDomainError {
  readonly code = 'ALREADY_FRIENDS';
  constructor() {
    super('Estas familias ya están vinculadas como amigas.');
  }
}

export class SelfFriendshipError extends SocialDomainError {
  readonly code = 'SELF_FRIENDSHIP';
  constructor() {
    super('Una familia no puede ser amiga de sí misma.');
  }
}

export class FriendLinkNotFoundError extends SocialDomainError {
  readonly code = 'FRIEND_LINK_NOT_FOUND';
  constructor() {
    super('El vínculo de amistad no existe.');
  }
}

export class NotFamilyOwnerError extends SocialDomainError {
  readonly code = 'NOT_FAMILY_OWNER';
  constructor() {
    super('Solo el propietario de la familia puede realizar esta acción.');
  }
}

export class NotFamilyMemberError extends SocialDomainError {
  readonly code = 'NOT_FAMILY_MEMBER';
  constructor() {
    super('No perteneces a esta familia.');
  }
}
