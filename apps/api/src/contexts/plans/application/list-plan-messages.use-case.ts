import { Inject, Injectable } from '@nestjs/common';
import { PlanNotFoundError, PlanAccessDeniedError } from '../domain/plans.errors';
import { PLAN_REPOSITORY, type PlanRepository } from '../domain/ports/plan.repository';
import {
  PLAN_MESSAGE_REPOSITORY,
  type PlanMessageRepository,
  type PlanMessageWithUser,
} from '../domain/ports/plan-message.repository';
import { FAMILY_REPOSITORY, type FamilyRepository } from '../../family/domain/ports/family.repository';

export interface ListPlanMessagesQuery {
  actingUserId: string;
  planId: string;
  before?: Date;
  limit?: number;
}

@Injectable()
export class ListPlanMessagesUseCase {
  constructor(
    @Inject(FAMILY_REPOSITORY) private readonly families: FamilyRepository,
    @Inject(PLAN_REPOSITORY) private readonly plans: PlanRepository,
    @Inject(PLAN_MESSAGE_REPOSITORY) private readonly messages: PlanMessageRepository,
  ) {}

  async execute(query: ListPlanMessagesQuery): Promise<PlanMessageWithUser[]> {
    const plan = await this.plans.findById(query.planId);
    if (!plan) throw new PlanNotFoundError();

    const familyIds = [plan.ownerFamilyId, ...plan.sharedWithFamilyIds];
    const memberships = await Promise.all(familyIds.map((fid) => this.families.findById(fid)));
    const hasAccess = memberships.some((f) => f && f.isMember(query.actingUserId));
    if (!hasAccess) throw new PlanAccessDeniedError();

    return this.messages.listWithUsers({
      planId: query.planId,
      before: query.before,
      limit: query.limit ?? 50,
    });
  }
}
