import { and, eq, gt } from 'drizzle-orm';
import type { DatabaseExecutor } from '../../../db/db.types';
import { joinPins } from '../../../db/schema';
import type { JoinPin } from '../domain/join-pin';
import type { JoinPinRepository } from '../domain/ports/join-pin.repository';

/** Adaptador Drizzle de {@link JoinPinRepository}. */
export class DrizzleJoinPinRepository implements JoinPinRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  async insert(pin: JoinPin): Promise<void> {
    await this.db.insert(joinPins).values({
      id: pin.id,
      familyId: pin.familyId,
      codeHash: pin.codeHash,
      status: pin.status,
      expiresAt: pin.expiresAt,
      createdBy: pin.createdBy,
      consumedBy: pin.consumedBy,
      createdAt: pin.createdAt,
      consumedAt: pin.consumedAt,
    });
  }

  async revokeActiveByFamily(familyId: string, _now: Date): Promise<number> {
    const updated = await this.db
      .update(joinPins)
      .set({ status: 'REVOKED' })
      .where(and(eq(joinPins.familyId, familyId), eq(joinPins.status, 'ACTIVE')))
      .returning({ id: joinPins.id });
    return updated.length;
  }

  /**
   * Consumo ATÓMICO: un único UPDATE condicional. Postgres bloquea la fila y
   * evalúa el WHERE de forma serializable respecto a otras transacciones, así
   * que dos peticiones concurrentes con el mismo hash no pueden ganar ambas.
   */
  async consumeActiveByHash(params: {
    codeHash: string;
    userId: string;
    now: Date;
  }): Promise<{ familyId: string } | null> {
    const consumed = await this.db
      .update(joinPins)
      .set({ status: 'CONSUMED', consumedBy: params.userId, consumedAt: params.now })
      .where(
        and(
          eq(joinPins.codeHash, params.codeHash),
          eq(joinPins.status, 'ACTIVE'),
          gt(joinPins.expiresAt, params.now),
        ),
      )
      .returning({ familyId: joinPins.familyId });
    return consumed[0] ?? null;
  }
}
