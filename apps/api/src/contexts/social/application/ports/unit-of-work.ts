import type { FriendInvitePinRepository } from '../../domain/ports/friend-invite-pin.repository';
import type { FriendLinkRepository } from '../../domain/ports/friend-link.repository';

export const SOCIAL_UNIT_OF_WORK = Symbol('SOCIAL_UNIT_OF_WORK');

export interface SocialTransactionalRepositories {
  friendInvitePins: FriendInvitePinRepository;
  friendLinks: FriendLinkRepository;
}

export interface SocialUnitOfWork {
  run<T>(
    work: (repos: SocialTransactionalRepositories) => Promise<T>,
    options?: { actingUserId?: string },
  ): Promise<T>;
}
