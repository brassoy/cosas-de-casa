import { Inject, Injectable } from '@nestjs/common';
import type { CoupleChallenge } from '../domain/couple-challenge';
import {
  COUPLE_CHALLENGE_REPOSITORY,
  type CoupleChallengeRepository,
} from '../domain/ports/couple-challenge.repository';

export interface ListChallengesCommand {
  coupleId: string;
}

@Injectable()
export class ListChallengesUseCase {
  constructor(
    @Inject(COUPLE_CHALLENGE_REPOSITORY) private readonly challenges: CoupleChallengeRepository,
  ) {}

  async execute(cmd: ListChallengesCommand): Promise<CoupleChallenge[]> {
    return this.challenges.findByCouple(cmd.coupleId);
  }
}
