import { describe, it, expect, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { JoinGroupByPinUseCase } from './join-group-by-pin.use-case';
import { CLOCK } from '../../family/application/ports/clock';
import { HASHER } from '../../family/application/ports/hasher';
import { ID_GENERATOR } from '../../family/application/ports/id-generator';
import { GROUP_UNIT_OF_WORK } from './ports/unit-of-work';
import { InvalidGroupJoinPinError } from '../domain/group.errors';
import { InvalidJoinPinError } from '../../family/domain/family.errors';
import type { GroupUnitOfWork, GroupTransactionalRepositories } from './ports/unit-of-work';
import type { Hasher } from '../../family/application/ports/hasher';
import type { IdGenerator } from '../../family/application/ports/id-generator';
import type { Clock } from '../../family/application/ports/clock';

// ─── fakes ──────────────────────────────────────────────────────────────────

const FIXED_NOW = new Date('2026-01-15T10:00:00.000Z');
const VALID_CODE = '00000000'; // Crockford Base32 válido

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

class FakeGroupUnitOfWork implements GroupUnitOfWork {
  /** Simula el resultado de consumeActiveByHash; null = PIN no válido. */
  consumeResult: { groupId: string } | null = { groupId: 'group-1' };
  insertedMembership = false;

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
        insert: async () => {
          self.insertedMembership = true;
          return true;
        },
        deleteById: async () => {},
        listByGroup: async () => [],
      },
      groupJoinPins: {
        insert: async () => {},
        revokeActiveByGroup: async () => 0,
        consumeActiveByHash: async () => self.consumeResult,
      },
    };
    return work(fakeRepos);
  }
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe('JoinGroupByPinUseCase', () => {
  let useCase: JoinGroupByPinUseCase;
  let uow: FakeGroupUnitOfWork;

  beforeEach(async () => {
    uow = new FakeGroupUnitOfWork();

    const module = await Test.createTestingModule({
      providers: [
        JoinGroupByPinUseCase,
        { provide: GROUP_UNIT_OF_WORK, useValue: uow },
        { provide: HASHER, useValue: new FakeHasher() },
        { provide: ID_GENERATOR, useValue: new FakeIdGenerator() },
        { provide: CLOCK, useValue: new FakeClock() },
      ],
    }).compile();

    useCase = module.get(JoinGroupByPinUseCase);
  });

  it('devuelve groupId y joined: true al consumir correctamente', async () => {
    const result = await useCase.execute({ actingUserId: 'user-joiner', code: VALID_CODE });
    expect(result.groupId).toBe('group-1');
    expect(result.joined).toBe(true);
    expect(uow.insertedMembership).toBe(true);
  });

  it('lanza InvalidGroupJoinPinError si consumeActiveByHash devuelve null', async () => {
    uow.consumeResult = null;
    await expect(
      useCase.execute({ actingUserId: 'user-joiner', code: VALID_CODE }),
    ).rejects.toThrow(InvalidGroupJoinPinError);
  });

  it('lanza InvalidJoinPinError (del VO compartido) si el código tiene formato inválido', async () => {
    // JoinPinCode.fromString (VO reutilizado de family) lanza InvalidJoinPinError
    // cuando el formato no es Crockford Base32 de 8 chars.
    await expect(
      useCase.execute({ actingUserId: 'user-joiner', code: 'INVALID!!' }),
    ).rejects.toThrow(InvalidJoinPinError);
  });
});
