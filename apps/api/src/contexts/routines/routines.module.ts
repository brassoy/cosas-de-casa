import { Module } from '@nestjs/common';
import { DRIZZLE } from '../../db/drizzle.tokens';
import { IdentityAccessModule } from '../identity-access/identity-access.module';
import type { Database } from '../../db/db.types';

// ── Domain ports ─────────────────────────────────────────────────────────────
import { ROUTINE_REPOSITORY } from './domain/ports/routine.repository';
import { ROUTINE_ITEM_REPOSITORY } from './domain/ports/routine-item.repository';

// ── Application ports ────────────────────────────────────────────────────────
import { ROUTINES_CLOCK } from './application/ports/clock';
import { ROUTINES_ID_GENERATOR } from './application/ports/id-generator';

// ── Use cases ────────────────────────────────────────────────────────────────
import { CreateRoutineItemUseCase } from './application/create-routine-item.use-case';
import { ListRoutineItemsUseCase } from './application/list-routine-items.use-case';
import { UpdateRoutineItemUseCase } from './application/update-routine-item.use-case';
import { DeleteRoutineItemUseCase } from './application/delete-routine-item.use-case';
import { CreateRoutineUseCase } from './application/create-routine.use-case';
import { ListRoutinesUseCase } from './application/list-routines.use-case';
import { GetRoutineUseCase } from './application/get-routine.use-case';
import { UpdateRoutineUseCase } from './application/update-routine.use-case';
import { DeleteRoutineUseCase } from './application/delete-routine.use-case';
import { SetRoutineItemsUseCase } from './application/set-routine-items.use-case';
import { GetRoutineSummaryUseCase } from './application/get-routine-summary.use-case';
import { CreateAssignmentUseCase } from './application/create-assignment.use-case';
import { UpdateAssignmentUseCase } from './application/update-assignment.use-case';
import { DeleteAssignmentUseCase } from './application/delete-assignment.use-case';
import { CreateIncidentUseCase } from './application/create-incident.use-case';
import { DeleteIncidentUseCase } from './application/delete-incident.use-case';
import { RoutineStatsQuery } from './application/routine-stats.query';

// ── Infrastructure ──────────────────────────────────────────────────────────
import { DrizzleRoutineRepository } from './infrastructure/drizzle-routine.repository';
import { DrizzleRoutineItemRepository } from './infrastructure/drizzle-routine-item.repository';

// ── Interface ────────────────────────────────────────────────────────────────
import { RoutinesController } from './interface/routines.controller';
import { RoutineScopeGuard } from './interface/routine-scope.guard';
import { RoutineItemScopeGuard } from './interface/routine-item-scope.guard';

// ── Family (repositorio para los guards) ─────────────────────────────────────
import { FAMILY_REPOSITORY } from '../family/domain/ports/family.repository';
import { DrizzleFamilyRepository } from '../family/infrastructure/drizzle-family.repository';
import { FamilyScopeGuard } from '../family/interface/family-scope.guard';
import { SystemClock } from '../family/infrastructure/system-clock';
import { UuidIdGenerator } from '../family/infrastructure/uuid-id-generator';

@Module({
  imports: [IdentityAccessModule],
  controllers: [RoutinesController],
  providers: [
    // ── Infrastructure: repositorios ──────────────────────────────────────
    {
      provide: ROUTINE_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzleRoutineRepository(db),
    },
    {
      provide: ROUTINE_ITEM_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzleRoutineItemRepository(db),
    },

    // ── Repositorio de familia (para los guards) ──────────────────────────
    {
      provide: FAMILY_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzleFamilyRepository(db),
    },

    // ── Read-model de estadísticas ────────────────────────────────────────
    RoutineStatsQuery,

    // ── Puertos de infraestructura compartidos ────────────────────────────
    SystemClock,
    {
      provide: ROUTINES_CLOCK,
      useExisting: SystemClock,
    },
    UuidIdGenerator,
    {
      provide: ROUTINES_ID_GENERATOR,
      useExisting: UuidIdGenerator,
    },

    // ── Guards ────────────────────────────────────────────────────────────
    FamilyScopeGuard,
    RoutineScopeGuard,
    RoutineItemScopeGuard,

    // ── Casos de uso ──────────────────────────────────────────────────────
    CreateRoutineItemUseCase,
    ListRoutineItemsUseCase,
    UpdateRoutineItemUseCase,
    DeleteRoutineItemUseCase,
    CreateRoutineUseCase,
    ListRoutinesUseCase,
    GetRoutineUseCase,
    UpdateRoutineUseCase,
    DeleteRoutineUseCase,
    SetRoutineItemsUseCase,
    GetRoutineSummaryUseCase,
    CreateAssignmentUseCase,
    UpdateAssignmentUseCase,
    DeleteAssignmentUseCase,
    CreateIncidentUseCase,
    DeleteIncidentUseCase,
  ],
})
export class RoutinesModule {}
