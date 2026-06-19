import { describe, it, expect, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { UpdateGroupUseCase } from './update-group.use-case';
import { GROUP_REPOSITORY } from '../domain/ports/group.repository';
import { GROUP_UNIT_OF_WORK } from './ports/unit-of-work';
import { CLOCK } from '../../family/application/ports/clock';
import { Group } from '../domain/group';
import { GroupNotFoundError } from '../domain/group.errors';
import type { Clock } from '../../family/application/ports/clock';
import type { GroupRepository } from '../domain/ports/group.repository';
import type { GroupUnitOfWork, GroupTransactionalRepositories } from './ports/unit-of-work';

const NOW = new Date('2026-01-15T10:00:00.000Z');
const LATER = new Date('2026-05-01T00:00:00.000Z');
const GROUP_ID = 'group-1';
const OWNER_ID = 'owner';

function makeGroup(): Group {
  return Group.create({
    id: GROUP_ID,
    name: 'Original',
    ownerUserId: OWNER_ID,
    ownerMembershipId: 'mo-1',
    now: NOW,
  });
}

class FakeGroupRepository implements GroupRepository {
  private groupsMap = new Map<string, Group>();
  seed(g: Group): void {
    this.groupsMap.set(g.id, g);
  }
  async findById(id: string): Promise<Group | null> {
    return this.groupsMap.get(id) ?? null;
  }
  async findByMember(): Promise<Group[]> {
    return [];
  }
  async create(): Promise<void> {}
  async update(): Promise<void> {}
  async delete(): Promise<void> {}
}

class FakeGroupUnitOfWork implements GroupUnitOfWork {
  public updated: Group[] = [];
  async run<T>(work: (repos: GroupTransactionalRepositories) => Promise<T>): Promise<T> {
    const self = this;
    const repos: GroupTransactionalRepositories = {
      groups: {
        create: async () => {},
        findById: async () => null,
        findByMember: async () => [],
        update: async (g: Group) => {
          self.updated.push(g);
        },
        delete: async () => {},
      },
      groupMemberships: {
        insert: async () => true,
        deleteById: async () => {},
        updateRole: async () => {},
        listByGroup: async () => [],
      },
      groupJoinPins: {
        insert: async () => {},
        revokeActiveByGroup: async () => 0,
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

describe('UpdateGroupUseCase', () => {
  let useCase: UpdateGroupUseCase;
  let groupRepo: FakeGroupRepository;
  let uow: FakeGroupUnitOfWork;

  beforeEach(async () => {
    groupRepo = new FakeGroupRepository();
    uow = new FakeGroupUnitOfWork();
    const module = await Test.createTestingModule({
      providers: [
        UpdateGroupUseCase,
        { provide: GROUP_REPOSITORY, useValue: groupRepo },
        { provide: GROUP_UNIT_OF_WORK, useValue: uow },
        { provide: CLOCK, useValue: new FakeClock() },
      ],
    }).compile();
    useCase = module.get(UpdateGroupUseCase);
  });

  it('lanza GroupNotFoundError si la peña no existe', async () => {
    await expect(
      useCase.execute({ actingUserId: OWNER_ID, groupId: 'nope', name: 'X' }),
    ).rejects.toThrow(GroupNotFoundError);
  });

  it('actualiza el nombre y refresca updatedAt', async () => {
    groupRepo.seed(makeGroup());
    const result = await useCase.execute({
      actingUserId: OWNER_ID,
      groupId: GROUP_ID,
      name: 'Renombrada',
    });
    expect(result.name).toBe('Renombrada');
    expect(result.updatedAt).toEqual(LATER);
    expect(uow.updated).toHaveLength(1);
    expect(uow.updated[0].name).toBe('Renombrada');
  });

  it('actualiza solo la descripción si no se pasa nombre', async () => {
    groupRepo.seed(makeGroup());
    const result = await useCase.execute({
      actingUserId: OWNER_ID,
      groupId: GROUP_ID,
      description: 'Nueva desc',
    });
    expect(result.name).toBe('Original');
    expect(result.description).toBe('Nueva desc');
  });

  it('una descripción vacía deja la descripción a null', async () => {
    groupRepo.seed(makeGroup());
    const result = await useCase.execute({
      actingUserId: OWNER_ID,
      groupId: GROUP_ID,
      description: '',
    });
    expect(result.description).toBeNull();
  });
});
