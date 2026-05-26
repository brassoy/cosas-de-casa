import { describe, it, expect } from 'vitest';
import { Group } from './group';
import { GroupMembership } from './group-membership';
import { GroupRole } from './group-role';
import {
  AlreadyGroupMemberError,
  LastGroupOwnerError,
  NotAGroupMemberError,
} from './group.errors';

// ─── helpers ────────────────────────────────────────────────────────────────

const NOW = new Date('2026-01-15T10:00:00.000Z');

function createGroup(ownerUserId = 'user-owner'): Group {
  return Group.create({
    id: 'group-1',
    name: 'La Peña del Barrio',
    ownerUserId,
    ownerMembershipId: 'membership-owner',
    now: NOW,
  });
}

// ─── Group.create ────────────────────────────────────────────────────────────

describe('Group.create', () => {
  it('el creador queda como OWNER', () => {
    const group = createGroup('user-1');
    const membership = group.membershipOf('user-1');
    expect(membership).toBeDefined();
    expect(membership!.role).toBe(GroupRole.OWNER);
  });

  it('hay exactamente 1 miembro al crear', () => {
    const group = createGroup();
    expect(group.members).toHaveLength(1);
  });

  it('isOwner devuelve true para el creador', () => {
    const group = createGroup('user-1');
    expect(group.isOwner('user-1')).toBe(true);
  });

  it('isMember devuelve false para un usuario que no pertenece', () => {
    const group = createGroup('user-1');
    expect(group.isMember('user-stranger')).toBe(false);
  });

  it('createdBy coincide con ownerUserId', () => {
    const group = createGroup('user-1');
    expect(group.createdBy).toBe('user-1');
  });
});

// ─── membershipOf ────────────────────────────────────────────────────────────

describe('Group.membershipOf', () => {
  it('devuelve la membership del OWNER', () => {
    const group = createGroup('u1');
    const m = group.membershipOf('u1');
    expect(m).toBeDefined();
    expect(m!.userId).toBe('u1');
  });

  it('devuelve undefined para un usuario que no es miembro', () => {
    const group = createGroup();
    expect(group.membershipOf('stranger')).toBeUndefined();
  });
});

// ─── addMember ───────────────────────────────────────────────────────────────

describe('Group.addMember', () => {
  it('añade un miembro nuevo con rol MEMBER', () => {
    const group = createGroup();
    const m = group.addMember({ membershipId: 'm2', userId: 'user-2', now: NOW });
    expect(m.role).toBe(GroupRole.MEMBER);
    expect(group.members).toHaveLength(2);
  });

  it('unicidad: lanza AlreadyGroupMemberError si el usuario ya es miembro', () => {
    const group = createGroup('user-1');
    expect(() =>
      group.addMember({ membershipId: 'm2', userId: 'user-1', now: NOW }),
    ).toThrow(AlreadyGroupMemberError);
  });

  it('el miembro añadido es localizable con membershipOf', () => {
    const group = createGroup();
    group.addMember({ membershipId: 'm3', userId: 'user-3', now: NOW });
    const m = group.membershipOf('user-3');
    expect(m).toBeDefined();
    expect(m!.isOwner).toBe(false);
  });
});

// ─── removeMember ────────────────────────────────────────────────────────────

describe('Group.removeMember', () => {
  it('elimina un MEMBER sin problema', () => {
    const group = createGroup('owner');
    group.addMember({ membershipId: 'm2', userId: 'member', now: NOW });
    group.removeMember('member');
    expect(group.isMember('member')).toBe(false);
    expect(group.members).toHaveLength(1);
  });

  it('protección del último OWNER: lanza LastGroupOwnerError', () => {
    const group = createGroup('owner');
    expect(() => group.removeMember('owner')).toThrow(LastGroupOwnerError);
  });

  it('lanza NotAGroupMemberError si el usuario no pertenece a la peña', () => {
    const group = createGroup();
    expect(() => group.removeMember('stranger')).toThrow(NotAGroupMemberError);
  });

  it('devuelve la membership eliminada', () => {
    const group = createGroup('owner');
    group.addMember({ membershipId: 'm2', userId: 'member', now: NOW });
    const removed = group.removeMember('member');
    expect(removed.userId).toBe('member');
    expect(removed.id).toBe('m2');
  });

  it('con dos OWNERs puede salir uno de ellos', () => {
    const m1 = new GroupMembership({
      id: 'mo1',
      groupId: 'group-1',
      userId: 'owner-1',
      role: GroupRole.OWNER,
      joinedAt: NOW,
    });
    const m2 = new GroupMembership({
      id: 'mo2',
      groupId: 'group-1',
      userId: 'owner-2',
      role: GroupRole.OWNER,
      joinedAt: NOW,
    });
    const group = new Group({
      id: 'group-1',
      name: 'Dos Owners',
      description: null,
      imageUrl: null,
      createdBy: 'owner-1',
      createdAt: NOW,
      updatedAt: NOW,
      memberships: [m1, m2],
    });
    expect(() => group.removeMember('owner-1')).not.toThrow();
    expect(group.isOwner('owner-2')).toBe(true);
  });
});
