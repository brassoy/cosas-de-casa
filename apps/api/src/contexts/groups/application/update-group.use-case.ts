import { Inject, Injectable } from '@nestjs/common';
import { Group } from '../domain/group';
import { GroupNotFoundError } from '../domain/group.errors';
import { GROUP_REPOSITORY, type GroupRepository } from '../domain/ports/group.repository';
import { CLOCK, type Clock } from '../../family/application/ports/clock';
import { GROUP_UNIT_OF_WORK, type GroupUnitOfWork } from './ports/unit-of-work';

export interface UpdateGroupCommand {
  /** OWNER autenticado que ejecuta la edición. */
  actingUserId: string;
  groupId: string;
  name?: string;
  description?: string;
}

/**
 * Caso de uso: el OWNER edita nombre y/o descripción de la peña.
 *
 * Actualización parcial: solo toca los campos presentes. Delega en
 * `Group.rename` (refresca `updatedAt`) y persiste por id. La autorización
 * (rol OWNER) la garantiza el `GroupScopeGuard`. Devuelve el aggregate
 * actualizado para que la interfaz lo presente.
 */
@Injectable()
export class UpdateGroupUseCase {
  constructor(
    @Inject(GROUP_REPOSITORY) private readonly groups: GroupRepository,
    @Inject(GROUP_UNIT_OF_WORK) private readonly uow: GroupUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: UpdateGroupCommand): Promise<Group> {
    const group = await this.groups.findById(command.groupId);
    if (!group) {
      throw new GroupNotFoundError();
    }

    group.rename({
      name: command.name,
      description: command.description,
      now: this.clock.now(),
    });

    await this.uow.run((repos) => repos.groups.update(group), {
      actingUserId: command.actingUserId,
    });

    return group;
  }
}
