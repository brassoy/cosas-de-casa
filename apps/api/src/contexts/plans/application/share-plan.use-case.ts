import { Inject, Injectable } from '@nestjs/common';
import {
  PlanNotFoundError,
  PlanNotOwnedByFamilyError,
  PlansNotFriendsError,
  PlanAlreadySharedError,
} from '../domain/plans.errors';
import { PLAN_REPOSITORY, type PlanRepository } from '../domain/ports/plan.repository';
import { FAMILY_REPOSITORY, type FamilyRepository } from '../../family/domain/ports/family.repository';
import { FRIEND_LINK_REPOSITORY, type FriendLinkRepository } from '../../social/domain/ports/friend-link.repository';
import {
  PUSH_SUBSCRIPTION_REPOSITORY,
  type PushSubscriptionRepository,
} from '../../notifications/domain/ports/push-subscription.repository';
import {
  NOTIFICATION_SENDER,
  type NotificationSenderPort,
} from '../../notifications/domain/ports/notification-sender.port';
import { CLOCK, type Clock } from '../../family/application/ports/clock';
import { notifyFamilyOfSharedPlan } from './create-plan.use-case';

export interface SharePlanCommand {
  actingUserId: string;
  planId: string;
  targetFamilyId: string;
}

@Injectable()
export class SharePlanUseCase {
  constructor(
    @Inject(FAMILY_REPOSITORY) private readonly families: FamilyRepository,
    @Inject(PLAN_REPOSITORY) private readonly plans: PlanRepository,
    @Inject(FRIEND_LINK_REPOSITORY) private readonly friendLinks: FriendLinkRepository,
    @Inject(PUSH_SUBSCRIPTION_REPOSITORY)
    private readonly subscriptions: PushSubscriptionRepository,
    @Inject(NOTIFICATION_SENDER) private readonly sender: NotificationSenderPort,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: SharePlanCommand): Promise<void> {
    const plan = await this.plans.findById(command.planId);
    if (!plan) throw new PlanNotFoundError();

    const ownerFamily = await this.families.findById(plan.ownerFamilyId);
    if (!ownerFamily || !ownerFamily.isMember(command.actingUserId)) {
      throw new PlanNotOwnedByFamilyError();
    }

    // Comprueba que las familias sean amigas.
    const areFriends = await this.friendLinks.areFriends(plan.ownerFamilyId, command.targetFamilyId);
    if (!areFriends) throw new PlansNotFriendsError();

    // Idempotente: si ya está compartido no falla, solo verifica.
    if (plan.sharedWithFamilyIds.includes(command.targetFamilyId)) {
      throw new PlanAlreadySharedError();
    }

    const now = this.clock.now();
    await this.plans.insertShare(command.planId, command.targetFamilyId, now);
    plan.addShare(command.targetFamilyId, now);

    // Notifica (best-effort) a la familia amiga con la que se acaba de compartir.
    await notifyFamilyOfSharedPlan(
      this.subscriptions,
      this.sender,
      command.targetFamilyId,
      ownerFamily.name,
      plan.title,
    );
  }
}
