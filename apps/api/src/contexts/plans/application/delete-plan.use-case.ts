import { Inject, Injectable } from '@nestjs/common';
import { PlanNotFoundError, PlanNotOwnedByFamilyError } from '../domain/plans.errors';
import { PLAN_REPOSITORY, type PlanRepository } from '../domain/ports/plan.repository';
import { FAMILY_REPOSITORY, type FamilyRepository } from '../../family/domain/ports/family.repository';

export interface DeletePlanCommand {
  actingUserId: string;
  planId: string;
}

@Injectable()
export class DeletePlanUseCase {
  constructor(
    @Inject(FAMILY_REPOSITORY) private readonly families: FamilyRepository,
    @Inject(PLAN_REPOSITORY) private readonly plans: PlanRepository,
  ) {}

  async execute(command: DeletePlanCommand): Promise<void> {
    const plan = await this.plans.findById(command.planId);
    if (!plan) throw new PlanNotFoundError();

    const ownerFamily = await this.families.findById(plan.ownerFamilyId);
    if (!ownerFamily || !ownerFamily.isMember(command.actingUserId)) {
      throw new PlanNotOwnedByFamilyError();
    }

    await this.plans.deleteById(command.planId);
  }
}
