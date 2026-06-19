import { Inject, Injectable } from '@nestjs/common';
import { Family } from '../domain/family';
import { FamilyNotFoundError } from '../domain/family.errors';
import { FAMILY_REPOSITORY, type FamilyRepository } from '../domain/ports/family.repository';
import { CLOCK, type Clock } from './ports/clock';
import { UNIT_OF_WORK, type UnitOfWork } from './ports/unit-of-work';

export interface UpdateFamilyCommand {
  /** OWNER autenticado que ejecuta la edición. */
  actingUserId: string;
  familyId: string;
  name?: string;
  description?: string;
}

/**
 * Caso de uso: el OWNER edita nombre y/o descripción de la familia.
 *
 * Actualización parcial: solo toca los campos presentes. Delega en
 * `Family.rename` (refresca `updatedAt`) y persiste por id. La autorización
 * (rol OWNER) la garantiza el `FamilyScopeGuard`. Devuelve el aggregate
 * actualizado para que la interfaz lo presente.
 */
@Injectable()
export class UpdateFamilyUseCase {
  constructor(
    @Inject(FAMILY_REPOSITORY) private readonly families: FamilyRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: UpdateFamilyCommand): Promise<Family> {
    const family = await this.families.findById(command.familyId);
    if (!family) {
      throw new FamilyNotFoundError();
    }

    family.rename({
      name: command.name,
      description: command.description,
      now: this.clock.now(),
    });

    await this.uow.run((repos) => repos.families.update(family), {
      actingUserId: command.actingUserId,
    });

    return family;
  }
}
