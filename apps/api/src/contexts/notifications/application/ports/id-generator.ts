export const NOTIFICATIONS_ID_GENERATOR = Symbol('NOTIFICATIONS_ID_GENERATOR');

export interface NotificationsIdGenerator {
  generate(): string;
}
