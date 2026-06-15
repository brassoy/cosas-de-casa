import { describe, it, expect, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { RevokeActivePinUseCase } from './revoke-active-pin.use-case';
import { FAMILY_REPOSITORY } from '../domain/ports/family.repository';
import { CLOCK } from './ports/clock';
import { UNIT_OF_WORK } from './ports/unit-of-work';
import { Family } from '../domain/family';
import { FamilyNotFoundError, NotAnOwnerError } from '../domain/family.errors';
import type { FamilyRepository } from '../domain/ports/family.repository';
import type { UnitOfWork, TransactionalRepositories } from './ports/unit-of-work';
import type { Clock } from './ports/clock';

// ─── fakes ──────────────────────────────────────────────────────────────────

const FIXED_NOW = new Date('2026-01-15T10:00:00.000Z');
const FAMILY_ID = 'fam-1';
const OWNER_ID = 'owner';
const MEMBER_ID = 'member';

class FakeFamilyRepository implements FamilyRepository {
  private families = new Map<string, Family>();

  seed(family: Family): void {
    this.families.set(family.id, family);
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
}

class FakeClock implements Clock {
  now(): Date {
    return FIXED_NOW;
  }
}

class FakeUnitOfWork implements UnitOfWork {
  public revokedCount = 0;
  public revokedForFamily: string[] = [];

  constructor(private readonly countToReturn: number = 1) {}

  async run<T>(
    work: (repos: TransactionalRepositories) => Promise<T>,
  ): Promise<T> {
    const self = this;
    const fakeRepos: TransactionalRepositories = {
      families: {
        create: async () => {},
        findById: async () => null,
        findByIds: async () => [],
        findByMember: async () => [],
      },
      memberships: {
        insert: async () => true,
        deleteById: async () => {},
        listByFamily: async () => [],
      },
      joinPins: {
        insert: async () => {},
        revokeActiveByFamily: async (familyId: string) => {
          self.revokedForFamily.push(familyId);
          return self.countToReturn;
        },
        consumeActiveByHash: async () => null,
      },
    };
    return work(fakeRepos);
  }
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe('RevokeActivePinUseCase', () => {
  let useCase: RevokeActivePinUseCase;
  let familyRepo: FakeFamilyRepository;
  let uow: FakeUnitOfWork;

  async function build(countToReturn = 1) {
    familyRepo = new FakeFamilyRepository();
    uow = new FakeUnitOfWork(countToReturn);

    const module = await Test.createTestingModule({
      providers: [
        RevokeActivePinUseCase,
        { provide: FAMILY_REPOSITORY, useValue: familyRepo },
        { provide: UNIT_OF_WORK, useValue: uow },
        { provide: CLOCK, useValue: new FakeClock() },
      ],
    }).compile();

    useCase = module.get(RevokeActivePinUseCase);
  }

  beforeEach(() => build());

  it('lanza FamilyNotFoundError si la familia no existe', async () => {
    await expect(
      useCase.execute({ actingUserId: OWNER_ID, familyId: 'non-existent' }),
    ).rejects.toThrow(FamilyNotFoundError);
  });

  it('lanza NotAnOwnerError si el usuario no es OWNER', async () => {
    const family = Family.create({
      id: FAMILY_ID,
      name: 'F',
      ownerUserId: OWNER_ID,
      ownerMembershipId: 'mo',
      now: FIXED_NOW,
    });
    family.addMember({ membershipId: 'mm', userId: MEMBER_ID, now: FIXED_NOW });
    familyRepo.seed(family);

    await expect(
      useCase.execute({ actingUserId: MEMBER_ID, familyId: FAMILY_ID }),
    ).rejects.toThrow(NotAnOwnerError);
  });

  it('devuelve revoked:1 cuando había un PIN activo', async () => {
    familyRepo.seed(
      Family.create({ id: FAMILY_ID, name: 'F', ownerUserId: OWNER_ID, ownerMembershipId: 'mo', now: FIXED_NOW }),
    );
    const result = await useCase.execute({ actingUserId: OWNER_ID, familyId: FAMILY_ID });
    expect(result.revoked).toBe(1);
  });

  it('devuelve revoked:0 (idempotente) cuando no había PIN activo', async () => {
    await build(0);
    familyRepo.seed(
      Family.create({ id: FAMILY_ID, name: 'F', ownerUserId: OWNER_ID, ownerMembershipId: 'mo', now: FIXED_NOW }),
    );
    const result = await useCase.execute({ actingUserId: OWNER_ID, familyId: FAMILY_ID });
    expect(result.revoked).toBe(0);
  });

  it('llama a revokeActiveByFamily con el familyId correcto', async () => {
    familyRepo.seed(
      Family.create({ id: FAMILY_ID, name: 'F', ownerUserId: OWNER_ID, ownerMembershipId: 'mo', now: FIXED_NOW }),
    );
    await useCase.execute({ actingUserId: OWNER_ID, familyId: FAMILY_ID });
    expect(uow.revokedForFamily).toContain(FAMILY_ID);
  });
});
