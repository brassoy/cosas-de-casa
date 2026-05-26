import { Inject, Injectable } from '@nestjs/common';
import {
  EMBEDDING_PORT,
  type EmbeddingPort,
} from '../domain/ports/embedding.port';
import {
  CATALOG_ITEM_REPOSITORY,
  type CatalogItemRepository,
} from '../domain/ports/catalog-item.repository';
import { normalizeItemName } from '../domain/item-normalizer';
import { applyDedupPolicy, type CatalogCandidate } from '../domain/dedup-policy';
import type { DedupDecision, DedupCandidateDto } from '@cosasdecasa/contracts';

export interface DedupCheckCommand {
  familyId: string;
  name: string;
}

export interface DedupCheckResult {
  decision: DedupDecision;
  normalizedName: string;
  candidates: DedupCandidateDto[];
}

/**
 * Caso de uso: comprobar si un nombre de artículo es duplicado en el catálogo.
 *
 * No modifica el catálogo. Solo consulta y aplica la política de dedup.
 * Para actualizar el catálogo (incrementar frecuencia), usar UpsertCatalogItemUseCase.
 */
@Injectable()
export class DedupCheckUseCase {
  constructor(
    @Inject(EMBEDDING_PORT) private readonly embedder: EmbeddingPort,
    @Inject(CATALOG_ITEM_REPOSITORY) private readonly catalog: CatalogItemRepository,
  ) {}

  async execute(command: DedupCheckCommand): Promise<DedupCheckResult> {
    const { familyId, name } = command;
    const { normalized, attributes } = normalizeItemName(name);

    // Generamos embedding (puede ser null si fastembed está en fallback)
    const embedding = await this.embedder.embed(normalized);

    let candidates: CatalogCandidate[];

    if (embedding !== null) {
      // Búsqueda vectorial (pgvector, family-scoped)
      const similar = await this.catalog.findSimilar({
        familyId,
        embedding,
        limit: 5,
        minSimilarity: 0.82,
      });
      candidates = similar.map((s) => ({
        id: s.id,
        normalizedName: s.normalizedName,
        displayName: s.displayName,
        attributes: s.attributes,
        embedding: s.embedding,
        similarity: s.similarity,
        frequency: s.frequency,
      }));
    } else {
      // Fallback: búsqueda por nombre normalizado exacto
      const byName = await this.catalog.findByNormalizedName(familyId, normalized);
      candidates = byName.map((c) => ({
        id: c.id,
        normalizedName: c.normalizedName,
        displayName: c.displayName,
        attributes: c.attributes,
        embedding: c.embedding,
        frequency: c.frequency,
      }));
    }

    const result = applyDedupPolicy({ normalizedName: normalized, attributes, embedding, candidates });

    return {
      decision: result.decision,
      normalizedName: normalized,
      candidates: result.candidates.map((c) => ({
        catalogItemId: c.id,
        normalizedName: c.normalizedName,
        displayName: c.displayName,
        similarity: c.similarity ?? 0,
        frequency: c.frequency,
      })),
    };
  }
}
