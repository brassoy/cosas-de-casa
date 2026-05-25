import { eq } from 'drizzle-orm';
import type { DatabaseExecutor } from '../../../db/db.types';
import { memberships } from '../../../db/schema';
import type { Membership } from '../domain/membership';
import type { MembershipRepository } from '../domain/ports/membership.repository';
import { FamilyMapper } from './family.mapper';

/** Adaptador Drizzle de {@link MembershipRepository}. */
export class DrizzleMembershipRepository implements MembershipRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  async insert(membership: Membership): Promise<boolean> {
    // ON CONFLICT DO NOTHING sobre UNIQUE(family_id, user_id): si ya era
    // miembro, no inserta. `returning` nos dice si hubo alta efectiva.
    const inserted = await this.db
      .insert(memberships)
      .values({
        id: membership.id,
        familyId: membership.familyId,
        userId: membership.userId,
        role: membership.role,
        joinedAt: membership.joinedAt,
      })
      .onConflictDoNothing({ target: [memberships.familyId, memberships.userId] })
      .returning({ id: memberships.id });
    return inserted.length > 0;
  }

  async deleteById(membershipId: string): Promise<void> {
    await this.db.delete(memberships).where(eq(memberships.id, membershipId));
  }

  async listByFamily(familyId: string): Promise<Membership[]> {
    const rows = await this.db.select().from(memberships).where(eq(memberships.familyId, familyId));
    return rows.map((row) => FamilyMapper.toMembership(row));
  }
}
