import { Inject, Injectable } from '@nestjs/common';
import type { MembershipRole } from '../domain/membership-role';
import { FamilyNotFoundError } from '../domain/family.errors';
import { FAMILY_REPOSITORY, type FamilyRepository } from '../domain/ports/family.repository';
import { CLOCK, type Clock } from './ports/clock';
import { UNIT_OF_WORK, type UnitOfWork } from './ports/unit-of-work';

export interface ChangeMemberRoleCommand {
  /** OWNER autenticado que ejecuta el cambio. */
  actingUserId: string;
  familyId: string;
  /** Usuario cuyo rol se cambia. */
  targetUserId: string;
  /** Nuevo rol (OWNER o MEMBER). */
  role: MembershipRole;
}

/**
 * Caso de uso: el OWNER cambia el rol de un miembro (OWNER ↔ MEMBER).
 *
 * Delega en `Family.changeMemberRole`, que protege la invariante "al menos un
 * OWNER" (`LastOwnerError` al degradar al único propietario) y es idempotente.
 * El cambio se persiste por id de membership dentro de una transacción.
 */
@Injectable()
export class ChangeMemberRoleUseCase {
  constructor(
    @Inject(FAMILY_REPOSITORY) private readonly families: FamilyRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: ChangeMemberRoleCommand): Promise<void> {
    const family = await this.families.findById(command.familyId);
    if (!family) {
      throw new FamilyNotFoundError();
    }
    // Lanza NotAMemberError o LastOwnerError según corresponda.
    const membership = family.changeMemberRole(
      command.targetUserId,
      command.role,
      this.clock.now(),
    );

    await this.uow.run(
      (repos) => repos.memberships.updateRole(membership.id, membership.role),
      { actingUserId: command.actingUserId },
    );
  }
}
