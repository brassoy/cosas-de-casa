import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { DatabaseExecutor } from '../../../db/db.types';
import { routineAssignments, routineItems, routineSelections } from '../../../db/schema';
import type { RoutineItem } from '../domain/routine-item';
import type { RoutineItemRepository } from '../domain/ports/routine-item.repository';
import { RoutineMapper } from './routine.mapper';

/** Adaptador Drizzle de {@link RoutineItemRepository}. */
export class DrizzleRoutineItemRepository implements RoutineItemRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  async create(item: RoutineItem): Promise<void> {
    await this.db.insert(routineItems).values({
      id: item.id,
      familyId: item.familyId,
      name: item.name,
      targetTimesPerWeek: item.targetTimesPerWeek,
      defaultStartTime: item.defaultStartTime,
      defaultEndTime: item.defaultEndTime,
      tags: item.tags,
      archivedAt: item.archivedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    });
  }

  async findById(itemId: string): Promise<RoutineItem | null> {
    const rows = await this.db
      .select()
      .from(routineItems)
      .where(eq(routineItems.id, itemId))
      .limit(1);
    const row = rows[0];
    return row ? RoutineMapper.toRoutineItem(row) : null;
  }

  async findByFamily(
    familyId: string,
    opts?: { includeArchived?: boolean },
  ): Promise<RoutineItem[]> {
    const conditions = [eq(routineItems.familyId, familyId)];
    if (!opts?.includeArchived) {
      conditions.push(isNull(routineItems.archivedAt));
    }
    const rows = await this.db
      .select()
      .from(routineItems)
      .where(and(...conditions))
      .orderBy(routineItems.createdAt);
    return rows.map(RoutineMapper.toRoutineItem);
  }

  async findByIds(itemIds: string[]): Promise<RoutineItem[]> {
    if (itemIds.length === 0) return [];
    const rows = await this.db
      .select()
      .from(routineItems)
      .where(inArray(routineItems.id, itemIds));
    return rows.map(RoutineMapper.toRoutineItem);
  }

  async update(item: RoutineItem): Promise<void> {
    await this.db
      .update(routineItems)
      .set({
        name: item.name,
        targetTimesPerWeek: item.targetTimesPerWeek,
        defaultStartTime: item.defaultStartTime,
        defaultEndTime: item.defaultEndTime,
        tags: item.tags,
        archivedAt: item.archivedAt,
        updatedAt: item.updatedAt,
      })
      .where(eq(routineItems.id, item.id));
  }

  async deleteById(itemId: string): Promise<void> {
    await this.db.delete(routineItems).where(eq(routineItems.id, itemId));
  }

  async isReferenced(itemId: string): Promise<boolean> {
    const rows = await this.db
      .select({ exists: sql<number>`1` })
      .from(routineSelections)
      .where(eq(routineSelections.routineItemId, itemId))
      .limit(1);
    if (rows.length > 0) return true;
    const assignmentRows = await this.db
      .select({ exists: sql<number>`1` })
      .from(routineAssignments)
      .where(eq(routineAssignments.routineItemId, itemId))
      .limit(1);
    return assignmentRows.length > 0;
  }
}
