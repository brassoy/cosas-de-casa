import { Inject, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../domain/authenticated-user';
import {
  APP_USER_REPOSITORY,
  type AppUserRepository,
} from '../domain/ports/app-user.repository';
import { TOKEN_VERIFIER, type TokenVerifier } from '../domain/ports/token-verifier';

/**
 * Caso de uso: autenticar una petición a partir del token Bearer.
 *
 * 1. Verifica el JWT (firma ES256 contra el JWKS de Supabase, issuer/audience).
 * 2. Aprovisiona "just-in-time" el usuario local (upsert en app_users desde los
 *    claims), de modo que su primera petición autenticada crea su fila.
 *
 * Lanza `InvalidTokenError` si el token no es válido.
 */
@Injectable()
export class AuthenticateRequestUseCase {
  constructor(
    @Inject(TOKEN_VERIFIER) private readonly tokenVerifier: TokenVerifier,
    @Inject(APP_USER_REPOSITORY) private readonly appUsers: AppUserRepository,
  ) {}

  async execute(token: string): Promise<AuthenticatedUser> {
    const claims = await this.tokenVerifier.verify(token);
    const defaultDisplayName = claims.email.split('@')[0] ?? null;
    return this.appUsers.upsertFromClaims({
      id: claims.sub,
      email: claims.email,
      defaultDisplayName,
    });
  }
}
