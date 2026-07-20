import { Inject, Injectable } from '@nestjs/common';
import type { PlanRsvpStatus } from '../domain/plan';
import { PlanNotFoundError, PlanAccessDeniedError } from '../domain/plans.errors';
import { PLAN_REPOSITORY, type PlanRepository } from '../domain/ports/plan.repository';
import { FAMILY_REPOSITORY, type FamilyRepository } from '../../family/domain/ports/family.repository';
import {
  PUSH_SUBSCRIPTION_REPOSITORY,
  type PushSubscriptionRepository,
} from '../../notifications/domain/ports/push-subscription.repository';
import {
  NOTIFICATION_SENDER,
  type NotificationSenderPort,
} from '../../notifications/domain/ports/notification-sender.port';
import { CLOCK, type Clock } from '../../family/application/ports/clock';

export interface SetRsvpCommand {
  actingUserId: string;
  planId: string;
  status: PlanRsvpStatus;
}

@Injectable()
export class SetRsvpUseCase {
  constructor(
    @Inject(FAMILY_REPOSITORY) private readonly families: FamilyRepository,
    @Inject(PLAN_REPOSITORY) private readonly plans: PlanRepository,
    @Inject(PUSH_SUBSCRIPTION_REPOSITORY)
    private readonly subscriptions: PushSubscriptionRepository,
    @Inject(NOTIFICATION_SENDER) private readonly sender: NotificationSenderPort,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: SetRsvpCommand): Promise<void> {
    const plan = await this.plans.findById(command.planId);
    if (!plan) throw new PlanNotFoundError();

    // El usuario debe pertenecer a alguna familia con acceso al plan.
    const familyIds = [plan.ownerFamilyId, ...plan.sharedWithFamilyIds];
    const memberships = await this.families.findByIds(familyIds);
    const hasAccess = memberships.some((f) => f.isMember(command.actingUserId));
    if (!hasAccess) throw new PlanAccessDeniedError();

    const now = this.clock.now();
    await this.plans.insertOrUpdateParticipant(command.planId, command.actingUserId, command.status, now);
    plan.setRsvp(command.actingUserId, command.status, now);

    // Notifica a la familia propietaria que hay un nuevo asistente (solo al
    // apuntarse, no al declinar). Se excluye a quien acaba de apuntarse.
    // Best-effort: un fallo de push no debe tumbar el RSVP.
    if (command.status === 'going') {
      await this.notifyOwnerOfAttendee(plan.ownerFamilyId, command.actingUserId, plan.title, command.planId);
    }
  }

  private async notifyOwnerOfAttendee(
    ownerFamilyId: string,
    actingUserId: string,
    planTitle: string,
    planId: string,
  ): Promise<void> {
    try {
      const subs = await this.subscriptions.findByFamily(ownerFamilyId);
      const targets = subs
        .filter((s) => s.userId !== actingUserId)
        .map((s) => ({ endpoint: s.endpoint, keys: s.keys }));
      if (targets.length === 0) return;
      await this.sender.sendToTargets(targets, {
        title: '🎉 Nuevo asistente a un plan',
        body: `Alguien se ha apuntado a «${planTitle}»`,
        url: `/plans/${planId}`,
      });
    } catch {
      // Best-effort: ignoramos fallos de push (VAPID ausente, endpoint caducado…).
    }
  }
}
