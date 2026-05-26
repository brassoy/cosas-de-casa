import { Inject, Injectable } from '@nestjs/common';
import { CoupleChallenge } from '../domain/couple-challenge';
import {
  COUPLE_CHALLENGE_REPOSITORY,
  type CoupleChallengeRepository,
} from '../domain/ports/couple-challenge.repository';
import { CHALLENGE_CATALOG_MAP } from '../domain/challenge-catalog';
import { ChallengeAlreadyExistsError, ChallengeNotFoundError } from '../domain/romantic.errors';
import { ROMANTIC_ID_GENERATOR, type RomanticIdGenerator } from './ports/id-generator';

export interface AddChallengeCommand {
  coupleId: string;
  challengeKey: string;
}

@Injectable()
export class AddChallengeUseCase {
  constructor(
    @Inject(COUPLE_CHALLENGE_REPOSITORY) private readonly challenges: CoupleChallengeRepository,
    @Inject(ROMANTIC_ID_GENERATOR) private readonly ids: RomanticIdGenerator,
  ) {}

  async execute(cmd: AddChallengeCommand): Promise<CoupleChallenge> {
    if (!CHALLENGE_CATALOG_MAP.has(cmd.challengeKey)) {
      throw new ChallengeNotFoundError(cmd.challengeKey);
    }

    const existing = await this.challenges.findByCoupleAndKey(cmd.coupleId, cmd.challengeKey);
    if (existing) throw new ChallengeAlreadyExistsError();

    const challenge = CoupleChallenge.create({
      id: this.ids.generate(),
      coupleId: cmd.coupleId,
      challengeKey: cmd.challengeKey,
    });

    await this.challenges.save(challenge);
    return challenge;
  }
}
