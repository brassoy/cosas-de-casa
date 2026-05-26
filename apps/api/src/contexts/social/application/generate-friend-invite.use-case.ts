import { Inject, Injectable } from '@nestjs/common';
import { FriendInvitePin } from '../domain/friend-invite-pin';
import { NotFamilyOwnerError, NotFamilyMemberError } from '../domain/social.errors';
import { FRIEND_INVITE_PIN_REPOSITORY, type FriendInvitePinRepository } from '../domain/ports/friend-invite-pin.repository';
import { CLOCK, type Clock } from '../../family/application/ports/clock';
import { HASHER, type Hasher } from '../../family/application/ports/hasher';
import { ID_GENERATOR, type IdGenerator } from '../../family/application/ports/id-generator';
import { RANDOM_BYTES, type RandomBytes } from '../../family/application/ports/random-bytes';
import { FAMILY_REPOSITORY, type FamilyRepository } from '../../family/domain/ports/family.repository';
import { JoinPinCode } from '../../family/domain/join-pin-code';

export interface GenerateFriendInviteCommand {
  actingUserId: string;
  familyId: string;
}

export interface GenerateFriendInviteResult {
  code: string;
  expiresAt: Date;
}

/**
 * Caso de uso: generar un PIN de invitación de amistad para una familia
 * (solo OWNER). Revoca el PIN activo previo y emite uno nuevo.
 */
@Injectable()
export class GenerateFriendInviteUseCase {
  private static readonly ENTROPY_BYTES = 16;

  constructor(
    @Inject(FAMILY_REPOSITORY) private readonly families: FamilyRepository,
    @Inject(FRIEND_INVITE_PIN_REPOSITORY) private readonly pins: FriendInvitePinRepository,
    @Inject(HASHER) private readonly hasher: Hasher,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(RANDOM_BYTES) private readonly random: RandomBytes,
  ) {}

  async execute(command: GenerateFriendInviteCommand): Promise<GenerateFriendInviteResult> {
    const family = await this.families.findById(command.familyId);
    if (!family) {
      throw new NotFamilyMemberError();
    }

    const membership = family.membershipOf(command.actingUserId);
    if (!membership) {
      throw new NotFamilyMemberError();
    }
    if (membership.role !== 'OWNER') {
      throw new NotFamilyOwnerError();
    }

    const now = this.clock.now();
    const code = JoinPinCode.fromRandomBytes(
      this.random.bytes(GenerateFriendInviteUseCase.ENTROPY_BYTES),
    );
    const codeHash = await this.hasher.hash(code.value);

    const pin = FriendInvitePin.issue({
      id: this.ids.generate(),
      fromFamilyId: command.familyId,
      codeHash,
      createdBy: command.actingUserId,
      now,
    });

    await this.pins.revokeActiveByFamily(command.familyId);
    await this.pins.insert(pin);

    return { code: code.value, expiresAt: pin.expiresAt };
  }
}
