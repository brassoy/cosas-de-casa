import { Inject, Injectable } from '@nestjs/common';
import { FamilyNotFoundError } from '../domain/family.errors';
import { FAMILY_REPOSITORY, type FamilyRepository } from '../domain/ports/family.repository';
import { UNIT_OF_WORK, type UnitOfWork } from './ports/unit-of-work';

export interface ExpelMemberCommand {
  /** OWNER autenticado que ejecuta la expulsión. */
  actingUserId: string;
  familyId: string;
  /** Usuario a expulsar. */
  targetUserId: string;
}

/**
 * Caso de uso: el OWNER expulsa a OTRO miembro de la familia.
 *
 * Carga el aggregate y delega en `Family.expelMember`, que prohíbe auto-expulsarse
 * (`CannotRemoveSelfError` → para eso está `DELETE /members/me`) y protege la
 * invariante del último OWNER (`LastOwnerError`). El borrado es transaccional.
 *
 * La autorización (rol OWNER + pertenencia) la garantiza el `FamilyScopeGuard`
 * en la capa de interfaz; aquí solo razonamos sobre invariantes de dominio.
 */
@Injectable()
export class ExpelMemberUseCase {
  constructor(
    @Inject(FAMILY_REPOSITORY) private readonly families: FamilyRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
  ) {}

  async execute(command: ExpelMemberCommand): Promise<void> {
    const family = await this.families.findById(command.familyId);
    if (!family) {
      throw new FamilyNotFoundError();
    }
    // Lanza CannotRemoveSelfError, NotAMemberError o LastOwnerError según el caso.
    const removed = family.expelMember(command.actingUserId, command.targetUserId);

    await this.uow.run((repos) => repos.memberships.deleteById(removed.id), {
      actingUserId: command.actingUserId,
    });
  }
}
