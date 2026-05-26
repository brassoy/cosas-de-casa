import { Inject, Injectable } from '@nestjs/common';
import { PushSubscription } from '../domain/push-subscription';
import {
  PUSH_SUBSCRIPTION_REPOSITORY,
  type PushSubscriptionRepository,
} from '../domain/ports/push-subscription.repository';

export interface SubscribePushCommand {
  userId: string;
  familyId: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  id: string;
  createdAt: Date;
}

/** Guarda (o actualiza) la suscripción Web Push de un usuario. */
@Injectable()
export class SubscribePushUseCase {
  constructor(
    @Inject(PUSH_SUBSCRIPTION_REPOSITORY)
    private readonly subscriptions: PushSubscriptionRepository,
  ) {}

  async execute(cmd: SubscribePushCommand): Promise<PushSubscription> {
    const sub = new PushSubscription(
      cmd.id,
      cmd.userId,
      cmd.familyId,
      cmd.endpoint,
      cmd.keys,
      cmd.createdAt,
    );
    await this.subscriptions.save(sub);
    return sub;
  }
}
