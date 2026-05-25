import { Inject, Injectable } from '@nestjs/common';
import { ShoppingItem } from '../domain/shopping-list';
import { ListNotFoundError } from '../domain/shopping.errors';
import {
  SHOPPING_LIST_REPOSITORY,
  type ShoppingListRepository,
} from '../domain/ports/shopping-list.repository';
import {
  SHOPPING_ITEM_REPOSITORY,
  type ShoppingItemRepository,
} from '../domain/ports/shopping-item.repository';
import { SHOPPING_CLOCK, type ShoppingClock } from './ports/clock';
import { SHOPPING_ID_GENERATOR, type ShoppingIdGenerator } from './ports/id-generator';

export interface AddItemCommand {
  listId: string;
  actingUserId: string;
  name: string;
  quantity?: number | null;
  unit?: string | null;
  description?: string | null;
  purchaseLink?: string | null;
}

/** Caso de uso: añadir un artículo a una lista. */
@Injectable()
export class AddItemUseCase {
  constructor(
    @Inject(SHOPPING_LIST_REPOSITORY) private readonly lists: ShoppingListRepository,
    @Inject(SHOPPING_ITEM_REPOSITORY) private readonly items: ShoppingItemRepository,
    @Inject(SHOPPING_CLOCK) private readonly clock: ShoppingClock,
    @Inject(SHOPPING_ID_GENERATOR) private readonly ids: ShoppingIdGenerator,
  ) {}

  async execute(command: AddItemCommand): Promise<ShoppingItem> {
    const list = await this.lists.findById(command.listId);
    if (!list) {
      throw new ListNotFoundError();
    }

    const item = ShoppingItem.create({
      id: this.ids.generate(),
      listId: command.listId,
      name: command.name,
      quantity: command.quantity,
      unit: command.unit,
      description: command.description,
      purchaseLink: command.purchaseLink,
      createdBy: command.actingUserId,
      now: this.clock.now(),
    });

    await this.items.create(item);
    return item;
  }
}
