import type { FriendFamilyView } from '../application/ports/social-read-model';
import type { FriendFamilyDto } from '@cosasdecasa/contracts';

export const SocialPresenter = {
  toFriendFamilyDto(view: FriendFamilyView): FriendFamilyDto {
    return {
      linkId: view.linkId,
      familyId: view.familyId,
      familyName: view.familyName,
      familyImageUrl: view.familyImageUrl ?? undefined,
      since: view.since.toISOString(),
    };
  },
};
