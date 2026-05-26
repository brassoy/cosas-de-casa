/**
 * Fábrica de aplicación Nest para tests de integración.
 *
 * Construye una instancia completa del sistema (base de datos real, JWKS real
 * de Supabase local) con los mismos pipes y filtros globales que main.ts para
 * que las respuestas HTTP coincidan exactamente con producción.
 *
 * La arquitectura hexagonal del proyecto no tiene módulos Nest por contexto:
 * los providers se registran directamente en AppModule... pero AppModule solo
 * tiene HealthModule en la fase actual. Por eso este factory ensambla el
 * módulo de test a mano registrando todos los providers necesarios.
 */
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { validateEnv, type Env } from '../../src/config/env.config';
import { DRIZZLE, PG_POOL } from '../../src/db/drizzle.tokens';
import * as schema from '../../src/db/schema';

// ── identity-access ────────────────────────────────────────────────────────
import { AuthController } from '../../src/contexts/identity-access/interface/auth.controller';
import { JwtAuthGuard } from '../../src/contexts/identity-access/interface/jwt-auth.guard';
import { AuthenticateRequestUseCase } from '../../src/contexts/identity-access/application/authenticate-request.use-case';
import { DrizzleAppUserRepository } from '../../src/contexts/identity-access/infrastructure/drizzle-app-user.repository';
import {
  JoseTokenVerifier,
  JWKS_PROVIDER,
} from '../../src/contexts/identity-access/infrastructure/jose-token-verifier';
import {
  APP_USER_REPOSITORY,
} from '../../src/contexts/identity-access/domain/ports/app-user.repository';
import { TOKEN_VERIFIER } from '../../src/contexts/identity-access/domain/ports/token-verifier';

// ── family ─────────────────────────────────────────────────────────────────
import { FamilyController } from '../../src/contexts/family/interface/family.controller';
import { FamilyScopeGuard } from '../../src/contexts/family/interface/family-scope.guard';

import { CreateFamilyUseCase } from '../../src/contexts/family/application/create-family.use-case';
import { ListMyFamiliesUseCase } from '../../src/contexts/family/application/list-my-families.use-case';
import { GenerateJoinPinUseCase } from '../../src/contexts/family/application/generate-join-pin.use-case';
import { JoinFamilyByPinUseCase } from '../../src/contexts/family/application/join-family-by-pin.use-case';
import { ListMembersUseCase } from '../../src/contexts/family/application/list-members.use-case';
import { LeaveFamilyUseCase } from '../../src/contexts/family/application/leave-family.use-case';
import { RevokeActivePinUseCase } from '../../src/contexts/family/application/revoke-active-pin.use-case';

import {
  FAMILY_REPOSITORY,
} from '../../src/contexts/family/domain/ports/family.repository';
import { UNIT_OF_WORK } from '../../src/contexts/family/application/ports/unit-of-work';
import { HASHER } from '../../src/contexts/family/application/ports/hasher';
import { ID_GENERATOR } from '../../src/contexts/family/application/ports/id-generator';
import { CLOCK } from '../../src/contexts/family/application/ports/clock';
import { RANDOM_BYTES } from '../../src/contexts/family/application/ports/random-bytes';
import { MEMBERS_READ_MODEL } from '../../src/contexts/family/application/ports/members-read-model';

import { DrizzleFamilyRepository } from '../../src/contexts/family/infrastructure/drizzle-family.repository';
import { DrizzleUnitOfWork } from '../../src/contexts/family/infrastructure/drizzle-unit-of-work';
import {
  ScryptHasher,
  HASHER_PEPPER,
} from '../../src/contexts/family/infrastructure/scrypt-hasher';
import { UuidIdGenerator } from '../../src/contexts/family/infrastructure/uuid-id-generator';
import { SystemClock } from '../../src/contexts/family/infrastructure/system-clock';
import { CryptoRandomBytes } from '../../src/contexts/family/infrastructure/crypto-random-bytes';
import { DrizzleMembersReadModel } from '../../src/contexts/family/infrastructure/drizzle-members-read-model';

import { createRemoteJWKSet } from 'jose';

// ── shopping ───────────────────────────────────────────────────────────────
import { ShoppingListsController } from '../../src/contexts/shopping/interface/shopping-lists.controller';
import { ShoppingItemsController } from '../../src/contexts/shopping/interface/shopping-items.controller';
import { ListScopeGuard } from '../../src/contexts/shopping/interface/list-scope.guard';
import { ItemScopeGuard } from '../../src/contexts/shopping/interface/item-scope.guard';

// ── ai ─────────────────────────────────────────────────────────────────────
import { AiController } from '../../src/contexts/ai/interface/ai.controller';
import { EMBEDDING_PORT } from '../../src/contexts/ai/domain/ports/embedding.port';
import { ITEM_EXTRACTION_PORT } from '../../src/contexts/ai/domain/ports/item-extraction.port';
import { CATALOG_ITEM_REPOSITORY } from '../../src/contexts/ai/domain/ports/catalog-item.repository';
import { DrizzleCatalogItemRepository } from '../../src/contexts/ai/infrastructure/drizzle-catalog-item.repository';
import { ExtractItemsUseCase } from '../../src/contexts/ai/application/extract-items.use-case';
import { DedupCheckUseCase } from '../../src/contexts/ai/application/dedup-check.use-case';
import { UpsertCatalogItemUseCase } from '../../src/contexts/ai/application/upsert-catalog-item.use-case';
import { GetFrequentItemsUseCase } from '../../src/contexts/ai/application/get-frequent-items.use-case';

import { EnsureAndListListsUseCase } from '../../src/contexts/shopping/application/ensure-and-list-lists.use-case';
import { CreateCustomListUseCase } from '../../src/contexts/shopping/application/create-custom-list.use-case';
import { GetListWithItemsUseCase } from '../../src/contexts/shopping/application/get-list-with-items.use-case';
import { AddItemUseCase } from '../../src/contexts/shopping/application/add-item.use-case';
import { ToggleItemCheckedUseCase } from '../../src/contexts/shopping/application/toggle-item-checked.use-case';
import { UpdateItemUseCase } from '../../src/contexts/shopping/application/update-item.use-case';
import { DeleteItemUseCase } from '../../src/contexts/shopping/application/delete-item.use-case';
import { DeleteCustomListUseCase } from '../../src/contexts/shopping/application/delete-custom-list.use-case';
import { AddCommentUseCase } from '../../src/contexts/shopping/application/add-comment.use-case';
import { ListCommentsUseCase } from '../../src/contexts/shopping/application/list-comments.use-case';

import {
  SHOPPING_LIST_REPOSITORY,
} from '../../src/contexts/shopping/domain/ports/shopping-list.repository';
import {
  SHOPPING_ITEM_REPOSITORY,
} from '../../src/contexts/shopping/domain/ports/shopping-item.repository';
import {
  ITEM_COMMENT_REPOSITORY,
} from '../../src/contexts/shopping/domain/ports/item-comment.repository';
import { SHOPPING_CLOCK } from '../../src/contexts/shopping/application/ports/clock';
import { SHOPPING_ID_GENERATOR } from '../../src/contexts/shopping/application/ports/id-generator';

import { DrizzleShoppingListRepository } from '../../src/contexts/shopping/infrastructure/drizzle-shopping-list.repository';
import { DrizzleShoppingItemRepository } from '../../src/contexts/shopping/infrastructure/drizzle-shopping-item.repository';
import { DrizzleItemCommentRepository } from '../../src/contexts/shopping/infrastructure/drizzle-item-comment.repository';

// ── fridge ─────────────────────────────────────────────────────────────────
import { FridgeController } from '../../src/contexts/fridge/interface/fridge.controller';
import { FridgeItemScopeGuard } from '../../src/contexts/fridge/interface/fridge-item-scope.guard';
import { FRIDGE_ITEM_REPOSITORY } from '../../src/contexts/fridge/domain/ports/fridge-item.repository';
import { FRIDGE_CLOCK } from '../../src/contexts/fridge/application/ports/clock';
import { FRIDGE_ID_GENERATOR } from '../../src/contexts/fridge/application/ports/id-generator';
import { DrizzleFridgeItemRepository } from '../../src/contexts/fridge/infrastructure/drizzle-fridge-item.repository';
import { AddFridgeItemUseCase } from '../../src/contexts/fridge/application/add-fridge-item.use-case';
import { ListFridgeItemsUseCase } from '../../src/contexts/fridge/application/list-fridge-items.use-case';
import { GetFridgeItemUseCase } from '../../src/contexts/fridge/application/get-fridge-item.use-case';
import { UpdateFridgeItemUseCase } from '../../src/contexts/fridge/application/update-fridge-item.use-case';
import { DeleteFridgeItemUseCase } from '../../src/contexts/fridge/application/delete-fridge-item.use-case';
import { EatFridgeItemUseCase } from '../../src/contexts/fridge/application/eat-fridge-item.use-case';
import { ThrowFridgeItemUseCase } from '../../src/contexts/fridge/application/throw-fridge-item.use-case';
import { FreezeFridgeItemUseCase } from '../../src/contexts/fridge/application/freeze-fridge-item.use-case';
import { GetExpiringSoonUseCase } from '../../src/contexts/fridge/application/get-expiring-soon.use-case';

// ── notifications ──────────────────────────────────────────────────────────
import { NotificationsController } from '../../src/contexts/notifications/interface/notifications.controller';
import { PUSH_SUBSCRIPTION_REPOSITORY } from '../../src/contexts/notifications/domain/ports/push-subscription.repository';
import { NOTIFICATION_SENDER } from '../../src/contexts/notifications/domain/ports/notification-sender.port';
import { NOTIFICATIONS_CLOCK } from '../../src/contexts/notifications/application/ports/clock';
import { NOTIFICATIONS_ID_GENERATOR } from '../../src/contexts/notifications/application/ports/id-generator';
import { DrizzlePushSubscriptionRepository } from '../../src/contexts/notifications/infrastructure/drizzle-push-subscription.repository';
import { SubscribePushUseCase } from '../../src/contexts/notifications/application/subscribe-push.use-case';
import { UnsubscribePushUseCase } from '../../src/contexts/notifications/application/unsubscribe-push.use-case';
import { ExpiryReminderService } from '../../src/contexts/notifications/application/expiry-reminder.service';

// ── stats ──────────────────────────────────────────────────────────────────
import { StatsController } from '../../src/contexts/stats/interface/stats.controller';
import { FamilyStatsQuery } from '../../src/contexts/stats/application/family-stats.query';

// ── tasks ──────────────────────────────────────────────────────────────────
import { TasksController } from '../../src/contexts/tasks/interface/tasks.controller';
import { TaskScopeGuard } from '../../src/contexts/tasks/interface/task-scope.guard';
import { TASK_REPOSITORY } from '../../src/contexts/tasks/domain/ports/task.repository';
import { TASK_PHOTO_REPOSITORY } from '../../src/contexts/tasks/domain/ports/task-photo.repository';
import { TASKS_CLOCK } from '../../src/contexts/tasks/application/ports/clock';
import { TASKS_ID_GENERATOR } from '../../src/contexts/tasks/application/ports/id-generator';
import { DrizzleTaskRepository } from '../../src/contexts/tasks/infrastructure/drizzle-task.repository';
import { DrizzleTaskPhotoRepository } from '../../src/contexts/tasks/infrastructure/drizzle-task-photo.repository';
import { TaskAssigneesReadModel } from '../../src/contexts/tasks/infrastructure/task-assignees-read-model';
import { CreateTaskUseCase } from '../../src/contexts/tasks/application/create-task.use-case';
import { GetTaskUseCase } from '../../src/contexts/tasks/application/get-task.use-case';
import { ListTasksUseCase } from '../../src/contexts/tasks/application/list-tasks.use-case';
import { UpdateTaskUseCase } from '../../src/contexts/tasks/application/update-task.use-case';
import { DeleteTaskUseCase } from '../../src/contexts/tasks/application/delete-task.use-case';
import { SetAssigneesUseCase } from '../../src/contexts/tasks/application/set-assignees.use-case';
import { AddTaskPhotoUseCase } from '../../src/contexts/tasks/application/add-task-photo.use-case';
import { RemoveTaskPhotoUseCase } from '../../src/contexts/tasks/application/remove-task-photo.use-case';
import { GenerateListFromTaskUseCase } from '../../src/contexts/tasks/application/generate-list-from-task.use-case';

export interface TestApp {
  app: INestApplication;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server: any;
}

/**
 * Crea y levanta la aplicación Nest de integración.
 * Reutiliza la misma instancia si se llama varias veces en el mismo proceso
 * (las suites comparten la instancia para no pagar el coste de init por suite).
 */
let cachedApp: TestApp | undefined;

export async function createTestApp(): Promise<TestApp> {
  if (cachedApp) {
    return cachedApp;
  }

  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        validate: validateEnv,
        cache: true,
        // El .env ya fue cargado por setup-env.ts; ConfigModule lo leerá
        // de process.env sin necesidad de especificar envFilePath.
        ignoreEnvFile: true,
      }),
      ScheduleModule.forRoot(),
    ],
    controllers: [FamilyController, AuthController, ShoppingListsController, ShoppingItemsController, AiController, TasksController, FridgeController, NotificationsController, StatsController],
    providers: [
      // ── DB ─────────────────────────────────────────────────────────────
      {
        provide: PG_POOL,
        inject: [ConfigService],
        useFactory: (config: ConfigService<Env, true>): Pool => {
          const connectionString = config.get('DATABASE_URL', { infer: true });
          if (!connectionString) {
            throw new Error('DATABASE_URL es obligatoria para los tests de integración.');
          }
          return new Pool({ connectionString, max: 5 });
        },
      },
      {
        provide: DRIZZLE,
        inject: [PG_POOL],
        useFactory: (pool: Pool) => drizzle(pool, { schema, casing: 'snake_case' }),
      },

      // ── identity-access ────────────────────────────────────────────────
      {
        provide: JWKS_PROVIDER,
        inject: [ConfigService],
        useFactory: (config: ConfigService<Env, true>) => {
          const jwksUrl = config.get('JWT_JWKS_URL', { infer: true });
          const issuer = config.get('JWT_ISSUER', { infer: true });
          const audience = config.get('JWT_AUDIENCE', { infer: true });
          if (!jwksUrl || !issuer || !audience) {
            throw new Error('Faltan variables JWT_* para los tests de integración.');
          }
          return {
            jwks: createRemoteJWKSet(new URL(jwksUrl)),
            issuer,
            audience,
          };
        },
      },
      {
        provide: TOKEN_VERIFIER,
        inject: [JWKS_PROVIDER],
        useFactory: (config: { jwks: ReturnType<typeof createRemoteJWKSet>; issuer: string; audience: string }) =>
          new JoseTokenVerifier(config),
      },
      DrizzleAppUserRepository,
      {
        provide: APP_USER_REPOSITORY,
        useExisting: DrizzleAppUserRepository,
      },
      AuthenticateRequestUseCase,
      JwtAuthGuard,

      // ── family: infraestructura ─────────────────────────────────────────
      {
        provide: HASHER_PEPPER,
        inject: [ConfigService],
        useFactory: (config: ConfigService<Env, true>): string => {
          return config.get('JOIN_PIN_PEPPER', { infer: true }) ?? 'dev-only-join-pin-pepper-change-me';
        },
      },
      ScryptHasher,
      {
        provide: HASHER,
        useExisting: ScryptHasher,
      },
      DrizzleUnitOfWork,
      {
        provide: UNIT_OF_WORK,
        useExisting: DrizzleUnitOfWork,
      },
      UuidIdGenerator,
      {
        provide: ID_GENERATOR,
        useExisting: UuidIdGenerator,
      },
      SystemClock,
      {
        provide: CLOCK,
        useExisting: SystemClock,
      },
      CryptoRandomBytes,
      {
        provide: RANDOM_BYTES,
        useExisting: CryptoRandomBytes,
      },
      DrizzleMembersReadModel,
      {
        provide: MEMBERS_READ_MODEL,
        useExisting: DrizzleMembersReadModel,
      },
      {
        provide: FAMILY_REPOSITORY,
        inject: [DRIZZLE],
        useFactory: (db: ReturnType<typeof drizzle>) =>
          new DrizzleFamilyRepository(db as Parameters<typeof DrizzleFamilyRepository.prototype.constructor>[0]),
      },
      FamilyScopeGuard,

      // ── family: casos de uso ───────────────────────────────────────────
      CreateFamilyUseCase,
      ListMyFamiliesUseCase,
      GenerateJoinPinUseCase,
      JoinFamilyByPinUseCase,
      ListMembersUseCase,
      LeaveFamilyUseCase,
      RevokeActivePinUseCase,

      // ── shopping: repositorios ─────────────────────────────────────────
      {
        provide: SHOPPING_LIST_REPOSITORY,
        inject: [DRIZZLE],
        useFactory: (db: ReturnType<typeof drizzle>) =>
          new DrizzleShoppingListRepository(db as Parameters<typeof DrizzleShoppingListRepository.prototype.constructor>[0]),
      },
      {
        provide: SHOPPING_ITEM_REPOSITORY,
        inject: [DRIZZLE],
        useFactory: (db: ReturnType<typeof drizzle>) =>
          new DrizzleShoppingItemRepository(db as Parameters<typeof DrizzleShoppingItemRepository.prototype.constructor>[0]),
      },
      {
        provide: ITEM_COMMENT_REPOSITORY,
        inject: [DRIZZLE],
        useFactory: (db: ReturnType<typeof drizzle>) =>
          new DrizzleItemCommentRepository(db as Parameters<typeof DrizzleItemCommentRepository.prototype.constructor>[0]),
      },

      // ── shopping: puertos de infra (reutiliza los de family) ──────────
      {
        provide: SHOPPING_CLOCK,
        useExisting: SystemClock,
      },
      {
        provide: SHOPPING_ID_GENERATOR,
        useExisting: UuidIdGenerator,
      },

      // ── shopping: guards ───────────────────────────────────────────────
      ListScopeGuard,
      ItemScopeGuard,

      // ── shopping: casos de uso ─────────────────────────────────────────
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

      // ── ai: embedding port (stub determinista para tests) ─────────────
      // Usamos un stub con vector fijo en lugar del modelo real para evitar
      // descargar fastembed en CI y hacer los tests deterministas.
      {
        provide: EMBEDDING_PORT,
        useValue: {
          embed: async (text: string) => {
            // Vector determinista: hash simple basado en el texto (384 dims).
            // Textos idénticos → mismo vector; textos distintos → distinto.
            const hash = Array.from({ length: 384 }, (_, i) => {
              const charCode = text.charCodeAt(i % text.length) || 1;
              return (Math.sin(i + charCode) * 0.5 + 0.5);
            });
            return hash;
          },
        },
      },

      // ── ai: extracción de ítems (stub para tests) ─────────────────────
      {
        provide: ITEM_EXTRACTION_PORT,
        useValue: {
          extractItems: async (phrase: string) => {
            // Stub: divide por comas o "y"
            return phrase
              .split(/,|\sy\s/)
              .map((s) => s.trim())
              .filter((s) => s.length > 0);
          },
        },
      },

      // ── ai: catálogo ──────────────────────────────────────────────────
      {
        provide: CATALOG_ITEM_REPOSITORY,
        inject: [DRIZZLE],
        useFactory: (db: ReturnType<typeof drizzle>) =>
          new DrizzleCatalogItemRepository(db as Parameters<typeof DrizzleCatalogItemRepository.prototype.constructor>[0]),
      },

      // ── ai: casos de uso ──────────────────────────────────────────────
      ExtractItemsUseCase,
      DedupCheckUseCase,
      UpsertCatalogItemUseCase,
      GetFrequentItemsUseCase,

      // ── tasks: repositorios ────────────────────────────────────────────
      {
        provide: TASK_REPOSITORY,
        inject: [DRIZZLE],
        useFactory: (db: ReturnType<typeof drizzle>) =>
          new DrizzleTaskRepository(db as Parameters<typeof DrizzleTaskRepository.prototype.constructor>[0]),
      },
      {
        provide: TASK_PHOTO_REPOSITORY,
        inject: [DRIZZLE],
        useFactory: (db: ReturnType<typeof drizzle>) =>
          new DrizzleTaskPhotoRepository(db as Parameters<typeof DrizzleTaskPhotoRepository.prototype.constructor>[0]),
      },

      // ── tasks: read-model ──────────────────────────────────────────────
      {
        provide: TaskAssigneesReadModel,
        inject: [DRIZZLE],
        useFactory: (db: ReturnType<typeof drizzle>) =>
          new TaskAssigneesReadModel(db as Parameters<typeof TaskAssigneesReadModel.prototype.constructor>[0]),
      },

      // ── tasks: puertos de infra (reutiliza los de family) ─────────────
      {
        provide: TASKS_CLOCK,
        useExisting: SystemClock,
      },
      {
        provide: TASKS_ID_GENERATOR,
        useExisting: UuidIdGenerator,
      },

      // ── tasks: guards ──────────────────────────────────────────────────
      TaskScopeGuard,

      // ── tasks: casos de uso ────────────────────────────────────────────
      CreateTaskUseCase,
      GetTaskUseCase,
      ListTasksUseCase,
      UpdateTaskUseCase,
      DeleteTaskUseCase,
      SetAssigneesUseCase,
      AddTaskPhotoUseCase,
      RemoveTaskPhotoUseCase,
      GenerateListFromTaskUseCase,

      // ── fridge: repositorio ────────────────────────────────────────────
      {
        provide: FRIDGE_ITEM_REPOSITORY,
        inject: [DRIZZLE],
        useFactory: (db: ReturnType<typeof drizzle>) =>
          new DrizzleFridgeItemRepository(db as Parameters<typeof DrizzleFridgeItemRepository.prototype.constructor>[0]),
      },

      // ── fridge: puertos de infra (reutiliza los de family) ─────────────
      {
        provide: FRIDGE_CLOCK,
        useExisting: SystemClock,
      },
      {
        provide: FRIDGE_ID_GENERATOR,
        useExisting: UuidIdGenerator,
      },

      // ── fridge: guards ─────────────────────────────────────────────────
      FridgeItemScopeGuard,

      // ── fridge: casos de uso ───────────────────────────────────────────
      AddFridgeItemUseCase,
      ListFridgeItemsUseCase,
      GetFridgeItemUseCase,
      UpdateFridgeItemUseCase,
      DeleteFridgeItemUseCase,
      EatFridgeItemUseCase,
      ThrowFridgeItemUseCase,
      FreezeFridgeItemUseCase,
      GetExpiringSoonUseCase,

      // ── notifications: repositorio ─────────────────────────────────────
      {
        provide: PUSH_SUBSCRIPTION_REPOSITORY,
        inject: [DRIZZLE],
        useFactory: (db: ReturnType<typeof drizzle>) =>
          new DrizzlePushSubscriptionRepository(db as Parameters<typeof DrizzlePushSubscriptionRepository.prototype.constructor>[0]),
      },

      // ── notifications: sender (stub no-op en tests) ───────────────────
      {
        provide: NOTIFICATION_SENDER,
        useValue: {
          sendToTargets: async () => undefined,
        },
      },

      // ── notifications: puertos de infra ──────────────────────────────
      {
        provide: NOTIFICATIONS_CLOCK,
        useExisting: SystemClock,
      },
      {
        provide: NOTIFICATIONS_ID_GENERATOR,
        useExisting: UuidIdGenerator,
      },

      // ── notifications: casos de uso ───────────────────────────────────
      SubscribePushUseCase,
      UnsubscribePushUseCase,

      // ── notifications: cron (no ejecuta en tests: sender es stub) ─────
      ExpiryReminderService,

      // ── stats: read-model ─────────────────────────────────────────────
      FamilyStatsQuery,
    ],
  }).compile();

  const app = moduleRef.createNestApplication();

  // Replica exacta de los globales de main.ts (sin Swagger, no lo necesitamos)
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  await app.init();

  const server = app.getHttpServer();
  cachedApp = { app, server };
  return cachedApp;
}

/** Cierra la app (pool de PG). Llamar en afterAll global. */
export async function closeTestApp(): Promise<void> {
  if (cachedApp) {
    await cachedApp.app.close();
    cachedApp = undefined;
  }
}
