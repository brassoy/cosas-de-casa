import { Inject, Injectable } from '@nestjs/common';
import type { PlanStatus, PlaceData } from '../domain/plan';
import { PlanNotFoundError, PlanNotOwnedByFamilyError } from '../domain/plans.errors';
import { PLAN_REPOSITORY, type PlanRepository } from '../domain/ports/plan.repository';
import { FAMILY_REPOSITORY, type FamilyRepository } from '../../family/domain/ports/family.repository';
import { CLOCK, type Clock } from '../../family/application/ports/clock';

export interface UpdatePlanCommand {
  actingUserId: string;
  planId: string;
  title?: string;
  description?: string | null;
  place?: PlaceData | null;
  scheduledAt?: string | null;
  status?: PlanStatus;
}

@Injectable()
export class UpdatePlanUseCase {
  constructor(
    @Inject(FAMILY_REPOSITORY) private readonly families: FamilyRepository,
    @Inject(PLAN_REPOSITORY) private readonly plans: PlanRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: UpdatePlanCommand): Promise<void> {
    const plan = await this.plans.findById(command.planId);
    if (!plan) throw new PlanNotFoundError();

    const ownerFamily = await this.families.findById(plan.ownerFamilyId);
    if (!ownerFamily || !ownerFamily.isMember(command.actingUserId)) {
      throw new PlanNotOwnedByFamilyError();
    }

    const now = this.clock.now();
    const scheduledAt =
      command.scheduledAt === null
        ? null
        : command.scheduledAt !== undefined
          ? new Date(command.scheduledAt)
          : undefined;
    plan.update({
      title: command.title,
      description: command.description,
      place: command.place,
      scheduledAt,
      status: command.status,
      now,
    });

    await this.plans.update(plan);
  }
}
