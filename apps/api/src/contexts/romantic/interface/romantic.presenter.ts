import type {
  CoupleDto,
  CoupleNoteDto,
  CoupleChallengeDto,
  ChallengeCatalogEntryDto,
} from '@cosasdecasa/contracts';
import type { Couple } from '../domain/couple';
import type { CoupleNote } from '../domain/couple-note';
import type { CoupleChallenge } from '../domain/couple-challenge';
import { CHALLENGE_CATALOG_MAP, type ChallengeDefinition } from '../domain/challenge-catalog';

/** Traduce entidades de dominio a DTOs del contrato público. */
export const RomanticPresenter = {
  toCoupleDto(couple: Couple): CoupleDto {
    return {
      id: couple.id,
      familyId: couple.familyId,
      userA: couple.userA,
      userB: couple.userB,
      createdAt: couple.createdAt.toISOString(),
    };
  },

  toNoteDto(note: CoupleNote): CoupleNoteDto {
    return {
      id: note.id,
      coupleId: note.coupleId,
      authorId: note.authorId,
      body: note.body,
      createdAt: note.createdAt.toISOString(),
    };
  },

  toCatalogEntryDto(entry: ChallengeDefinition): ChallengeCatalogEntryDto {
    return {
      key: entry.key,
      description: entry.description,
    };
  },

  toChallengeDto(challenge: CoupleChallenge): CoupleChallengeDto {
    const catalogEntry = CHALLENGE_CATALOG_MAP.get(challenge.challengeKey);
    return {
      id: challenge.id,
      coupleId: challenge.coupleId,
      challengeKey: challenge.challengeKey,
      description: catalogEntry?.description ?? '',
      done: challenge.done,
      doneAt: challenge.doneAt?.toISOString() ?? null,
    };
  },
};
