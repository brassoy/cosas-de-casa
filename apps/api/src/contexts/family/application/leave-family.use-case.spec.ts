import { describe, it, expect, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { LeaveFamilyUseCase } from './leave-family.use-case';
import { FAMILY_REPOSITORY } from '../domain/ports/family.repository';
import { UNIT_OF_WORK } from './ports/unit-of-work';
import { Family } from '../domain/family';
import { Membership } from '../domain/membership';
import { MembershipRole } from '../domain/membership-role';
import {
  FamilyNotFoundError,
  LastOwnerError,
  NotAMemberError,
} from '../domain/family.errors';
import type { FamilyRepository } from '../domain/ports/family.repository';
import type { UnitOfWork, TransactionalRepositories } from './ports/unit-of-work';

// ─── fakes ──────────────────────────────────────────────────────────────────

const NOW = new Date('2026-01-15T10:00:00.000Z');
const FAMILY_ID = 'fam-1';
const OWNER_ID = 'owner';
const MEMBER_ID = 'member';

function makeFamilyWithOwnerAndMember(): Family {
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

function makeFamilyOwnerOnly(): Family {
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

  seed(family: Family): void {
    this.families.set(family.id, family);
  }

  async findById(id: string): Promise<Family | null> {
    return this.families.get(id) ?? null;
  }

  async findByMember(): Promise<Family[]> {
    return [];
  }

  async create(): Promise<void> {}
}

class FakeUnitOfWork implements UnitOfWork {
  public deletedMembershipIds: string[] = [];

  async run<T>(
    work: (repos: TransactionalRepositories) => Promise<T>,
  ): Promise<T> {
    const self = this;
    const fakeRepos: TransactionalRepositories = {
      families: {
        create: async () => {},
        findById: async () => null,
        findByMember: async () => [],
      },
      memberships: {
        insert: async () => true,
        deleteById: async (id: string) => {
          self.deletedMembershipIds.push(id);
        },
        listByFamily: async () => [],
      },
      joinPins: {
        insert: async () => {},
        revokeActiveByFamily: async () => 0,
        consumeActiveByHash: async () => null,
      },
    };
    return work(fakeRepos);
  }
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe('LeaveFamilyUseCase', () => {
  let useCase: LeaveFamilyUseCase;
  let familyRepo: FakeFamilyRepository;
  let uow: FakeUnitOfWork;

  beforeEach(async () => {
    familyRepo = new FakeFamilyRepository();
    uow = new FakeUnitOfWork();

    const module = await Test.createTestingModule({
      providers: [
        LeaveFamilyUseCase,
        { provide: FAMILY_REPOSITORY, useValue: familyRepo },
        { provide: UNIT_OF_WORK, useValue: uow },
      ],
    }).compile();

    useCase = module.get(LeaveFamilyUseCase);
  });

  it('lanza FamilyNotFoundError si la familia no existe', async () => {
    await expect(
      useCase.execute({ actingUserId: MEMBER_ID, familyId: 'non-existent' }),
    ).rejects.toThrow(FamilyNotFoundError);
  });

  it('lanza NotAMemberError si el usuario no pertenece a la familia', async () => {
    familyRepo.seed(makeFamilyOwnerOnly());
    await expect(
      useCase.execute({ actingUserId: 'stranger', familyId: FAMILY_ID }),
    ).rejects.toThrow(NotAMemberError);
  });

  it('protección del último OWNER: lanza LastOwnerError', async () => {
    familyRepo.seed(makeFamilyOwnerOnly());
    await expect(
      useCase.execute({ actingUserId: OWNER_ID, familyId: FAMILY_ID }),
    ).rejects.toThrow(LastOwnerError);
  });

  it('un MEMBER puede salir sin problema', async () => {
    familyRepo.seed(makeFamilyWithOwnerAndMember());
    await expect(
      useCase.execute({ actingUserId: MEMBER_ID, familyId: FAMILY_ID }),
    ).resolves.not.toThrow();
  });

  it('se invoca deleteById con el id de la membership eliminada', async () => {
    familyRepo.seed(makeFamilyWithOwnerAndMember());
    await useCase.execute({ actingUserId: MEMBER_ID, familyId: FAMILY_ID });

    expect(uow.deletedMembershipIds).toContain('mm-1');
  });

  it('con dos OWNERs el primero puede salir', async () => {
    const m1 = new Membership({
      id: 'mo1',
      familyId: FAMILY_ID,
      userId: OWNER_ID,
      role: MembershipRole.OWNER,
      joinedAt: NOW,
    });
    const m2 = new Membership({
      id: 'mo2',
      familyId: FAMILY_ID,
      userId: 'owner-2',
      role: MembershipRole.OWNER,
      joinedAt: NOW,
    });
    const family = new Family({
      id: FAMILY_ID,
      name: 'Dos Owners',
      description: null,
      imageUrl: null,
      createdBy: OWNER_ID,
      createdAt: NOW,
      updatedAt: NOW,
      memberships: [m1, m2],
    });
    familyRepo.seed(family);

    await expect(
      useCase.execute({ actingUserId: OWNER_ID, familyId: FAMILY_ID }),
    ).resolves.not.toThrow();
    expect(uow.deletedMembershipIds).toContain('mo1');
  });
});
