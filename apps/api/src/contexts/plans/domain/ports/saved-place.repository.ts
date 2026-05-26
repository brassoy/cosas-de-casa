import type { SavedPlace } from '../saved-place';

export const SAVED_PLACE_REPOSITORY = Symbol('SAVED_PLACE_REPOSITORY');

export interface SavedPlaceRepository {
  insert(place: SavedPlace): Promise<void>;
  findById(placeId: string): Promise<SavedPlace | null>;
  listByFamily(familyId: string): Promise<SavedPlace[]>;
  deleteById(placeId: string): Promise<void>;
}
