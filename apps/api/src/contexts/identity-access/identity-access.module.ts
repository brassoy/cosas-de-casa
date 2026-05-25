import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet } from 'jose';
import type { Env } from '../../config/env.config';
import { DRIZZLE } from '../../db/drizzle.tokens';
import type { Database } from '../../db/db.types';

import { APP_USER_REPOSITORY } from './domain/ports/app-user.repository';
import { TOKEN_VERIFIER } from './domain/ports/token-verifier';
import { DrizzleAppUserRepository } from './infrastructure/drizzle-app-user.repository';
import {
  JoseTokenVerifier,
  JWKS_PROVIDER,
} from './infrastructure/jose-token-verifier';
import { AuthenticateRequestUseCase } from './application/authenticate-request.use-case';
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
    AuthenticateRequestUseCase,
    JwtAuthGuard,
  ],
  exports: [JwtAuthGuard, AuthenticateRequestUseCase],
})
export class IdentityAccessModule {}
