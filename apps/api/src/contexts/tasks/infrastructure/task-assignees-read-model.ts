import { inArray } from 'drizzle-orm';
import type { DatabaseExecutor } from '../../../db/db.types';
import { appUsers } from '../../../db/schema';

export interface AssigneeView {
  userId: string;
  displayName: string | null;
}

/**
 * Read-model para enriquecer los asignados de una tarea con el displayName
 * del usuario. Evita N+1 cargando todos los usuarios en una sola consulta.
 */
export class TaskAssigneesReadModel {
  constructor(private readonly db: DatabaseExecutor) {}

  async enrichAssignees(userIds: string[]): Promise<AssigneeView[]> {
    if (userIds.length === 0) return [];

    const rows = await this.db
      .select({ id: appUsers.id, displayName: appUsers.displayName })
      .from(appUsers)
      .where(inArray(appUsers.id, userIds));

    // Respeta el orden original de userIds
    return userIds.map((uid) => {
      const row = rows.find((r) => r.id === uid);
      return { userId: uid, displayName: row?.displayName ?? null };
    });
  }
}
