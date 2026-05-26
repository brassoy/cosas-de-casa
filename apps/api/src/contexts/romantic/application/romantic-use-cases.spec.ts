/**
 * Tests unitarios del contexto `romantic`.
 *
 * Cobertura:
 *  ✓ CreateCouple: crea la pareja cuando ambos son miembros de la familia
 *  ✓ CreateCouple: lanza CannotCoupleWithSelfError si los dos son el mismo usuario
 *  ✓ CreateCouple: lanza AlreadyInCoupleError si el creador ya tiene pareja
 *  ✓ CreateCouple: lanza PartnerAlreadyInCoupleError si el partner ya tiene pareja
 *  ✓ CreateCouple: lanza NotFamilyMemberError si alguno no es miembro
 *  ✓ GetMyCouple: devuelve la pareja del usuario
 *  ✓ GetMyCouple: lanza CoupleNotFoundError si no existe
 *  ✓ AddChallenge: añade un reto del catálogo
 *  ✓ AddChallenge: lanza ChallengeNotFoundError si la clave no existe en el catálogo
 *  ✓ AddChallenge: lanza ChallengeAlreadyExistsError si ya está en la lista
 *  ✓ MarkChallengeDone: marca el reto como hecho
 *  ✓ MarkChallengeDone: lanza ChallengeNotFoundError si el reto no está en la lista
 *  ✓ DoMischief: envía push al partner con el sender
 *  ✓ DoMischief: no llama al sender si el partner no tiene suscripciones
 *  ✓ DoMischief: lanza CoupleNotFoundError si la pareja no existe
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { CoupleRepository } from '../domain/ports/couple.repository';
import type { CoupleNoteRepository } from '../domain/ports/couple-note.repository';
import type { CoupleChallengeRepository } from '../domain/ports/couple-challenge.repository';
import type { FamilyRepository } from '../../family/domain/ports/family.repository';
import type { PushSubscriptionRepository } from '../../notifications/domain/ports/push-subscription.repository';
import type { NotificationSenderPort } from '../../notifications/domain/ports/notification-sender.port';
import type { RomanticClock } from './ports/clock';
import type { RomanticIdGenerator } from './ports/id-generator';
import { Couple } from '../domain/couple';
import { CoupleChallenge } from '../domain/couple-challenge';
import {
  AlreadyInCoupleError,
  CannotCoupleWithSelfError,
  ChallengeAlreadyExistsError,
  ChallengeNotFoundError,
  CoupleNotFoundError,
  NotFamilyMemberError,
  PartnerAlreadyInCoupleError,
} from '../domain/romantic.errors';
import { CreateCoupleUseCase } from './create-couple.use-case';
import { GetMyCoupleUseCase } from './get-my-couple.use-case';
import { AddChallengeUseCase } from './add-challenge.use-case';
import { ListChallengesUseCase } from './list-challenges.use-case';
import { MarkChallengeDoneUseCase } from './mark-challenge-done.use-case';
import { DoMischiefUseCase } from './do-mischief.use-case';
import { PushSubscription } from '../../notifications/domain/push-subscription';

// ── Fakes ──────────────────────────────────────────────────────────────────

const FIXED_NOW = new Date('2026-05-26T10:00:00Z');
let idCounter = 0;
const fakeClock: RomanticClock = { now: () => FIXED_NOW };
const fakeIds: RomanticIdGenerator = { generate: () => `id-${++idCounter}` };

// Familia fake con dos miembros
const FAMILY_ID = 'fam-1';
const USER_A = 'user-a';
const USER_B = 'user-b';
const OUTSIDER = 'user-outsider';

let coupleStore: Couple[] = [];
let challengeStore: CoupleChallenge[] = [];

const fakeCoupleRepo: CoupleRepository = {
  async save(couple) { coupleStore.push(couple); },
  async findById(id) { return coupleStore.find((c) => c.id === id) ?? null; },
  async findByFamilyAndUser(familyId, userId) {
    return coupleStore.find(
      (c) => c.familyId === familyId && (c.userA === userId || c.userB === userId),
    ) ?? null;
  },
};

const fakeNoteRepo: CoupleNoteRepository = {
  async save() { /* noop */ },
  async findByCouple() { return []; },
};

const fakeChallengeRepo: CoupleChallengeRepository = {
  async save(c) { challengeStore.push(c); },
  async update(c) {
    const idx = challengeStore.findIndex((ch) => ch.id === c.id);
    if (idx !== -1) challengeStore[idx] = c;
  },
  async findByCouple(coupleId) { return challengeStore.filter((c) => c.coupleId === coupleId); },
  async findByCoupleAndKey(coupleId, key) {
    return challengeStore.find((c) => c.coupleId === coupleId && c.challengeKey === key) ?? null;
  },
};

const fakeFamilyRepo: FamilyRepository = {
  async findById(id) {
    if (id !== FAMILY_ID) return null;
    // Familia fake con dos miembros: USER_A y USER_B
    return {
      id: FAMILY_ID,
      isMember: (userId: string) => userId === USER_A || userId === USER_B,
    } as unknown as import('../../family/domain/family').Family;
  },
  async save() { /* noop */ },
  async findByMember() { return []; },
};

// ── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  coupleStore = [];
  challengeStore = [];
  idCounter = 0;
});

// ── CreateCouple ──────────────────────────────────────────────────────────────

describe('CreateCoupleUseCase', () => {
  function makeUC() {
    return new CreateCoupleUseCase(fakeCoupleRepo, fakeFamilyRepo, fakeClock, fakeIds);
  }

  it('crea la pareja cuando ambos son miembros', async () => {
    const couple = await makeUC().execute({ familyId: FAMILY_ID, userA: USER_A, userB: USER_B });
    expect(couple.userA).toBe(USER_A);
    expect(couple.userB).toBe(USER_B);
    expect(coupleStore).toHaveLength(1);
  });

  it('lanza CannotCoupleWithSelfError si los dos son el mismo usuario', async () => {
    await expect(
      makeUC().execute({ familyId: FAMILY_ID, userA: USER_A, userB: USER_A }),
    ).rejects.toThrow(CannotCoupleWithSelfError);
  });

  it('lanza AlreadyInCoupleError si el creador ya tiene pareja', async () => {
    await makeUC().execute({ familyId: FAMILY_ID, userA: USER_A, userB: USER_B });
    // Intentamos crear otra pareja con el mismo creador (necesitaría un tercer miembro)
    // Pero como USER_A ya está en pareja → AlreadyInCoupleError
    // El third member no es de la familia, pero el check de usuario existente va primero
    await expect(
      makeUC().execute({ familyId: FAMILY_ID, userA: USER_A, userB: USER_B }),
    ).rejects.toThrow(AlreadyInCoupleError);
  });

  it('lanza PartnerAlreadyInCoupleError si el partner ya tiene pareja', async () => {
    // Creamos pareja con USER_A y USER_B
    await makeUC().execute({ familyId: FAMILY_ID, userA: USER_A, userB: USER_B });
    // Intentamos emparejar a USER_B de nuevo (pero USER_A ya está en pareja también)
    // Para forzar la rama PartnerAlreadyInCoupleError, borramos la pareja y creamos una
    // con userA=USER_B, luego intentamos emparejar con userA=nuevo, userB=USER_B
    coupleStore = [];
    idCounter = 0;
    // Primero crear una pareja donde USER_B es miembro
    await makeUC().execute({ familyId: FAMILY_ID, userA: USER_B, userB: USER_A });
    // Ahora intentar emparejar USER_A con USER_B: USER_A no tiene pareja pero USER_B sí
    // Necesitamos un repositorio que refleje que USER_A no tiene pareja pero USER_B sí
    const partialRepo: CoupleRepository = {
      ...fakeCoupleRepo,
      async findByFamilyAndUser(familyId, userId) {
        if (userId === USER_B) return coupleStore[0] ?? null;
        return null;
      },
    };
    const uc = new CreateCoupleUseCase(partialRepo, fakeFamilyRepo, fakeClock, fakeIds);
    await expect(
      uc.execute({ familyId: FAMILY_ID, userA: USER_A, userB: USER_B }),
    ).rejects.toThrow(PartnerAlreadyInCoupleError);
  });

  it('lanza NotFamilyMemberError si alguno no es miembro de la familia', async () => {
    await expect(
      makeUC().execute({ familyId: FAMILY_ID, userA: USER_A, userB: OUTSIDER }),
    ).rejects.toThrow(NotFamilyMemberError);
  });
});

// ── GetMyCouple ───────────────────────────────────────────────────────────────

describe('GetMyCoupleUseCase', () => {
  it('devuelve la pareja del usuario', async () => {
    const couple = Couple.create({ id: 'c-1', familyId: FAMILY_ID, userA: USER_A, userB: USER_B, now: FIXED_NOW });
    coupleStore.push(couple);

    const uc = new GetMyCoupleUseCase(fakeCoupleRepo);
    const found = await uc.execute({ familyId: FAMILY_ID, userId: USER_A });
    expect(found.id).toBe('c-1');
  });

  it('lanza CoupleNotFoundError si no existe pareja', async () => {
    const uc = new GetMyCoupleUseCase(fakeCoupleRepo);
    await expect(uc.execute({ familyId: FAMILY_ID, userId: USER_A })).rejects.toThrow(CoupleNotFoundError);
  });
});

// ── AddChallenge ──────────────────────────────────────────────────────────────

describe('AddChallengeUseCase', () => {
  const COUPLE_ID = 'c-1';
  const VALID_KEY = 'COCINAMOS_JUNTOS';

  it('añade un reto del catálogo', async () => {
    const uc = new AddChallengeUseCase(fakeChallengeRepo, fakeIds);
    const ch = await uc.execute({ coupleId: COUPLE_ID, challengeKey: VALID_KEY });
    expect(ch.challengeKey).toBe(VALID_KEY);
    expect(ch.done).toBe(false);
    expect(challengeStore).toHaveLength(1);
  });

  it('lanza ChallengeNotFoundError si la clave no existe en el catálogo', async () => {
    const uc = new AddChallengeUseCase(fakeChallengeRepo, fakeIds);
    await expect(
      uc.execute({ coupleId: COUPLE_ID, challengeKey: 'CLAVE_INEXISTENTE' }),
    ).rejects.toThrow(ChallengeNotFoundError);
  });

  it('lanza ChallengeAlreadyExistsError si el reto ya está en la lista', async () => {
    const uc = new AddChallengeUseCase(fakeChallengeRepo, fakeIds);
    await uc.execute({ coupleId: COUPLE_ID, challengeKey: VALID_KEY });
    await expect(
      uc.execute({ coupleId: COUPLE_ID, challengeKey: VALID_KEY }),
    ).rejects.toThrow(ChallengeAlreadyExistsError);
  });
});

// ── MarkChallengeDone ─────────────────────────────────────────────────────────

describe('MarkChallengeDoneUseCase', () => {
  const COUPLE_ID = 'c-1';
  const KEY = 'CARTA_MANUSCRITA';

  it('marca el reto como hecho', async () => {
    const ch = CoupleChallenge.create({ id: 'ch-1', coupleId: COUPLE_ID, challengeKey: KEY });
    challengeStore.push(ch);

    const uc = new MarkChallengeDoneUseCase(fakeChallengeRepo, fakeClock);
    const updated = await uc.execute({ coupleId: COUPLE_ID, challengeKey: KEY });
    expect(updated.done).toBe(true);
    expect(updated.doneAt).toEqual(FIXED_NOW);
  });

  it('lanza ChallengeNotFoundError si el reto no está en la lista de la pareja', async () => {
    const uc = new MarkChallengeDoneUseCase(fakeChallengeRepo, fakeClock);
    await expect(
      uc.execute({ coupleId: COUPLE_ID, challengeKey: KEY }),
    ).rejects.toThrow(ChallengeNotFoundError);
  });
});

// ── DoMischief ────────────────────────────────────────────────────────────────

describe('DoMischiefUseCase', () => {
  const COUPLE_ID = 'c-1';

  it('envía push al partner cuando tiene suscripciones', async () => {
    const couple = Couple.create({ id: COUPLE_ID, familyId: FAMILY_ID, userA: USER_A, userB: USER_B, now: FIXED_NOW });
    coupleStore.push(couple);

    const mockSend = vi.fn().mockResolvedValue(undefined);
    const mockSender: NotificationSenderPort = { sendToTargets: mockSend };

    const partnerSub = new PushSubscription(
      'sub-1',
      USER_B,
      FAMILY_ID,
      'https://push.example/endpoint',
      { p256dh: 'aaa', auth: 'bbb' },
      FIXED_NOW,
    );

    const mockSubRepo: PushSubscriptionRepository = {
      async findByFamily() { return [partnerSub]; },
      async save() { /* noop */ },
      async findByUserAndEndpoint() { return null; },
      async deleteByEndpoint() { /* noop */ },
      async findAllFamilyIds() { return []; },
    };

    const uc = new DoMischiefUseCase(fakeCoupleRepo, mockSubRepo, mockSender);
    await uc.execute({ coupleId: COUPLE_ID, senderId: USER_A });

    expect(mockSend).toHaveBeenCalledOnce();
    const [targets, payload] = mockSend.mock.calls[0] as [Array<{ endpoint: string; keys: object }>, { title: string; body: string }];
    expect(targets[0].endpoint).toBe('https://push.example/endpoint');
    expect(payload.title).toContain('maldad');
  });

  it('no llama al sender si el partner no tiene suscripciones', async () => {
    const couple = Couple.create({ id: COUPLE_ID, familyId: FAMILY_ID, userA: USER_A, userB: USER_B, now: FIXED_NOW });
    coupleStore.push(couple);

    const mockSend = vi.fn();
    const mockSender: NotificationSenderPort = { sendToTargets: mockSend };

    const emptySubRepo: PushSubscriptionRepository = {
      async findByFamily() { return []; },
      async save() { /* noop */ },
      async findByUserAndEndpoint() { return null; },
      async deleteByEndpoint() { /* noop */ },
      async findAllFamilyIds() { return []; },
    };

    const uc = new DoMischiefUseCase(fakeCoupleRepo, emptySubRepo, mockSender);
    await uc.execute({ coupleId: COUPLE_ID, senderId: USER_A });

    expect(mockSend).not.toHaveBeenCalled();
  });

  it('lanza CoupleNotFoundError si la pareja no existe', async () => {
    const mockSender: NotificationSenderPort = { sendToTargets: vi.fn() };
    const emptySubRepo: PushSubscriptionRepository = {
      async findByFamily() { return []; },
      async save() { /* noop */ },
      async findByUserAndEndpoint() { return null; },
      async deleteByEndpoint() { /* noop */ },
      async findAllFamilyIds() { return []; },
    };

    const uc = new DoMischiefUseCase(fakeCoupleRepo, emptySubRepo, mockSender);
    await expect(
      uc.execute({ coupleId: 'ghost', senderId: USER_A }),
    ).rejects.toThrow(CoupleNotFoundError);
  });
});
