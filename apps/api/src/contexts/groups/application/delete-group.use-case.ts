import { Inject, Injectable } from '@nestjs/common';
import { GroupNotFoundError } from '../domain/group.errors';
import { GROUP_REPOSITORY, type GroupRepository } from '../domain/ports/group.repository';
import { GROUP_UNIT_OF_WORK, type GroupUnitOfWork } from './ports/unit-of-work';

export interface DeleteGroupCommand {
  /** OWNER autenticado que ejecuta el borrado. */
  actingUserId: string;
  groupId: string;
}

/**
 * Caso de uso: el OWNER borra la peña por completo.
 *
 * Verifica que existe y delega el borrado al repositorio. La cascada de la BD
 * (`ON DELETE CASCADE`) elimina memberships, PINs, etc. La autorización (rol
 * OWNER) la garantiza el `GroupScopeGuard`. El borrado se ejecuta en
 * transacción para fijar el contexto de identidad (RLS).
 */
@Injectable()
export class DeleteGroupUseCase {
  constructor(
    @Inject(GROUP_REPOSITORY) private readonly groups: GroupRepository,
    @Inject(GROUP_UNIT_OF_WORK) private readonly uow: GroupUnitOfWork,
  ) {}

  async execute(command: DeleteGroupCommand): Promise<void> {
    const group = await this.groups.findById(command.groupId);
    if (!group) {
      throw new GroupNotFoundError();
    }

    await this.uow.run((repos) => repos.groups.delete(command.groupId), {
      actingUserId: command.actingUserId,
    });
  }
}
