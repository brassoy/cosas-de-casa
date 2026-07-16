import { Inject, Injectable } from '@nestjs/common';
import type { RoutineItem } from '../domain/routine-item';
import { RoutineItemNotFoundError } from '../domain/routine.errors';
import {
  ROUTINE_ITEM_REPOSITORY,
  type RoutineItemRepository,
} from '../domain/ports/routine-item.repository';
import { ROUTINES_CLOCK, type RoutinesClock } from './ports/clock';

export interface UpdateRoutineItemCommand {
  itemId: string;
  name?: string;
  targetTimesPerWeek?: number;
  defaultStartTime?: string;
  defaultEndTime?: string;
  tags?: string[];
  /** true archiva el item; false lo restaura. */
  archived?: boolean;
}

/** Caso de uso: editar un item del catálogo (incluye archivar/restaurar). */
@Injectable()
export class UpdateRoutineItemUseCase {
  constructor(
    @Inject(ROUTINE_ITEM_REPOSITORY) private readonly items: RoutineItemRepository,
    @Inject(ROUTINES_CLOCK) private readonly clock: RoutinesClock,
  ) {}

  async execute(command: UpdateRoutineItemCommand): Promise<RoutineItem> {
    const item = await this.items.findById(command.itemId);
    if (!item) {
      throw new RoutineItemNotFoundError();
    }

    const now = this.clock.now();
    item.update(
      {
        name: command.name,
        targetTimesPerWeek: command.targetTimesPerWeek,
        defaultStartTime: command.defaultStartTime,
        defaultEndTime: command.defaultEndTime,
        tags: command.tags,
      },
      now,
    );
    if (command.archived === true) item.archive(now);
    if (command.archived === false) item.restore(now);

    await this.items.update(item);
    return item;
  }
}
