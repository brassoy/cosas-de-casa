import { Inject, Injectable } from '@nestjs/common';
import { FamilyNotFoundError } from '../domain/family.errors';
import { FAMILY_REPOSITORY, type FamilyRepository } from '../domain/ports/family.repository';
import { UNIT_OF_WORK, type UnitOfWork } from './ports/unit-of-work';

export interface LeaveFamilyCommand {
  actingUserId: string;
  familyId: string;
}

/**
 * Caso de uso: salir de una familia.
 *
 * Carga el aggregate y delega en `Family.removeMember`, que protege la
 * invariante del último OWNER (lanza `LastOwnerError` si el que sale es el
 * único propietario). El borrado se ejecuta en transacción.
 */
@Injectable()
export class LeaveFamilyUseCase {
  constructor(
    @Inject(FAMILY_REPOSITORY) private readonly families: FamilyRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
  ) {}

  async execute(command: LeaveFamilyCommand): Promise<void> {
    const family = await this.families.findById(command.familyId);
    if (!family) {
      throw new FamilyNotFoundError();
    }
    // Lanza NotAMemberError o LastOwnerError según corresponda.
    const removed = family.removeMember(command.actingUserId);

    await this.uow.run((repos) => repos.memberships.deleteById(removed.id), {
      actingUserId: command.actingUserId,
    });
  }
}
