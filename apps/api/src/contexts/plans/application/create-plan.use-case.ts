import { Inject, Injectable } from '@nestjs/common';
import { Plan } from '../domain/plan';
import { SavedPlace } from '../domain/saved-place';
import { PlanFamilyMemberError } from '../domain/plans.errors';
import { PLAN_REPOSITORY, type PlanRepository } from '../domain/ports/plan.repository';
import { SAVED_PLACE_REPOSITORY, type SavedPlaceRepository } from '../domain/ports/saved-place.repository';
import { FAMILY_REPOSITORY, type FamilyRepository } from '../../family/domain/ports/family.repository';
import { CLOCK, type Clock } from '../../family/application/ports/clock';
import { ID_GENERATOR, type IdGenerator } from '../../family/application/ports/id-generator';
import type { PlaceData } from '../domain/plan';

export interface CreatePlanCommand {
  actingUserId: string;
  ownerFamilyId: string;
  title: string;
  description?: string | null;
  place?: PlaceData | null;
  savePlace?: boolean;
  scheduledAt?: Date | null;
}

@Injectable()
export class CreatePlanUseCase {
  constructor(
    @Inject(FAMILY_REPOSITORY) private readonly families: FamilyRepository,
    @Inject(PLAN_REPOSITORY) private readonly plans: PlanRepository,
    @Inject(SAVED_PLACE_REPOSITORY) private readonly savedPlaces: SavedPlaceRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: CreatePlanCommand): Promise<Plan> {
    const family = await this.families.findById(command.ownerFamilyId);
    if (!family || !family.isMember(command.actingUserId)) {
      throw new PlanFamilyMemberError();
    }

    const now = this.clock.now();
    const plan = Plan.create({
      id: this.ids.generate(),
      ownerFamilyId: command.ownerFamilyId,
      title: command.title,
      description: command.description,
      place: command.place,
      scheduledAt: command.scheduledAt,
      createdBy: command.actingUserId,
      now,
    });

    await this.plans.insert(plan);

    // Si se pide guardar el lugar y hay datos de lugar.
    if (command.savePlace && command.place) {
      const savedPlace = new SavedPlace({
        id: this.ids.generate(),
        familyId: command.ownerFamilyId,
        name: command.place.name,
        address: command.place.address,
        lat: command.place.lat,
        lng: command.place.lng,
        createdBy: command.actingUserId,
        createdAt: now,
      });
      await this.savedPlaces.insert(savedPlace);
    }

    return plan;
  }
}
