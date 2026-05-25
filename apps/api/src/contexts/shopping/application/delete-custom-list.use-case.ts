import { Inject, Injectable } from '@nestjs/common';
import { ListNotFoundError } from '../domain/shopping.errors';
import {
  SHOPPING_LIST_REPOSITORY,
  type ShoppingListRepository,
} from '../domain/ports/shopping-list.repository';

export interface DeleteCustomListCommand {
  listId: string;
}

/**
 * Caso de uso: eliminar una lista CUSTOM.
 *
 * Lanza {@link CannotDeleteMainListError} si se intenta borrar la lista MAIN.
 */
@Injectable()
export class DeleteCustomListUseCase {
  constructor(
    @Inject(SHOPPING_LIST_REPOSITORY) private readonly lists: ShoppingListRepository,
  ) {}

  async execute(command: DeleteCustomListCommand): Promise<void> {
    const list = await this.lists.findById(command.listId);
    if (!list) {
      throw new ListNotFoundError();
    }

    list.assertDeletable();
    await this.lists.deleteById(command.listId);
  }
}
