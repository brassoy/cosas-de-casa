import { Inject, Injectable } from '@nestjs/common';
import type { FridgeItem } from '../domain/fridge-item';
import { FRIDGE_ITEM_REPOSITORY, type FridgeItemRepository } from '../domain/ports/fridge-item.repository';
import { FRIDGE_CLOCK, type FridgeClock } from './ports/clock';
import { FridgeItemNotFoundError } from '../domain/fridge.errors';

export interface FreezeFridgeItemCommand {
  itemId: string;
}

/** Caso de uso: congelar un ítem (location → FREEZER). */
@Injectable()
export class FreezeFridgeItemUseCase {
  constructor(
    @Inject(FRIDGE_ITEM_REPOSITORY) private readonly items: FridgeItemRepository,
    @Inject(FRIDGE_CLOCK) private readonly clock: FridgeClock,
  ) {}

  async execute(command: FreezeFridgeItemCommand): Promise<FridgeItem> {
    const item = await this.items.findById(command.itemId);
    if (!item) throw new FridgeItemNotFoundError();

    item.freeze(this.clock.now());
    await this.items.update(item);
    return item;
  }
}
