export abstract class NotificationsDomainError extends Error {
  abstract readonly code: string;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class PushSubscriptionNotFoundError extends NotificationsDomainError {
  readonly code = 'PUSH_SUBSCRIPTION_NOT_FOUND';
  constructor() {
    super('La suscripción push no existe.');
  }
}
