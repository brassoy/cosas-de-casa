import { Inject, Injectable } from '@nestjs/common';
import { FamilyNotFoundError } from '../domain/family.errors';
import { FAMILY_REPOSITORY, type FamilyRepository } from '../domain/ports/family.repository';
import { UNIT_OF_WORK, type UnitOfWork } from './ports/unit-of-work';

export interface DeleteFamilyCommand {
  /** OWNER autenticado que ejecuta el borrado. */
  actingUserId: string;
  familyId: string;
}

/**
 * Caso de uso: el OWNER borra la familia por completo.
 *
 * Verifica que existe y delega el borrado al repositorio. La cascada de la BD
 * (`ON DELETE CASCADE`) elimina memberships, PINs, listas, tareas, eventos, etc.
 * La autorización (rol OWNER) la garantiza el `FamilyScopeGuard`. El borrado se
 * ejecuta en transacción para fijar el contexto de identidad (RLS).
 */
@Injectable()
export class DeleteFamilyUseCase {
  constructor(
    @Inject(FAMILY_REPOSITORY) private readonly families: FamilyRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
  ) {}

  async execute(command: DeleteFamilyCommand): Promise<void> {
    const family = await this.families.findById(command.familyId);
    if (!family) {
      throw new FamilyNotFoundError();
    }

    await this.uow.run((repos) => repos.families.delete(command.familyId), {
      actingUserId: command.actingUserId,
    });
  }
}
