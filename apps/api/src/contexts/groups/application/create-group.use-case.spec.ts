import { describe, it, expect, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { CreateGroupUseCase } from './create-group.use-case';
import { CLOCK } from '../../../contexts/family/application/ports/clock';
import { ID_GENERATOR } from '../../../contexts/family/application/ports/id-generator';
import { GROUP_UNIT_OF_WORK } from './ports/unit-of-work';
import { GroupRole } from '../domain/group-role';
import type { Group } from '../domain/group';
import type { GroupUnitOfWork, GroupTransactionalRepositories } from './ports/unit-of-work';
import type { Clock } from '../../../contexts/family/application/ports/clock';
import type { IdGenerator } from '../../../contexts/family/application/ports/id-generator';

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

class FakeGroupUnitOfWork implements GroupUnitOfWork {
  public createdGroups: Group[] = [];

  async run<T>(
    work: (repos: GroupTransactionalRepositories) => Promise<T>,
  ): Promise<T> {
    const fakeRepos: GroupTransactionalRepositories = {
      groups: {
        create: async (g: Group) => {
          this.createdGroups.push(g);
        },
        findById: async () => null,
        findByMember: async () => [],
      },
      groupMemberships: {
        insert: async () => true,
        deleteById: async () => {},
        listByGroup: async () => [],
      },
      groupJoinPins: {
        insert: async () => {},
        revokeActiveByGroup: async () => 0,
        consumeActiveByHash: async () => null,
      },
    };
    return work(fakeRepos);
  }
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe('CreateGroupUseCase', () => {
  let useCase: CreateGroupUseCase;
  let uow: FakeGroupUnitOfWork;

  beforeEach(async () => {
    uow = new FakeGroupUnitOfWork();

    const module = await Test.createTestingModule({
      providers: [
        CreateGroupUseCase,
        { provide: GROUP_UNIT_OF_WORK, useValue: uow },
        { provide: ID_GENERATOR, useValue: new FakeIdGenerator() },
        { provide: CLOCK, useValue: new FakeClock() },
      ],
    }).compile();

    useCase = module.get(CreateGroupUseCase);
  });

  it('devuelve la peña creada', async () => {
    const group = await useCase.execute({
      actingUserId: 'user-1',
      name: 'La Peña del Barrio',
    });
    expect(group.name).toBe('La Peña del Barrio');
    expect(group.createdBy).toBe('user-1');
  });

  it('el creador queda como OWNER', async () => {
    const group = await useCase.execute({
      actingUserId: 'user-1',
      name: 'Test',
    });
    expect(group.isOwner('user-1')).toBe(true);
    expect(group.membershipOf('user-1')?.role).toBe(GroupRole.OWNER);
  });

  it('se llama a uow.run y se persiste la peña', async () => {
    await useCase.execute({ actingUserId: 'u1', name: 'G' });
    expect(uow.createdGroups).toHaveLength(1);
    expect(uow.createdGroups[0]!.name).toBe('G');
  });

  it('usa el reloj fijo para createdAt', async () => {
    const group = await useCase.execute({ actingUserId: 'u1', name: 'G' });
    expect(group.createdAt).toEqual(FIXED_NOW);
  });
});
