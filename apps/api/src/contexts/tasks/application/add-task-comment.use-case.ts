import { Inject, Injectable } from '@nestjs/common';
import { TaskComment } from '../domain/task';
import { TaskNotFoundError } from '../domain/task.errors';
import { TASK_REPOSITORY, type TaskRepository } from '../domain/ports/task.repository';
import {
  TASK_COMMENT_REPOSITORY,
  type TaskCommentRepository,
} from '../domain/ports/task-comment.repository';
import { TASKS_CLOCK, type TasksClock } from './ports/clock';
import { TASKS_ID_GENERATOR, type TasksIdGenerator } from './ports/id-generator';

export interface AddTaskCommentCommand {
  taskId: string;
  actingUserId: string;
  body: string;
}

/** Caso de uso: añadir un comentario a una tarea. */
@Injectable()
export class AddTaskCommentUseCase {
  constructor(
    @Inject(TASK_REPOSITORY) private readonly tasks: TaskRepository,
    @Inject(TASK_COMMENT_REPOSITORY) private readonly comments: TaskCommentRepository,
    @Inject(TASKS_CLOCK) private readonly clock: TasksClock,
    @Inject(TASKS_ID_GENERATOR) private readonly ids: TasksIdGenerator,
  ) {}

  async execute(command: AddTaskCommentCommand): Promise<TaskComment> {
    const task = await this.tasks.findById(command.taskId);
    if (!task) throw new TaskNotFoundError();

    const comment = TaskComment.create({
      id: this.ids.generate(),
      taskId: command.taskId,
      authorId: command.actingUserId,
      body: command.body,
      now: this.clock.now(),
    });

    await this.comments.create(comment);
    return comment;
  }
}
