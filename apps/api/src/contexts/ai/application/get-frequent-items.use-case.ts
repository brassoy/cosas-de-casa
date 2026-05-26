import { Inject, Injectable } from '@nestjs/common';
import {
  CATALOG_ITEM_REPOSITORY,
  type CatalogItemRepository,
  type CatalogItemData,
} from '../domain/ports/catalog-item.repository';

export interface GetFrequentItemsCommand {
  familyId: string;
  limit: number;
}

/** Caso de uso: obtener los artículos más frecuentes del catálogo de una familia. */
@Injectable()
export class GetFrequentItemsUseCase {
  constructor(
    @Inject(CATALOG_ITEM_REPOSITORY)
    private readonly catalog: CatalogItemRepository,
  ) {}

  async execute(command: GetFrequentItemsCommand): Promise<CatalogItemData[]> {
    const limit = Math.max(1, Math.min(command.limit, 50));
    return this.catalog.findFrequent(command.familyId, limit);
  }
}
