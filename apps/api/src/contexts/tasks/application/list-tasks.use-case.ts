import { Inject, Injectable } from '@nestjs/common';
import type { Task } from '../domain/task';
import { TASK_REPOSITORY, type TaskRepository, type ListTasksFilter } from '../domain/ports/task.repository';

export interface ListTasksCommand {
  familyId: string;
  filter?: ListTasksFilter;
}

/** Caso de uso: listar las tareas de una familia (con filtros opcionales). */
@Injectable()
export class ListTasksUseCase {
  constructor(
    @Inject(TASK_REPOSITORY) private readonly tasks: TaskRepository,
  ) {}

  async execute(command: ListTasksCommand): Promise<Task[]> {
    return this.tasks.findByFamily(command.familyId, command.filter);
  }
}
