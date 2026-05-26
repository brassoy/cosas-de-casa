import { and, eq, gt } from 'drizzle-orm';
import type { DatabaseExecutor } from '../../../db/db.types';
import { groupJoinPins } from '../../../db/schema';
import type { GroupJoinPin } from '../domain/group-join-pin';
import type { GroupJoinPinRepository } from '../domain/ports/group-join-pin.repository';

/** Adaptador Drizzle de {@link GroupJoinPinRepository}. */
export class DrizzleGroupJoinPinRepository implements GroupJoinPinRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  async insert(pin: GroupJoinPin): Promise<void> {
    await this.db.insert(groupJoinPins).values({
      id: pin.id,
      groupId: pin.groupId,
      codeHash: pin.codeHash,
      status: pin.status,
      expiresAt: pin.expiresAt,
      createdBy: pin.createdBy,
      consumedBy: pin.consumedBy,
      createdAt: pin.createdAt,
      consumedAt: pin.consumedAt,
    });
  }

  async revokeActiveByGroup(groupId: string, _now: Date): Promise<number> {
    const updated = await this.db
      .update(groupJoinPins)
      .set({ status: 'REVOKED' })
      .where(and(eq(groupJoinPins.groupId, groupId), eq(groupJoinPins.status, 'ACTIVE')))
      .returning({ id: groupJoinPins.id });
    return updated.length;
  }

  /**
   * Consumo ATÓMICO: un único UPDATE condicional. Postgres bloquea la fila y
   * evalúa el WHERE de forma serializable respecto a otras transacciones.
   */
  async consumeActiveByHash(params: {
    codeHash: string;
    userId: string;
    now: Date;
  }): Promise<{ groupId: string } | null> {
    const consumed = await this.db
      .update(groupJoinPins)
      .set({ status: 'CONSUMED', consumedBy: params.userId, consumedAt: params.now })
      .where(
        and(
          eq(groupJoinPins.codeHash, params.codeHash),
          eq(groupJoinPins.status, 'ACTIVE'),
          gt(groupJoinPins.expiresAt, params.now),
        ),
      )
      .returning({ groupId: groupJoinPins.groupId });
    return consumed[0] ?? null;
  }
}
