import { Inject, Injectable } from '@nestjs/common';
import { Task } from '../domain/task';
import { TASK_REPOSITORY, type TaskRepository } from '../domain/ports/task.repository';
import { TASKS_CLOCK, type TasksClock } from './ports/clock';
import { TASKS_ID_GENERATOR, type TasksIdGenerator } from './ports/id-generator';

export interface CreateTaskCommand {
  familyId: string;
  title: string;
  description?: string | null;
  recommendedDate?: string | null;
  deadlineDate?: string | null;
  createdBy: string;
  assigneeIds?: string[];
}

/** Caso de uso: crear una tarea doméstica para una familia. */
@Injectable()
export class CreateTaskUseCase {
  constructor(
    @Inject(TASK_REPOSITORY) private readonly tasks: TaskRepository,
    @Inject(TASKS_CLOCK) private readonly clock: TasksClock,
    @Inject(TASKS_ID_GENERATOR) private readonly ids: TasksIdGenerator,
  ) {}

  async execute(command: CreateTaskCommand): Promise<Task> {
    const task = Task.create({
      id: this.ids.generate(),
      familyId: command.familyId,
      title: command.title,
      description: command.description,
      recommendedDate: command.recommendedDate,
      deadlineDate: command.deadlineDate,
      createdBy: command.createdBy,
      assigneeIds: command.assigneeIds,
      now: this.clock.now(),
    });

    await this.tasks.create(task);
    return task;
  }
}
