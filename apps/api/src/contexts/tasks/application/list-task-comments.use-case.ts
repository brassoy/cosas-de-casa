import { Inject, Injectable } from '@nestjs/common';
import type { TaskComment } from '../domain/task';
import { TaskNotFoundError } from '../domain/task.errors';
import { TASK_REPOSITORY, type TaskRepository } from '../domain/ports/task.repository';
import {
  TASK_COMMENT_REPOSITORY,
  type TaskCommentRepository,
} from '../domain/ports/task-comment.repository';

export interface ListTaskCommentsCommand {
  taskId: string;
}

/** Caso de uso: listar los comentarios de una tarea. */
@Injectable()
export class ListTaskCommentsUseCase {
  constructor(
    @Inject(TASK_REPOSITORY) private readonly tasks: TaskRepository,
    @Inject(TASK_COMMENT_REPOSITORY) private readonly comments: TaskCommentRepository,
  ) {}

  async execute(command: ListTaskCommentsCommand): Promise<TaskComment[]> {
    const task = await this.tasks.findById(command.taskId);
    if (!task) throw new TaskNotFoundError();

    return this.comments.findByTask(command.taskId);
  }
}
