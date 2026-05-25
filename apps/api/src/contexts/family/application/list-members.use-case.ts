import { Inject, Injectable } from '@nestjs/common';
import { Family } from '../domain/family';
import { FamilyNotFoundError, NotAMemberError } from '../domain/family.errors';
import { FAMILY_REPOSITORY, type FamilyRepository } from '../domain/ports/family.repository';
import {
  MEMBERS_READ_MODEL,
  type MembersReadModel,
  type MemberView,
} from './ports/members-read-model';

export interface ListMembersQuery {
  actingUserId: string;
  familyId: string;
}

/**
 * Caso de uso: listar los miembros de una familia. El solicitante debe ser
 * miembro (también lo refuerza el FamilyScopeGuard). La autorización se decide
 * con el aggregate; los datos de presentación (displayName) vienen del
 * read-model que cruza con `app_users`.
 */
@Injectable()
export class ListMembersUseCase {
  constructor(
    @Inject(FAMILY_REPOSITORY) private readonly families: FamilyRepository,
    @Inject(MEMBERS_READ_MODEL) private readonly membersReadModel: MembersReadModel,
  ) {}

  async execute(query: ListMembersQuery): Promise<{ family: Family; members: MemberView[] }> {
    const family = await this.families.findById(query.familyId);
    if (!family) {
      throw new FamilyNotFoundError();
    }
    if (!family.isMember(query.actingUserId)) {
      throw new NotAMemberError();
    }
    const members = await this.membersReadModel.listByFamily(query.familyId);
    return { family, members };
  }
}
