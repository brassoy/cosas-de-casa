import { Inject, Injectable } from '@nestjs/common';
import type { ShoppingItem, ShoppingList } from '../domain/shopping-list';
import { ListNotFoundError } from '../domain/shopping.errors';
import {
  SHOPPING_LIST_REPOSITORY,
  type ShoppingListRepository,
} from '../domain/ports/shopping-list.repository';
import {
  SHOPPING_ITEM_REPOSITORY,
  type ShoppingItemRepository,
} from '../domain/ports/shopping-item.repository';

export interface GetListWithItemsCommand {
  listId: string;
}

export interface ListWithItems {
  list: ShoppingList;
  items: ShoppingItem[];
}

/** Caso de uso: obtener una lista con todos sus ítems. */
@Injectable()
export class GetListWithItemsUseCase {
  constructor(
    @Inject(SHOPPING_LIST_REPOSITORY) private readonly lists: ShoppingListRepository,
    @Inject(SHOPPING_ITEM_REPOSITORY) private readonly items: ShoppingItemRepository,
  ) {}

  async execute(command: GetListWithItemsCommand): Promise<ListWithItems> {
    const list = await this.lists.findById(command.listId);
    if (!list) {
      throw new ListNotFoundError();
    }

    const items = await this.items.findByList(command.listId);
    return { list, items };
  }
}
