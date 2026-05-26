import { Inject, Injectable } from '@nestjs/common';
import type { SavedPlace } from '../domain/saved-place';
import { PlanFamilyMemberError } from '../domain/plans.errors';
import { SAVED_PLACE_REPOSITORY, type SavedPlaceRepository } from '../domain/ports/saved-place.repository';
import { FAMILY_REPOSITORY, type FamilyRepository } from '../../family/domain/ports/family.repository';

export interface ListSavedPlacesQuery {
  actingUserId: string;
  familyId: string;
}

@Injectable()
export class ListSavedPlacesUseCase {
  constructor(
    @Inject(FAMILY_REPOSITORY) private readonly families: FamilyRepository,
    @Inject(SAVED_PLACE_REPOSITORY) private readonly savedPlaces: SavedPlaceRepository,
  ) {}

  async execute(query: ListSavedPlacesQuery): Promise<SavedPlace[]> {
    const family = await this.families.findById(query.familyId);
    if (!family || !family.isMember(query.actingUserId)) {
      throw new PlanFamilyMemberError();
    }
    return this.savedPlaces.listByFamily(query.familyId);
  }
}
