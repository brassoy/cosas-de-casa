import { Inject, Injectable } from '@nestjs/common';
import { GroupNotFoundError, NotAGroupOwnerError } from '../domain/group.errors';
import { GROUP_REPOSITORY, type GroupRepository } from '../domain/ports/group.repository';
import { CLOCK, type Clock } from '../../family/application/ports/clock';
import { GROUP_UNIT_OF_WORK, type GroupUnitOfWork } from './ports/unit-of-work';

export interface RevokeActiveGroupPinCommand {
  actingUserId: string;
  groupId: string;
}

export interface RevokeActiveGroupPinResult {
  /** Cuántos PIN se revocaron (0 o 1). */
  revoked: number;
}

/**
 * Caso de uso: revocar el PIN activo de una peña (solo OWNER). Idempotente:
 * si no hay PIN activo, no falla y devuelve `revoked: 0`.
 */
@Injectable()
export class RevokeActiveGroupPinUseCase {
  constructor(
    @Inject(GROUP_REPOSITORY) private readonly groups: GroupRepository,
    @Inject(GROUP_UNIT_OF_WORK) private readonly uow: GroupUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: RevokeActiveGroupPinCommand): Promise<RevokeActiveGroupPinResult> {
    const group = await this.groups.findById(command.groupId);
    if (!group) {
      throw new GroupNotFoundError();
    }
    if (!group.isOwner(command.actingUserId)) {
      throw new NotAGroupOwnerError();
    }

    const now = this.clock.now();
    const revoked = await this.uow.run(
      (repos) => repos.groupJoinPins.revokeActiveByGroup(group.id, now),
      { actingUserId: command.actingUserId },
    );

    return { revoked };
  }
}
