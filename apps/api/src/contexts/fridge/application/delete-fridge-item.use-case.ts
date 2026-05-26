import { Inject, Injectable } from '@nestjs/common';
import { FRIDGE_ITEM_REPOSITORY, type FridgeItemRepository } from '../domain/ports/fridge-item.repository';
import { FridgeItemNotFoundError } from '../domain/fridge.errors';

export interface DeleteFridgeItemCommand {
  itemId: string;
}

/** Caso de uso: eliminar un ítem de la nevera. */
@Injectable()
export class DeleteFridgeItemUseCase {
  constructor(
    @Inject(FRIDGE_ITEM_REPOSITORY) private readonly items: FridgeItemRepository,
  ) {}

  async execute(command: DeleteFridgeItemCommand): Promise<void> {
    const item = await this.items.findById(command.itemId);
    if (!item) throw new FridgeItemNotFoundError();
    await this.items.deleteById(item.id);
  }
}
