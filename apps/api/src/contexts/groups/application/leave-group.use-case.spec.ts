import { describe, it, expect, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { LeaveGroupUseCase } from './leave-group.use-case';
import { GROUP_REPOSITORY } from '../domain/ports/group.repository';
import { GROUP_UNIT_OF_WORK } from './ports/unit-of-work';
import { Group } from '../domain/group';
import { GroupNotFoundError, LastGroupOwnerError, NotAGroupMemberError } from '../domain/group.errors';
import type { GroupRepository } from '../domain/ports/group.repository';
import type { GroupUnitOfWork, GroupTransactionalRepositories } from './ports/unit-of-work';

// ─── fakes ──────────────────────────────────────────────────────────────────

const FIXED_NOW = new Date('2026-01-15T10:00:00.000Z');
const OWNER_ID = 'user-owner';
const MEMBER_ID = 'user-member';
const GROUP_ID = 'group-1';

function makeGroupWithOwnerAndMember(): Group {
  const g = Group.create({
    id: GROUP_ID,
    name: 'Test',
    ownerUserId: OWNER_ID,
    ownerMembershipId: 'mo-1',
    now: FIXED_NOW,
  });
  g.addMember({ membershipId: 'mm-1', userId: MEMBER_ID, now: FIXED_NOW });
  return g;
}

class FakeGroupRepository implements GroupRepository {
  private groupsMap = new Map<string, Group>();

  seed(group: Group): void {
    this.groupsMap.set(group.id, group);
  }

  async findById(id: string): Promise<Group | null> {
    return this.groupsMap.get(id) ?? null;
  }

  async findByMember(): Promise<Group[]> {
    return [];
  }

  async create(): Promise<void> {}
}

class FakeGroupUnitOfWork implements GroupUnitOfWork {
  deletedIds: string[] = [];

  async run<T>(
    work: (repos: GroupTransactionalRepositories) => Promise<T>,
  ): Promise<T> {
    const self = this;
    const fakeRepos: GroupTransactionalRepositories = {
      groups: {
        create: async () => {},
        findById: async () => null,
        findByMember: async () => [],
      },
      groupMemberships: {
        insert: async () => true,
        deleteById: async (id: string) => {
          self.deletedIds.push(id);
        },
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

describe('LeaveGroupUseCase', () => {
  let useCase: LeaveGroupUseCase;
  let groupRepo: FakeGroupRepository;
  let uow: FakeGroupUnitOfWork;

  beforeEach(async () => {
    groupRepo = new FakeGroupRepository();
    uow = new FakeGroupUnitOfWork();

    const module = await Test.createTestingModule({
      providers: [
        LeaveGroupUseCase,
        { provide: GROUP_REPOSITORY, useValue: groupRepo },
        { provide: GROUP_UNIT_OF_WORK, useValue: uow },
      ],
    }).compile();

    useCase = module.get(LeaveGroupUseCase);
  });

  it('lanza GroupNotFoundError si la peña no existe', async () => {
    await expect(
      useCase.execute({ actingUserId: MEMBER_ID, groupId: 'non-existent' }),
    ).rejects.toThrow(GroupNotFoundError);
  });

  it('MEMBER puede salir de la peña', async () => {
    groupRepo.seed(makeGroupWithOwnerAndMember());
    await expect(
      useCase.execute({ actingUserId: MEMBER_ID, groupId: GROUP_ID }),
    ).resolves.toBeUndefined();
    expect(uow.deletedIds).toHaveLength(1);
  });

  it('lanza LastGroupOwnerError si el OWNER único intenta salir', async () => {
    const g = Group.create({
      id: GROUP_ID,
      name: 'Solo owner',
      ownerUserId: OWNER_ID,
      ownerMembershipId: 'mo-1',
      now: FIXED_NOW,
    });
    groupRepo.seed(g);
    await expect(
      useCase.execute({ actingUserId: OWNER_ID, groupId: GROUP_ID }),
    ).rejects.toThrow(LastGroupOwnerError);
  });

  it('lanza NotAGroupMemberError si el usuario no pertenece a la peña', async () => {
    groupRepo.seed(makeGroupWithOwnerAndMember());
    await expect(
      useCase.execute({ actingUserId: 'stranger', groupId: GROUP_ID }),
    ).rejects.toThrow(NotAGroupMemberError);
  });
});
