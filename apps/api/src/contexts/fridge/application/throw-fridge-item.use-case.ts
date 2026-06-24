import { Inject, Injectable } from '@nestjs/common';
import type { FridgeItem } from '../domain/fridge-item';
import { FRIDGE_ITEM_REPOSITORY, type FridgeItemRepository } from '../domain/ports/fridge-item.repository';
import { FRIDGE_CLOCK, type FridgeClock } from './ports/clock';
import { FridgeItemNotFoundError } from '../domain/fridge.errors';

export interface ThrowFridgeItemCommand {
  itemId: string;
}

/**
 * Caso de uso: tirar un ítem (desperdicio).
 * Mueve el ítem a la ubicación DISCARDED en vez de eliminarlo, dejando un
 * registro de la comida tirada. Espejo de freeze/thaw (relocation).
 */
@Injectable()
export class ThrowFridgeItemUseCase {
  constructor(
    @Inject(FRIDGE_ITEM_REPOSITORY) private readonly items: FridgeItemRepository,
    @Inject(FRIDGE_CLOCK) private readonly clock: FridgeClock,
  ) {}

  async execute(command: ThrowFridgeItemCommand): Promise<FridgeItem> {
    const item = await this.items.findById(command.itemId);
    if (!item) throw new FridgeItemNotFoundError();

    item.throw_(this.clock.now());
    await this.items.update(item);
    return item;
  }
}
