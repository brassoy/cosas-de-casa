import { Inject, Injectable } from '@nestjs/common';
import type { FridgeItem } from '../domain/fridge-item';
import { FRIDGE_ITEM_REPOSITORY, type FridgeItemRepository } from '../domain/ports/fridge-item.repository';

export interface GetExpiringSoonQuery {
  familyId: string;
  /** Días máximos hasta caducidad (por defecto 2). */
  days?: number;
}

/** Caso de uso: obtener los ítems que caducan pronto (≤ 2 días por defecto). */
@Injectable()
export class GetExpiringSoonUseCase {
  constructor(
    @Inject(FRIDGE_ITEM_REPOSITORY) private readonly items: FridgeItemRepository,
  ) {}

  async execute(query: GetExpiringSoonQuery): Promise<FridgeItem[]> {
    return this.items.findExpiringSoon(query.familyId, query.days ?? 2);
  }
}
