import { Inject, Injectable } from '@nestjs/common';
import { FriendLinkNotFoundError, NotFamilyMemberError } from '../domain/social.errors';
import { FRIEND_LINK_REPOSITORY, type FriendLinkRepository } from '../domain/ports/friend-link.repository';
import { FAMILY_REPOSITORY, type FamilyRepository } from '../../family/domain/ports/family.repository';

export interface RemoveFriendFamilyCommand {
  actingUserId: string;
  linkId: string;
}

/**
 * Caso de uso: eliminar un vínculo de amistad.
 * Solo puede hacerlo un miembro de alguna de las dos familias implicadas.
 */
@Injectable()
export class RemoveFriendFamilyUseCase {
  constructor(
    @Inject(FAMILY_REPOSITORY) private readonly families: FamilyRepository,
    @Inject(FRIEND_LINK_REPOSITORY) private readonly friendLinks: FriendLinkRepository,
  ) {}

  async execute(command: RemoveFriendFamilyCommand): Promise<void> {
    const link = await this.friendLinks.findById(command.linkId);
    if (!link) {
      throw new FriendLinkNotFoundError();
    }

    // El usuario debe pertenecer a una de las dos familias del vínculo.
    const [familyA, familyB] = await Promise.all([
      this.families.findById(link.familyAId),
      this.families.findById(link.familyBId),
    ]);
    const isMemberOfA = familyA?.isMember(command.actingUserId) ?? false;
    const isMemberOfB = familyB?.isMember(command.actingUserId) ?? false;

    if (!isMemberOfA && !isMemberOfB) {
      throw new NotFamilyMemberError();
    }

    await this.friendLinks.deleteById(command.linkId);
  }
}
