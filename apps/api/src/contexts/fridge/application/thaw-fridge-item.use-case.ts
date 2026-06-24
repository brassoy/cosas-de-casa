import { Inject, Injectable } from '@nestjs/common';
import type { FridgeItem } from '../domain/fridge-item';
import { FRIDGE_ITEM_REPOSITORY, type FridgeItemRepository } from '../domain/ports/fridge-item.repository';
import { FRIDGE_CLOCK, type FridgeClock } from './ports/clock';
import { FridgeItemNotFoundError } from '../domain/fridge.errors';

export interface ThawFridgeItemCommand {
  itemId: string;
}

/** Caso de uso: descongelar un ítem (location → FRIDGE). */
@Injectable()
export class ThawFridgeItemUseCase {
  constructor(
    @Inject(FRIDGE_ITEM_REPOSITORY) private readonly items: FridgeItemRepository,
    @Inject(FRIDGE_CLOCK) private readonly clock: FridgeClock,
  ) {}

  async execute(command: ThawFridgeItemCommand): Promise<FridgeItem> {
    const item = await this.items.findById(command.itemId);
    if (!item) throw new FridgeItemNotFoundError();

    item.thaw(this.clock.now());
    await this.items.update(item);
    return item;
  }
}
