import { Inject, Injectable } from '@nestjs/common';
import type { FridgeItem } from '../domain/fridge-item';
import { FRIDGE_ITEM_REPOSITORY, type FridgeItemRepository } from '../domain/ports/fridge-item.repository';
import { FridgeItemNotFoundError } from '../domain/fridge.errors';

export interface GetFridgeItemQuery {
  itemId: string;
}

/** Caso de uso: obtener un ítem por id. */
@Injectable()
export class GetFridgeItemUseCase {
  constructor(
    @Inject(FRIDGE_ITEM_REPOSITORY) private readonly items: FridgeItemRepository,
  ) {}

  async execute(query: GetFridgeItemQuery): Promise<FridgeItem> {
    const item = await this.items.findById(query.itemId);
    if (!item) throw new FridgeItemNotFoundError();
    return item;
  }
}
