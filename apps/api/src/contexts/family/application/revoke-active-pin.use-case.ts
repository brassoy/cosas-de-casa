import { Inject, Injectable } from '@nestjs/common';
import { FamilyNotFoundError, NotAnOwnerError } from '../domain/family.errors';
import { FAMILY_REPOSITORY, type FamilyRepository } from '../domain/ports/family.repository';
import { CLOCK, type Clock } from './ports/clock';
import { UNIT_OF_WORK, type UnitOfWork } from './ports/unit-of-work';

export interface RevokeActivePinCommand {
  actingUserId: string;
  familyId: string;
}

export interface RevokeActivePinResult {
  /** Cuántos PIN se revocaron (0 o 1). */
  revoked: number;
}

/**
 * Caso de uso: revocar el PIN activo de una familia (solo OWNER). Idempotente:
 * si no hay PIN activo, no falla y devuelve `revoked: 0`.
 */
@Injectable()
export class RevokeActivePinUseCase {
  constructor(
    @Inject(FAMILY_REPOSITORY) private readonly families: FamilyRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: RevokeActivePinCommand): Promise<RevokeActivePinResult> {
    const family = await this.families.findById(command.familyId);
    if (!family) {
      throw new FamilyNotFoundError();
    }
    if (!family.isOwner(command.actingUserId)) {
      throw new NotAnOwnerError();
    }

    const now = this.clock.now();
    const revoked = await this.uow.run(
      (repos) => repos.joinPins.revokeActiveByFamily(family.id, now),
      { actingUserId: command.actingUserId },
    );

    return { revoked };
  }
}
