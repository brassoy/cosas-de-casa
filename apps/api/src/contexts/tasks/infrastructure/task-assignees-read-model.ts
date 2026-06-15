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

  /**
   * Versión batch de {@link enrichAssignees} para listados.
   *
   * Recibe los pares `taskId -> assigneeIds` (los `assigneeIds` ya vienen
   * cargados en el aggregate Task por el repositorio), reúne TODOS los
   * userIds únicos y resuelve sus displayName en UNA sola query a
   * `app_users` (WHERE id IN (...)). Evita el N+1 de llamar a
   * `enrichAssignees` una vez por tarea.
   *
   * Devuelve un Map `taskId -> AssigneeView[]` que respeta, por tarea, el
   * mismo orden de `assigneeIds` que produciría `enrichAssignees`.
   */
  async findAssigneesByTasks(
    tasks: ReadonlyArray<{ taskId: string; assigneeIds: string[] }>,
  ): Promise<Map<string, AssigneeView[]>> {
    const result = new Map<string, AssigneeView[]>();
    if (tasks.length === 0) return result;

    const uniqueUserIds = [
      ...new Set(tasks.flatMap((t) => t.assigneeIds)),
    ];

    // Una única query para todos los usuarios de todas las tareas.
    const rows = uniqueUserIds.length
      ? await this.db
          .select({ id: appUsers.id, displayName: appUsers.displayName })
          .from(appUsers)
          .where(inArray(appUsers.id, uniqueUserIds))
      : [];

    const displayNameById = new Map<string, string | null>(
      rows.map((r) => [r.id, r.displayName ?? null]),
    );

    // Reconstruye por tarea respetando el orden original de assigneeIds.
    for (const { taskId, assigneeIds } of tasks) {
      result.set(
        taskId,
        assigneeIds.map((uid) => ({
          userId: uid,
          displayName: displayNameById.get(uid) ?? null,
        })),
      );
    }

    return result;
  }
}
