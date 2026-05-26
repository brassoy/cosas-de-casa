import { Inject, Injectable } from '@nestjs/common';
import type { Task } from '../domain/task';
import { TaskNotFoundError } from '../domain/task.errors';
import { TASK_REPOSITORY, type TaskRepository } from '../domain/ports/task.repository';
import { TASKS_CLOCK, type TasksClock } from './ports/clock';

export interface SetAssigneesCommand {
  taskId: string;
  assigneeIds: string[];
}

/** Caso de uso: reemplazar la lista de asignados de una tarea. */
@Injectable()
export class SetAssigneesUseCase {
  constructor(
    @Inject(TASK_REPOSITORY) private readonly tasks: TaskRepository,
    @Inject(TASKS_CLOCK) private readonly clock: TasksClock,
  ) {}

  async execute(command: SetAssigneesCommand): Promise<Task> {
    const task = await this.tasks.findById(command.taskId);
    if (!task) throw new TaskNotFoundError();

    const now = this.clock.now();
    task.setAssignees(command.assigneeIds, now);
    // Actualiza updatedAt en la fila de tasks y reemplaza los asignados en task_assignees
    await this.tasks.update(task);
    await this.tasks.setAssignees(command.taskId, command.assigneeIds);
    return task;
  }
}
