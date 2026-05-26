import { eq } from 'drizzle-orm';
import type { DatabaseExecutor } from '../../../db/db.types';
import { groupMemberships } from '../../../db/schema';
import type { GroupMembership } from '../domain/group-membership';
import type { GroupMembershipRepository } from '../domain/ports/group-membership.repository';
import { GroupMapper } from './group.mapper';

/** Adaptador Drizzle de {@link GroupMembershipRepository}. */
export class DrizzleGroupMembershipRepository implements GroupMembershipRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  async insert(membership: GroupMembership): Promise<boolean> {
    const inserted = await this.db
      .insert(groupMemberships)
      .values({
        id: membership.id,
        groupId: membership.groupId,
        userId: membership.userId,
        role: membership.role,
        joinedAt: membership.joinedAt,
      })
      .onConflictDoNothing({ target: [groupMemberships.groupId, groupMemberships.userId] })
      .returning({ id: groupMemberships.id });
    return inserted.length > 0;
  }

  async deleteById(membershipId: string): Promise<void> {
    await this.db.delete(groupMemberships).where(eq(groupMemberships.id, membershipId));
  }

  async listByGroup(groupId: string): Promise<GroupMembership[]> {
    const rows = await this.db
      .select()
      .from(groupMemberships)
      .where(eq(groupMemberships.groupId, groupId));
    return rows.map((row) => GroupMapper.toGroupMembership(row));
  }
}
