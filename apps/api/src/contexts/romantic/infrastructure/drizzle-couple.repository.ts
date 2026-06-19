import { and, eq, or } from 'drizzle-orm';
import type { DatabaseExecutor } from '../../../db/db.types';
import { couples } from '../../../db/schema';
import { Couple } from '../domain/couple';
import type { CoupleRepository } from '../domain/ports/couple.repository';

/** Adaptador Drizzle de {@link CoupleRepository}. */
export class DrizzleCoupleRepository implements CoupleRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  async save(couple: Couple): Promise<void> {
    await this.db.insert(couples).values({
      id: couple.id,
      familyId: couple.familyId,
      userA: couple.userA,
      userB: couple.userB,
      createdAt: couple.createdAt,
    });
  }

  async findById(coupleId: string): Promise<Couple | null> {
    const rows = await this.db
      .select()
      .from(couples)
      .where(eq(couples.id, coupleId))
      .limit(1);

    const row = rows[0];
    return row ? this.toEntity(row) : null;
  }

  async findByFamilyAndUser(familyId: string, userId: string): Promise<Couple | null> {
    const rows = await this.db
      .select()
      .from(couples)
      .where(
        and(
          eq(couples.familyId, familyId),
          or(eq(couples.userA, userId), eq(couples.userB, userId)),
        ),
      )
      .limit(1);

    const row = rows[0];
    return row ? this.toEntity(row) : null;
  }

  async delete(coupleId: string): Promise<void> {
    // Notas y retos se borran en cascada por la FK (onDelete: 'cascade').
    await this.db.delete(couples).where(eq(couples.id, coupleId));
  }

  private toEntity(row: typeof couples.$inferSelect): Couple {
    return new Couple({
      id: row.id,
      familyId: row.familyId,
      userA: row.userA,
      userB: row.userB,
      createdAt: row.createdAt,
    });
  }
}
