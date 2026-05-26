import { Inject, Injectable } from '@nestjs/common';
import { PlanMessage } from '../domain/plan-message';
import { PlanNotFoundError, PlanAccessDeniedError } from '../domain/plans.errors';
import { PLAN_REPOSITORY, type PlanRepository } from '../domain/ports/plan.repository';
import {
  PLAN_MESSAGE_REPOSITORY,
  type PlanMessageRepository,
  type PlanMessageWithUser,
} from '../domain/ports/plan-message.repository';
import { FAMILY_REPOSITORY, type FamilyRepository } from '../../family/domain/ports/family.repository';
import { CLOCK, type Clock } from '../../family/application/ports/clock';
import { ID_GENERATOR, type IdGenerator } from '../../family/application/ports/id-generator';

export interface SendPlanMessageCommand {
  actingUserId: string;
  planId: string;
  body: string;
  /** displayName del usuario (para devolver en la respuesta). */
  displayName?: string | null;
}

@Injectable()
export class SendPlanMessageUseCase {
  constructor(
    @Inject(FAMILY_REPOSITORY) private readonly families: FamilyRepository,
    @Inject(PLAN_REPOSITORY) private readonly plans: PlanRepository,
    @Inject(PLAN_MESSAGE_REPOSITORY) private readonly messages: PlanMessageRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: SendPlanMessageCommand): Promise<PlanMessageWithUser> {
    const plan = await this.plans.findById(command.planId);
    if (!plan) throw new PlanNotFoundError();

    const familyIds = [plan.ownerFamilyId, ...plan.sharedWithFamilyIds];
    const memberships = await Promise.all(familyIds.map((fid) => this.families.findById(fid)));
    const hasAccess = memberships.some((f) => f && f.isMember(command.actingUserId));
    if (!hasAccess) throw new PlanAccessDeniedError();

    const sanitizedBody = PlanMessage.sanitizeBody(command.body);
    const now = this.clock.now();

    const message = new PlanMessage({
      id: this.ids.generate(),
      planId: command.planId,
      userId: command.actingUserId,
      body: sanitizedBody,
      createdAt: now,
    });

    await this.messages.insert(message);

    return {
      id: message.id,
      planId: message.planId,
      userId: message.userId,
      displayName: command.displayName ?? null,
      body: message.body,
      createdAt: message.createdAt,
    };
  }
}
