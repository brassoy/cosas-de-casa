import { Inject, Injectable } from '@nestjs/common';
import { FRIDGE_ITEM_REPOSITORY, type FridgeItemRepository } from '../domain/ports/fridge-item.repository';
import { FridgeItemNotFoundError } from '../domain/fridge.errors';

export interface ThrowFridgeItemCommand {
  itemId: string;
}

/**
 * Caso de uso: tirar un ítem (desperdicio).
 * Elimina el ítem del inventario.
 */
@Injectable()
export class ThrowFridgeItemUseCase {
  constructor(
    @Inject(FRIDGE_ITEM_REPOSITORY) private readonly items: FridgeItemRepository,
  ) {}

  async execute(command: ThrowFridgeItemCommand): Promise<void> {
    const item = await this.items.findById(command.itemId);
    if (!item) throw new FridgeItemNotFoundError();

    await this.items.deleteById(item.id);
  }
}
