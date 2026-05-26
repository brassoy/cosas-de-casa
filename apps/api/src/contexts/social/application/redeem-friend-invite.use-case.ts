import { Inject, Injectable } from '@nestjs/common';
import { FriendLink } from '../domain/friend-link';
import {
  InvalidFriendInvitePinError,
  NotFamilyMemberError,
  SelfFriendshipError,
} from '../domain/social.errors';
import { SOCIAL_UNIT_OF_WORK, type SocialUnitOfWork } from './ports/unit-of-work';
import { FAMILY_REPOSITORY, type FamilyRepository } from '../../family/domain/ports/family.repository';
import { HASHER, type Hasher } from '../../family/application/ports/hasher';
import { ID_GENERATOR, type IdGenerator } from '../../family/application/ports/id-generator';
import { CLOCK, type Clock } from '../../family/application/ports/clock';
import { JoinPinCode } from '../../family/domain/join-pin-code';

export interface RedeemFriendInviteCommand {
  actingUserId: string;
  /** La familia a la que pertenece el usuario que canjea. */
  redeemingFamilyId: string;
  code: string;
}

export interface RedeemFriendInviteResult {
  /** El vínculo creado (o existente si ya existía — idempotente). */
  linkId: string;
  fromFamilyId: string;
  /** false si el vínculo ya existía. */
  created: boolean;
}

/**
 * Caso de uso: canjear un PIN de invitación de amistad.
 *
 * Idempotente: si las familias ya son amigas, devuelve el vínculo existente.
 * No permite auto-amistad. El consumo del PIN es ATÓMICO.
 */
@Injectable()
export class RedeemFriendInviteUseCase {
  constructor(
    @Inject(FAMILY_REPOSITORY) private readonly families: FamilyRepository,
    @Inject(SOCIAL_UNIT_OF_WORK) private readonly uow: SocialUnitOfWork,
    @Inject(HASHER) private readonly hasher: Hasher,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: RedeemFriendInviteCommand): Promise<RedeemFriendInviteResult> {
    // Verifica que el usuario pertenezca a la familia que indica.
    const redeemingFamily = await this.families.findById(command.redeemingFamilyId);
    if (!redeemingFamily || !redeemingFamily.isMember(command.actingUserId)) {
      throw new NotFamilyMemberError();
    }

    const code = JoinPinCode.fromString(command.code);
    const codeHash = await this.hasher.hash(code.value);
    const now = this.clock.now();

    return this.uow.run(
      async (repos) => {
        const consumed = await repos.friendInvitePins.consumeActiveByHash({
          codeHash,
          userId: command.actingUserId,
          byFamilyId: command.redeemingFamilyId,
          now,
        });

        if (!consumed) {
          throw new InvalidFriendInvitePinError();
        }

        const fromFamilyId = consumed.fromFamilyId;

        // No permite auto-amistad.
        if (fromFamilyId === command.redeemingFamilyId) {
          throw new SelfFriendshipError();
        }

        // Idempotente: si ya son amigas, devuelve el vínculo existente.
        const existing = await repos.friendLinks.findByPair(fromFamilyId, command.redeemingFamilyId);
        if (existing) {
          return { linkId: existing.id, fromFamilyId, created: false };
        }

        const { familyAId, familyBId } = FriendLink.normalizedPair(fromFamilyId, command.redeemingFamilyId);
        const link = new FriendLink({
          id: this.ids.generate(),
          familyAId,
          familyBId,
          createdAt: now,
        });

        await repos.friendLinks.insert(link);
        return { linkId: link.id, fromFamilyId, created: true };
      },
      { actingUserId: command.actingUserId },
    );
  }
}
