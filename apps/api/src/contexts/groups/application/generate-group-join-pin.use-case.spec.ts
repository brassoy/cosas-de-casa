import { describe, it, expect, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { GenerateGroupJoinPinUseCase } from './generate-group-join-pin.use-case';
import { GROUP_REPOSITORY } from '../domain/ports/group.repository';
import { CLOCK } from '../../family/application/ports/clock';
import { HASHER } from '../../family/application/ports/hasher';
import { ID_GENERATOR } from '../../family/application/ports/id-generator';
import { RANDOM_BYTES } from '../../family/application/ports/random-bytes';
import { GROUP_UNIT_OF_WORK } from './ports/unit-of-work';
import { Group } from '../domain/group';
import { GroupJoinPin } from '../domain/group-join-pin';
import { GroupNotFoundError, NotAGroupOwnerError } from '../domain/group.errors';
import type { GroupRepository } from '../domain/ports/group.repository';
import type { GroupUnitOfWork, GroupTransactionalRepositories } from './ports/unit-of-work';
import type { Hasher } from '../../family/application/ports/hasher';
import type { IdGenerator } from '../../family/application/ports/id-generator';
import type { RandomBytes } from '../../family/application/ports/random-bytes';
import type { Clock } from '../../family/application/ports/clock';

// ─── fakes ──────────────────────────────────────────────────────────────────

const FIXED_NOW = new Date('2026-01-15T10:00:00.000Z');
const OWNER_ID = 'user-owner';
const MEMBER_ID = 'user-member';
const GROUP_ID = 'group-1';

function makeGroupWithOwner(): Group {
  return Group.create({
    id: GROUP_ID,
    name: 'Test',
    ownerUserId: OWNER_ID,
    ownerMembershipId: 'mo-1',
    now: FIXED_NOW,
  });
}

class FakeHasher implements Hasher {
  async hash(code: string): Promise<string> {
    return `hash:${code}`;
  }
  async verify(code: string, hash: string): Promise<boolean> {
    return hash === `hash:${code}`;
  }
}

class FakeIdGenerator implements IdGenerator {
  private counter = 0;
  generate(): string {
    return `id-${++this.counter}`;
  }
}

class FakeClock implements Clock {
  now(): Date {
    return FIXED_NOW;
  }
}

class FakeRandomBytes implements RandomBytes {
  bytes(size: number): Uint8Array {
    return new Uint8Array(size).fill(0);
  }
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
  public revokedForGroup: string[] = [];
  public insertedPins: GroupJoinPin[] = [];

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
        deleteById: async () => {},
        listByGroup: async () => [],
      },
      groupJoinPins: {
        insert: async (pin: GroupJoinPin) => {
          self.insertedPins.push(pin);
        },
        revokeActiveByGroup: async (groupId: string) => {
          self.revokedForGroup.push(groupId);
          return 0;
        },
        consumeActiveByHash: async () => null,
      },
    };
    return work(fakeRepos);
  }
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe('GenerateGroupJoinPinUseCase', () => {
  let useCase: GenerateGroupJoinPinUseCase;
  let groupRepo: FakeGroupRepository;
  let uow: FakeGroupUnitOfWork;

  beforeEach(async () => {
    groupRepo = new FakeGroupRepository();
    uow = new FakeGroupUnitOfWork();

    const module = await Test.createTestingModule({
      providers: [
        GenerateGroupJoinPinUseCase,
        { provide: GROUP_REPOSITORY, useValue: groupRepo },
        { provide: GROUP_UNIT_OF_WORK, useValue: uow },
        { provide: HASHER, useValue: new FakeHasher() },
        { provide: ID_GENERATOR, useValue: new FakeIdGenerator() },
        { provide: CLOCK, useValue: new FakeClock() },
        { provide: RANDOM_BYTES, useValue: new FakeRandomBytes() },
      ],
    }).compile();

    useCase = module.get(GenerateGroupJoinPinUseCase);
  });

  it('lanza GroupNotFoundError si la peña no existe', async () => {
    await expect(
      useCase.execute({ actingUserId: OWNER_ID, groupId: 'non-existent' }),
    ).rejects.toThrow(GroupNotFoundError);
  });

  it('lanza NotAGroupOwnerError si el usuario no es OWNER', async () => {
    const group = makeGroupWithOwner();
    group.addMember({ membershipId: 'mm', userId: MEMBER_ID, now: FIXED_NOW });
    groupRepo.seed(group);

    await expect(
      useCase.execute({ actingUserId: MEMBER_ID, groupId: GROUP_ID }),
    ).rejects.toThrow(NotAGroupOwnerError);
  });

  it('devuelve el código en claro y expiresAt', async () => {
    groupRepo.seed(makeGroupWithOwner());
    const result = await useCase.execute({ actingUserId: OWNER_ID, groupId: GROUP_ID });

    expect(typeof result.code).toBe('string');
    expect(result.code).toHaveLength(8);
    expect(result.expiresAt.getTime()).toBeGreaterThan(FIXED_NOW.getTime());
  });

  it('revoca el PIN ACTIVE previo en la misma transacción', async () => {
    groupRepo.seed(makeGroupWithOwner());
    await useCase.execute({ actingUserId: OWNER_ID, groupId: GROUP_ID });

    expect(uow.revokedForGroup).toContain(GROUP_ID);
  });

  it('inserta el nuevo PIN en la misma transacción', async () => {
    groupRepo.seed(makeGroupWithOwner());
    await useCase.execute({ actingUserId: OWNER_ID, groupId: GROUP_ID });

    expect(uow.insertedPins).toHaveLength(1);
    expect(uow.insertedPins[0]!.groupId).toBe(GROUP_ID);
    expect(uow.insertedPins[0]!.status).toBe('ACTIVE');
  });

  it('el código que devuelve corresponde al hash almacenado', async () => {
    groupRepo.seed(makeGroupWithOwner());
    const { code } = await useCase.execute({ actingUserId: OWNER_ID, groupId: GROUP_ID });
    const storedHash = uow.insertedPins[0]!.codeHash;
    expect(storedHash).toBe(`hash:${code}`);
  });
});
