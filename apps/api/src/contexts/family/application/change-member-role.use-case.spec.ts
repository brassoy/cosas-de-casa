import { describe, it, expect, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { ChangeMemberRoleUseCase } from './change-member-role.use-case';
import { FAMILY_REPOSITORY } from '../domain/ports/family.repository';
import { UNIT_OF_WORK } from './ports/unit-of-work';
import { CLOCK } from './ports/clock';
import { Family } from '../domain/family';
import { Membership } from '../domain/membership';
import { MembershipRole } from '../domain/membership-role';
import {
  FamilyNotFoundError,
  LastOwnerError,
  NotAMemberError,
} from '../domain/family.errors';
import type { Clock } from './ports/clock';
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

function familyTwoOwners(): Family {
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
  return new Family({
    id: FAMILY_ID,
    name: 'Dos',
    description: null,
    imageUrl: null,
    createdBy: OWNER_ID,
    createdAt: NOW,
    updatedAt: NOW,
    memberships: [m1, m2],
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
  public roleUpdates: Array<{ id: string; role: string }> = [];
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
        deleteById: async () => {},
        updateRole: async (id: string, role: 'OWNER' | 'MEMBER') => {
          self.roleUpdates.push({ id, role });
        },
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

class FakeClock implements Clock {
  now(): Date {
    return NOW;
  }
}

describe('ChangeMemberRoleUseCase', () => {
  let useCase: ChangeMemberRoleUseCase;
  let familyRepo: FakeFamilyRepository;
  let uow: FakeUnitOfWork;

  beforeEach(async () => {
    familyRepo = new FakeFamilyRepository();
    uow = new FakeUnitOfWork();
    const module = await Test.createTestingModule({
      providers: [
        ChangeMemberRoleUseCase,
        { provide: FAMILY_REPOSITORY, useValue: familyRepo },
        { provide: UNIT_OF_WORK, useValue: uow },
        { provide: CLOCK, useValue: new FakeClock() },
      ],
    }).compile();
    useCase = module.get(ChangeMemberRoleUseCase);
  });

  it('lanza FamilyNotFoundError si la familia no existe', async () => {
    await expect(
      useCase.execute({ actingUserId: OWNER_ID, familyId: 'nope', targetUserId: MEMBER_ID, role: 'OWNER' }),
    ).rejects.toThrow(FamilyNotFoundError);
  });

  it('asciende un MEMBER a OWNER y persiste el cambio', async () => {
    familyRepo.seed(familyWithMember());
    await useCase.execute({ actingUserId: OWNER_ID, familyId: FAMILY_ID, targetUserId: MEMBER_ID, role: 'OWNER' });
    expect(uow.roleUpdates).toEqual([{ id: 'mm-1', role: 'OWNER' }]);
  });

  it('degrada un OWNER a MEMBER cuando hay otro OWNER', async () => {
    familyRepo.seed(familyTwoOwners());
    await useCase.execute({ actingUserId: OWNER_ID, familyId: FAMILY_ID, targetUserId: 'owner-2', role: 'MEMBER' });
    expect(uow.roleUpdates).toEqual([{ id: 'mo2', role: 'MEMBER' }]);
  });

  it('protección del último OWNER: degradar al único OWNER → LastOwnerError', async () => {
    familyRepo.seed(familyWithMember());
    await expect(
      useCase.execute({ actingUserId: OWNER_ID, familyId: FAMILY_ID, targetUserId: OWNER_ID, role: 'MEMBER' }),
    ).rejects.toThrow(LastOwnerError);
  });

  it('lanza NotAMemberError si el objetivo no pertenece', async () => {
    familyRepo.seed(familyOwnerOnly());
    await expect(
      useCase.execute({ actingUserId: OWNER_ID, familyId: FAMILY_ID, targetUserId: 'stranger', role: 'OWNER' }),
    ).rejects.toThrow(NotAMemberError);
  });

  it('idempotente: si el rol ya coincide igualmente persiste sin fallar', async () => {
    familyRepo.seed(familyWithMember());
    await expect(
      useCase.execute({ actingUserId: OWNER_ID, familyId: FAMILY_ID, targetUserId: MEMBER_ID, role: 'MEMBER' }),
    ).resolves.not.toThrow();
    // el cambio es no-op a nivel rol, pero updateRole se llama con el rol vigente
    expect(uow.roleUpdates).toEqual([{ id: 'mm-1', role: 'MEMBER' }]);
  });
});
