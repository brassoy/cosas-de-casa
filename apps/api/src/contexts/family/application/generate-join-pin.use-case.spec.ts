import { describe, it, expect, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { GenerateJoinPinUseCase } from './generate-join-pin.use-case';
import { FAMILY_REPOSITORY } from '../domain/ports/family.repository';
import { CLOCK } from './ports/clock';
import { HASHER } from './ports/hasher';
import { ID_GENERATOR } from './ports/id-generator';
import { RANDOM_BYTES } from './ports/random-bytes';
import { UNIT_OF_WORK } from './ports/unit-of-work';
import { Family } from '../domain/family';
import { JoinPin } from '../domain/join-pin';
import { FamilyNotFoundError, NotAnOwnerError } from '../domain/family.errors';
import type { FamilyRepository } from '../domain/ports/family.repository';
import type { UnitOfWork, TransactionalRepositories } from './ports/unit-of-work';
import type { Hasher } from './ports/hasher';
import type { IdGenerator } from './ports/id-generator';
import type { RandomBytes } from './ports/random-bytes';
import type { Clock } from './ports/clock';

// ─── fakes ──────────────────────────────────────────────────────────────────

const FIXED_NOW = new Date('2026-01-15T10:00:00.000Z');
const OWNER_ID = 'user-owner';
const MEMBER_ID = 'user-member';
const FAMILY_ID = 'fam-1';

function makeFamilyWithOwner(): Family {
  return Family.create({
    id: FAMILY_ID,
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
    // Bytes fijos: todos = 0 → código '00000000'
    return new Uint8Array(size).fill(0);
  }
}

class FakeFamilyRepository implements FamilyRepository {
  private families = new Map<string, Family>();

  seed(family: Family): void {
    this.families.set(family.id, family);
  }

  async findById(id: string): Promise<Family | null> {
    return this.families.get(id) ?? null;
  }

  async findByMember(): Promise<Family[]> {
    return [];
  }

  async create(): Promise<void> {}
}

class FakeUnitOfWork implements UnitOfWork {
  public revokedForFamily: string[] = [];
  public insertedPins: JoinPin[] = [];

  async run<T>(
    work: (repos: TransactionalRepositories) => Promise<T>,
  ): Promise<T> {
    const self = this;
    const fakeRepos: TransactionalRepositories = {
      families: {
        create: async () => {},
        findById: async () => null,
        findByMember: async () => [],
      },
      memberships: {
        insert: async () => true,
        deleteById: async () => {},
        listByFamily: async () => [],
      },
      joinPins: {
        insert: async (pin: JoinPin) => {
          self.insertedPins.push(pin);
        },
        revokeActiveByFamily: async (familyId: string) => {
          self.revokedForFamily.push(familyId);
          return 0;
        },
        consumeActiveByHash: async () => null,
      },
    };
    return work(fakeRepos);
  }
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe('GenerateJoinPinUseCase', () => {
  let useCase: GenerateJoinPinUseCase;
  let familyRepo: FakeFamilyRepository;
  let uow: FakeUnitOfWork;

  beforeEach(async () => {
    familyRepo = new FakeFamilyRepository();
    uow = new FakeUnitOfWork();

    const module = await Test.createTestingModule({
      providers: [
        GenerateJoinPinUseCase,
        { provide: FAMILY_REPOSITORY, useValue: familyRepo },
        { provide: UNIT_OF_WORK, useValue: uow },
        { provide: HASHER, useValue: new FakeHasher() },
        { provide: ID_GENERATOR, useValue: new FakeIdGenerator() },
        { provide: CLOCK, useValue: new FakeClock() },
        { provide: RANDOM_BYTES, useValue: new FakeRandomBytes() },
      ],
    }).compile();

    useCase = module.get(GenerateJoinPinUseCase);
  });

  it('lanza FamilyNotFoundError si la familia no existe', async () => {
    await expect(
      useCase.execute({ actingUserId: OWNER_ID, familyId: 'non-existent' }),
    ).rejects.toThrow(FamilyNotFoundError);
  });

  it('lanza NotAnOwnerError si el usuario no es OWNER', async () => {
    const family = makeFamilyWithOwner();
    family.addMember({ membershipId: 'mm', userId: MEMBER_ID, now: FIXED_NOW });
    familyRepo.seed(family);

    await expect(
      useCase.execute({ actingUserId: MEMBER_ID, familyId: FAMILY_ID }),
    ).rejects.toThrow(NotAnOwnerError);
  });

  it('devuelve el código en claro y expiresAt', async () => {
    familyRepo.seed(makeFamilyWithOwner());
    const result = await useCase.execute({ actingUserId: OWNER_ID, familyId: FAMILY_ID });

    expect(typeof result.code).toBe('string');
    expect(result.code).toHaveLength(8);
    expect(result.expiresAt.getTime()).toBeGreaterThan(FIXED_NOW.getTime());
  });

  it('revoca el PIN ACTIVE previo en la misma transacción', async () => {
    familyRepo.seed(makeFamilyWithOwner());
    await useCase.execute({ actingUserId: OWNER_ID, familyId: FAMILY_ID });

    expect(uow.revokedForFamily).toContain(FAMILY_ID);
  });

  it('inserta el nuevo PIN en la misma transacción', async () => {
    familyRepo.seed(makeFamilyWithOwner());
    await useCase.execute({ actingUserId: OWNER_ID, familyId: FAMILY_ID });

    expect(uow.insertedPins).toHaveLength(1);
    expect(uow.insertedPins[0]!.familyId).toBe(FAMILY_ID);
    expect(uow.insertedPins[0]!.status).toBe('ACTIVE');
  });

  it('el código que devuelve corresponde al hash almacenado', async () => {
    familyRepo.seed(makeFamilyWithOwner());
    const { code } = await useCase.execute({ actingUserId: OWNER_ID, familyId: FAMILY_ID });
    const storedHash = uow.insertedPins[0]!.codeHash;

    // El fake hasher hace hash:código
    expect(storedHash).toBe(`hash:${code}`);
  });
});
