import { Inject, Injectable } from '@nestjs/common';
import { FridgeItem, type FridgeLocation } from '../domain/fridge-item';
import { FRIDGE_ITEM_REPOSITORY, type FridgeItemRepository } from '../domain/ports/fridge-item.repository';
import { FRIDGE_CLOCK, type FridgeClock } from './ports/clock';
import { FRIDGE_ID_GENERATOR, type FridgeIdGenerator } from './ports/id-generator';

export interface AddFridgeItemCommand {
  familyId: string;
  name: string;
  quantity?: string | null;
  unit?: string | null;
  location?: FridgeLocation;
  expiryDate?: string | null;
  createdBy: string;
}

/** Caso de uso: añadir un ítem a la nevera/despensa de una familia. */
@Injectable()
export class AddFridgeItemUseCase {
  constructor(
    @Inject(FRIDGE_ITEM_REPOSITORY) private readonly items: FridgeItemRepository,
    @Inject(FRIDGE_CLOCK) private readonly clock: FridgeClock,
    @Inject(FRIDGE_ID_GENERATOR) private readonly ids: FridgeIdGenerator,
  ) {}

  async execute(command: AddFridgeItemCommand): Promise<FridgeItem> {
    const item = FridgeItem.create({
      id: this.ids.generate(),
      familyId: command.familyId,
      name: command.name,
      quantity: command.quantity,
      unit: command.unit,
      location: command.location,
      expiryDate: command.expiryDate,
      createdBy: command.createdBy,
      now: this.clock.now(),
    });

    await this.items.create(item);
    return item;
  }
}
