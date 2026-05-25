import { Inject, Injectable } from '@nestjs/common';
import type { ShoppingItem } from '../domain/shopping-list';
import { ItemNotFoundError } from '../domain/shopping.errors';
import {
  SHOPPING_ITEM_REPOSITORY,
  type ShoppingItemRepository,
} from '../domain/ports/shopping-item.repository';
import { SHOPPING_CLOCK, type ShoppingClock } from './ports/clock';

export interface ToggleItemCheckedCommand {
  itemId: string;
}

/** Caso de uso: marcar/desmarcar un ítem como comprado. */
@Injectable()
export class ToggleItemCheckedUseCase {
  constructor(
    @Inject(SHOPPING_ITEM_REPOSITORY) private readonly items: ShoppingItemRepository,
    @Inject(SHOPPING_CLOCK) private readonly clock: ShoppingClock,
  ) {}

  async execute(command: ToggleItemCheckedCommand): Promise<ShoppingItem> {
    const item = await this.items.findById(command.itemId);
    if (!item) {
      throw new ItemNotFoundError();
    }

    item.toggleChecked(this.clock.now());
    await this.items.update(item);
    return item;
  }
}
