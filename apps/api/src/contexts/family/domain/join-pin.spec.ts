import { describe, it, expect } from 'vitest';
import { JoinPin, JoinPinStatus } from './join-pin';
import { InvalidJoinPinError } from './family.errors';

// ─── helpers ────────────────────────────────────────────────────────────────

const NOW = new Date('2026-01-15T12:00:00.000Z');
const FUTURE = new Date(NOW.getTime() + 60_000); // 1 min después
const PAST = new Date(NOW.getTime() - 60_000); // 1 min antes

function makeActivePin(overrides: { expiresAt?: Date } = {}): JoinPin {
  return JoinPin.issue({
    id: 'pin-1',
    familyId: 'fam-1',
    codeHash: 'hash-abc',
    createdBy: 'user-owner',
    now: NOW,
    ttlMs: 60_000 * 60, // 1 h
  });
}

function makePinWithExpiresAt(expiresAt: Date): JoinPin {
  return new JoinPin({
    id: 'pin-exp',
    familyId: 'fam-1',
    codeHash: 'hash-exp',
    status: JoinPinStatus.ACTIVE,
    expiresAt,
    createdBy: 'user-owner',
    consumedBy: null,
    createdAt: NOW,
    consumedAt: null,
  });
}

// ─── JoinPin.issue ───────────────────────────────────────────────────────────

describe('JoinPin.issue', () => {
  it('crea un PIN en estado ACTIVE', () => {
    const pin = makeActivePin();
    expect(pin.status).toBe(JoinPinStatus.ACTIVE);
  });

  it('calcula expiresAt como now + ttl', () => {
    const pin = JoinPin.issue({
      id: 'pin-ttl',
      familyId: 'fam-1',
      codeHash: 'h',
      createdBy: 'u',
      now: NOW,
      ttlMs: 3_600_000,
    });
    expect(pin.expiresAt.getTime()).toBe(NOW.getTime() + 3_600_000);
  });

  it('usa el TTL por defecto (24 h) si no se pasa ttlMs', () => {
    const pin = JoinPin.issue({ id: 'p', familyId: 'f', codeHash: 'h', createdBy: 'u', now: NOW });
    expect(pin.expiresAt.getTime()).toBe(NOW.getTime() + 24 * 60 * 60 * 1000);
  });

  it('consumedBy y consumedAt son null al emitirse', () => {
    const pin = makeActivePin();
    expect(pin.consumedBy).toBeNull();
    expect(pin.consumedAt).toBeNull();
  });
});

// ─── isExpired / isRedeemable ─────────────────────────────────────────────────

describe('JoinPin.isExpired', () => {
  it('no está expirado cuando now < expiresAt', () => {
    const pin = makePinWithExpiresAt(FUTURE);
    expect(pin.isExpired(NOW)).toBe(false);
  });

  it('está expirado cuando now >= expiresAt', () => {
    const pin = makePinWithExpiresAt(PAST);
    expect(pin.isExpired(NOW)).toBe(true);
  });

  it('está expirado cuando now === expiresAt (límite exacto)', () => {
    const pin = makePinWithExpiresAt(NOW);
    expect(pin.isExpired(NOW)).toBe(true);
  });
});

describe('JoinPin.isRedeemable', () => {
  it('es canjeable si está ACTIVE y no ha expirado', () => {
    const pin = makePinWithExpiresAt(FUTURE);
    expect(pin.isRedeemable(NOW)).toBe(true);
  });

  it('no es canjeable si ha expirado aunque esté ACTIVE', () => {
    const pin = makePinWithExpiresAt(PAST);
    expect(pin.isRedeemable(NOW)).toBe(false);
  });

  it('no es canjeable si ya está CONSUMED', () => {
    const pin = new JoinPin({
      id: 'p',
      familyId: 'f',
      codeHash: 'h',
      status: JoinPinStatus.CONSUMED,
      expiresAt: FUTURE,
      createdBy: 'u',
      consumedBy: 'u2',
      createdAt: NOW,
      consumedAt: NOW,
    });
    expect(pin.isRedeemable(NOW)).toBe(false);
  });

  it('no es canjeable si está REVOKED', () => {
    const pin = new JoinPin({
      id: 'p',
      familyId: 'f',
      codeHash: 'h',
      status: JoinPinStatus.REVOKED,
      expiresAt: FUTURE,
      createdBy: 'u',
      consumedBy: null,
      createdAt: NOW,
      consumedAt: null,
    });
    expect(pin.isRedeemable(NOW)).toBe(false);
  });
});

// ─── consume ─────────────────────────────────────────────────────────────────

describe('JoinPin.consume', () => {
  it('single-use: ACTIVE → CONSUMED al consumir la primera vez', () => {
    const pin = makePinWithExpiresAt(FUTURE);
    pin.consume({ userId: 'user-2', now: NOW });
    expect(pin.status).toBe(JoinPinStatus.CONSUMED);
    expect(pin.consumedBy).toBe('user-2');
    expect(pin.consumedAt).toEqual(NOW);
  });

  it('single-use: consumir dos veces lanza InvalidJoinPinError', () => {
    const pin = makePinWithExpiresAt(FUTURE);
    pin.consume({ userId: 'user-2', now: NOW });
    expect(() => pin.consume({ userId: 'user-3', now: NOW })).toThrow(InvalidJoinPinError);
  });

  it('lanza InvalidJoinPinError al consumir un PIN expirado', () => {
    const pin = makePinWithExpiresAt(PAST);
    expect(() => pin.consume({ userId: 'u', now: NOW })).toThrow(InvalidJoinPinError);
  });

  it('lanza InvalidJoinPinError al consumir un PIN REVOKED', () => {
    const pin = new JoinPin({
      id: 'p',
      familyId: 'f',
      codeHash: 'h',
      status: JoinPinStatus.REVOKED,
      expiresAt: FUTURE,
      createdBy: 'u',
      consumedBy: null,
      createdAt: NOW,
      consumedAt: null,
    });
    expect(() => pin.consume({ userId: 'u', now: NOW })).toThrow(InvalidJoinPinError);
  });
});

// ─── revoke ───────────────────────────────────────────────────────────────────

describe('JoinPin.revoke', () => {
  it('ACTIVE → REVOKED', () => {
    const pin = makePinWithExpiresAt(FUTURE);
    pin.revoke();
    expect(pin.status).toBe(JoinPinStatus.REVOKED);
  });

  it('idempotente: revocar un PIN ya REVOKED no falla', () => {
    const pin = new JoinPin({
      id: 'p',
      familyId: 'f',
      codeHash: 'h',
      status: JoinPinStatus.REVOKED,
      expiresAt: FUTURE,
      createdBy: 'u',
      consumedBy: null,
      createdAt: NOW,
      consumedAt: null,
    });
    expect(() => pin.revoke()).not.toThrow();
    expect(pin.status).toBe(JoinPinStatus.REVOKED);
  });

  it('no cambia de CONSUMED a REVOKED (idempotente, queda CONSUMED)', () => {
    const pin = new JoinPin({
      id: 'p',
      familyId: 'f',
      codeHash: 'h',
      status: JoinPinStatus.CONSUMED,
      expiresAt: FUTURE,
      createdBy: 'u',
      consumedBy: 'u2',
      createdAt: NOW,
      consumedAt: NOW,
    });
    pin.revoke();
    expect(pin.status).toBe(JoinPinStatus.CONSUMED);
  });
});
