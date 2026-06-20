import { describe, it, expect, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { DeleteAccountUseCase } from './delete-account.use-case';
import { ACCOUNT_DELETION_REPOSITORY } from '../domain/ports/account-deletion.repository';
import type {
  AccountDeletionRepository,
  CreatedFamilySummary,
  CreatedGroupSummary,
} from '../domain/ports/account-deletion.repository';
import { AUTH_USER_ADMIN } from '../domain/ports/auth-user-admin.port';
import type { AuthUserAdmin } from '../domain/ports/auth-user-admin.port';

// ─── fakes ──────────────────────────────────────────────────────────────────

class FakeAccountDeletionRepository implements AccountDeletionRepository {
  public reassignCalls: Array<{ familyId: string; newCreatorId: string }> = [];
  public deleteFamilyCalls: string[] = [];
  public reassignGroupCalls: Array<{ groupId: string; newCreatorId: string }> = [];
  public deleteGroupCalls: string[] = [];
  public deleteJoinPinsCalls: string[] = [];
  public deleteGroupJoinPinsCalls: string[] = [];
  public deleteFriendInvitePinsCalls: string[] = [];
  public deletePlanMessagesCalls: string[] = [];
  public deletePlansCalls: string[] = [];
  public deleteReceiptsCalls: string[] = [];
  public deleteAppUserCalls: string[] = [];

  constructor(
    private readonly createdFamilies: CreatedFamilySummary[] = [],
    private readonly createdGroups: CreatedGroupSummary[] = [],
  ) {}

  async findFamiliesCreatedBy(_userId: string): Promise<CreatedFamilySummary[]> {
    return this.createdFamilies;
  }

  async reassignFamilyCreator(familyId: string, newCreatorId: string): Promise<void> {
    this.reassignCalls.push({ familyId, newCreatorId });
  }

  async deleteFamily(familyId: string): Promise<void> {
    this.deleteFamilyCalls.push(familyId);
  }

  async deleteJoinPinsCreatedBy(userId: string): Promise<void> {
    this.deleteJoinPinsCalls.push(userId);
  }

  async findGroupsCreatedBy(_userId: string): Promise<CreatedGroupSummary[]> {
    return this.createdGroups;
  }

  async reassignGroupCreator(groupId: string, newCreatorId: string): Promise<void> {
    this.reassignGroupCalls.push({ groupId, newCreatorId });
  }

  async deleteGroup(groupId: string): Promise<void> {
    this.deleteGroupCalls.push(groupId);
  }

  async deleteGroupJoinPinsCreatedBy(userId: string): Promise<void> {
    this.deleteGroupJoinPinsCalls.push(userId);
  }

  async deleteFriendInvitePinsCreatedBy(userId: string): Promise<void> {
    this.deleteFriendInvitePinsCalls.push(userId);
  }

  async deletePlanMessagesByUser(userId: string): Promise<void> {
    this.deletePlanMessagesCalls.push(userId);
  }

  async deletePlansCreatedBy(userId: string): Promise<void> {
    this.deletePlansCalls.push(userId);
  }

  async deleteReceiptsCreatedBy(userId: string): Promise<void> {
    this.deleteReceiptsCalls.push(userId);
  }

  async deleteAppUser(userId: string): Promise<void> {
    this.deleteAppUserCalls.push(userId);
  }
}

class SpyAuthUserAdmin implements AuthUserAdmin {
  public deleteCalls: string[] = [];
  async deleteAuthUser(userId: string): Promise<void> {
    this.deleteCalls.push(userId);
  }
}

async function buildUseCase(
  repo: FakeAccountDeletionRepository,
  admin: AuthUserAdmin,
): Promise<DeleteAccountUseCase> {
  const module = await Test.createTestingModule({
    providers: [
      DeleteAccountUseCase,
      { provide: ACCOUNT_DELETION_REPOSITORY, useValue: repo },
      { provide: AUTH_USER_ADMIN, useValue: admin },
    ],
  }).compile();
  return module.get(DeleteAccountUseCase);
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe('DeleteAccountUseCase', () => {
  let admin: SpyAuthUserAdmin;

  beforeEach(() => {
    admin = new SpyAuthUserAdmin();
  });

  it('REASIGNA created_by a otro OWNER cuando la familia tiene más miembros', async () => {
    const repo = new FakeAccountDeletionRepository([
      {
        familyId: 'fam-1',
        otherMembers: [
          { userId: 'member-no-owner', isOwner: false },
          { userId: 'other-owner', isOwner: true },
        ],
      },
    ]);
    const useCase = await buildUseCase(repo, admin);

    await useCase.execute({ userId: 'uid-1' });

    // Prefiere el OWNER aunque no sea el primero de la lista.
    expect(repo.reassignCalls).toEqual([{ familyId: 'fam-1', newCreatorId: 'other-owner' }]);
    expect(repo.deleteFamilyCalls).toEqual([]);
  });

  it('REASIGNA a cualquier otro miembro cuando no hay otro OWNER', async () => {
    const repo = new FakeAccountDeletionRepository([
      {
        familyId: 'fam-2',
        otherMembers: [{ userId: 'solo-member', isOwner: false }],
      },
    ]);
    const useCase = await buildUseCase(repo, admin);

    await useCase.execute({ userId: 'uid-2' });

    expect(repo.reassignCalls).toEqual([{ familyId: 'fam-2', newCreatorId: 'solo-member' }]);
    expect(repo.deleteFamilyCalls).toEqual([]);
  });

  it('BORRA la familia cuando el usuario era el único miembro', async () => {
    const repo = new FakeAccountDeletionRepository([
      { familyId: 'fam-solo', otherMembers: [] },
    ]);
    const useCase = await buildUseCase(repo, admin);

    await useCase.execute({ userId: 'uid-3' });

    expect(repo.deleteFamilyCalls).toEqual(['fam-solo']);
    expect(repo.reassignCalls).toEqual([]);
  });

  it('mezcla familias: reasigna las que sobreviven y borra las que están en solitario', async () => {
    const repo = new FakeAccountDeletionRepository([
      { familyId: 'fam-survive', otherMembers: [{ userId: 'heredera', isOwner: true }] },
      { familyId: 'fam-solo', otherMembers: [] },
    ]);
    const useCase = await buildUseCase(repo, admin);

    await useCase.execute({ userId: 'uid-4' });

    expect(repo.reassignCalls).toEqual([
      { familyId: 'fam-survive', newCreatorId: 'heredera' },
    ]);
    expect(repo.deleteFamilyCalls).toEqual(['fam-solo']);
  });

  it('PEÑAS: reasigna las que sobreviven y borra las que están en solitario', async () => {
    const repo = new FakeAccountDeletionRepository(
      [],
      [
        { groupId: 'grp-survive', otherMembers: [{ userId: 'heredero', isOwner: true }] },
        { groupId: 'grp-solo', otherMembers: [] },
      ],
    );
    const useCase = await buildUseCase(repo, admin);

    await useCase.execute({ userId: 'uid-grp' });

    expect(repo.reassignGroupCalls).toEqual([
      { groupId: 'grp-survive', newCreatorId: 'heredero' },
    ]);
    expect(repo.deleteGroupCalls).toEqual(['grp-solo']);
  });

  it('BORRA todo lo que apunta al usuario por RESTRICT (pins, mensajes, planes, recibos) y el app_user', async () => {
    const repo = new FakeAccountDeletionRepository([]);
    const useCase = await buildUseCase(repo, admin);

    await useCase.execute({ userId: 'uid-5' });

    expect(repo.deleteJoinPinsCalls).toEqual(['uid-5']);
    expect(repo.deleteGroupJoinPinsCalls).toEqual(['uid-5']);
    expect(repo.deleteFriendInvitePinsCalls).toEqual(['uid-5']);
    expect(repo.deletePlanMessagesCalls).toEqual(['uid-5']);
    expect(repo.deletePlansCalls).toEqual(['uid-5']);
    expect(repo.deleteReceiptsCalls).toEqual(['uid-5']);
    expect(repo.deleteAppUserCalls).toEqual(['uid-5']);
  });

  it('borra los mensajes del usuario ANTES que sus planes (evita el RESTRICT de plan_messages)', async () => {
    const repo = new FakeAccountDeletionRepository([]);
    const order: string[] = [];
    repo.deletePlanMessagesByUser = async (userId: string) => {
      order.push(`messages:${userId}`);
    };
    repo.deletePlansCreatedBy = async (userId: string) => {
      order.push(`plans:${userId}`);
    };
    const useCase = await buildUseCase(repo, admin);

    await useCase.execute({ userId: 'uid-order' });

    expect(order).toEqual(['messages:uid-order', 'plans:uid-order']);
  });

  it('llama a deleteAuthUser (borrado en el proveedor de Auth) cuando hay service-role', async () => {
    const repo = new FakeAccountDeletionRepository([]);
    const useCase = await buildUseCase(repo, admin);

    await useCase.execute({ userId: 'uid-6' });

    expect(admin.deleteCalls).toEqual(['uid-6']);
  });

  it('completa la baja de DATOS aunque NO haya service-role (auth admin no-op)', async () => {
    const repo = new FakeAccountDeletionRepository([
      { familyId: 'fam-solo', otherMembers: [] },
    ]);
    // No-op: simula el adaptador sin service-role (no registra llamadas reales,
    // pero no debe romper la baja de datos).
    const noop: AuthUserAdmin = { deleteAuthUser: async () => undefined };
    const useCase = await buildUseCase(repo, noop);

    await useCase.execute({ userId: 'uid-7' });

    // La baja de datos se completó pese a no borrar nada en el proveedor.
    expect(repo.deleteFamilyCalls).toEqual(['fam-solo']);
    expect(repo.deleteJoinPinsCalls).toEqual(['uid-7']);
    expect(repo.deleteAppUserCalls).toEqual(['uid-7']);
  });
});
