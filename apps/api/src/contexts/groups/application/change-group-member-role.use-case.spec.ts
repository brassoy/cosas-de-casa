import { describe, it, expect, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { ChangeGroupMemberRoleUseCase } from './change-group-member-role.use-case';
import { GROUP_REPOSITORY } from '../domain/ports/group.repository';
import { GROUP_UNIT_OF_WORK } from './ports/unit-of-work';
import { CLOCK } from '../../family/application/ports/clock';
import { Group } from '../domain/group';
import { GroupMembership } from '../domain/group-membership';
import { GroupRole } from '../domain/group-role';
import {
  GroupNotFoundError,
  LastGroupOwnerError,
  NotAGroupMemberError,
} from '../domain/group.errors';
import type { Clock } from '../../family/application/ports/clock';
import type { GroupRepository } from '../domain/ports/group.repository';
import type { GroupUnitOfWork, GroupTransactionalRepositories } from './ports/unit-of-work';

const NOW = new Date('2026-01-15T10:00:00.000Z');
const GROUP_ID = 'group-1';
const OWNER_ID = 'owner';
const MEMBER_ID = 'member';

function groupWithMember(): Group {
  const group = Group.create({
    id: GROUP_ID,
    name: 'Test',
    ownerUserId: OWNER_ID,
    ownerMembershipId: 'mo-1',
    now: NOW,
  });
  group.addMember({ membershipId: 'mm-1', userId: MEMBER_ID, now: NOW });
  return group;
}

function groupOwnerOnly(): Group {
  return Group.create({
    id: GROUP_ID,
    name: 'Test',
    ownerUserId: OWNER_ID,
    ownerMembershipId: 'mo-1',
    now: NOW,
  });
}

function groupTwoOwners(): Group {
  const m1 = new GroupMembership({
    id: 'mo1',
    groupId: GROUP_ID,
    userId: OWNER_ID,
    role: GroupRole.OWNER,
    joinedAt: NOW,
  });
  const m2 = new GroupMembership({
    id: 'mo2',
    groupId: GROUP_ID,
    userId: 'owner-2',
    role: GroupRole.OWNER,
    joinedAt: NOW,
  });
  return new Group({
    id: GROUP_ID,
    name: 'Dos',
    description: null,
    imageUrl: null,
    createdBy: OWNER_ID,
    createdAt: NOW,
    updatedAt: NOW,
    memberships: [m1, m2],
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
  public roleUpdates: Array<{ id: string; role: string }> = [];
  async run<T>(work: (repos: GroupTransactionalRepositories) => Promise<T>): Promise<T> {
    const self = this;
    const repos: GroupTransactionalRepositories = {
      groups: {
        create: async () => {},
        findById: async () => null,
        findByMember: async () => [],
        update: async () => {},
        delete: async () => {},
      },
      groupMemberships: {
        insert: async () => true,
        deleteById: async () => {},
        updateRole: async (id: string, role: 'OWNER' | 'MEMBER') => {
          self.roleUpdates.push({ id, role });
        },
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
    return NOW;
  }
}

describe('ChangeGroupMemberRoleUseCase', () => {
  let useCase: ChangeGroupMemberRoleUseCase;
  let groupRepo: FakeGroupRepository;
  let uow: FakeGroupUnitOfWork;

  beforeEach(async () => {
    groupRepo = new FakeGroupRepository();
    uow = new FakeGroupUnitOfWork();
    const module = await Test.createTestingModule({
      providers: [
        ChangeGroupMemberRoleUseCase,
        { provide: GROUP_REPOSITORY, useValue: groupRepo },
        { provide: GROUP_UNIT_OF_WORK, useValue: uow },
        { provide: CLOCK, useValue: new FakeClock() },
      ],
    }).compile();
    useCase = module.get(ChangeGroupMemberRoleUseCase);
  });

  it('lanza GroupNotFoundError si la peña no existe', async () => {
    await expect(
      useCase.execute({ actingUserId: OWNER_ID, groupId: 'nope', targetUserId: MEMBER_ID, role: 'OWNER' }),
    ).rejects.toThrow(GroupNotFoundError);
  });

  it('asciende un MEMBER a OWNER y persiste el cambio', async () => {
    groupRepo.seed(groupWithMember());
    await useCase.execute({ actingUserId: OWNER_ID, groupId: GROUP_ID, targetUserId: MEMBER_ID, role: 'OWNER' });
    expect(uow.roleUpdates).toEqual([{ id: 'mm-1', role: 'OWNER' }]);
  });

  it('degrada un OWNER a MEMBER cuando hay otro OWNER', async () => {
    groupRepo.seed(groupTwoOwners());
    await useCase.execute({ actingUserId: OWNER_ID, groupId: GROUP_ID, targetUserId: 'owner-2', role: 'MEMBER' });
    expect(uow.roleUpdates).toEqual([{ id: 'mo2', role: 'MEMBER' }]);
  });

  it('protección del último OWNER: degradar al único OWNER → LastGroupOwnerError', async () => {
    groupRepo.seed(groupWithMember());
    await expect(
      useCase.execute({ actingUserId: OWNER_ID, groupId: GROUP_ID, targetUserId: OWNER_ID, role: 'MEMBER' }),
    ).rejects.toThrow(LastGroupOwnerError);
  });

  it('lanza NotAGroupMemberError si el objetivo no pertenece', async () => {
    groupRepo.seed(groupOwnerOnly());
    await expect(
      useCase.execute({ actingUserId: OWNER_ID, groupId: GROUP_ID, targetUserId: 'stranger', role: 'OWNER' }),
    ).rejects.toThrow(NotAGroupMemberError);
  });

  it('idempotente: si el rol ya coincide igualmente persiste sin fallar', async () => {
    groupRepo.seed(groupWithMember());
    await expect(
      useCase.execute({ actingUserId: OWNER_ID, groupId: GROUP_ID, targetUserId: MEMBER_ID, role: 'MEMBER' }),
    ).resolves.not.toThrow();
    expect(uow.roleUpdates).toEqual([{ id: 'mm-1', role: 'MEMBER' }]);
  });
});
