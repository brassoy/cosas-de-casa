import type { GroupMembershipRow, GroupRow } from '../../../db/schema';
import { Group } from '../domain/group';
import { GroupMembership } from '../domain/group-membership';

/**
 * Mapper fila ↔ aggregate para `groups`. Traduce entre el modelo de
 * persistencia (Drizzle) y el dominio, sin que ninguno conozca al otro.
 */
export const GroupMapper = {
  toGroupMembership(row: GroupMembershipRow): GroupMembership {
    return new GroupMembership({
      id: row.id,
      groupId: row.groupId,
      userId: row.userId,
      role: row.role,
      joinedAt: row.joinedAt,
    });
  },

  toGroup(row: GroupRow, memberships: GroupMembershipRow[]): Group {
    return new Group({
      id: row.id,
      name: row.name,
      description: row.description,
      imageUrl: row.imageUrl,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      memberships: memberships.map((m) => GroupMapper.toGroupMembership(m)),
    });
  },
};
