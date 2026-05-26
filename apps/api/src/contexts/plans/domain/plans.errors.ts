export abstract class PlansDomainError extends Error {
  abstract readonly code: string;
  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class PlanNotFoundError extends PlansDomainError {
  readonly code = 'PLAN_NOT_FOUND';
  constructor() { super('El plan no existe.'); }
}

export class PlanAccessDeniedError extends PlansDomainError {
  readonly code = 'PLAN_ACCESS_DENIED';
  constructor() { super('No tienes acceso a este plan.'); }
}

export class PlanNotOwnedByFamilyError extends PlansDomainError {
  readonly code = 'PLAN_NOT_OWNED_BY_FAMILY';
  constructor() { super('Tu familia no es propietaria de este plan.'); }
}

export class PlansNotFriendsError extends PlansDomainError {
  readonly code = 'PLANS_NOT_FRIENDS';
  constructor() { super('Solo puedes compartir planes con familias amigas.'); }
}

export class PlanAlreadySharedError extends PlansDomainError {
  readonly code = 'PLAN_ALREADY_SHARED';
  constructor() { super('El plan ya está compartido con esa familia.'); }
}

export class SavedPlaceNotFoundError extends PlansDomainError {
  readonly code = 'SAVED_PLACE_NOT_FOUND';
  constructor() { super('El lugar guardado no existe.'); }
}

export class SavedPlaceAccessDeniedError extends PlansDomainError {
  readonly code = 'SAVED_PLACE_ACCESS_DENIED';
  constructor() { super('No tienes acceso a este lugar guardado.'); }
}

export class PlanFamilyMemberError extends PlansDomainError {
  readonly code = 'PLAN_FAMILY_MEMBER';
  constructor() { super('No perteneces a ninguna familia con acceso a este plan.'); }
}
