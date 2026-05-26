import { Inject, Injectable } from '@nestjs/common';
import { Group } from '../domain/group';
import { CLOCK, type Clock } from '../../family/application/ports/clock';
import { ID_GENERATOR, type IdGenerator } from '../../family/application/ports/id-generator';
import { GROUP_UNIT_OF_WORK, type GroupUnitOfWork } from './ports/unit-of-work';

export interface CreateGroupCommand {
  actingUserId: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
}

/**
 * Caso de uso: crear una peña. El creador queda automáticamente como OWNER
 * (invariante del aggregate {@link Group}). La inserción de la peña y su
 * membership OWNER es atómica (Unit of Work).
 */
@Injectable()
export class CreateGroupUseCase {
  constructor(
    @Inject(GROUP_UNIT_OF_WORK) private readonly uow: GroupUnitOfWork,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: CreateGroupCommand): Promise<Group> {
    const group = Group.create({
      id: this.ids.generate(),
      name: command.name,
      description: command.description ?? null,
      imageUrl: command.imageUrl ?? null,
      ownerUserId: command.actingUserId,
      ownerMembershipId: this.ids.generate(),
      now: this.clock.now(),
    });

    await this.uow.run((repos) => repos.groups.create(group), {
      actingUserId: command.actingUserId,
    });

    return group;
  }
}
