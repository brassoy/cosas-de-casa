import { Inject, Injectable } from '@nestjs/common';
import { PlanAccessDeniedError, PlanNotFoundError } from '../domain/plans.errors';
import { PLAN_REPOSITORY, type PlanRepository } from '../domain/ports/plan.repository';
import { FAMILY_REPOSITORY, type FamilyRepository } from '../../family/domain/ports/family.repository';
import { PLANS_READ_MODEL, type PlansReadModel, type PlanDetailView } from './ports/plans-read-model';

export interface GetPlanQuery {
  actingUserId: string;
  planId: string;
}

@Injectable()
export class GetPlanUseCase {
  constructor(
    @Inject(FAMILY_REPOSITORY) private readonly families: FamilyRepository,
    @Inject(PLAN_REPOSITORY) private readonly plans: PlanRepository,
    @Inject(PLANS_READ_MODEL) private readonly readModel: PlansReadModel,
  ) {}

  async execute(query: GetPlanQuery): Promise<PlanDetailView> {
    const plan = await this.plans.findById(query.planId);
    if (!plan) throw new PlanNotFoundError();

    // Verifica que el usuario pertenezca a una familia con acceso al plan.
    const familyIds = [plan.ownerFamilyId, ...plan.sharedWithFamilyIds];
    const memberships = await Promise.all(
      familyIds.map((fid) => this.families.findById(fid)),
    );
    const hasAccess = memberships.some(
      (f) => f && f.isMember(query.actingUserId),
    );
    if (!hasAccess) throw new PlanAccessDeniedError();

    const detail = await this.readModel.getPlanDetail(query.planId);
    if (!detail) throw new PlanNotFoundError();
    return detail;
  }
}
