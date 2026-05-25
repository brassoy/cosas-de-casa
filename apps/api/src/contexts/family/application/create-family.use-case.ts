import { Inject, Injectable } from '@nestjs/common';
import { Family } from '../domain/family';
import { CLOCK, type Clock } from './ports/clock';
import { ID_GENERATOR, type IdGenerator } from './ports/id-generator';
import { UNIT_OF_WORK, type UnitOfWork } from './ports/unit-of-work';

export interface CreateFamilyCommand {
  actingUserId: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
}

/**
 * Caso de uso: crear una familia. El creador queda automáticamente como OWNER
 * (invariante del aggregate {@link Family}). La inserción de la familia y su
 * membership OWNER es atómica (Unit of Work).
 */
@Injectable()
export class CreateFamilyUseCase {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: CreateFamilyCommand): Promise<Family> {
    const family = Family.create({
      id: this.ids.generate(),
      name: command.name,
      description: command.description ?? null,
      imageUrl: command.imageUrl ?? null,
      ownerUserId: command.actingUserId,
      ownerMembershipId: this.ids.generate(),
      now: this.clock.now(),
    });

    await this.uow.run((repos) => repos.families.create(family), {
      actingUserId: command.actingUserId,
    });

    return family;
  }
}
