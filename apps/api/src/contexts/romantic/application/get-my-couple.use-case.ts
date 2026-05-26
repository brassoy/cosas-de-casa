import { Inject, Injectable } from '@nestjs/common';
import type { Couple } from '../domain/couple';
import {
  COUPLE_REPOSITORY,
  type CoupleRepository,
} from '../domain/ports/couple.repository';
import { CoupleNotFoundError } from '../domain/romantic.errors';

export interface GetMyCoupleCommand {
  familyId: string;
  userId: string;
}

@Injectable()
export class GetMyCoupleUseCase {
  constructor(
    @Inject(COUPLE_REPOSITORY) private readonly couples: CoupleRepository,
  ) {}

  async execute(cmd: GetMyCoupleCommand): Promise<Couple> {
    const couple = await this.couples.findByFamilyAndUser(cmd.familyId, cmd.userId);
    if (!couple) throw new CoupleNotFoundError();
    return couple;
  }
}
