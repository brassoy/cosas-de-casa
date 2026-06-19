import { Inject, Injectable } from '@nestjs/common';
import { GroupNotFoundError } from '../domain/group.errors';
import { GROUP_REPOSITORY, type GroupRepository } from '../domain/ports/group.repository';
import { GROUP_UNIT_OF_WORK, type GroupUnitOfWork } from './ports/unit-of-work';

export interface ExpelGroupMemberCommand {
  /** OWNER autenticado que ejecuta la expulsión. */
  actingUserId: string;
  groupId: string;
  /** Usuario a expulsar. */
  targetUserId: string;
}

/**
 * Caso de uso: el OWNER expulsa a OTRO miembro de la peña.
 *
 * Carga el aggregate y delega en `Group.expelMember`, que prohíbe auto-expulsarse
 * (`CannotRemoveGroupSelfError` → para eso está `DELETE /members/me`) y protege
 * la invariante del último OWNER (`LastGroupOwnerError`). El borrado es
 * transaccional.
 *
 * La autorización (rol OWNER + pertenencia) la garantiza el `GroupScopeGuard`
 * en la capa de interfaz; aquí solo razonamos sobre invariantes de dominio.
 */
@Injectable()
export class ExpelGroupMemberUseCase {
  constructor(
    @Inject(GROUP_REPOSITORY) private readonly groups: GroupRepository,
    @Inject(GROUP_UNIT_OF_WORK) private readonly uow: GroupUnitOfWork,
  ) {}

  async execute(command: ExpelGroupMemberCommand): Promise<void> {
    const group = await this.groups.findById(command.groupId);
    if (!group) {
      throw new GroupNotFoundError();
    }
    // Lanza CannotRemoveGroupSelfError, NotAGroupMemberError o LastGroupOwnerError.
    const removed = group.expelMember(command.actingUserId, command.targetUserId);

    await this.uow.run((repos) => repos.groupMemberships.deleteById(removed.id), {
      actingUserId: command.actingUserId,
    });
  }
}
