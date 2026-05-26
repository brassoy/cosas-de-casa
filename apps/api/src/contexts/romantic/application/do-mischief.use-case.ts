import { Inject, Injectable } from '@nestjs/common';
import {
  COUPLE_REPOSITORY,
  type CoupleRepository,
} from '../domain/ports/couple.repository';
import {
  PUSH_SUBSCRIPTION_REPOSITORY,
  type PushSubscriptionRepository,
} from '../../notifications/domain/ports/push-subscription.repository';
import {
  NOTIFICATION_SENDER,
  type NotificationSenderPort,
} from '../../notifications/domain/ports/notification-sender.port';
import { CoupleNotFoundError } from '../domain/romantic.errors';
import { randomMischiefPhrase } from '../domain/mischief-phrases';

export interface DoMischiefCommand {
  coupleId: string;
  senderId: string;
}

/**
 * Caso de uso "hacer maldad".
 *
 * Envía una notificación push DIVERTIDA al otro miembro de la pareja.
 * El enviador no recibe push (es el que aprieta el botón).
 *
 * Diseño: reutiliza el puerto NOTIFICATION_SENDER del contexto notifications
 * y el repositorio de suscripciones para encontrar los targets del partner.
 * Si el partner no tiene suscripciones, simplemente no se envía nada (no error).
 */
@Injectable()
export class DoMischiefUseCase {
  constructor(
    @Inject(COUPLE_REPOSITORY) private readonly couples: CoupleRepository,
    @Inject(PUSH_SUBSCRIPTION_REPOSITORY) private readonly subscriptions: PushSubscriptionRepository,
    @Inject(NOTIFICATION_SENDER) private readonly sender: NotificationSenderPort,
  ) {}

  async execute(cmd: DoMischiefCommand): Promise<void> {
    const couple = await this.couples.findById(cmd.coupleId);
    if (!couple) throw new CoupleNotFoundError();

    const partnerId = couple.partnerOf(cmd.senderId);

    // Obtener suscripciones del partner filtrando por userId desde las de la familia.
    const familySubs = await this.subscriptions.findByFamily(couple.familyId);
    const partnerSubs = familySubs.filter((s) => s.userId === partnerId);

    if (partnerSubs.length === 0) return;

    const targets = partnerSubs.map((s) => ({ endpoint: s.endpoint, keys: s.keys }));
    const phrase = randomMischiefPhrase();

    await this.sender.sendToTargets(targets, {
      title: '¡Tu pareja te está haciendo maldades! 😈',
      body: phrase,
      url: '/romantic',
    });
  }
}
