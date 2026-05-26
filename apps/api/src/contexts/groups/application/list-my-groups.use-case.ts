import { Inject, Injectable } from '@nestjs/common';
import type { Group } from '../domain/group';
import { GROUP_REPOSITORY, type GroupRepository } from '../domain/ports/group.repository';

export interface ListMyGroupsQuery {
  actingUserId: string;
}

/**
 * Caso de uso: listar las peñas a las que pertenece el usuario autenticado.
 */
@Injectable()
export class ListMyGroupsUseCase {
  constructor(@Inject(GROUP_REPOSITORY) private readonly groups: GroupRepository) {}

  execute(query: ListMyGroupsQuery): Promise<Group[]> {
    return this.groups.findByMember(query.actingUserId);
  }
}
