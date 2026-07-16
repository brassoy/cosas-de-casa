import { Inject, Injectable } from '@nestjs/common';
import { RoutineItem } from '../domain/routine-item';
import {
  ROUTINE_ITEM_REPOSITORY,
  type RoutineItemRepository,
} from '../domain/ports/routine-item.repository';
import { ROUTINES_CLOCK, type RoutinesClock } from './ports/clock';
import { ROUTINES_ID_GENERATOR, type RoutinesIdGenerator } from './ports/id-generator';

export interface CreateRoutineItemCommand {
  familyId: string;
  name: string;
  targetTimesPerWeek: number;
  defaultStartTime: string;
  defaultEndTime: string;
  tags?: string[];
}

/** Caso de uso: crear un item del catálogo de rutinas de la familia. */
@Injectable()
export class CreateRoutineItemUseCase {
  constructor(
    @Inject(ROUTINE_ITEM_REPOSITORY) private readonly items: RoutineItemRepository,
    @Inject(ROUTINES_CLOCK) private readonly clock: RoutinesClock,
    @Inject(ROUTINES_ID_GENERATOR) private readonly ids: RoutinesIdGenerator,
  ) {}

  async execute(command: CreateRoutineItemCommand): Promise<RoutineItem> {
    const item = RoutineItem.create({
      id: this.ids.generate(),
      familyId: command.familyId,
      name: command.name,
      targetTimesPerWeek: command.targetTimesPerWeek,
      defaultStartTime: command.defaultStartTime,
      defaultEndTime: command.defaultEndTime,
      tags: command.tags,
      now: this.clock.now(),
    });

    await this.items.create(item);
    return item;
  }
}
