import { describe, it, expect, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { UpdateDisplayNameUseCase } from './update-display-name.use-case';
import { APP_USER_REPOSITORY } from '../domain/ports/app-user.repository';
import type {
  AppUserRepository,
  UpdateProfileParams,
  UpsertAppUserParams,
} from '../domain/ports/app-user.repository';
import type { AuthenticatedUser } from '../domain/authenticated-user';

// ─── fake ─────────────────────────────────────────────────────────────────────

class FakeAppUserRepository implements AppUserRepository {
  public updateCalls: Array<{ id: string; params: UpdateProfileParams }> = [];
  private users = new Map<string, AuthenticatedUser>();

  seed(user: AuthenticatedUser): void {
    this.users.set(user.id, user);
  }

  async upsertFromClaims(params: UpsertAppUserParams): Promise<AuthenticatedUser> {
    const user: AuthenticatedUser = {
      id: params.id,
      email: params.email,
      displayName: params.defaultDisplayName ?? null,
      avatarUrl: null,
    };
    this.users.set(user.id, user);
    return user;
  }

  async findById(id: string): Promise<AuthenticatedUser | null> {
    return this.users.get(id) ?? null;
  }

  async updateProfile(id: string, params: UpdateProfileParams): Promise<AuthenticatedUser> {
    this.updateCalls.push({ id, params });
    const existing = this.users.get(id);
    // Solo se pisan los campos presentes (undefined = no tocar); avatarUrl: null
    // BORRA el avatar, igual que el repo Drizzle real.
    const user: AuthenticatedUser = {
      id,
      email: existing?.email ?? 'unknown@example.com',
      displayName:
        params.displayName !== undefined ? params.displayName : existing?.displayName ?? null,
      avatarUrl: params.avatarUrl !== undefined ? params.avatarUrl : existing?.avatarUrl ?? null,
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
    appUsers.seed({ id: 'uid-1', email: 'pepe@casa.com', displayName: 'Pepe', avatarUrl: null });

    const result = await useCase.execute({ userId: 'uid-1', displayName: 'Pepito' });

    expect(result.displayName).toBe('Pepito');
    expect(result.id).toBe('uid-1');
  });

  it('PISA el display_name anterior (no es COALESCE)', async () => {
    appUsers.seed({ id: 'uid-2', email: 'ana@casa.com', displayName: 'Nombre Viejo', avatarUrl: null });

    const result = await useCase.execute({ userId: 'uid-2', displayName: 'Nombre Nuevo' });

    expect(result.displayName).toBe('Nombre Nuevo');
  });

  it('delega en el repositorio con el id y el nombre correctos', async () => {
    appUsers.seed({ id: 'uid-3', email: 'leo@casa.com', displayName: null, avatarUrl: null });

    await useCase.execute({ userId: 'uid-3', displayName: 'Leo' });

    expect(appUsers.updateCalls).toHaveLength(1);
    expect(appUsers.updateCalls[0]).toEqual({ id: 'uid-3', params: { displayName: 'Leo', avatarUrl: undefined } });
  });

  it('actualiza el avatar_url cuando viene en el comando (sin tocar el nombre)', async () => {
    appUsers.seed({ id: 'uid-5', email: 'mar@casa.com', displayName: 'Mar', avatarUrl: null });

    const result = await useCase.execute({
      userId: 'uid-5',
      avatarUrl: 'https://cdn.test/avatars/uid-5/foto.webp',
    });

    expect(result.avatarUrl).toBe('https://cdn.test/avatars/uid-5/foto.webp');
    // El nombre no se toca cuando no viene en el comando.
    expect(result.displayName).toBe('Mar');
  });

  it('BORRA el avatar cuando avatarUrl es null (no es COALESCE)', async () => {
    appUsers.seed({
      id: 'uid-6',
      email: 'sol@casa.com',
      displayName: 'Sol',
      avatarUrl: 'https://cdn.test/avatars/uid-6/vieja.webp',
    });

    const result = await useCase.execute({ userId: 'uid-6', avatarUrl: null });

    expect(result.avatarUrl).toBeNull();
    expect(result.displayName).toBe('Sol');
  });
});
