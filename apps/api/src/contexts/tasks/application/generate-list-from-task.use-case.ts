import { Inject, Injectable } from '@nestjs/common';
import type { ShoppingList } from '../../shopping/domain/shopping-list';
import { TaskNotFoundError } from '../domain/task.errors';
import { TASK_REPOSITORY, type TaskRepository } from '../domain/ports/task.repository';
import { CreateCustomListUseCase } from '../../shopping/application/create-custom-list.use-case';

export interface GenerateListFromTaskCommand {
  taskId: string;
  actingUserId: string;
}

/**
 * Caso de uso: crear una lista CUSTOM de la compra con el nombre de la tarea.
 *
 * Reutiliza {@link CreateCustomListUseCase} del contexto shopping.
 * Sentido de la dependencia: tasks → shopping (no hay ciclo porque shopping
 * no importa tasks).
 */
@Injectable()
export class GenerateListFromTaskUseCase {
  constructor(
    @Inject(TASK_REPOSITORY) private readonly tasks: TaskRepository,
    private readonly createCustomList: CreateCustomListUseCase,
  ) {}

  async execute(command: GenerateListFromTaskCommand): Promise<ShoppingList> {
    const task = await this.tasks.findById(command.taskId);
    if (!task) throw new TaskNotFoundError();

    return this.createCustomList.execute({
      familyId: task.familyId,
      name: task.title,
      actingUserId: command.actingUserId,
    });
  }
}
