import { Inject, Injectable } from '@nestjs/common';
import { Couple } from '../domain/couple';
import {
  COUPLE_REPOSITORY,
  type CoupleRepository,
} from '../domain/ports/couple.repository';
import {
  FAMILY_REPOSITORY,
  type FamilyRepository,
} from '../../family/domain/ports/family.repository';
import {
  AlreadyInCoupleError,
  NotFamilyMemberError,
  PartnerAlreadyInCoupleError,
} from '../domain/romantic.errors';
import { ROMANTIC_CLOCK, type RomanticClock } from './ports/clock';
import { ROMANTIC_ID_GENERATOR, type RomanticIdGenerator } from './ports/id-generator';

export interface CreateCoupleCommand {
  familyId: string;
  userA: string;
  userB: string;
}

@Injectable()
export class CreateCoupleUseCase {
  constructor(
    @Inject(COUPLE_REPOSITORY) private readonly couples: CoupleRepository,
    @Inject(FAMILY_REPOSITORY) private readonly families: FamilyRepository,
    @Inject(ROMANTIC_CLOCK) private readonly clock: RomanticClock,
    @Inject(ROMANTIC_ID_GENERATOR) private readonly ids: RomanticIdGenerator,
  ) {}

  async execute(cmd: CreateCoupleCommand): Promise<Couple> {
    const family = await this.families.findById(cmd.familyId);
    if (!family || !family.isMember(cmd.userA) || !family.isMember(cmd.userB)) {
      throw new NotFamilyMemberError();
    }

    const existingA = await this.couples.findByFamilyAndUser(cmd.familyId, cmd.userA);
    if (existingA) throw new AlreadyInCoupleError();

    const existingB = await this.couples.findByFamilyAndUser(cmd.familyId, cmd.userB);
    if (existingB) throw new PartnerAlreadyInCoupleError();

    const couple = Couple.create({
      id: this.ids.generate(),
      familyId: cmd.familyId,
      userA: cmd.userA,
      userB: cmd.userB,
      now: this.clock.now(),
    });

    await this.couples.save(couple);
    return couple;
  }
}
