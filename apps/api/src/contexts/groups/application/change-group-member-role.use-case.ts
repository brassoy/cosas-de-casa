import { Inject, Injectable } from '@nestjs/common';
import type { GroupRole } from '../domain/group-role';
import { GroupNotFoundError } from '../domain/group.errors';
import { GROUP_REPOSITORY, type GroupRepository } from '../domain/ports/group.repository';
import { CLOCK, type Clock } from '../../family/application/ports/clock';
import { GROUP_UNIT_OF_WORK, type GroupUnitOfWork } from './ports/unit-of-work';

export interface ChangeGroupMemberRoleCommand {
  /** OWNER autenticado que ejecuta el cambio. */
  actingUserId: string;
  groupId: string;
  /** Usuario cuyo rol se cambia. */
  targetUserId: string;
  /** Nuevo rol (OWNER o MEMBER). */
  role: GroupRole;
}

/**
 * Caso de uso: el OWNER cambia el rol de un miembro (OWNER ↔ MEMBER).
 *
 * Delega en `Group.changeMemberRole`, que protege la invariante "al menos un
 * OWNER" (`LastGroupOwnerError` al degradar al único propietario) y es
 * idempotente. El cambio se persiste por id de membership dentro de una
 * transacción.
 */
@Injectable()
export class ChangeGroupMemberRoleUseCase {
  constructor(
    @Inject(GROUP_REPOSITORY) private readonly groups: GroupRepository,
    @Inject(GROUP_UNIT_OF_WORK) private readonly uow: GroupUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: ChangeGroupMemberRoleCommand): Promise<void> {
    const group = await this.groups.findById(command.groupId);
    if (!group) {
      throw new GroupNotFoundError();
    }
    // Lanza NotAGroupMemberError o LastGroupOwnerError según corresponda.
    const membership = group.changeMemberRole(
      command.targetUserId,
      command.role,
      this.clock.now(),
    );

    await this.uow.run(
      (repos) => repos.groupMemberships.updateRole(membership.id, membership.role),
      { actingUserId: command.actingUserId },
    );
  }
}
