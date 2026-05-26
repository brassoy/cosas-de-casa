import { Inject, Injectable } from '@nestjs/common';
import {
  PUSH_SUBSCRIPTION_REPOSITORY,
  type PushSubscriptionRepository,
} from '../domain/ports/push-subscription.repository';

export interface UnsubscribePushCommand {
  endpoint: string;
}

/** Elimina la suscripción Web Push del endpoint indicado. */
@Injectable()
export class UnsubscribePushUseCase {
  constructor(
    @Inject(PUSH_SUBSCRIPTION_REPOSITORY)
    private readonly subscriptions: PushSubscriptionRepository,
  ) {}

  async execute(cmd: UnsubscribePushCommand): Promise<void> {
    await this.subscriptions.deleteByEndpoint(cmd.endpoint);
  }
}
