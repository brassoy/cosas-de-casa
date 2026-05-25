import { describe, it, expect, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { ListMyFamiliesUseCase } from './list-my-families.use-case';
import { FAMILY_REPOSITORY } from '../domain/ports/family.repository';
import { Family } from '../domain/family';
import type { FamilyRepository } from '../domain/ports/family.repository';

// ─── fakes ──────────────────────────────────────────────────────────────────

const NOW = new Date('2026-01-15T10:00:00.000Z');
const USER_ID = 'user-1';

class FakeFamilyRepository implements FamilyRepository {
  private memberFamilies: Family[] = [];

  seedForMember(families: Family[]): void {
    this.memberFamilies = families;
  }

  async findById(): Promise<Family | null> {
    return null;
  }

  async findByMember(): Promise<Family[]> {
    return this.memberFamilies;
  }

  async create(): Promise<void> {}
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe('ListMyFamiliesUseCase', () => {
  let useCase: ListMyFamiliesUseCase;
  let familyRepo: FakeFamilyRepository;

  beforeEach(async () => {
    familyRepo = new FakeFamilyRepository();

    const module = await Test.createTestingModule({
      providers: [
        ListMyFamiliesUseCase,
        { provide: FAMILY_REPOSITORY, useValue: familyRepo },
      ],
    }).compile();

    useCase = module.get(ListMyFamiliesUseCase);
  });

  it('devuelve array vacío si el usuario no pertenece a ninguna familia', async () => {
    const result = await useCase.execute({ actingUserId: USER_ID });
    expect(result).toEqual([]);
  });

  it('devuelve las familias del usuario', async () => {
    const f1 = Family.create({ id: 'f1', name: 'F1', ownerUserId: USER_ID, ownerMembershipId: 'mo1', now: NOW });
    const f2 = Family.create({ id: 'f2', name: 'F2', ownerUserId: USER_ID, ownerMembershipId: 'mo2', now: NOW });
    familyRepo.seedForMember([f1, f2]);

    const result = await useCase.execute({ actingUserId: USER_ID });

    expect(result).toHaveLength(2);
    expect(result.map((f) => f.id)).toContain('f1');
    expect(result.map((f) => f.id)).toContain('f2');
  });
});
