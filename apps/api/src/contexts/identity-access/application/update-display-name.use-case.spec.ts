import { describe, it, expect, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { UpdateDisplayNameUseCase } from './update-display-name.use-case';
import { APP_USER_REPOSITORY } from '../domain/ports/app-user.repository';
import type {
  AppUserRepository,
  UpsertAppUserParams,
} from '../domain/ports/app-user.repository';
import type { AuthenticatedUser } from '../domain/authenticated-user';

// ─── fake ─────────────────────────────────────────────────────────────────────

class FakeAppUserRepository implements AppUserRepository {
  public updateCalls: Array<{ id: string; displayName: string }> = [];
  private users = new Map<string, AuthenticatedUser>();

  seed(user: AuthenticatedUser): void {
    this.users.set(user.id, user);
  }

  async upsertFromClaims(params: UpsertAppUserParams): Promise<AuthenticatedUser> {
    const user: AuthenticatedUser = {
      id: params.id,
      email: params.email,
      displayName: params.defaultDisplayName ?? null,
    };
    this.users.set(user.id, user);
    return user;
  }

  async findById(id: string): Promise<AuthenticatedUser | null> {
    return this.users.get(id) ?? null;
  }

  async updateDisplayName(id: string, displayName: string): Promise<AuthenticatedUser> {
    this.updateCalls.push({ id, displayName });
    const existing = this.users.get(id);
    const user: AuthenticatedUser = {
      id,
      email: existing?.email ?? 'unknown@example.com',
      displayName,
    };
    this.users.set(id, user);
    return user;
  }
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('UpdateDisplayNameUseCase', () => {
  let useCase: UpdateDisplayNameUseCase;
  let appUsers: FakeAppUserRepository;

  beforeEach(async () => {
    appUsers = new FakeAppUserRepository();

    const module = await Test.createTestingModule({
      providers: [
        UpdateDisplayNameUseCase,
        { provide: APP_USER_REPOSITORY, useValue: appUsers },
      ],
    }).compile();

    useCase = module.get(UpdateDisplayNameUseCase);
  });

  it('actualiza el display_name del usuario y devuelve el usuario resultante', async () => {
    appUsers.seed({ id: 'uid-1', email: 'pepe@casa.com', displayName: 'Pepe' });

    const result = await useCase.execute({ userId: 'uid-1', displayName: 'Pepito' });

    expect(result.displayName).toBe('Pepito');
    expect(result.id).toBe('uid-1');
  });

  it('PISA el display_name anterior (no es COALESCE)', async () => {
    appUsers.seed({ id: 'uid-2', email: 'ana@casa.com', displayName: 'Nombre Viejo' });

    const result = await useCase.execute({ userId: 'uid-2', displayName: 'Nombre Nuevo' });

    expect(result.displayName).toBe('Nombre Nuevo');
  });

  it('delega en el repositorio con el id y el nombre correctos', async () => {
    appUsers.seed({ id: 'uid-3', email: 'leo@casa.com', displayName: null });

    await useCase.execute({ userId: 'uid-3', displayName: 'Leo' });

    expect(appUsers.updateCalls).toHaveLength(1);
    expect(appUsers.updateCalls[0]).toEqual({ id: 'uid-3', displayName: 'Leo' });
  });
});
