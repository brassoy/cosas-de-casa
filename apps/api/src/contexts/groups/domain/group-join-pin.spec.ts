import { describe, it, expect } from 'vitest';
import { GroupJoinPin, GroupJoinPinStatus, DEFAULT_GROUP_PIN_TTL_MS } from './group-join-pin';
import { InvalidGroupJoinPinError } from './group.errors';

const NOW = new Date('2026-01-15T10:00:00.000Z');
const FUTURE = new Date(NOW.getTime() + DEFAULT_GROUP_PIN_TTL_MS - 1000);
const PAST = new Date(NOW.getTime() - 1);

function makeActivePin(overrides: Partial<ConstructorParameters<typeof GroupJoinPin>[0]> = {}): GroupJoinPin {
  return GroupJoinPin.issue({
    id: 'pin-1',
    groupId: 'group-1',
    codeHash: 'hash-abc',
    createdBy: 'user-owner',
    now: NOW,
    ...overrides,
  });
}

describe('GroupJoinPin.issue', () => {
  it('emite un PIN en estado ACTIVE', () => {
    const pin = makeActivePin();
    expect(pin.status).toBe(GroupJoinPinStatus.ACTIVE);
  });

  it('la caducidad es now + TTL por defecto', () => {
    const pin = makeActivePin();
    expect(pin.expiresAt.getTime()).toBe(NOW.getTime() + DEFAULT_GROUP_PIN_TTL_MS);
  });

  it('isActive devuelve true para un PIN recién emitido', () => {
    const pin = makeActivePin();
    expect(pin.isActive()).toBe(true);
  });

  it('isRedeemable devuelve true antes de la expiración', () => {
    const pin = makeActivePin();
    expect(pin.isRedeemable(NOW)).toBe(true);
  });
});

describe('GroupJoinPin.consume', () => {
  it('pasa a CONSUMED al consumirse', () => {
    const pin = makeActivePin();
    pin.consume({ userId: 'user-joiner', now: NOW });
    expect(pin.status).toBe(GroupJoinPinStatus.CONSUMED);
    expect(pin.consumedBy).toBe('user-joiner');
  });

  it('single-use: consumir dos veces lanza InvalidGroupJoinPinError', () => {
    const pin = makeActivePin();
    pin.consume({ userId: 'user-joiner', now: NOW });
    expect(() => pin.consume({ userId: 'user-joiner-2', now: NOW })).toThrow(
      InvalidGroupJoinPinError,
    );
  });

  it('lanza InvalidGroupJoinPinError si el PIN está caducado', () => {
    const pin = new GroupJoinPin({
      id: 'pin-exp',
      groupId: 'group-1',
      codeHash: 'hash',
      status: 'ACTIVE',
      expiresAt: PAST,
      createdBy: 'user-owner',
      consumedBy: null,
      createdAt: PAST,
      consumedAt: null,
    });
    expect(() => pin.consume({ userId: 'user-joiner', now: NOW })).toThrow(
      InvalidGroupJoinPinError,
    );
  });
});

describe('GroupJoinPin.revoke', () => {
  it('pasa a REVOKED desde ACTIVE', () => {
    const pin = makeActivePin();
    pin.revoke();
    expect(pin.status).toBe(GroupJoinPinStatus.REVOKED);
  });

  it('idempotente: revocar un PIN ya CONSUMED no cambia nada', () => {
    const pin = makeActivePin();
    pin.consume({ userId: 'u', now: NOW });
    pin.revoke(); // no debe lanzar
    expect(pin.status).toBe(GroupJoinPinStatus.CONSUMED);
  });
});
