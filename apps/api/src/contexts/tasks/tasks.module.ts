import { Module } from '@nestjs/common';
import { DRIZZLE } from '../../db/drizzle.tokens';
import { IdentityAccessModule } from '../identity-access/identity-access.module';
import { ShoppingModule } from '../shopping/shopping.module';
import type { Database } from '../../db/db.types';

// ── Domain ports ─────────────────────────────────────────────────────────────
import { TASK_REPOSITORY } from './domain/ports/task.repository';
import { TASK_PHOTO_REPOSITORY } from './domain/ports/task-photo.repository';

// ── Application ports ────────────────────────────────────────────────────────
import { TASKS_CLOCK } from './application/ports/clock';
import { TASKS_ID_GENERATOR } from './application/ports/id-generator';

// ── Use cases ────────────────────────────────────────────────────────────────
import { CreateTaskUseCase } from './application/create-task.use-case';
import { GetTaskUseCase } from './application/get-task.use-case';
import { ListTasksUseCase } from './application/list-tasks.use-case';
import { UpdateTaskUseCase } from './application/update-task.use-case';
import { DeleteTaskUseCase } from './application/delete-task.use-case';
import { SetAssigneesUseCase } from './application/set-assignees.use-case';
import { AddTaskPhotoUseCase } from './application/add-task-photo.use-case';
import { RemoveTaskPhotoUseCase } from './application/remove-task-photo.use-case';
import { GenerateListFromTaskUseCase } from './application/generate-list-from-task.use-case';

// ── Infrastructure ──────────────────────────────────────────────────────────
import { DrizzleTaskRepository } from './infrastructure/drizzle-task.repository';
import { DrizzleTaskPhotoRepository } from './infrastructure/drizzle-task-photo.repository';
import { TaskAssigneesReadModel } from './infrastructure/task-assignees-read-model';

// ── Interface ────────────────────────────────────────────────────────────────
import { TasksController } from './interface/tasks.controller';
import { TaskScopeGuard } from './interface/task-scope.guard';

// ── Family (repositorio para los guards) ─────────────────────────────────────
import { FAMILY_REPOSITORY } from '../family/domain/ports/family.repository';
import { DrizzleFamilyRepository } from '../family/infrastructure/drizzle-family.repository';
import { FamilyScopeGuard } from '../family/interface/family-scope.guard';
import { SystemClock } from '../family/infrastructure/system-clock';
import { UuidIdGenerator } from '../family/infrastructure/uuid-id-generator';

@Module({
  imports: [IdentityAccessModule, ShoppingModule],
  controllers: [TasksController],
  providers: [
    // ── Infrastructure: repositorios ──────────────────────────────────────
    {
      provide: TASK_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzleTaskRepository(db),
    },
    {
      provide: TASK_PHOTO_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzleTaskPhotoRepository(db),
    },

    // ── Repositorio de familia (para los guards) ──────────────────────────
    {
      provide: FAMILY_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzleFamilyRepository(db),
    },

    // ── Read-model de asignados ────────────────────────────────────────────
    {
      provide: TaskAssigneesReadModel,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new TaskAssigneesReadModel(db),
    },

    // ── Puertos de infraestructura compartidos ────────────────────────────
    SystemClock,
    {
      provide: TASKS_CLOCK,
      useExisting: SystemClock,
    },
    UuidIdGenerator,
    {
      provide: TASKS_ID_GENERATOR,
      useExisting: UuidIdGenerator,
    },

    // ── Guards ────────────────────────────────────────────────────────────
    FamilyScopeGuard,
    TaskScopeGuard,

    // ── Casos de uso ──────────────────────────────────────────────────────
    CreateTaskUseCase,
    GetTaskUseCase,
    ListTasksUseCase,
    UpdateTaskUseCase,
    DeleteTaskUseCase,
    SetAssigneesUseCase,
    AddTaskPhotoUseCase,
    RemoveTaskPhotoUseCase,
    GenerateListFromTaskUseCase,
  ],
})
export class TasksModule {}
