import { eq, inArray } from 'drizzle-orm';
import type { DatabaseExecutor } from '../../../db/db.types';
import {
  plans,
  planParticipants,
  planShares,
} from '../../../db/schema';
import { Plan, type PlaceData, type PlanRsvpStatus, type PlanStatus } from '../domain/plan';
import type { PlanRepository } from '../domain/ports/plan.repository';

export class DrizzlePlanRepository implements PlanRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  async insert(plan: Plan): Promise<void> {
    await this.db.insert(plans).values({
      id: plan.id,
      ownerFamilyId: plan.ownerFamilyId,
      title: plan.title,
      description: plan.description,
      placeName: plan.place?.name ?? null,
      placeAddress: plan.place?.address ?? null,
      placeLat: plan.place?.lat != null ? String(plan.place.lat) : null,
      placeLng: plan.place?.lng != null ? String(plan.place.lng) : null,
      scheduledAt: plan.scheduledAt,
      status: plan.status,
      createdBy: plan.createdBy,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    });

    // Inserta el participante inicial (creador).
    if (plan.participants.length > 0) {
      await this.db.insert(planParticipants).values(
        plan.participants.map((p) => ({
          planId: plan.id,
          userId: p.userId,
          status: p.status,
          updatedAt: plan.createdAt,
        })),
      );
    }
  }

  async findById(planId: string): Promise<Plan | null> {
    const rows = await this.db.select().from(plans).where(eq(plans.id, planId)).limit(1);
    const row = rows[0];
    if (!row) return null;

    const participants = await this.db
      .select()
      .from(planParticipants)
      .where(eq(planParticipants.planId, planId));

    const shares = await this.db
      .select({ familyId: planShares.familyId })
      .from(planShares)
      .where(eq(planShares.planId, planId));

    return this.mapRow(row, participants, shares.map((s) => s.familyId));
  }

  async listByFamilyAccess(familyId: string): Promise<Plan[]> {
    // Planes donde la familia es owner.
    const ownedRows = await this.db
      .select()
      .from(plans)
      .where(eq(plans.ownerFamilyId, familyId));

    // Planes compartidos con esta familia.
    const sharedPlanIds = await this.db
      .select({ planId: planShares.planId })
      .from(planShares)
      .where(eq(planShares.familyId, familyId));

    let sharedRows: typeof ownedRows = [];
    if (sharedPlanIds.length > 0) {
      const ids = sharedPlanIds.map((r) => r.planId);
      sharedRows = await this.db
        .select()
        .from(plans)
        .where(inArray(plans.id, ids));
    }

    const allRows = [...ownedRows, ...sharedRows.filter((r) => r.ownerFamilyId !== familyId)];
    if (allRows.length === 0) return [];

    const allPlanIds = allRows.map((r) => r.id);
    const allParticipants = await this.db
      .select()
      .from(planParticipants)
      .where(inArray(planParticipants.planId, allPlanIds));

    const allShares = await this.db
      .select()
      .from(planShares)
      .where(inArray(planShares.planId, allPlanIds));

    const participantsByPlan = new Map<string, typeof allParticipants>();
    for (const p of allParticipants) {
      const list = participantsByPlan.get(p.planId) ?? [];
      list.push(p);
      participantsByPlan.set(p.planId, list);
    }

    const sharesByPlan = new Map<string, string[]>();
    for (const s of allShares) {
      const list = sharesByPlan.get(s.planId) ?? [];
      list.push(s.familyId);
      sharesByPlan.set(s.planId, list);
    }

    return allRows.map((row) =>
      this.mapRow(
        row,
        participantsByPlan.get(row.id) ?? [],
        sharesByPlan.get(row.id) ?? [],
      ),
    );
  }

  async update(plan: Plan): Promise<void> {
    await this.db
      .update(plans)
      .set({
        title: plan.title,
        description: plan.description,
        placeName: plan.place?.name ?? null,
        placeAddress: plan.place?.address ?? null,
        placeLat: plan.place?.lat != null ? String(plan.place.lat) : null,
        placeLng: plan.place?.lng != null ? String(plan.place.lng) : null,
        scheduledAt: plan.scheduledAt,
        status: plan.status,
        updatedAt: plan.updatedAt,
      })
      .where(eq(plans.id, plan.id));
  }

  async deleteById(planId: string): Promise<void> {
    await this.db.delete(plans).where(eq(plans.id, planId));
  }

  async insertShare(planId: string, familyId: string, sharedAt: Date): Promise<void> {
    await this.db
      .insert(planShares)
      .values({ planId, familyId, sharedAt })
      .onConflictDoNothing({ target: [planShares.planId, planShares.familyId] });
  }

  async insertOrUpdateParticipant(
    planId: string,
    userId: string,
    status: string,
    updatedAt: Date,
  ): Promise<void> {
    await this.db
      .insert(planParticipants)
      .values({ planId, userId, status: status as PlanRsvpStatus, updatedAt })
      .onConflictDoUpdate({
        target: [planParticipants.planId, planParticipants.userId],
        set: { status: status as PlanRsvpStatus, updatedAt },
      });
  }

  private mapRow(
    row: typeof plans.$inferSelect,
    participants: Array<{ userId: string; status: string }>,
    sharedWithFamilyIds: string[],
  ): Plan {
    const place: PlaceData | null = row.placeName
      ? {
          name: row.placeName,
          address: row.placeAddress,
          lat: row.placeLat != null ? Number(row.placeLat) : null,
          lng: row.placeLng != null ? Number(row.placeLng) : null,
        }
      : null;

    return new Plan({
      id: row.id,
      ownerFamilyId: row.ownerFamilyId,
      title: row.title,
      description: row.description,
      place,
      scheduledAt: row.scheduledAt,
      status: row.status as PlanStatus,
      createdBy: row.createdBy,
      participants: participants.map((p) => ({
        userId: p.userId,
        status: p.status as PlanRsvpStatus,
      })),
      sharedWithFamilyIds,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
