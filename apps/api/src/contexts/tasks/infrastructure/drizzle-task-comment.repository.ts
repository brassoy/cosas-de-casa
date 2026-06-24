import { asc, eq } from 'drizzle-orm';
import type { DatabaseExecutor } from '../../../db/db.types';
import { taskComments } from '../../../db/schema';
import type { TaskComment } from '../domain/task';
import type { TaskCommentRepository } from '../domain/ports/task-comment.repository';
import { TaskMapper } from './task.mapper';

/** Adaptador Drizzle de {@link TaskCommentRepository}. */
export class DrizzleTaskCommentRepository implements TaskCommentRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  async create(comment: TaskComment): Promise<void> {
    await this.db.insert(taskComments).values({
      id: comment.id,
      taskId: comment.taskId,
      authorId: comment.authorId ?? undefined,
      body: comment.body,
      createdAt: comment.createdAt,
    });
  }

  async findByTask(taskId: string): Promise<TaskComment[]> {
    const rows = await this.db
      .select()
      .from(taskComments)
      .where(eq(taskComments.taskId, taskId))
      .orderBy(asc(taskComments.createdAt));
    return rows.map((r) => TaskMapper.toComment(r));
  }
}
