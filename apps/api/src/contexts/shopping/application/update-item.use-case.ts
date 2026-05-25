import { Inject, Injectable } from '@nestjs/common';
import type { ShoppingItem } from '../domain/shopping-list';
import { ItemNotFoundError } from '../domain/shopping.errors';
import {
  SHOPPING_ITEM_REPOSITORY,
  type ShoppingItemRepository,
} from '../domain/ports/shopping-item.repository';
import { SHOPPING_CLOCK, type ShoppingClock } from './ports/clock';

export interface UpdateItemCommand {
  itemId: string;
  name?: string;
  quantity?: number | null;
  unit?: string | null;
  description?: string | null;
  purchaseLink?: string | null;
  checked?: boolean;
  position?: number | null;
}

/** Caso de uso: editar campos de un ítem (patch parcial). */
@Injectable()
export class UpdateItemUseCase {
  constructor(
    @Inject(SHOPPING_ITEM_REPOSITORY) private readonly items: ShoppingItemRepository,
    @Inject(SHOPPING_CLOCK) private readonly clock: ShoppingClock,
  ) {}

  async execute(command: UpdateItemCommand): Promise<ShoppingItem> {
    const item = await this.items.findById(command.itemId);
    if (!item) {
      throw new ItemNotFoundError();
    }

    const now = this.clock.now();

    // toggle explícito de checked si viene en el patch
    if (command.checked !== undefined && command.checked !== item.checked) {
      item.toggleChecked(now);
    }

    item.update(
      {
        name: command.name,
        quantity: command.quantity,
        unit: command.unit,
        description: command.description,
        purchaseLink: command.purchaseLink,
        position: command.position,
      },
      now,
    );

    await this.items.update(item);
    return item;
  }
}
