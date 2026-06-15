import { describe, it, expect, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { CreateFamilyUseCase } from './create-family.use-case';
import { CLOCK } from './ports/clock';
import { ID_GENERATOR } from './ports/id-generator';
import { UNIT_OF_WORK } from './ports/unit-of-work';
import { MembershipRole } from '../domain/membership-role';
import type { Family } from '../domain/family';
import type { UnitOfWork, TransactionalRepositories } from './ports/unit-of-work';
import type { Clock } from './ports/clock';
import type { IdGenerator } from './ports/id-generator';

// ─── fakes ──────────────────────────────────────────────────────────────────

const FIXED_NOW = new Date('2026-01-15T10:00:00.000Z');

class FakeClock implements Clock {
  now(): Date {
    return FIXED_NOW;
  }
}

class FakeIdGenerator implements IdGenerator {
  private counter = 0;
  generate(): string {
    return `id-${++this.counter}`;
  }
}

class FakeUnitOfWork implements UnitOfWork {
  public createdFamilies: Family[] = [];

  async run<T>(
    work: (repos: TransactionalRepositories) => Promise<T>,
  ): Promise<T> {
    const fakeRepos: TransactionalRepositories = {
      families: {
        create: async (f: Family) => {
          this.createdFamilies.push(f);
        },
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
        revokeActiveByFamily: async () => 0,
        consumeActiveByHash: async () => null,
      },
    };
    return work(fakeRepos);
  }
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe('CreateFamilyUseCase', () => {
  let useCase: CreateFamilyUseCase;
  let uow: FakeUnitOfWork;
  let ids: FakeIdGenerator;

  beforeEach(async () => {
    uow = new FakeUnitOfWork();
    ids = new FakeIdGenerator();

    const module = await Test.createTestingModule({
      providers: [
        CreateFamilyUseCase,
        { provide: UNIT_OF_WORK, useValue: uow },
        { provide: ID_GENERATOR, useValue: ids },
        { provide: CLOCK, useValue: new FakeClock() },
      ],
    }).compile();

    useCase = module.get(CreateFamilyUseCase);
  });

  it('devuelve la familia creada', async () => {
    const family = await useCase.execute({
      actingUserId: 'user-1',
      name: 'Mi Familia',
    });
    expect(family.name).toBe('Mi Familia');
    expect(family.createdBy).toBe('user-1');
  });

  it('el creador queda como OWNER', async () => {
    const family = await useCase.execute({
      actingUserId: 'user-1',
      name: 'F',
    });
    expect(family.isOwner('user-1')).toBe(true);
    expect(family.membershipOf('user-1')?.role).toBe(MembershipRole.OWNER);
  });

  it('se llama a uow.run y se persiste la familia', async () => {
    await useCase.execute({ actingUserId: 'u1', name: 'F' });
    expect(uow.createdFamilies).toHaveLength(1);
    expect(uow.createdFamilies[0]!.name).toBe('F');
  });

  it('usa el reloj fijo para createdAt', async () => {
    const family = await useCase.execute({ actingUserId: 'u1', name: 'F' });
    expect(family.createdAt).toEqual(FIXED_NOW);
  });

  it('genera IDs no vacíos para familia y membership', async () => {
    const family = await useCase.execute({ actingUserId: 'u1', name: 'F' });
    expect(family.id).toBeTruthy();
    expect(family.membershipOf('u1')?.id).toBeTruthy();
  });
});
