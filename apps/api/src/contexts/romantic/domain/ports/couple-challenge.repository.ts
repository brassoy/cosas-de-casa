import type { CoupleChallenge } from '../couple-challenge';

export const COUPLE_CHALLENGE_REPOSITORY = Symbol('COUPLE_CHALLENGE_REPOSITORY');

export interface CoupleChallengeRepository {
  save(challenge: CoupleChallenge): Promise<void>;
  update(challenge: CoupleChallenge): Promise<void>;
  findByCouple(coupleId: string): Promise<CoupleChallenge[]>;
  findByCoupleAndKey(coupleId: string, challengeKey: string): Promise<CoupleChallenge | null>;
}
