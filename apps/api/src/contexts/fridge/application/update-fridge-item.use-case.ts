import { Inject, Injectable } from '@nestjs/common';
import type { FridgeItem, FridgeLocation } from '../domain/fridge-item';
import { FRIDGE_ITEM_REPOSITORY, type FridgeItemRepository } from '../domain/ports/fridge-item.repository';
import { FRIDGE_CLOCK, type FridgeClock } from './ports/clock';
import { FridgeItemNotFoundError } from '../domain/fridge.errors';

export interface UpdateFridgeItemCommand {
  itemId: string;
  name?: string;
  quantity?: string | null;
  unit?: string | null;
  location?: FridgeLocation;
  expiryDate?: string | null;
}

/** Caso de uso: editar un ítem de la nevera (patch parcial). */
@Injectable()
export class UpdateFridgeItemUseCase {
  constructor(
    @Inject(FRIDGE_ITEM_REPOSITORY) private readonly items: FridgeItemRepository,
    @Inject(FRIDGE_CLOCK) private readonly clock: FridgeClock,
  ) {}

  async execute(command: UpdateFridgeItemCommand): Promise<FridgeItem> {
    const item = await this.items.findById(command.itemId);
    if (!item) throw new FridgeItemNotFoundError();

    item.update(
      {
        name: command.name,
        quantity: command.quantity,
        unit: command.unit,
        location: command.location,
        expiryDate: command.expiryDate,
      },
      this.clock.now(),
    );

    await this.items.update(item);
    return item;
  }
}
