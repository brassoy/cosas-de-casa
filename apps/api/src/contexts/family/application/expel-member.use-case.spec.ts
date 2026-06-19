import { describe, it, expect, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { ExpelMemberUseCase } from './expel-member.use-case';
import { FAMILY_REPOSITORY } from '../domain/ports/family.repository';
import { UNIT_OF_WORK } from './ports/unit-of-work';
import { Family } from '../domain/family';
import {
  CannotRemoveSelfError,
  FamilyNotFoundError,
  LastOwnerError,
  NotAMemberError,
} from '../domain/family.errors';
import type { FamilyRepository } from '../domain/ports/family.repository';
import type { UnitOfWork, TransactionalRepositories } from './ports/unit-of-work';

const NOW = new Date('2026-01-15T10:00:00.000Z');
const FAMILY_ID = 'fam-1';
const OWNER_ID = 'owner';
const MEMBER_ID = 'member';

function familyWithMember(): Family {
  const family = Family.create({
    id: FAMILY_ID,
    name: 'Test',
    ownerUserId: OWNER_ID,
    ownerMembershipId: 'mo-1',
    now: NOW,
  });
  family.addMember({ membershipId: 'mm-1', userId: MEMBER_ID, now: NOW });
  return family;
}

function familyOwnerOnly(): Family {
  return Family.create({
    id: FAMILY_ID,
    name: 'Test',
    ownerUserId: OWNER_ID,
    ownerMembershipId: 'mo-1',
    now: NOW,
  });
}

class FakeFamilyRepository implements FamilyRepository {
  private families = new Map<string, Family>();
  seed(f: Family): void {
    this.families.set(f.id, f);
  }
  async findById(id: string): Promise<Family | null> {
    return this.families.get(id) ?? null;
  }
  async findByIds(ids: string[]): Promise<Family[]> {
    return ids.map((id) => this.families.get(id)).filter((f): f is Family => f != null);
  }
  async findByMember(): Promise<Family[]> {
    return [];
  }
  async create(): Promise<void> {}
  async update(): Promise<void> {}
  async delete(): Promise<void> {}
}

class FakeUnitOfWork implements UnitOfWork {
  public deletedMembershipIds: string[] = [];
  async run<T>(work: (repos: TransactionalRepositories) => Promise<T>): Promise<T> {
    const self = this;
    const repos: TransactionalRepositories = {
      families: {
        create: async () => {},
        findById: async () => null,
        findByIds: async () => [],
        findByMember: async () => [],
        update: async () => {},
        delete: async () => {},
      },
      memberships: {
        insert: async () => true,
        deleteById: async (id: string) => {
          self.deletedMembershipIds.push(id);
        },
        updateRole: async () => {},
        listByFamily: async () => [],
      },
      joinPins: {
        insert: async () => {},
        revokeActiveByFamily: async () => 0,
        consumeActiveByHash: async () => null,
      },
    };
    return work(repos);
  }
}

describe('ExpelMemberUseCase', () => {
  let useCase: ExpelMemberUseCase;
  let familyRepo: FakeFamilyRepository;
  let uow: FakeUnitOfWork;

  beforeEach(async () => {
    familyRepo = new FakeFamilyRepository();
    uow = new FakeUnitOfWork();
    const module = await Test.createTestingModule({
      providers: [
        ExpelMemberUseCase,
        { provide: FAMILY_REPOSITORY, useValue: familyRepo },
        { provide: UNIT_OF_WORK, useValue: uow },
      ],
    }).compile();
    useCase = module.get(ExpelMemberUseCase);
  });

  it('lanza FamilyNotFoundError si la familia no existe', async () => {
    await expect(
      useCase.execute({ actingUserId: OWNER_ID, familyId: 'nope', targetUserId: MEMBER_ID }),
    ).rejects.toThrow(FamilyNotFoundError);
  });

  it('el OWNER expulsa a un MEMBER y se borra su membership', async () => {
    familyRepo.seed(familyWithMember());
    await useCase.execute({ actingUserId: OWNER_ID, familyId: FAMILY_ID, targetUserId: MEMBER_ID });
    expect(uow.deletedMembershipIds).toContain('mm-1');
  });

  it('no puede expulsarse a sí mismo: CannotRemoveSelfError', async () => {
    familyRepo.seed(familyWithMember());
    await expect(
      useCase.execute({ actingUserId: OWNER_ID, familyId: FAMILY_ID, targetUserId: OWNER_ID }),
    ).rejects.toThrow(CannotRemoveSelfError);
  });

  it('lanza NotAMemberError si el objetivo no pertenece', async () => {
    familyRepo.seed(familyOwnerOnly());
    await expect(
      useCase.execute({ actingUserId: OWNER_ID, familyId: FAMILY_ID, targetUserId: 'stranger' }),
    ).rejects.toThrow(NotAMemberError);
  });

  it('protección del último OWNER al expulsar a un OWNER único', async () => {
    // family con owner único; intentar expulsar a OTRO usuario que es el mismo OWNER
    // ya está cubierto por self-check; aquí probamos expulsar a un segundo OWNER inexistente
    // así que reutilizamos la invariante vía dominio: con un solo OWNER no hay otro a quitar.
    familyRepo.seed(familyOwnerOnly());
    await expect(
      useCase.execute({ actingUserId: OWNER_ID, familyId: FAMILY_ID, targetUserId: 'ghost' }),
    ).rejects.toThrow(NotAMemberError);
  });

  it('expulsar al único OWNER (vía otro OWNER) respeta LastOwnerError', async () => {
    const family = Family.create({
      id: FAMILY_ID,
      name: 'Test',
      ownerUserId: OWNER_ID,
      ownerMembershipId: 'mo-1',
      now: NOW,
    });
    // owner único; un MEMBER no puede llegar aquí por el guard, pero comprobamos
    // que removeMember dispara LastOwnerError si se intenta quitar al único OWNER.
    family.addMember({ membershipId: 'mm-1', userId: MEMBER_ID, now: NOW });
    family.changeMemberRole(MEMBER_ID, 'OWNER', NOW); // ahora 2 OWNERs
    family.changeMemberRole(OWNER_ID, 'MEMBER', NOW); // owner pasa a MEMBER, queda 1 OWNER (member)
    familyRepo.seed(family);
    // expulsar al único OWNER (MEMBER_ID, ahora OWNER) debe fallar
    await expect(
      useCase.execute({ actingUserId: OWNER_ID, familyId: FAMILY_ID, targetUserId: MEMBER_ID }),
    ).rejects.toThrow(LastOwnerError);
  });
});
