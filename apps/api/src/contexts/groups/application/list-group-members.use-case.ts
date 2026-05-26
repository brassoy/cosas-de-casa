import { Inject, Injectable } from '@nestjs/common';
import { Group } from '../domain/group';
import { GroupNotFoundError, NotAGroupMemberError } from '../domain/group.errors';
import { GROUP_REPOSITORY, type GroupRepository } from '../domain/ports/group.repository';
import {
  GROUP_MEMBERS_READ_MODEL,
  type GroupMembersReadModel,
  type GroupMemberView,
} from './ports/group-members-read-model';

export interface ListGroupMembersQuery {
  actingUserId: string;
  groupId: string;
}

/**
 * Caso de uso: listar los miembros de una peña. El solicitante debe ser
 * miembro (también lo refuerza el GroupScopeGuard).
 */
@Injectable()
export class ListGroupMembersUseCase {
  constructor(
    @Inject(GROUP_REPOSITORY) private readonly groups: GroupRepository,
    @Inject(GROUP_MEMBERS_READ_MODEL) private readonly membersReadModel: GroupMembersReadModel,
  ) {}

  async execute(query: ListGroupMembersQuery): Promise<{ group: Group; members: GroupMemberView[] }> {
    const group = await this.groups.findById(query.groupId);
    if (!group) {
      throw new GroupNotFoundError();
    }
    if (!group.isMember(query.actingUserId)) {
      throw new NotAGroupMemberError();
    }
    const members = await this.membersReadModel.listByGroup(query.groupId);
    return { group, members };
  }
}
