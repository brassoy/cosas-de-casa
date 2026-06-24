import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE } from '../../db/drizzle.tokens';
import { IdentityAccessModule } from '../identity-access/identity-access.module';
import type { Database } from '../../db/db.types';
import type { Env } from '../../config/env.config';

// ── Domain ports ─────────────────────────────────────────────────────────────
import { MENU_SUGGESTION_PORT } from './domain/ports/menu-suggestion.port';
import { RECIPE_REPOSITORY } from './domain/ports/recipe.repository';

// ── Application ports ────────────────────────────────────────────────────────
import { MENU_CLOCK } from './application/ports/clock';
import { MENU_ID_GENERATOR } from './application/ports/id-generator';

// ── Use cases ────────────────────────────────────────────────────────────────
import { SuggestMenuUseCase } from './application/suggest-menu.use-case';
import { GenerateListFromMenuUseCase } from './application/generate-list-from-menu.use-case';
import { CreateRecipeUseCase } from './application/create-recipe.use-case';
import { ListRecipesUseCase } from './application/list-recipes.use-case';
import { DeleteRecipeUseCase } from './application/delete-recipe.use-case';
import { CheckRecipeAvailabilityUseCase } from './application/check-recipe-availability.use-case';

// ── Infrastructure ────────────────────────────────────────────────────────────
import { MinimaxMenuSuggestionAdapter } from './infrastructure/minimax-menu-suggestion.adapter';
import { DrizzleRecipeRepository } from './infrastructure/drizzle-recipe.repository';

// ── AI (embeddings, reutilizado para el cruce semántico de ingredientes) ──────
import { EMBEDDING_PORT } from '../ai/domain/ports/embedding.port';
import { FastEmbedEmbeddingAdapter } from '../ai/infrastructure/fastembed-embedding.adapter';

// ── Interface ─────────────────────────────────────────────────────────────────
import { MenuController } from './interface/menu.controller';

// ── Family ────────────────────────────────────────────────────────────────────
import { FAMILY_REPOSITORY } from '../family/domain/ports/family.repository';
import { DrizzleFamilyRepository } from '../family/infrastructure/drizzle-family.repository';
import { FamilyScopeGuard } from '../family/interface/family-scope.guard';

// ── Fridge (read-model) ───────────────────────────────────────────────────────
import { FRIDGE_ITEM_REPOSITORY } from '../fridge/domain/ports/fridge-item.repository';
import { DrizzleFridgeItemRepository } from '../fridge/infrastructure/drizzle-fridge-item.repository';

// ── Shopping (reutilizamos casos de uso) ─────────────────────────────────────
import { SHOPPING_LIST_REPOSITORY } from '../shopping/domain/ports/shopping-list.repository';
import { SHOPPING_ITEM_REPOSITORY } from '../shopping/domain/ports/shopping-item.repository';
import { SHOPPING_CLOCK } from '../shopping/application/ports/clock';
import { SHOPPING_ID_GENERATOR } from '../shopping/application/ports/id-generator';
import { DrizzleShoppingListRepository } from '../shopping/infrastructure/drizzle-shopping-list.repository';
import { DrizzleShoppingItemRepository } from '../shopping/infrastructure/drizzle-shopping-item.repository';
import { AddItemUseCase } from '../shopping/application/add-item.use-case';
import { EnsureAndListListsUseCase } from '../shopping/application/ensure-and-list-lists.use-case';
import { SystemClock } from '../family/infrastructure/system-clock';
import { UuidIdGenerator } from '../family/infrastructure/uuid-id-generator';
import { MenuAiUnavailableError } from './domain/menu.errors';
import { RateLimitGuard } from '../../common/rate-limit.guard';

@Module({
  imports: [IdentityAccessModule],
  controllers: [MenuController],
  providers: [
    // ── Sugerencia de menú (IA) ───────────────────────────────────────────
    {
      provide: MENU_SUGGESTION_PORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const baseURL = config.get('MINIMAX_BASE_URL' as keyof Env, { infer: true }) as string | undefined;
        const apiKey = config.get('MINIMAX_API_KEY' as keyof Env, { infer: true }) as string | undefined;
        const model = config.get('MINIMAX_MODEL' as keyof Env, { infer: true }) as string | undefined;

        if (!baseURL || !apiKey || !model) {
          return {
            suggest: async () => {
              throw new MenuAiUnavailableError('El servicio de IA no está configurado en este entorno.');
            },
          };
        }
        return new MinimaxMenuSuggestionAdapter({ baseURL, apiKey, model });
      },
    },

    // ── Family ────────────────────────────────────────────────────────────
    {
      provide: FAMILY_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzleFamilyRepository(db),
    },
    FamilyScopeGuard,

    // ── Fridge (read-model) ───────────────────────────────────────────────
    {
      provide: FRIDGE_ITEM_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzleFridgeItemRepository(db),
    },

    // ── Recetas (repositorio + embeddings) ────────────────────────────────
    {
      provide: RECIPE_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzleRecipeRepository(db),
    },
    // Mismo singleton perezoso de embeddings que usa el contexto ai
    // (ai.module.ts). Degrada a null si el modelo no está disponible.
    {
      provide: EMBEDDING_PORT,
      useFactory: () => FastEmbedEmbeddingAdapter.getInstance(),
    },

    // ── Shopping (reutilizados para GenerateListFromMenu) ─────────────────
    {
      provide: SHOPPING_LIST_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzleShoppingListRepository(db),
    },
    {
      provide: SHOPPING_ITEM_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzleShoppingItemRepository(db),
    },
    SystemClock,
    { provide: SHOPPING_CLOCK, useExisting: SystemClock },
    { provide: MENU_CLOCK, useExisting: SystemClock },
    UuidIdGenerator,
    { provide: SHOPPING_ID_GENERATOR, useExisting: UuidIdGenerator },
    { provide: MENU_ID_GENERATOR, useExisting: UuidIdGenerator },

    // ── Guards ────────────────────────────────────────────────────────────
    RateLimitGuard,

    // ── Casos de uso ──────────────────────────────────────────────────────
    SuggestMenuUseCase,
    AddItemUseCase,
    EnsureAndListListsUseCase,
    GenerateListFromMenuUseCase,
    CreateRecipeUseCase,
    ListRecipesUseCase,
    DeleteRecipeUseCase,
    CheckRecipeAvailabilityUseCase,
  ],
})
export class MenuModule {}
