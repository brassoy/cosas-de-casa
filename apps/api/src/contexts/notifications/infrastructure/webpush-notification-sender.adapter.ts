import webpush from 'web-push';
import { Logger } from '@nestjs/common';
import type {
  NotificationSenderPort,
  NotificationPayload,
  PushTarget,
} from '../domain/ports/notification-sender.port';

/**
 * Adaptador web-push (VAPID).
 *
 * Itera los targets en paralelo. Si un envío falla (suscripción expirada,
 * endpoint muerto…), registra el error y continúa — nunca lanza.
 */
export class WebpushNotificationSenderAdapter implements NotificationSenderPort {
  private readonly logger = new Logger(WebpushNotificationSenderAdapter.name);

  constructor(vapidPublicKey: string, vapidPrivateKey: string, vapidSubject: string) {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  }

  async sendToTargets(
    targets: PushTarget[],
    payload: NotificationPayload,
  ): Promise<void> {
    if (targets.length === 0) return;

    const body = JSON.stringify(payload);

    await Promise.allSettled(
      targets.map(async (target) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: target.endpoint,
              keys: {
                p256dh: target.keys.p256dh,
                auth: target.keys.auth,
              },
            },
            body,
          );
        } catch (err) {
          this.logger.warn(`Error enviando push a ${target.endpoint.slice(0, 60)}…: ${String(err)}`);
        }
      }),
    );
  }
}
