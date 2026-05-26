import { eq } from 'drizzle-orm';
import type { DatabaseExecutor } from '../../../db/db.types';
import { savedPlaces } from '../../../db/schema';
import { SavedPlace } from '../domain/saved-place';
import type { SavedPlaceRepository } from '../domain/ports/saved-place.repository';

export class DrizzleSavedPlaceRepository implements SavedPlaceRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  async insert(place: SavedPlace): Promise<void> {
    await this.db.insert(savedPlaces).values({
      id: place.id,
      familyId: place.familyId,
      name: place.name,
      address: place.address,
      lat: place.lat != null ? String(place.lat) : null,
      lng: place.lng != null ? String(place.lng) : null,
      createdBy: place.createdBy,
      createdAt: place.createdAt,
    });
  }

  async findById(placeId: string): Promise<SavedPlace | null> {
    const rows = await this.db
      .select()
      .from(savedPlaces)
      .where(eq(savedPlaces.id, placeId))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return this.mapRow(row);
  }

  async listByFamily(familyId: string): Promise<SavedPlace[]> {
    const rows = await this.db
      .select()
      .from(savedPlaces)
      .where(eq(savedPlaces.familyId, familyId));
    return rows.map(this.mapRow);
  }

  async deleteById(placeId: string): Promise<void> {
    await this.db.delete(savedPlaces).where(eq(savedPlaces.id, placeId));
  }

  private mapRow(row: typeof savedPlaces.$inferSelect): SavedPlace {
    return new SavedPlace({
      id: row.id,
      familyId: row.familyId,
      name: row.name,
      address: row.address,
      lat: row.lat != null ? Number(row.lat) : null,
      lng: row.lng != null ? Number(row.lng) : null,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
    });
  }
}
