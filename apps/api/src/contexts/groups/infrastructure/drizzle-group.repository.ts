import { eq, inArray } from 'drizzle-orm';
import type { DatabaseExecutor } from '../../../db/db.types';
import { groups, groupMemberships } from '../../../db/schema';
import type { Group } from '../domain/group';
import type { GroupRepository } from '../domain/ports/group.repository';
import { GroupMapper } from './group.mapper';

/**
 * Adaptador Drizzle de {@link GroupRepository}. Recibe un `DatabaseExecutor`
 * (conexión raíz o transacción), de modo que el mismo código sirve dentro o
 * fuera de una Unit of Work.
 */
export class DrizzleGroupRepository implements GroupRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  async create(group: Group): Promise<void> {
    await this.db.insert(groups).values({
      id: group.id,
      name: group.name,
      description: group.description,
      imageUrl: group.imageUrl,
      createdBy: group.createdBy,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    });

    const rows = group.members.map((m) => ({
      id: m.id,
      groupId: m.groupId,
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
    }));
    if (rows.length > 0) {
      await this.db.insert(groupMemberships).values(rows);
    }
  }

  async findById(groupId: string): Promise<Group | null> {
    const groupRows = await this.db
      .select()
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1);
    const groupRow = groupRows[0];
    if (!groupRow) {
      return null;
    }
    const memberRows = await this.db
      .select()
      .from(groupMemberships)
      .where(eq(groupMemberships.groupId, groupId));
    return GroupMapper.toGroup(groupRow, memberRows);
  }

  async findByMember(userId: string): Promise<Group[]> {
    const myMemberships = await this.db
      .select({ groupId: groupMemberships.groupId })
      .from(groupMemberships)
      .where(eq(groupMemberships.userId, userId));
    const groupIds = myMemberships.map((m) => m.groupId);
    if (groupIds.length === 0) {
      return [];
    }

    const groupRows = await this.db
      .select()
      .from(groups)
      .where(inArray(groups.id, groupIds));
    const allMembers = await this.db
      .select()
      .from(groupMemberships)
      .where(inArray(groupMemberships.groupId, groupIds));

    const byGroup = new Map<string, typeof allMembers>();
    for (const row of allMembers) {
      const list = byGroup.get(row.groupId) ?? [];
      list.push(row);
      byGroup.set(row.groupId, list);
    }

    return groupRows.map((row) => GroupMapper.toGroup(row, byGroup.get(row.id) ?? []));
  }

  async update(group: Group): Promise<void> {
    await this.db
      .update(groups)
      .set({
        name: group.name,
        description: group.description,
        updatedAt: group.updatedAt,
      })
      .where(eq(groups.id, group.id));
  }

  async delete(groupId: string): Promise<void> {
    // Las FKs `ON DELETE CASCADE` (memberships, PINs…) limpian las filas
    // dependientes; aquí solo borramos la fila de la peña.
    await this.db.delete(groups).where(eq(groups.id, groupId));
  }
}
