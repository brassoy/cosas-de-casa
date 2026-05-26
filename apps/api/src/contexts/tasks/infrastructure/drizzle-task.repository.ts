import { and, eq, inArray } from 'drizzle-orm';
import type { DatabaseExecutor } from '../../../db/db.types';
import { tasks, taskAssignees } from '../../../db/schema';
import type { Task } from '../domain/task';
import type { TaskRepository, ListTasksFilter } from '../domain/ports/task.repository';
import { TaskMapper } from './task.mapper';

/** Adaptador Drizzle de {@link TaskRepository}. */
export class DrizzleTaskRepository implements TaskRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  async create(task: Task): Promise<void> {
    await this.db.insert(tasks).values({
      id: task.id,
      familyId: task.familyId,
      title: task.title,
      description: task.description ?? undefined,
      status: task.status,
      recommendedDate: task.recommendedDate ?? undefined,
      deadlineDate: task.deadlineDate ?? undefined,
      createdBy: task.createdBy ?? undefined,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    });

    if (task.assigneeIds.length > 0) {
      await this.db.insert(taskAssignees).values(
        task.assigneeIds.map((userId) => ({ taskId: task.id, userId })),
      );
    }
  }

  async findById(taskId: string): Promise<Task | null> {
    const rows = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    const assigneeRows = await this.db
      .select()
      .from(taskAssignees)
      .where(eq(taskAssignees.taskId, taskId));

    return TaskMapper.toTask(row, TaskMapper.extractAssigneeIds(assigneeRows));
  }

  async findByFamily(familyId: string, filter?: ListTasksFilter): Promise<Task[]> {
    const conditions = [eq(tasks.familyId, familyId)];

    if (filter?.status) {
      conditions.push(eq(tasks.status, filter.status));
    }

    if (filter?.assigneeId) {
      // Subquery: tareas asignadas a un usuario concreto
      const assignedTaskIds = await this.db
        .select({ taskId: taskAssignees.taskId })
        .from(taskAssignees)
        .where(eq(taskAssignees.userId, filter.assigneeId));

      const ids = assignedTaskIds.map((r) => r.taskId);
      if (ids.length === 0) return [];
      conditions.push(inArray(tasks.id, ids));
    }

    const taskRows = await this.db
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(tasks.createdAt);

    if (taskRows.length === 0) return [];

    const taskIds = taskRows.map((r) => r.id);
    const allAssignees = await this.db
      .select()
      .from(taskAssignees)
      .where(inArray(taskAssignees.taskId, taskIds));

    return taskRows.map((row) => {
      const assigneeIds = allAssignees
        .filter((a) => a.taskId === row.id)
        .map((a) => a.userId);
      return TaskMapper.toTask(row, assigneeIds);
    });
  }

  async update(task: Task): Promise<void> {
    await this.db
      .update(tasks)
      .set({
        title: task.title,
        description: task.description ?? null,
        status: task.status,
        recommendedDate: task.recommendedDate ?? null,
        deadlineDate: task.deadlineDate ?? null,
        updatedAt: task.updatedAt,
      })
      .where(eq(tasks.id, task.id));
  }

  async deleteById(taskId: string): Promise<void> {
    await this.db.delete(tasks).where(eq(tasks.id, taskId));
  }

  async setAssignees(taskId: string, assigneeIds: string[]): Promise<void> {
    await this.db.delete(taskAssignees).where(eq(taskAssignees.taskId, taskId));

    if (assigneeIds.length > 0) {
      await this.db.insert(taskAssignees).values(
        assigneeIds.map((userId) => ({ taskId, userId })),
      );
    }
  }
}
