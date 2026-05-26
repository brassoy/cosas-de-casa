import type { TaskRow, TaskAssigneeRow, TaskPhotoRow } from '../../../db/schema';
import { Task, TaskPhoto } from '../domain/task';

/** Traduce filas de BD a entidades de dominio. */
export const TaskMapper = {
  toTask(row: TaskRow, assigneeIds: string[]): Task {
    return new Task({
      id: row.id,
      familyId: row.familyId,
      title: row.title,
      description: row.description ?? null,
      status: row.status,
      // Drizzle devuelve date como string 'YYYY-MM-DD'
      recommendedDate: row.recommendedDate ?? null,
      deadlineDate: row.deadlineDate ?? null,
      createdBy: row.createdBy ?? null,
      assigneeIds,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  },

  toPhoto(row: TaskPhotoRow): TaskPhoto {
    return new TaskPhoto({
      id: row.id,
      taskId: row.taskId,
      storagePath: row.storagePath,
      createdAt: row.createdAt,
    });
  },

  extractAssigneeIds(rows: TaskAssigneeRow[]): string[] {
    return rows.map((r) => r.userId);
  },
};
