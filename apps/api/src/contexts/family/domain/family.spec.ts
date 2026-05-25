import { describe, it, expect } from 'vitest';
import { Family } from './family';
import { Membership } from './membership';
import { MembershipRole } from './membership-role';
import {
  AlreadyMemberError,
  LastOwnerError,
  NotAMemberError,
} from './family.errors';

// ─── helpers ────────────────────────────────────────────────────────────────

const NOW = new Date('2026-01-15T10:00:00.000Z');

function createFamily(ownerUserId = 'user-owner'): Family {
  return Family.create({
    id: 'fam-1',
    name: 'Mi Familia',
    ownerUserId,
    ownerMembershipId: 'membership-owner',
    now: NOW,
  });
}

// ─── Family.create ───────────────────────────────────────────────────────────

describe('Family.create', () => {
  it('el creador queda como OWNER', () => {
    const family = createFamily('user-1');
    const membership = family.membershipOf('user-1');
    expect(membership).toBeDefined();
    expect(membership!.role).toBe(MembershipRole.OWNER);
  });

  it('hay exactamente 1 miembro al crear', () => {
    const family = createFamily();
    expect(family.members).toHaveLength(1);
  });

  it('isOwner devuelve true para el creador', () => {
    const family = createFamily('user-1');
    expect(family.isOwner('user-1')).toBe(true);
  });

  it('isMember devuelve false para un usuario que no pertenece', () => {
    const family = createFamily('user-1');
    expect(family.isMember('user-stranger')).toBe(false);
  });

  it('createdBy coincide con ownerUserId', () => {
    const family = createFamily('user-1');
    expect(family.createdBy).toBe('user-1');
  });
});

// ─── membershipOf ────────────────────────────────────────────────────────────

describe('Family.membershipOf', () => {
  it('devuelve la membership del OWNER', () => {
    const family = createFamily('u1');
    const m = family.membershipOf('u1');
    expect(m).toBeDefined();
    expect(m!.userId).toBe('u1');
  });

  it('devuelve undefined para un usuario que no es miembro', () => {
    const family = createFamily();
    expect(family.membershipOf('stranger')).toBeUndefined();
  });
});

// ─── addMember ───────────────────────────────────────────────────────────────

describe('Family.addMember', () => {
  it('añade un miembro nuevo con rol MEMBER', () => {
    const family = createFamily();
    const m = family.addMember({ membershipId: 'm2', userId: 'user-2', now: NOW });
    expect(m.role).toBe(MembershipRole.MEMBER);
    expect(family.members).toHaveLength(2);
  });

  it('unicidad: lanza AlreadyMemberError si el usuario ya es miembro', () => {
    const family = createFamily('user-1');
    expect(() => family.addMember({ membershipId: 'm2', userId: 'user-1', now: NOW })).toThrow(
      AlreadyMemberError,
    );
  });

  it('el miembro añadido es localizable con membershipOf', () => {
    const family = createFamily();
    family.addMember({ membershipId: 'm3', userId: 'user-3', now: NOW });
    const m = family.membershipOf('user-3');
    expect(m).toBeDefined();
    expect(m!.isOwner).toBe(false);
  });
});

// ─── removeMember ────────────────────────────────────────────────────────────

describe('Family.removeMember', () => {
  it('elimina un MEMBER sin problema', () => {
    const family = createFamily('owner');
    family.addMember({ membershipId: 'm2', userId: 'member', now: NOW });
    family.removeMember('member');
    expect(family.isMember('member')).toBe(false);
    expect(family.members).toHaveLength(1);
  });

  it('protección del último OWNER: lanza LastOwnerError', () => {
    const family = createFamily('owner');
    expect(() => family.removeMember('owner')).toThrow(LastOwnerError);
  });

  it('lanza NotAMemberError si el usuario no pertenece a la familia', () => {
    const family = createFamily();
    expect(() => family.removeMember('stranger')).toThrow(NotAMemberError);
  });

  it('devuelve la membership eliminada', () => {
    const family = createFamily('owner');
    family.addMember({ membershipId: 'm2', userId: 'member', now: NOW });
    const removed = family.removeMember('member');
    expect(removed.userId).toBe('member');
    expect(removed.id).toBe('m2');
  });

  it('con dos OWNERs puede salir uno de ellos', () => {
    // Construimos la familia directamente con 2 OWNERs para probar la invariante
    const m1 = new Membership({
      id: 'mo1',
      familyId: 'fam-1',
      userId: 'owner-1',
      role: MembershipRole.OWNER,
      joinedAt: NOW,
    });
    const m2 = new Membership({
      id: 'mo2',
      familyId: 'fam-1',
      userId: 'owner-2',
      role: MembershipRole.OWNER,
      joinedAt: NOW,
    });
    const family = new Family({
      id: 'fam-1',
      name: 'Dos Owners',
      description: null,
      imageUrl: null,
      createdBy: 'owner-1',
      createdAt: NOW,
      updatedAt: NOW,
      memberships: [m1, m2],
    });
    expect(() => family.removeMember('owner-1')).not.toThrow();
    expect(family.isOwner('owner-2')).toBe(true);
  });
});
