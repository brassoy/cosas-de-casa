import { and, eq } from 'drizzle-orm';
import type { DatabaseExecutor } from '../../../db/db.types';
import { pushSubscriptions } from '../../../db/schema';
import { PushSubscription } from '../domain/push-subscription';
import type { PushSubscriptionRepository } from '../domain/ports/push-subscription.repository';

/** Adaptador Drizzle de {@link PushSubscriptionRepository}. */
export class DrizzlePushSubscriptionRepository implements PushSubscriptionRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  async save(sub: PushSubscription): Promise<void> {
    await this.db
      .insert(pushSubscriptions)
      .values({
        id: sub.id,
        userId: sub.userId,
        familyId: sub.familyId,
        endpoint: sub.endpoint,
        keys: sub.keys,
        createdAt: sub.createdAt,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          userId: sub.userId,
          familyId: sub.familyId,
          keys: sub.keys,
        },
      });
  }

  async findByUserAndEndpoint(userId: string, endpoint: string): Promise<PushSubscription | null> {
    const rows = await this.db
      .select()
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.endpoint, endpoint),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    return this.toEntity(row);
  }

  async findByFamily(familyId: string): Promise<PushSubscription[]> {
    const rows = await this.db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.familyId, familyId));

    return rows.map((r) => this.toEntity(r));
  }

  async deleteByEndpoint(endpoint: string): Promise<void> {
    await this.db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint));
  }

  async findAllFamilyIds(): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ familyId: pushSubscriptions.familyId })
      .from(pushSubscriptions);

    return rows.map((r) => r.familyId);
  }

  private toEntity(row: typeof pushSubscriptions.$inferSelect): PushSubscription {
    return new PushSubscription(
      row.id,
      row.userId,
      row.familyId,
      row.endpoint,
      row.keys as { p256dh: string; auth: string },
      row.createdAt,
    );
  }
}
