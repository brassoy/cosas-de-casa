import { and, eq } from 'drizzle-orm';
import type { DatabaseExecutor } from '../../../db/db.types';
import { coupleChallenges } from '../../../db/schema';
import { CoupleChallenge } from '../domain/couple-challenge';
import type { CoupleChallengeRepository } from '../domain/ports/couple-challenge.repository';

/** Adaptador Drizzle de {@link CoupleChallengeRepository}. */
export class DrizzleCoupleChallengeRepository implements CoupleChallengeRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  async save(challenge: CoupleChallenge): Promise<void> {
    await this.db.insert(coupleChallenges).values({
      id: challenge.id,
      coupleId: challenge.coupleId,
      challengeKey: challenge.challengeKey,
      done: challenge.done,
      doneAt: challenge.doneAt ?? undefined,
    });
  }

  async update(challenge: CoupleChallenge): Promise<void> {
    await this.db
      .update(coupleChallenges)
      .set({
        done: challenge.done,
        doneAt: challenge.doneAt ?? null,
      })
      .where(eq(coupleChallenges.id, challenge.id));
  }

  async findByCouple(coupleId: string): Promise<CoupleChallenge[]> {
    const rows = await this.db
      .select()
      .from(coupleChallenges)
      .where(eq(coupleChallenges.coupleId, coupleId))
      .orderBy(coupleChallenges.challengeKey);

    return rows.map((row) => new CoupleChallenge({
      id: row.id,
      coupleId: row.coupleId,
      challengeKey: row.challengeKey,
      done: row.done,
      doneAt: row.doneAt ?? null,
    }));
  }

  async findByCoupleAndKey(coupleId: string, challengeKey: string): Promise<CoupleChallenge | null> {
    const rows = await this.db
      .select()
      .from(coupleChallenges)
      .where(
        and(
          eq(coupleChallenges.coupleId, coupleId),
          eq(coupleChallenges.challengeKey, challengeKey),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    return new CoupleChallenge({
      id: row.id,
      coupleId: row.coupleId,
      challengeKey: row.challengeKey,
      done: row.done,
      doneAt: row.doneAt ?? null,
    });
  }
}
