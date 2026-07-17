import { desc, eq } from 'drizzle-orm';
import type { DatabaseExecutor } from '../../../db/db.types';
import { routineEvents, appUsers } from '../../../db/schema';
import type {
  NewRoutineEvent,
  RoutineChange,
  RoutineEventAction,
  RoutineEventEntity,
  RoutineEventRecord,
  RoutineHistoryRepository,
} from '../application/ports/routine-history.repository';

/**
 * Adaptador Drizzle del historial de rutinas. `append` inserta un evento (la BD
 * pone id y created_at); `list` lo lee ordenado por fecha descendente y resuelve
 * el nombre del autor con un left join a `app_users` (que sobrevive si el actor
 * se elimina, gracias al `onDelete: set null` de la FK).
 */
export class DrizzleRoutineHistoryRepository implements RoutineHistoryRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  async append(event: NewRoutineEvent): Promise<void> {
    await this.db.insert(routineEvents).values({
      routineId: event.routineId,
      entity: event.entity,
      action: event.action,
      summary: event.summary,
      changes: event.changes,
      createdBy: event.createdBy,
    });
  }

  async list(routineId: string, options?: { limit?: number }): Promise<RoutineEventRecord[]> {
    const limit = options?.limit ?? 100;

    const rows = await this.db
      .select({
        id: routineEvents.id,
        routineId: routineEvents.routineId,
        entity: routineEvents.entity,
        action: routineEvents.action,
        summary: routineEvents.summary,
        changes: routineEvents.changes,
        createdBy: routineEvents.createdBy,
        createdAt: routineEvents.createdAt,
        createdByName: appUsers.displayName,
      })
      .from(routineEvents)
      .leftJoin(appUsers, eq(appUsers.id, routineEvents.createdBy))
      .where(eq(routineEvents.routineId, routineId))
      .orderBy(desc(routineEvents.createdAt))
      .limit(limit);

    return rows.map((row) => ({
      id: row.id,
      routineId: row.routineId,
      entity: row.entity as RoutineEventEntity,
      action: row.action as RoutineEventAction,
      summary: row.summary,
      changes: (row.changes ?? []) as RoutineChange[],
      createdBy: row.createdBy,
      createdByName: row.createdByName,
      createdAt: row.createdAt,
    }));
  }
}
