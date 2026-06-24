import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE } from '../../db/drizzle.tokens';
import type { Database } from '../../db/db.types';
import type { Env } from '../../config/env.config';
import { IdentityAccessModule } from '../identity-access/identity-access.module';

// ── Domain ports ──────────────────────────────────────────────────────────────
import { EMBEDDING_PORT } from './domain/ports/embedding.port';
import { ITEM_EXTRACTION_PORT } from './domain/ports/item-extraction.port';
import { PLAN_PARSING_PORT } from './domain/ports/plan-parsing.port';
import { CATALOG_ITEM_REPOSITORY } from './domain/ports/catalog-item.repository';
import { AiUnavailableError } from './domain/ai.errors';

// ── Infrastructure ────────────────────────────────────────────────────────────
import { FastEmbedEmbeddingAdapter } from './infrastructure/fastembed-embedding.adapter';
import { MinimaxItemExtractionAdapter } from './infrastructure/minimax-item-extraction.adapter';
import { MinimaxPlanParsingAdapter } from './infrastructure/minimax-plan-parsing.adapter';
import { DrizzleCatalogItemRepository } from './infrastructure/drizzle-catalog-item.repository';

// ── Use cases ─────────────────────────────────────────────────────────────────
import { ExtractItemsUseCase } from './application/extract-items.use-case';
import { DedupCheckUseCase } from './application/dedup-check.use-case';
import { UpsertCatalogItemUseCase } from './application/upsert-catalog-item.use-case';
import { GetFrequentItemsUseCase } from './application/get-frequent-items.use-case';
import { ParsePlanUseCase } from './application/parse-plan.use-case';

// ── Interface ─────────────────────────────────────────────────────────────────
import { AiController } from './interface/ai.controller';

// ── Family (guard) ────────────────────────────────────────────────────────────
import { FAMILY_REPOSITORY } from '../family/domain/ports/family.repository';
import { DrizzleFamilyRepository } from '../family/infrastructure/drizzle-family.repository';
import { FamilyScopeGuard } from '../family/interface/family-scope.guard';

// ── Common (rate-limit) ────────────────────────────────────────────────────────
import { RateLimitGuard } from '../../common/rate-limit.guard';

@Module({
  imports: [IdentityAccessModule],
  controllers: [AiController],
  providers: [
    // ── Repositorio de familia (para FamilyScopeGuard) ────────────────────
    {
      provide: FAMILY_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzleFamilyRepository(db),
    },
    FamilyScopeGuard,

    // ── Guards ────────────────────────────────────────────────────────────
    RateLimitGuard,

    // ── Embedding (fastembed, singleton perezoso) ─────────────────────────
    {
      provide: EMBEDDING_PORT,
      useFactory: () => FastEmbedEmbeddingAdapter.getInstance(),
    },

    // ── Extracción de ítems (MiniMax/Anthropic SDK) ───────────────────────
    {
      provide: ITEM_EXTRACTION_PORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const baseURL = config.get('MINIMAX_BASE_URL' as keyof Env, { infer: true }) as string | undefined;
        const apiKey = config.get('MINIMAX_API_KEY' as keyof Env, { infer: true }) as string | undefined;
        const model = config.get('MINIMAX_MODEL' as keyof Env, { infer: true }) as string | undefined;

        if (!baseURL || !apiKey || !model) {
          // Si no hay config, devuelve una implementación nula segura
          return {
            extractItems: async () => [],
          };
        }
        return new MinimaxItemExtractionAdapter({ baseURL, apiKey, model });
      },
    },

    // ── Autocompletado de plan (MiniMax/Anthropic SDK) ────────────────────
    {
      provide: PLAN_PARSING_PORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const baseURL = config.get('MINIMAX_BASE_URL' as keyof Env, { infer: true }) as string | undefined;
        const apiKey = config.get('MINIMAX_API_KEY' as keyof Env, { infer: true }) as string | undefined;
        const model = config.get('MINIMAX_MODEL' as keyof Env, { infer: true }) as string | undefined;

        if (!baseURL || !apiKey || !model) {
          // Sin config de IA (ADR 0014) → adaptador nulo que lanza
          // AiUnavailableError; el filtro lo traduce a 503.
          return {
            parsePlan: async () => {
              throw new AiUnavailableError('El servicio de IA no está configurado en este entorno.');
            },
          };
        }
        return new MinimaxPlanParsingAdapter({ baseURL, apiKey, model });
      },
    },

    // ── Catálogo (Drizzle + pgvector) ─────────────────────────────────────
    {
      provide: CATALOG_ITEM_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzleCatalogItemRepository(db),
    },

    // ── Casos de uso ──────────────────────────────────────────────────────
    ExtractItemsUseCase,
    DedupCheckUseCase,
    UpsertCatalogItemUseCase,
    GetFrequentItemsUseCase,
    ParsePlanUseCase,
  ],
  exports: [
    UpsertCatalogItemUseCase,
    DedupCheckUseCase,
    GetFrequentItemsUseCase,
    EMBEDDING_PORT,
    CATALOG_ITEM_REPOSITORY,
  ],
})
export class AiModule {}
