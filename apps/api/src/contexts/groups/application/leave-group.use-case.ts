import { Inject, Injectable } from '@nestjs/common';
import { GroupNotFoundError } from '../domain/group.errors';
import { GROUP_REPOSITORY, type GroupRepository } from '../domain/ports/group.repository';
import { GROUP_UNIT_OF_WORK, type GroupUnitOfWork } from './ports/unit-of-work';

export interface LeaveGroupCommand {
  actingUserId: string;
  groupId: string;
}

/**
 * Caso de uso: salir de una peña.
 *
 * Carga el aggregate y delega en `Group.removeMember`, que protege la
 * invariante del último OWNER (lanza `LastGroupOwnerError` si el que sale es
 * el único propietario). El borrado se ejecuta en transacción.
 */
@Injectable()
export class LeaveGroupUseCase {
  constructor(
    @Inject(GROUP_REPOSITORY) private readonly groups: GroupRepository,
    @Inject(GROUP_UNIT_OF_WORK) private readonly uow: GroupUnitOfWork,
  ) {}

  async execute(command: LeaveGroupCommand): Promise<void> {
    const group = await this.groups.findById(command.groupId);
    if (!group) {
      throw new GroupNotFoundError();
    }
    // Lanza NotAGroupMemberError o LastGroupOwnerError según corresponda.
    const removed = group.removeMember(command.actingUserId);

    await this.uow.run((repos) => repos.groupMemberships.deleteById(removed.id), {
      actingUserId: command.actingUserId,
    });
  }
}
