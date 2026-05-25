import { Module } from '@nestjs/common';
import { DRIZZLE } from '../../db/drizzle.tokens';
import { IdentityAccessModule } from '../identity-access/identity-access.module';
import type { Database } from '../../db/db.types';

// ── Domain ports ─────────────────────────────────────────────────────────────
import { SHOPPING_LIST_REPOSITORY } from './domain/ports/shopping-list.repository';
import { SHOPPING_ITEM_REPOSITORY } from './domain/ports/shopping-item.repository';
import { ITEM_COMMENT_REPOSITORY } from './domain/ports/item-comment.repository';

// ── Application ports ────────────────────────────────────────────────────────
import { SHOPPING_CLOCK } from './application/ports/clock';
import { SHOPPING_ID_GENERATOR } from './application/ports/id-generator';

// ── Use cases ────────────────────────────────────────────────────────────────
import { EnsureAndListListsUseCase } from './application/ensure-and-list-lists.use-case';
import { CreateCustomListUseCase } from './application/create-custom-list.use-case';
import { GetListWithItemsUseCase } from './application/get-list-with-items.use-case';
import { AddItemUseCase } from './application/add-item.use-case';
import { ToggleItemCheckedUseCase } from './application/toggle-item-checked.use-case';
import { UpdateItemUseCase } from './application/update-item.use-case';
import { DeleteItemUseCase } from './application/delete-item.use-case';
import { DeleteCustomListUseCase } from './application/delete-custom-list.use-case';
import { AddCommentUseCase } from './application/add-comment.use-case';
import { ListCommentsUseCase } from './application/list-comments.use-case';

// ── Infrastructure ──────────────────────────────────────────────────────────
import { DrizzleShoppingListRepository } from './infrastructure/drizzle-shopping-list.repository';
import { DrizzleShoppingItemRepository } from './infrastructure/drizzle-shopping-item.repository';
import { DrizzleItemCommentRepository } from './infrastructure/drizzle-item-comment.repository';

// ── Interface ────────────────────────────────────────────────────────────────
import { ShoppingListsController } from './interface/shopping-lists.controller';
import { ShoppingItemsController } from './interface/shopping-items.controller';
import { ListScopeGuard } from './interface/list-scope.guard';
import { ItemScopeGuard } from './interface/item-scope.guard';

// ── Family (reutilizamos su repositorio para los guards) ─────────────────────
import { FAMILY_REPOSITORY } from '../family/domain/ports/family.repository';
import { DrizzleFamilyRepository } from '../family/infrastructure/drizzle-family.repository';
import { FamilyScopeGuard } from '../family/interface/family-scope.guard';
import { SystemClock } from '../family/infrastructure/system-clock';
import { UuidIdGenerator } from '../family/infrastructure/uuid-id-generator';

@Module({
  imports: [IdentityAccessModule],
  controllers: [ShoppingListsController, ShoppingItemsController],
  providers: [
    // ── Infrastructure: repositorios ──────────────────────────────────────
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
    {
      provide: ITEM_COMMENT_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzleItemCommentRepository(db),
    },

    // ── Repositorio de familia (para los guards de scope) ─────────────────
    {
      provide: FAMILY_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzleFamilyRepository(db),
    },

    // ── Puertos de infraestructura compartidos ────────────────────────────
    SystemClock,
    {
      provide: SHOPPING_CLOCK,
      useExisting: SystemClock,
    },
    UuidIdGenerator,
    {
      provide: SHOPPING_ID_GENERATOR,
      useExisting: UuidIdGenerator,
    },

    // ── Guards ────────────────────────────────────────────────────────────
    FamilyScopeGuard,
    ListScopeGuard,
    ItemScopeGuard,

    // ── Casos de uso ──────────────────────────────────────────────────────
    EnsureAndListListsUseCase,
    CreateCustomListUseCase,
    GetListWithItemsUseCase,
    AddItemUseCase,
    ToggleItemCheckedUseCase,
    UpdateItemUseCase,
    DeleteItemUseCase,
    DeleteCustomListUseCase,
    AddCommentUseCase,
    ListCommentsUseCase,
  ],
})
export class ShoppingModule {}
