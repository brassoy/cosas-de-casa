import { Inject, Injectable } from '@nestjs/common';
import { SavedPlace } from '../domain/saved-place';
import { PlanFamilyMemberError } from '../domain/plans.errors';
import { SAVED_PLACE_REPOSITORY, type SavedPlaceRepository } from '../domain/ports/saved-place.repository';
import { FAMILY_REPOSITORY, type FamilyRepository } from '../../family/domain/ports/family.repository';
import { CLOCK, type Clock } from '../../family/application/ports/clock';
import { ID_GENERATOR, type IdGenerator } from '../../family/application/ports/id-generator';

export interface CreateSavedPlaceCommand {
  actingUserId: string;
  familyId: string;
  name: string;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
}

@Injectable()
export class CreateSavedPlaceUseCase {
  constructor(
    @Inject(FAMILY_REPOSITORY) private readonly families: FamilyRepository,
    @Inject(SAVED_PLACE_REPOSITORY) private readonly savedPlaces: SavedPlaceRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: CreateSavedPlaceCommand): Promise<SavedPlace> {
    const family = await this.families.findById(command.familyId);
    if (!family || !family.isMember(command.actingUserId)) {
      throw new PlanFamilyMemberError();
    }

    const place = new SavedPlace({
      id: this.ids.generate(),
      familyId: command.familyId,
      name: command.name,
      address: command.address ?? null,
      lat: command.lat ?? null,
      lng: command.lng ?? null,
      createdBy: command.actingUserId,
      createdAt: this.clock.now(),
    });

    await this.savedPlaces.insert(place);
    return place;
  }
}
