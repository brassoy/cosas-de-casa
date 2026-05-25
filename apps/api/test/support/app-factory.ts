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
    ],
    controllers: [FamilyController, AuthController],
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
