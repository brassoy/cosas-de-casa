import { describe, it, expect, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { AuthenticateRequestUseCase } from './authenticate-request.use-case';
import { TOKEN_VERIFIER } from '../domain/ports/token-verifier';
import { APP_USER_REPOSITORY } from '../domain/ports/app-user.repository';
import { InvalidTokenError } from '../domain/auth.errors';
import type { TokenVerifier, VerifiedClaims } from '../domain/ports/token-verifier';
import type { AppUserRepository, UpsertAppUserParams } from '../domain/ports/app-user.repository';
import type { AuthenticatedUser } from '../domain/authenticated-user';

// ─── fakes ──────────────────────────────────────────────────────────────────

class FakeTokenVerifier implements TokenVerifier {
  private validTokens = new Map<string, VerifiedClaims>();

  addToken(token: string, claims: VerifiedClaims): void {
    this.validTokens.set(token, claims);
  }

  async verify(token: string): Promise<VerifiedClaims> {
    const claims = this.validTokens.get(token);
    if (!claims) {
      throw new InvalidTokenError();
    }
    return claims;
  }
}

class FakeAppUserRepository implements AppUserRepository {
  public upsertCalls: UpsertAppUserParams[] = [];
  private users = new Map<string, AuthenticatedUser>();

  seed(user: AuthenticatedUser): void {
    this.users.set(user.id, user);
  }

  async upsertFromClaims(params: UpsertAppUserParams): Promise<AuthenticatedUser> {
    this.upsertCalls.push(params);
    const existing = this.users.get(params.id);
    const user: AuthenticatedUser = {
      id: params.id,
      email: params.email,
      displayName: existing?.displayName ?? params.defaultDisplayName ?? null,
    };
    this.users.set(user.id, user);
    return user;
  }

  async findById(id: string): Promise<AuthenticatedUser | null> {
    return this.users.get(id) ?? null;
  }
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe('AuthenticateRequestUseCase', () => {
  let useCase: AuthenticateRequestUseCase;
  let tokenVerifier: FakeTokenVerifier;
  let appUsers: FakeAppUserRepository;

  beforeEach(async () => {
    tokenVerifier = new FakeTokenVerifier();
    appUsers = new FakeAppUserRepository();

    const module = await Test.createTestingModule({
      providers: [
        AuthenticateRequestUseCase,
        { provide: TOKEN_VERIFIER, useValue: tokenVerifier },
        { provide: APP_USER_REPOSITORY, useValue: appUsers },
      ],
    }).compile();

    useCase = module.get(AuthenticateRequestUseCase);
  });

  it('lanza InvalidTokenError si el token no es válido', async () => {
    await expect(useCase.execute('bad-token')).rejects.toThrow(InvalidTokenError);
  });

  it('devuelve el usuario autenticado con token válido', async () => {
    tokenVerifier.addToken('valid-token', { sub: 'uid-1', email: 'user@example.com' });

    const result = await useCase.execute('valid-token');

    expect(result.id).toBe('uid-1');
    expect(result.email).toBe('user@example.com');
  });

  it('provisiona el usuario JIT: llama a upsertFromClaims con los claims correctos', async () => {
    tokenVerifier.addToken('tok', { sub: 'uid-2', email: 'nuevo@example.com' });

    await useCase.execute('tok');

    expect(appUsers.upsertCalls).toHaveLength(1);
    expect(appUsers.upsertCalls[0]!.id).toBe('uid-2');
    expect(appUsers.upsertCalls[0]!.email).toBe('nuevo@example.com');
  });

  it('deriva el displayName por defecto de la parte local del email', async () => {
    tokenVerifier.addToken('tok', { sub: 'uid-3', email: 'juana@casa.com' });

    await useCase.execute('tok');

    expect(appUsers.upsertCalls[0]!.defaultDisplayName).toBe('juana');
  });

  it('no pisa el displayName existente del usuario', async () => {
    appUsers.seed({ id: 'uid-4', email: 'pepe@casa.com', displayName: 'Pepe Personalizado' });
    tokenVerifier.addToken('tok', { sub: 'uid-4', email: 'pepe@casa.com' });

    const result = await useCase.execute('tok');

    expect(result.displayName).toBe('Pepe Personalizado');
  });

  it('token inválido propaga InvalidTokenError con el código correcto', async () => {
    let caught: unknown;
    try {
      await useCase.execute('fake');
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(InvalidTokenError);
    expect((caught as InvalidTokenError).code).toBe('INVALID_TOKEN');
  });
});
