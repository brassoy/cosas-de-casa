import { describe, it, expect, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { DeleteFamilyUseCase } from './delete-family.use-case';
import { FAMILY_REPOSITORY } from '../domain/ports/family.repository';
import { UNIT_OF_WORK } from './ports/unit-of-work';
import { Family } from '../domain/family';
import { FamilyNotFoundError } from '../domain/family.errors';
import type { FamilyRepository } from '../domain/ports/family.repository';
import type { UnitOfWork, TransactionalRepositories } from './ports/unit-of-work';

const NOW = new Date('2026-01-15T10:00:00.000Z');
const FAMILY_ID = 'fam-1';
const OWNER_ID = 'owner';

function makeFamily(): Family {
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
  public deletedFamilyIds: string[] = [];
  async run<T>(work: (repos: TransactionalRepositories) => Promise<T>): Promise<T> {
    const self = this;
    const repos: TransactionalRepositories = {
      families: {
        create: async () => {},
        findById: async () => null,
        findByIds: async () => [],
        findByMember: async () => [],
        update: async () => {},
        delete: async (id: string) => {
          self.deletedFamilyIds.push(id);
        },
      },
      memberships: {
        insert: async () => true,
        deleteById: async () => {},
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

describe('DeleteFamilyUseCase', () => {
  let useCase: DeleteFamilyUseCase;
  let familyRepo: FakeFamilyRepository;
  let uow: FakeUnitOfWork;

  beforeEach(async () => {
    familyRepo = new FakeFamilyRepository();
    uow = new FakeUnitOfWork();
    const module = await Test.createTestingModule({
      providers: [
        DeleteFamilyUseCase,
        { provide: FAMILY_REPOSITORY, useValue: familyRepo },
        { provide: UNIT_OF_WORK, useValue: uow },
      ],
    }).compile();
    useCase = module.get(DeleteFamilyUseCase);
  });

  it('lanza FamilyNotFoundError si la familia no existe', async () => {
    await expect(
      useCase.execute({ actingUserId: OWNER_ID, familyId: 'nope' }),
    ).rejects.toThrow(FamilyNotFoundError);
  });

  it('borra la familia por id', async () => {
    familyRepo.seed(makeFamily());
    await useCase.execute({ actingUserId: OWNER_ID, familyId: FAMILY_ID });
    expect(uow.deletedFamilyIds).toEqual([FAMILY_ID]);
  });
});
