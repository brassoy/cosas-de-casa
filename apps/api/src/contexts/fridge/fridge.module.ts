import { Module } from '@nestjs/common';
import { DRIZZLE } from '../../db/drizzle.tokens';
import { IdentityAccessModule } from '../identity-access/identity-access.module';
import type { Database } from '../../db/db.types';

// ── Domain ports ─────────────────────────────────────────────────────────────
import { FRIDGE_ITEM_REPOSITORY } from './domain/ports/fridge-item.repository';

// ── Application ports ─────────────────────────────────────────────────────────
import { FRIDGE_CLOCK } from './application/ports/clock';
import { FRIDGE_ID_GENERATOR } from './application/ports/id-generator';

// ── Use cases ─────────────────────────────────────────────────────────────────
import { AddFridgeItemUseCase } from './application/add-fridge-item.use-case';
import { ListFridgeItemsUseCase } from './application/list-fridge-items.use-case';
import { GetFridgeItemUseCase } from './application/get-fridge-item.use-case';
import { UpdateFridgeItemUseCase } from './application/update-fridge-item.use-case';
import { DeleteFridgeItemUseCase } from './application/delete-fridge-item.use-case';
import { EatFridgeItemUseCase } from './application/eat-fridge-item.use-case';
import { ThrowFridgeItemUseCase } from './application/throw-fridge-item.use-case';
import { FreezeFridgeItemUseCase } from './application/freeze-fridge-item.use-case';
import { ThawFridgeItemUseCase } from './application/thaw-fridge-item.use-case';
import { GetExpiringSoonUseCase } from './application/get-expiring-soon.use-case';

// ── Infrastructure ────────────────────────────────────────────────────────────
import { DrizzleFridgeItemRepository } from './infrastructure/drizzle-fridge-item.repository';

// ── Interface ─────────────────────────────────────────────────────────────────
import { FridgeController } from './interface/fridge.controller';
import { FridgeItemScopeGuard } from './interface/fridge-item-scope.guard';

// ── Family (repositorio para los guards) ─────────────────────────────────────
import { FAMILY_REPOSITORY } from '../family/domain/ports/family.repository';
import { DrizzleFamilyRepository } from '../family/infrastructure/drizzle-family.repository';
import { FamilyScopeGuard } from '../family/interface/family-scope.guard';
import { SystemClock } from '../family/infrastructure/system-clock';
import { UuidIdGenerator } from '../family/infrastructure/uuid-id-generator';

@Module({
  imports: [IdentityAccessModule],
  controllers: [FridgeController],
  providers: [
    // ── Infrastructure: repositorio ──────────────────────────────────────
    {
      provide: FRIDGE_ITEM_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzleFridgeItemRepository(db),
    },

    // ── Repositorio de familia (para los guards) ──────────────────────────
    {
      provide: FAMILY_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzleFamilyRepository(db),
    },

    // ── Puertos de infraestructura compartidos ────────────────────────────
    SystemClock,
    {
      provide: FRIDGE_CLOCK,
      useExisting: SystemClock,
    },
    UuidIdGenerator,
    {
      provide: FRIDGE_ID_GENERATOR,
      useExisting: UuidIdGenerator,
    },

    // ── Guards ────────────────────────────────────────────────────────────
    FamilyScopeGuard,
    FridgeItemScopeGuard,

    // ── Casos de uso ──────────────────────────────────────────────────────
    AddFridgeItemUseCase,
    ListFridgeItemsUseCase,
    GetFridgeItemUseCase,
    UpdateFridgeItemUseCase,
    DeleteFridgeItemUseCase,
    EatFridgeItemUseCase,
    ThrowFridgeItemUseCase,
    FreezeFridgeItemUseCase,
    ThawFridgeItemUseCase,
    GetExpiringSoonUseCase,
  ],
})
export class FridgeModule {}
