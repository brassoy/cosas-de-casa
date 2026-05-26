import { Inject, Injectable } from '@nestjs/common';
import type { PlanRsvpStatus } from '../domain/plan';
import { PlanNotFoundError, PlanAccessDeniedError } from '../domain/plans.errors';
import { PLAN_REPOSITORY, type PlanRepository } from '../domain/ports/plan.repository';
import { FAMILY_REPOSITORY, type FamilyRepository } from '../../family/domain/ports/family.repository';
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
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: SetRsvpCommand): Promise<void> {
    const plan = await this.plans.findById(command.planId);
    if (!plan) throw new PlanNotFoundError();

    // El usuario debe pertenecer a alguna familia con acceso al plan.
    const familyIds = [plan.ownerFamilyId, ...plan.sharedWithFamilyIds];
    const memberships = await Promise.all(familyIds.map((fid) => this.families.findById(fid)));
    const hasAccess = memberships.some((f) => f && f.isMember(command.actingUserId));
    if (!hasAccess) throw new PlanAccessDeniedError();

    const now = this.clock.now();
    await this.plans.insertOrUpdateParticipant(command.planId, command.actingUserId, command.status, now);
    plan.setRsvp(command.actingUserId, command.status, now);
  }
}
