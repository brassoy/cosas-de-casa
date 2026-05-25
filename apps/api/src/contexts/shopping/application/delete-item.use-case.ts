import { Inject, Injectable } from '@nestjs/common';
import { ItemNotFoundError } from '../domain/shopping.errors';
import {
  SHOPPING_ITEM_REPOSITORY,
  type ShoppingItemRepository,
} from '../domain/ports/shopping-item.repository';

export interface DeleteItemCommand {
  itemId: string;
}

/** Caso de uso: eliminar un ítem de una lista. */
@Injectable()
export class DeleteItemUseCase {
  constructor(
    @Inject(SHOPPING_ITEM_REPOSITORY) private readonly items: ShoppingItemRepository,
  ) {}

  async execute(command: DeleteItemCommand): Promise<void> {
    const item = await this.items.findById(command.itemId);
    if (!item) {
      throw new ItemNotFoundError();
    }

    await this.items.deleteById(command.itemId);
  }
}
