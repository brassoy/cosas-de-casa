import { Inject, Injectable } from '@nestjs/common';
import { FRIDGE_ITEM_REPOSITORY, type FridgeItemRepository } from '../domain/ports/fridge-item.repository';
import { FRIDGE_CLOCK, type FridgeClock } from './ports/clock';
import { FridgeItemNotFoundError } from '../domain/fridge.errors';

export interface EatFridgeItemCommand {
  itemId: string;
  /** Cantidad consumida. Si se omite, se elimina el ítem directamente. */
  amount?: string;
}

export interface EatFridgeItemResult {
  /** true si el ítem fue eliminado (cantidad llegó a 0 o no tenía cantidad). */
  deleted: boolean;
  itemId: string;
}

/**
 * Caso de uso: comer/consumir parte o todo de un ítem.
 *
 * - Si el ítem no tiene cantidad o no se indica amount → se elimina.
 * - Si la cantidad resultante es 0 → se elimina.
 * - En caso contrario → se actualiza la cantidad.
 */
@Injectable()
export class EatFridgeItemUseCase {
  constructor(
    @Inject(FRIDGE_ITEM_REPOSITORY) private readonly items: FridgeItemRepository,
    @Inject(FRIDGE_CLOCK) private readonly clock: FridgeClock,
  ) {}

  async execute(command: EatFridgeItemCommand): Promise<EatFridgeItemResult> {
    const item = await this.items.findById(command.itemId);
    if (!item) throw new FridgeItemNotFoundError();

    const shouldDelete = item.eat(command.amount, this.clock.now());

    if (shouldDelete) {
      await this.items.deleteById(item.id);
      return { deleted: true, itemId: item.id };
    }

    await this.items.update(item);
    return { deleted: false, itemId: item.id };
  }
}
