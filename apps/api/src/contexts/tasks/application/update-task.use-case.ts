import { Inject, Injectable } from '@nestjs/common';
import type { Task, TaskStatus } from '../domain/task';
import { TaskNotFoundError } from '../domain/task.errors';
import { TASK_REPOSITORY, type TaskRepository } from '../domain/ports/task.repository';
import { TASKS_CLOCK, type TasksClock } from './ports/clock';

export interface UpdateTaskCommand {
  taskId: string;
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  recommendedDate?: string | null;
  deadlineDate?: string | null;
}

/** Caso de uso: actualizar campos editables de una tarea (patch parcial). */
@Injectable()
export class UpdateTaskUseCase {
  constructor(
    @Inject(TASK_REPOSITORY) private readonly tasks: TaskRepository,
    @Inject(TASKS_CLOCK) private readonly clock: TasksClock,
  ) {}

  async execute(command: UpdateTaskCommand): Promise<Task> {
    const task = await this.tasks.findById(command.taskId);
    if (!task) throw new TaskNotFoundError();

    task.update(
      {
        title: command.title,
        description: command.description,
        status: command.status,
        recommendedDate: command.recommendedDate,
        deadlineDate: command.deadlineDate,
      },
      this.clock.now(),
    );

    await this.tasks.update(task);
    return task;
  }
}
