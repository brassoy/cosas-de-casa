import { asc, eq } from 'drizzle-orm';
import { Inject, Injectable } from '@nestjs/common';
import type { Database } from '../../../db/db.types';
import { DRIZZLE } from '../../../db/drizzle.tokens';
import { appUsers, groupMemberships } from '../../../db/schema';
import type { GroupMembersReadModel, GroupMemberView } from '../application/ports/group-members-read-model';

/**
 * Adaptador Drizzle del read-model de miembros de peña. Une `group_memberships`
 * con `app_users` para devolver el nombre visible junto con el rol.
 */
@Injectable()
export class DrizzleGroupMembersReadModel implements GroupMembersReadModel {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async listByGroup(groupId: string): Promise<GroupMemberView[]> {
    const rows = await this.db
      .select({
        userId: groupMemberships.userId,
        displayName: appUsers.displayName,
        role: groupMemberships.role,
        joinedAt: groupMemberships.joinedAt,
      })
      .from(groupMemberships)
      .innerJoin(appUsers, eq(appUsers.id, groupMemberships.userId))
      .where(eq(groupMemberships.groupId, groupId))
      .orderBy(asc(groupMemberships.joinedAt));

    return rows.map((row) => ({
      userId: row.userId,
      displayName: row.displayName,
      role: row.role,
      joinedAt: row.joinedAt,
    }));
  }
}
