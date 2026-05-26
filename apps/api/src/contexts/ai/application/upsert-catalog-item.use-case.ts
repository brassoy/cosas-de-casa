import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  EMBEDDING_PORT,
  type EmbeddingPort,
} from '../domain/ports/embedding.port';
import {
  CATALOG_ITEM_REPOSITORY,
  type CatalogItemRepository,
  type CatalogItemData,
} from '../domain/ports/catalog-item.repository';
import { normalizeItemName } from '../domain/item-normalizer';

export interface UpsertCatalogItemCommand {
  familyId: string;
  /** Nombre tal como lo introdujo el usuario (sin normalizar). */
  displayName: string;
}

/**
 * Caso de uso: añadir/actualizar un artículo en el catálogo de la familia.
 *
 * Se llama cuando el usuario efectivamente añade un artículo a una lista
 * (después del check de dedup). Incrementa la frecuencia si ya existe.
 */
@Injectable()
export class UpsertCatalogItemUseCase {
  constructor(
    @Inject(EMBEDDING_PORT) private readonly embedder: EmbeddingPort,
    @Inject(CATALOG_ITEM_REPOSITORY) private readonly catalog: CatalogItemRepository,
  ) {}

  async execute(command: UpsertCatalogItemCommand): Promise<CatalogItemData> {
    const { familyId, displayName } = command;
    const { normalized, attributes } = normalizeItemName(displayName);
    const embedding = await this.embedder.embed(normalized);

    return this.catalog.upsert({
      id: randomUUID(),
      familyId,
      normalizedName: normalized,
      displayName,
      attributes,
      embedding,
    });
  }
}
