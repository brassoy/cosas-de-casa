import { Inject, Injectable } from '@nestjs/common';
import { TaskNotFoundError } from '../domain/task.errors';
import { TASK_REPOSITORY, type TaskRepository } from '../domain/ports/task.repository';

export interface DeleteTaskCommand {
  taskId: string;
}

/** Caso de uso: eliminar una tarea. */
@Injectable()
export class DeleteTaskUseCase {
  constructor(
    @Inject(TASK_REPOSITORY) private readonly tasks: TaskRepository,
  ) {}

  async execute(command: DeleteTaskCommand): Promise<void> {
    const task = await this.tasks.findById(command.taskId);
    if (!task) throw new TaskNotFoundError();
    await this.tasks.deleteById(command.taskId);
  }
}
