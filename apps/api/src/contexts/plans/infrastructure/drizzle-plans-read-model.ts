import { eq } from 'drizzle-orm';
import { Inject, Injectable } from '@nestjs/common';
import type { Database } from '../../../db/db.types';
import { DRIZZLE } from '../../../db/drizzle.tokens';
import {
  plans,
  planParticipants,
  planShares,
  appUsers,
} from '../../../db/schema';
import type { PlansReadModel, PlanDetailView, PlanParticipantView } from '../application/ports/plans-read-model';
import type { PlaceData, PlanRsvpStatus, PlanStatus } from '../domain/plan';

@Injectable()
export class DrizzlePlansReadModel implements PlansReadModel {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async getPlanDetail(planId: string): Promise<PlanDetailView | null> {
    const rows = await this.db.select().from(plans).where(eq(plans.id, planId)).limit(1);
    const row = rows[0];
    if (!row) return null;

    const participantRows = await this.db
      .select({
        userId: planParticipants.userId,
        status: planParticipants.status,
        displayName: appUsers.displayName,
      })
      .from(planParticipants)
      .leftJoin(appUsers, eq(appUsers.id, planParticipants.userId))
      .where(eq(planParticipants.planId, planId));

    const shareRows = await this.db
      .select({ familyId: planShares.familyId })
      .from(planShares)
      .where(eq(planShares.planId, planId));

    const place: PlaceData | null = row.placeName
      ? {
          name: row.placeName,
          address: row.placeAddress,
          lat: row.placeLat != null ? Number(row.placeLat) : null,
          lng: row.placeLng != null ? Number(row.placeLng) : null,
        }
      : null;

    const participants: PlanParticipantView[] = participantRows.map((p) => ({
      userId: p.userId,
      displayName: p.displayName,
      status: p.status as PlanRsvpStatus,
    }));

    return {
      id: row.id,
      ownerFamilyId: row.ownerFamilyId,
      title: row.title,
      description: row.description,
      place,
      scheduledAt: row.scheduledAt,
      status: row.status as PlanStatus,
      createdBy: row.createdBy,
      participants,
      sharedWithFamilyIds: shareRows.map((s) => s.familyId),
      createdAt: row.createdAt,
    };
  }
}
