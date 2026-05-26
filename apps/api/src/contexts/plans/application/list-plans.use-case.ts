import { Inject, Injectable } from '@nestjs/common';
import type { Plan } from '../domain/plan';
import { PlanFamilyMemberError } from '../domain/plans.errors';
import { PLAN_REPOSITORY, type PlanRepository } from '../domain/ports/plan.repository';
import { FAMILY_REPOSITORY, type FamilyRepository } from '../../family/domain/ports/family.repository';

export interface ListPlansQuery {
  actingUserId: string;
  familyId: string;
}

@Injectable()
export class ListPlansUseCase {
  constructor(
    @Inject(FAMILY_REPOSITORY) private readonly families: FamilyRepository,
    @Inject(PLAN_REPOSITORY) private readonly plans: PlanRepository,
  ) {}

  async execute(query: ListPlansQuery): Promise<Plan[]> {
    const family = await this.families.findById(query.familyId);
    if (!family || !family.isMember(query.actingUserId)) {
      throw new PlanFamilyMemberError();
    }
    return this.plans.listByFamilyAccess(query.familyId);
  }
}
