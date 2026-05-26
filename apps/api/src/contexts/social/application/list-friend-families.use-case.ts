import { Inject, Injectable } from '@nestjs/common';
import { NotFamilyMemberError } from '../domain/social.errors';
import { SOCIAL_READ_MODEL, type SocialReadModel, type FriendFamilyView } from './ports/social-read-model';
import { FAMILY_REPOSITORY, type FamilyRepository } from '../../family/domain/ports/family.repository';

export interface ListFriendFamiliesQuery {
  actingUserId: string;
  familyId: string;
}

@Injectable()
export class ListFriendFamiliesUseCase {
  constructor(
    @Inject(FAMILY_REPOSITORY) private readonly families: FamilyRepository,
    @Inject(SOCIAL_READ_MODEL) private readonly readModel: SocialReadModel,
  ) {}

  async execute(query: ListFriendFamiliesQuery): Promise<FriendFamilyView[]> {
    const family = await this.families.findById(query.familyId);
    if (!family || !family.isMember(query.actingUserId)) {
      throw new NotFamilyMemberError();
    }
    return this.readModel.listFriendFamilies(query.familyId);
  }
}
