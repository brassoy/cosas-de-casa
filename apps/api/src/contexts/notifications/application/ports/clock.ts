export const NOTIFICATIONS_CLOCK = Symbol('NOTIFICATIONS_CLOCK');

export interface NotificationsClock {
  now(): Date;
}
