import { describe, it, expect } from 'vitest';
import { Family } from './family';
import { Membership } from './membership';
import { MembershipRole } from './membership-role';
import {
  AlreadyMemberError,
  CannotRemoveSelfError,
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

// ─── expelMember ──────────────────────────────────────────────────────────────

function familyWithTwoOwners(): Family {
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
  return new Family({
    id: 'fam-1',
    name: 'Dos Owners',
    description: null,
    imageUrl: null,
    createdBy: 'owner-1',
    createdAt: NOW,
    updatedAt: NOW,
    memberships: [m1, m2],
  });
}

describe('Family.expelMember', () => {
  it('el OWNER expulsa a un MEMBER', () => {
    const family = createFamily('owner');
    family.addMember({ membershipId: 'm2', userId: 'member', now: NOW });
    const removed = family.expelMember('owner', 'member');
    expect(removed.userId).toBe('member');
    expect(family.isMember('member')).toBe(false);
  });

  it('no puede expulsarse a sí mismo: lanza CannotRemoveSelfError', () => {
    const family = createFamily('owner');
    family.addMember({ membershipId: 'm2', userId: 'member', now: NOW });
    expect(() => family.expelMember('owner', 'owner')).toThrow(CannotRemoveSelfError);
  });

  it('lanza NotAMemberError si el objetivo no pertenece', () => {
    const family = createFamily('owner');
    expect(() => family.expelMember('owner', 'stranger')).toThrow(NotAMemberError);
  });

  it('un OWNER puede expulsar a otro OWNER si queda al menos uno', () => {
    const family = familyWithTwoOwners();
    // owner-1 expulsa a owner-2 → queda 1 OWNER (válido)
    expect(() => family.expelMember('owner-1', 'owner-2')).not.toThrow();
    expect(family.isMember('owner-2')).toBe(false);
    expect(family.isOwner('owner-1')).toBe(true);
  });
});

// ─── changeMemberRole ─────────────────────────────────────────────────────────

describe('Family.changeMemberRole', () => {
  it('asciende un MEMBER a OWNER', () => {
    const family = createFamily('owner');
    family.addMember({ membershipId: 'm2', userId: 'member', now: NOW });
    family.changeMemberRole('member', MembershipRole.OWNER, NOW);
    expect(family.isOwner('member')).toBe(true);
  });

  it('degrada un OWNER a MEMBER cuando hay otro OWNER', () => {
    const family = familyWithTwoOwners();
    family.changeMemberRole('owner-2', MembershipRole.MEMBER, NOW);
    expect(family.isOwner('owner-2')).toBe(false);
  });

  it('protección del último OWNER: degradar al único OWNER lanza LastOwnerError', () => {
    const family = createFamily('owner');
    family.addMember({ membershipId: 'm2', userId: 'member', now: NOW });
    expect(() => family.changeMemberRole('owner', MembershipRole.MEMBER, NOW)).toThrow(
      LastOwnerError,
    );
  });

  it('lanza NotAMemberError si el objetivo no pertenece', () => {
    const family = createFamily('owner');
    expect(() => family.changeMemberRole('stranger', MembershipRole.OWNER, NOW)).toThrow(
      NotAMemberError,
    );
  });

  it('es idempotente: cambiar al mismo rol no falla ni altera nada', () => {
    const family = createFamily('owner');
    family.addMember({ membershipId: 'm2', userId: 'member', now: NOW });
    expect(() => family.changeMemberRole('member', MembershipRole.MEMBER, NOW)).not.toThrow();
    expect(family.isOwner('member')).toBe(false);
  });

  it('actualiza updatedAt al cambiar un rol', () => {
    const family = createFamily('owner');
    family.addMember({ membershipId: 'm2', userId: 'member', now: NOW });
    const later = new Date('2026-02-01T00:00:00.000Z');
    family.changeMemberRole('member', MembershipRole.OWNER, later);
    expect(family.updatedAt).toEqual(later);
  });
});

// ─── rename ──────────────────────────────────────────────────────────────────

describe('Family.rename', () => {
  it('cambia el nombre y refresca updatedAt', () => {
    const family = createFamily('owner');
    const later = new Date('2026-03-01T00:00:00.000Z');
    family.rename({ name: 'Nuevo nombre', now: later });
    expect(family.name).toBe('Nuevo nombre');
    expect(family.updatedAt).toEqual(later);
  });

  it('cambia solo la descripción si no se pasa nombre', () => {
    const family = createFamily('owner');
    family.rename({ description: 'Una descripción', now: NOW });
    expect(family.name).toBe('Mi Familia');
    expect(family.description).toBe('Una descripción');
  });

  it('una descripción vacía deja description a null', () => {
    const family = createFamily('owner');
    family.rename({ description: '', now: NOW });
    expect(family.description).toBeNull();
  });

  it('no toca campos que no se envían', () => {
    const family = createFamily('owner');
    family.rename({ name: 'X', now: NOW });
    // description seguía null
    expect(family.description).toBeNull();
  });
});
