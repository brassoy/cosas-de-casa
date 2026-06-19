import { describe, it, expect, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { DeleteGroupUseCase } from './delete-group.use-case';
import { GROUP_REPOSITORY } from '../domain/ports/group.repository';
import { GROUP_UNIT_OF_WORK } from './ports/unit-of-work';
import { Group } from '../domain/group';
import { GroupNotFoundError } from '../domain/group.errors';
import type { GroupRepository } from '../domain/ports/group.repository';
import type { GroupUnitOfWork, GroupTransactionalRepositories } from './ports/unit-of-work';

const NOW = new Date('2026-01-15T10:00:00.000Z');
const GROUP_ID = 'group-1';
const OWNER_ID = 'owner';

function makeGroup(): Group {
  return Group.create({
    id: GROUP_ID,
    name: 'Test',
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
  public deletedGroupIds: string[] = [];
  async run<T>(work: (repos: GroupTransactionalRepositories) => Promise<T>): Promise<T> {
    const self = this;
    const repos: GroupTransactionalRepositories = {
      groups: {
        create: async () => {},
        findById: async () => null,
        findByMember: async () => [],
        update: async () => {},
        delete: async (id: string) => {
          self.deletedGroupIds.push(id);
        },
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

describe('DeleteGroupUseCase', () => {
  let useCase: DeleteGroupUseCase;
  let groupRepo: FakeGroupRepository;
  let uow: FakeGroupUnitOfWork;

  beforeEach(async () => {
    groupRepo = new FakeGroupRepository();
    uow = new FakeGroupUnitOfWork();
    const module = await Test.createTestingModule({
      providers: [
        DeleteGroupUseCase,
        { provide: GROUP_REPOSITORY, useValue: groupRepo },
        { provide: GROUP_UNIT_OF_WORK, useValue: uow },
      ],
    }).compile();
    useCase = module.get(DeleteGroupUseCase);
  });

  it('lanza GroupNotFoundError si la peña no existe', async () => {
    await expect(
      useCase.execute({ actingUserId: OWNER_ID, groupId: 'nope' }),
    ).rejects.toThrow(GroupNotFoundError);
  });

  it('borra la peña por id', async () => {
    groupRepo.seed(makeGroup());
    await useCase.execute({ actingUserId: OWNER_ID, groupId: GROUP_ID });
    expect(uow.deletedGroupIds).toEqual([GROUP_ID]);
  });
});
