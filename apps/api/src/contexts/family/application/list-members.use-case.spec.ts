import { describe, it, expect, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { ListMembersUseCase } from './list-members.use-case';
import { FAMILY_REPOSITORY } from '../domain/ports/family.repository';
import { MEMBERS_READ_MODEL } from './ports/members-read-model';
import { Family } from '../domain/family';
import { MembershipRole } from '../domain/membership-role';
import { FamilyNotFoundError, NotAMemberError } from '../domain/family.errors';
import type { FamilyRepository } from '../domain/ports/family.repository';
import type { MembersReadModel, MemberView } from './ports/members-read-model';

// ─── fakes ──────────────────────────────────────────────────────────────────

const NOW = new Date('2026-01-15T10:00:00.000Z');
const FAMILY_ID = 'fam-1';
const OWNER_ID = 'owner';
const MEMBER_ID = 'member';

class FakeFamilyRepository implements FamilyRepository {
  private families = new Map<string, Family>();

  seed(family: Family): void {
    this.families.set(family.id, family);
  }

  async findById(id: string): Promise<Family | null> {
    return this.families.get(id) ?? null;
  }

  async findByIds(ids: string[]): Promise<Family[]> {
    return ids.map((id) => this.families.get(id)).filter((f): f is Family => f != null);
  }

  async findByMember(): Promise<Family[]> {
    return [];
  }

  async create(): Promise<void> {}

  async update(): Promise<void> {}

  async delete(): Promise<void> {}
}

class FakeMembersReadModel implements MembersReadModel {
  private views: MemberView[] = [];

  setViews(views: MemberView[]): void {
    this.views = views;
  }

  async listByFamily(): Promise<MemberView[]> {
    return this.views;
  }
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe('ListMembersUseCase', () => {
  let useCase: ListMembersUseCase;
  let familyRepo: FakeFamilyRepository;
  let readModel: FakeMembersReadModel;

  beforeEach(async () => {
    familyRepo = new FakeFamilyRepository();
    readModel = new FakeMembersReadModel();

    const module = await Test.createTestingModule({
      providers: [
        ListMembersUseCase,
        { provide: FAMILY_REPOSITORY, useValue: familyRepo },
        { provide: MEMBERS_READ_MODEL, useValue: readModel },
      ],
    }).compile();

    useCase = module.get(ListMembersUseCase);
  });

  it('lanza FamilyNotFoundError si la familia no existe', async () => {
    await expect(
      useCase.execute({ actingUserId: OWNER_ID, familyId: 'non-existent' }),
    ).rejects.toThrow(FamilyNotFoundError);
  });

  it('lanza NotAMemberError si el usuario no pertenece a la familia', async () => {
    familyRepo.seed(
      Family.create({ id: FAMILY_ID, name: 'F', ownerUserId: OWNER_ID, ownerMembershipId: 'mo', now: NOW }),
    );
    await expect(
      useCase.execute({ actingUserId: 'stranger', familyId: FAMILY_ID }),
    ).rejects.toThrow(NotAMemberError);
  });

  it('devuelve la familia y los miembros del read-model', async () => {
    const family = Family.create({
      id: FAMILY_ID,
      name: 'F',
      ownerUserId: OWNER_ID,
      ownerMembershipId: 'mo',
      now: NOW,
    });
    family.addMember({ membershipId: 'mm', userId: MEMBER_ID, now: NOW });
    familyRepo.seed(family);

    const views: MemberView[] = [
      { userId: OWNER_ID, displayName: 'El Dueño', avatarUrl: null, role: MembershipRole.OWNER, joinedAt: NOW },
      { userId: MEMBER_ID, displayName: 'El Miembro', avatarUrl: null, role: MembershipRole.MEMBER, joinedAt: NOW },
    ];
    readModel.setViews(views);

    const result = await useCase.execute({ actingUserId: OWNER_ID, familyId: FAMILY_ID });

    expect(result.family.id).toBe(FAMILY_ID);
    expect(result.members).toHaveLength(2);
    expect(result.members[0]!.displayName).toBe('El Dueño');
  });

  it('permite que un MEMBER (no OWNER) liste los miembros', async () => {
    const family = Family.create({
      id: FAMILY_ID,
      name: 'F',
      ownerUserId: OWNER_ID,
      ownerMembershipId: 'mo',
      now: NOW,
    });
    family.addMember({ membershipId: 'mm', userId: MEMBER_ID, now: NOW });
    familyRepo.seed(family);
    readModel.setViews([]);

    await expect(
      useCase.execute({ actingUserId: MEMBER_ID, familyId: FAMILY_ID }),
    ).resolves.not.toThrow();
  });
});
