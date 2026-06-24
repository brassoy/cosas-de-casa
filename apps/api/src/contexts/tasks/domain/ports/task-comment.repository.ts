import type { TaskComment } from '../task';

export const TASK_COMMENT_REPOSITORY = Symbol('TASK_COMMENT_REPOSITORY');

/** Puerto de persistencia de comentarios de tarea. */
export interface TaskCommentRepository {
  /** Persiste un comentario nuevo. */
  create(comment: TaskComment): Promise<void>;

  /** Devuelve los comentarios de una tarea ordenados por createdAt ASC. */
  findByTask(taskId: string): Promise<TaskComment[]>;
}
