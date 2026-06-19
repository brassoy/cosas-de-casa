import { describe, it, expect, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { ExpelGroupMemberUseCase } from './expel-group-member.use-case';
import { GROUP_REPOSITORY } from '../domain/ports/group.repository';
import { GROUP_UNIT_OF_WORK } from './ports/unit-of-work';
import { Group } from '../domain/group';
import {
  CannotRemoveGroupSelfError,
  GroupNotFoundError,
  LastGroupOwnerError,
  NotAGroupMemberError,
} from '../domain/group.errors';
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
  public deletedMembershipIds: string[] = [];
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
        deleteById: async (id: string) => {
          self.deletedMembershipIds.push(id);
        },
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

describe('ExpelGroupMemberUseCase', () => {
  let useCase: ExpelGroupMemberUseCase;
  let groupRepo: FakeGroupRepository;
  let uow: FakeGroupUnitOfWork;

  beforeEach(async () => {
    groupRepo = new FakeGroupRepository();
    uow = new FakeGroupUnitOfWork();
    const module = await Test.createTestingModule({
      providers: [
        ExpelGroupMemberUseCase,
        { provide: GROUP_REPOSITORY, useValue: groupRepo },
        { provide: GROUP_UNIT_OF_WORK, useValue: uow },
      ],
    }).compile();
    useCase = module.get(ExpelGroupMemberUseCase);
  });

  it('lanza GroupNotFoundError si la peña no existe', async () => {
    await expect(
      useCase.execute({ actingUserId: OWNER_ID, groupId: 'nope', targetUserId: MEMBER_ID }),
    ).rejects.toThrow(GroupNotFoundError);
  });

  it('el OWNER expulsa a un MEMBER y se borra su membership', async () => {
    groupRepo.seed(groupWithMember());
    await useCase.execute({ actingUserId: OWNER_ID, groupId: GROUP_ID, targetUserId: MEMBER_ID });
    expect(uow.deletedMembershipIds).toContain('mm-1');
  });

  it('no puede expulsarse a sí mismo: CannotRemoveGroupSelfError', async () => {
    groupRepo.seed(groupWithMember());
    await expect(
      useCase.execute({ actingUserId: OWNER_ID, groupId: GROUP_ID, targetUserId: OWNER_ID }),
    ).rejects.toThrow(CannotRemoveGroupSelfError);
  });

  it('lanza NotAGroupMemberError si el objetivo no pertenece', async () => {
    groupRepo.seed(groupOwnerOnly());
    await expect(
      useCase.execute({ actingUserId: OWNER_ID, groupId: GROUP_ID, targetUserId: 'stranger' }),
    ).rejects.toThrow(NotAGroupMemberError);
  });

  it('expulsar al único OWNER (vía otro OWNER) respeta LastGroupOwnerError', async () => {
    const group = Group.create({
      id: GROUP_ID,
      name: 'Test',
      ownerUserId: OWNER_ID,
      ownerMembershipId: 'mo-1',
      now: NOW,
    });
    group.addMember({ membershipId: 'mm-1', userId: MEMBER_ID, now: NOW });
    group.changeMemberRole(MEMBER_ID, 'OWNER', NOW); // ahora 2 OWNERs
    group.changeMemberRole(OWNER_ID, 'MEMBER', NOW); // owner pasa a MEMBER, queda 1 OWNER (member)
    groupRepo.seed(group);
    // expulsar al único OWNER (MEMBER_ID, ahora OWNER) debe fallar
    await expect(
      useCase.execute({ actingUserId: OWNER_ID, groupId: GROUP_ID, targetUserId: MEMBER_ID }),
    ).rejects.toThrow(LastGroupOwnerError);
  });
});
