import { Inject, Injectable } from '@nestjs/common';
import type { Task } from '../domain/task';
import { TaskNotFoundError } from '../domain/task.errors';
import { TASK_REPOSITORY, type TaskRepository } from '../domain/ports/task.repository';

export interface GetTaskCommand {
  taskId: string;
}

/** Caso de uso: obtener una tarea por id. */
@Injectable()
export class GetTaskUseCase {
  constructor(
    @Inject(TASK_REPOSITORY) private readonly tasks: TaskRepository,
  ) {}

  async execute(command: GetTaskCommand): Promise<Task> {
    const task = await this.tasks.findById(command.taskId);
    if (!task) throw new TaskNotFoundError();
    return task;
  }
}
