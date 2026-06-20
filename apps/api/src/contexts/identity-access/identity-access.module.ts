import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet } from 'jose';
import type { Env } from '../../config/env.config';
import { DRIZZLE } from '../../db/drizzle.tokens';
import type { Database } from '../../db/db.types';

import { APP_USER_REPOSITORY } from './domain/ports/app-user.repository';
import { ACCOUNT_DELETION_REPOSITORY } from './domain/ports/account-deletion.repository';
import { AUTH_USER_ADMIN } from './domain/ports/auth-user-admin.port';
import { TOKEN_VERIFIER } from './domain/ports/token-verifier';
import { DrizzleAppUserRepository } from './infrastructure/drizzle-app-user.repository';
import { DrizzleAccountDeletionRepository } from './infrastructure/drizzle-account-deletion.repository';
import {
  NoopAuthUserAdmin,
  SupabaseAuthUserAdmin,
} from './infrastructure/supabase-auth-user-admin.adapter';
import {
  JoseTokenVerifier,
  JWKS_PROVIDER,
} from './infrastructure/jose-token-verifier';
import { AuthenticateRequestUseCase } from './application/authenticate-request.use-case';
import { UpdateDisplayNameUseCase } from './application/update-display-name.use-case';
import { DeleteAccountUseCase } from './application/delete-account.use-case';
import { JwtAuthGuard } from './interface/jwt-auth.guard';

@Module({
  // AuthController vive en FamilyModule: /auth/me compone usuario + familias,
  // y mantener identity-access como capa baja (sin depender de family) evita el ciclo.
  providers: [
    {
      provide: JWKS_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        jwks: createRemoteJWKSet(new URL(config.get('JWT_JWKS_URL', { infer: true }))),
        issuer: config.get('JWT_ISSUER', { infer: true }),
        audience: config.get('JWT_AUDIENCE', { infer: true }),
      }),
    },
    {
      provide: TOKEN_VERIFIER,
      inject: [JWKS_PROVIDER],
      useFactory: (cfg: ConstructorParameters<typeof JoseTokenVerifier>[0]) =>
        new JoseTokenVerifier(cfg),
    },
    {
      provide: APP_USER_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzleAppUserRepository(db),
    },
    {
      provide: ACCOUNT_DELETION_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzleAccountDeletionRepository(db),
    },
    {
      // Adaptador OPCIONAL: con service-role borra el usuario de Supabase Auth;
      // sin ella, un no-op que solo avisa (la baja de DATOS sí se completa).
      provide: AUTH_USER_ADMIN,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const url = config.get('SUPABASE_URL', { infer: true });
        const serviceRoleKey = config.get('SUPABASE_SERVICE_ROLE_KEY', { infer: true });
        return url && serviceRoleKey
          ? new SupabaseAuthUserAdmin(url, serviceRoleKey)
          : new NoopAuthUserAdmin();
      },
    },
    AuthenticateRequestUseCase,
    UpdateDisplayNameUseCase,
    DeleteAccountUseCase,
    JwtAuthGuard,
  ],
  exports: [
    JwtAuthGuard,
    AuthenticateRequestUseCase,
    UpdateDisplayNameUseCase,
    DeleteAccountUseCase,
  ],
})
export class IdentityAccessModule {}
