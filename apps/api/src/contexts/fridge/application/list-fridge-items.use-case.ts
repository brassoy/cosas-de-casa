import { Inject, Injectable } from '@nestjs/common';
import type { FridgeItem } from '../domain/fridge-item';
import { FRIDGE_ITEM_REPOSITORY, type FridgeItemRepository } from '../domain/ports/fridge-item.repository';

export interface ListFridgeItemsQuery {
  familyId: string;
}

/** Caso de uso: listar todos los ítems de la nevera de una familia (expiry_date ASC, NULLs al final). */
@Injectable()
export class ListFridgeItemsUseCase {
  constructor(
    @Inject(FRIDGE_ITEM_REPOSITORY) private readonly items: FridgeItemRepository,
  ) {}

  async execute(query: ListFridgeItemsQuery): Promise<FridgeItem[]> {
    return this.items.findByFamily(query.familyId);
  }
}
