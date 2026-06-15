import { describe, it, expect, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { JoinFamilyByPinUseCase } from './join-family-by-pin.use-case';
import { CLOCK } from './ports/clock';
import { HASHER } from './ports/hasher';
import { ID_GENERATOR } from './ports/id-generator';
import { UNIT_OF_WORK } from './ports/unit-of-work';
import { InvalidJoinPinError } from '../domain/family.errors';
import { Membership } from '../domain/membership';
import type { UnitOfWork, TransactionalRepositories } from './ports/unit-of-work';
import type { Hasher } from './ports/hasher';
import type { IdGenerator } from './ports/id-generator';
import type { Clock } from './ports/clock';

// ─── fakes ──────────────────────────────────────────────────────────────────

const FIXED_NOW = new Date('2026-01-15T10:00:00.000Z');
const FAMILY_ID = 'fam-1';
const VALID_CODE = 'ABCDEFGH'; // 8 chars del alfabeto Crockford
const VALID_HASH = `hash:${VALID_CODE}`;

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

/**
 * UoW configurable: puede simular PIN válido, inválido o ya existente.
 */
class FakeUnitOfWork implements UnitOfWork {
  public insertedMemberships: Membership[] = [];

  constructor(
    private readonly consumeResult: { familyId: string } | null,
    private readonly insertResult: boolean = true,
  ) {}

  async run<T>(
    work: (repos: TransactionalRepositories) => Promise<T>,
  ): Promise<T> {
    const self = this;
    const fakeRepos: TransactionalRepositories = {
      families: {
        create: async () => {},
        findById: async () => null,
        findByIds: async () => [],
        findByMember: async () => [],
      },
      memberships: {
        insert: async (m: Membership) => {
          self.insertedMemberships.push(m);
          return self.insertResult;
        },
        deleteById: async () => {},
        listByFamily: async () => [],
      },
      joinPins: {
        insert: async () => {},
        revokeActiveByFamily: async () => 0,
        consumeActiveByHash: async () => self.consumeResult,
      },
    };
    return work(fakeRepos);
  }
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe('JoinFamilyByPinUseCase', () => {
  async function buildUseCase(consumeResult: { familyId: string } | null, insertResult = true) {
    const uow = new FakeUnitOfWork(consumeResult, insertResult);

    const module = await Test.createTestingModule({
      providers: [
        JoinFamilyByPinUseCase,
        { provide: UNIT_OF_WORK, useValue: uow },
        { provide: HASHER, useValue: new FakeHasher() },
        { provide: ID_GENERATOR, useValue: new FakeIdGenerator() },
        { provide: CLOCK, useValue: new FakeClock() },
      ],
    }).compile();

    return { useCase: module.get(JoinFamilyByPinUseCase), uow };
  }

  it('une al usuario y devuelve joined:true cuando el PIN es válido', async () => {
    const { useCase } = await buildUseCase({ familyId: FAMILY_ID });
    const result = await useCase.execute({ actingUserId: 'user-2', code: VALID_CODE });

    expect(result.familyId).toBe(FAMILY_ID);
    expect(result.joined).toBe(true);
  });

  it('lanza InvalidJoinPinError cuando el repo devuelve null (PIN inválido/caducado/consumido)', async () => {
    const { useCase } = await buildUseCase(null);
    await expect(
      useCase.execute({ actingUserId: 'user-2', code: VALID_CODE }),
    ).rejects.toThrow(InvalidJoinPinError);
  });

  it('lanza InvalidJoinPinError si el código tiene formato inválido', async () => {
    const { useCase } = await buildUseCase({ familyId: FAMILY_ID });
    await expect(
      useCase.execute({ actingUserId: 'user-2', code: 'CORTO' }),
    ).rejects.toThrow(InvalidJoinPinError);
  });

  it('joined:false si la membership ya existía (ON CONFLICT DO NOTHING)', async () => {
    const { useCase } = await buildUseCase({ familyId: FAMILY_ID }, false);
    const result = await useCase.execute({ actingUserId: 'user-2', code: VALID_CODE });

    expect(result.joined).toBe(false);
  });

  it('la membership se inserta con el userId del solicitante', async () => {
    const { useCase, uow } = await buildUseCase({ familyId: FAMILY_ID });
    await useCase.execute({ actingUserId: 'user-joining', code: VALID_CODE });

    expect(uow.insertedMemberships[0]!.userId).toBe('user-joining');
    expect(uow.insertedMemberships[0]!.familyId).toBe(FAMILY_ID);
  });

  it('normaliza el código (minúsculas → mayúsculas) antes de hashear', async () => {
    // 'abcdefgh' normalizado debe ser igual que ABCDEFGH
    const { useCase } = await buildUseCase({ familyId: FAMILY_ID });
    const result = await useCase.execute({ actingUserId: 'u', code: 'abcdefgh' });
    expect(result.familyId).toBe(FAMILY_ID);
  });
});
