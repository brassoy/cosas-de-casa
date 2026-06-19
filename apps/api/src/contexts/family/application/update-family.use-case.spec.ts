import { describe, it, expect, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { UpdateFamilyUseCase } from './update-family.use-case';
import { FAMILY_REPOSITORY } from '../domain/ports/family.repository';
import { UNIT_OF_WORK } from './ports/unit-of-work';
import { CLOCK } from './ports/clock';
import { Family } from '../domain/family';
import { FamilyNotFoundError } from '../domain/family.errors';
import type { Clock } from './ports/clock';
import type { FamilyRepository } from '../domain/ports/family.repository';
import type { UnitOfWork, TransactionalRepositories } from './ports/unit-of-work';

const NOW = new Date('2026-01-15T10:00:00.000Z');
const LATER = new Date('2026-05-01T00:00:00.000Z');
const FAMILY_ID = 'fam-1';
const OWNER_ID = 'owner';

function makeFamily(): Family {
  return Family.create({
    id: FAMILY_ID,
    name: 'Original',
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
  public updated: Family[] = [];
  async run<T>(work: (repos: TransactionalRepositories) => Promise<T>): Promise<T> {
    const self = this;
    const repos: TransactionalRepositories = {
      families: {
        create: async () => {},
        findById: async () => null,
        findByIds: async () => [],
        findByMember: async () => [],
        update: async (f: Family) => {
          self.updated.push(f);
        },
        delete: async () => {},
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

class FakeClock implements Clock {
  now(): Date {
    return LATER;
  }
}

describe('UpdateFamilyUseCase', () => {
  let useCase: UpdateFamilyUseCase;
  let familyRepo: FakeFamilyRepository;
  let uow: FakeUnitOfWork;

  beforeEach(async () => {
    familyRepo = new FakeFamilyRepository();
    uow = new FakeUnitOfWork();
    const module = await Test.createTestingModule({
      providers: [
        UpdateFamilyUseCase,
        { provide: FAMILY_REPOSITORY, useValue: familyRepo },
        { provide: UNIT_OF_WORK, useValue: uow },
        { provide: CLOCK, useValue: new FakeClock() },
      ],
    }).compile();
    useCase = module.get(UpdateFamilyUseCase);
  });

  it('lanza FamilyNotFoundError si la familia no existe', async () => {
    await expect(
      useCase.execute({ actingUserId: OWNER_ID, familyId: 'nope', name: 'X' }),
    ).rejects.toThrow(FamilyNotFoundError);
  });

  it('actualiza el nombre y refresca updatedAt', async () => {
    familyRepo.seed(makeFamily());
    const result = await useCase.execute({
      actingUserId: OWNER_ID,
      familyId: FAMILY_ID,
      name: 'Renombrada',
    });
    expect(result.name).toBe('Renombrada');
    expect(result.updatedAt).toEqual(LATER);
    expect(uow.updated).toHaveLength(1);
    expect(uow.updated[0].name).toBe('Renombrada');
  });

  it('actualiza solo la descripción si no se pasa nombre', async () => {
    familyRepo.seed(makeFamily());
    const result = await useCase.execute({
      actingUserId: OWNER_ID,
      familyId: FAMILY_ID,
      description: 'Nueva desc',
    });
    expect(result.name).toBe('Original');
    expect(result.description).toBe('Nueva desc');
  });

  it('una descripción vacía deja la descripción a null', async () => {
    familyRepo.seed(makeFamily());
    const result = await useCase.execute({
      actingUserId: OWNER_ID,
      familyId: FAMILY_ID,
      description: '',
    });
    expect(result.description).toBeNull();
  });
});
