export const NOTIFICATION_SENDER = Symbol('NOTIFICATION_SENDER');

export interface NotificationPayload {
  title: string;
  body: string;
  /** URL a la que navegar al hacer clic (opcional). */
  url?: string;
}

export interface PushTarget {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Puerto para enviar notificaciones push. */
export interface NotificationSenderPort {
  sendToTargets(targets: PushTarget[], payload: NotificationPayload): Promise<void>;
}
