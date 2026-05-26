import { Inject, Injectable } from '@nestjs/common';
import type { CoupleChallenge } from '../domain/couple-challenge';
import {
  COUPLE_CHALLENGE_REPOSITORY,
  type CoupleChallengeRepository,
} from '../domain/ports/couple-challenge.repository';
import { ChallengeNotFoundError } from '../domain/romantic.errors';
import { ROMANTIC_CLOCK, type RomanticClock } from './ports/clock';

export interface MarkChallengeDoneCommand {
  coupleId: string;
  challengeKey: string;
}

@Injectable()
export class MarkChallengeDoneUseCase {
  constructor(
    @Inject(COUPLE_CHALLENGE_REPOSITORY) private readonly challenges: CoupleChallengeRepository,
    @Inject(ROMANTIC_CLOCK) private readonly clock: RomanticClock,
  ) {}

  async execute(cmd: MarkChallengeDoneCommand): Promise<CoupleChallenge> {
    const challenge = await this.challenges.findByCoupleAndKey(cmd.coupleId, cmd.challengeKey);
    if (!challenge) throw new ChallengeNotFoundError(cmd.challengeKey);

    challenge.markDone(this.clock.now());
    await this.challenges.update(challenge);
    return challenge;
  }
}
