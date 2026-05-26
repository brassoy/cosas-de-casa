import type { FrequentItemDto, DedupCheckResponse } from '@cosasdecasa/contracts';
import type { CatalogItemData } from '../domain/ports/catalog-item.repository';
import type { DedupCheckResult } from '../application/dedup-check.use-case';

export const AiPresenter = {
  toFrequentItemDto(item: CatalogItemData): FrequentItemDto {
    return {
      catalogItemId: item.id,
      normalizedName: item.normalizedName,
      displayName: item.displayName,
      frequency: item.frequency,
      lastAddedAt: item.lastAddedAt.toISOString(),
      attributes: Object.keys(item.attributes).length > 0 ? item.attributes : undefined,
    };
  },

  toDedupCheckResponse(result: DedupCheckResult): DedupCheckResponse {
    return {
      decision: result.decision,
      normalizedName: result.normalizedName,
      candidates: result.candidates,
    };
  },
};
