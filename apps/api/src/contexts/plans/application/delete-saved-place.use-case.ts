import { Inject, Injectable } from '@nestjs/common';
import { SavedPlaceNotFoundError, SavedPlaceAccessDeniedError } from '../domain/plans.errors';
import { SAVED_PLACE_REPOSITORY, type SavedPlaceRepository } from '../domain/ports/saved-place.repository';
import { FAMILY_REPOSITORY, type FamilyRepository } from '../../family/domain/ports/family.repository';

export interface DeleteSavedPlaceCommand {
  actingUserId: string;
  placeId: string;
}

@Injectable()
export class DeleteSavedPlaceUseCase {
  constructor(
    @Inject(FAMILY_REPOSITORY) private readonly families: FamilyRepository,
    @Inject(SAVED_PLACE_REPOSITORY) private readonly savedPlaces: SavedPlaceRepository,
  ) {}

  async execute(command: DeleteSavedPlaceCommand): Promise<void> {
    const place = await this.savedPlaces.findById(command.placeId);
    if (!place) throw new SavedPlaceNotFoundError();

    const family = await this.families.findById(place.familyId);
    if (!family || !family.isMember(command.actingUserId)) {
      throw new SavedPlaceAccessDeniedError();
    }

    await this.savedPlaces.deleteById(command.placeId);
  }
}
