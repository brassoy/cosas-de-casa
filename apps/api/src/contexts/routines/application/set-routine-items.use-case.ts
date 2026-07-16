import { Inject, Injectable } from '@nestjs/common';
import type { Routine } from '../domain/routine';
import {
  RoutineItemArchivedError,
  RoutineItemNotFoundError,
  RoutineNotFoundError,
} from '../domain/routine.errors';
import {
  ROUTINE_REPOSITORY,
  type RoutineRepository,
} from '../domain/ports/routine.repository';
import {
  ROUTINE_ITEM_REPOSITORY,
  type RoutineItemRepository,
} from '../domain/ports/routine-item.repository';
import { ROUTINES_CLOCK, type RoutinesClock } from './ports/clock';

export interface SetRoutineItemsCommand {
  routineId: string;
  itemIds: string[];
}

/**
 * Caso de uso: reemplazar la selección de items de una rutina.
 *
 * Los items que siguen conservan su snapshot de target; los nuevos toman la
 * regla actual del catálogo (y no pueden estar archivados); los quitados
 * pierden sus asignaciones e incidencias en cascada.
 */
@Injectable()
export class SetRoutineItemsUseCase {
  constructor(
    @Inject(ROUTINE_REPOSITORY) private readonly routines: RoutineRepository,
    @Inject(ROUTINE_ITEM_REPOSITORY) private readonly items: RoutineItemRepository,
    @Inject(ROUTINES_CLOCK) private readonly clock: RoutinesClock,
  ) {}

  async execute(command: SetRoutineItemsCommand): Promise<Routine> {
    const routine = await this.routines.findById(command.routineId);
    if (!routine) {
      throw new RoutineNotFoundError();
    }

    const uniqueIds = [...new Set(command.itemIds)];
    const items = await this.items.findByIds(uniqueIds);
    const byId = new Map(items.map((item) => [item.id, item]));
    const alreadySelected = new Set(routine.selections.map((s) => s.routineItemId));

    for (const itemId of uniqueIds) {
      const item = byId.get(itemId);
      if (!item || item.familyId !== routine.familyId) {
        throw new RoutineItemNotFoundError();
      }
      // Un item archivado puede SEGUIR seleccionado, pero no añadirse de nuevo.
      if (item.isArchived && !alreadySelected.has(itemId)) {
        throw new RoutineItemArchivedError();
      }
    }

    routine.setSelections(
      uniqueIds.map((itemId) => ({
        routineItemId: itemId,
        targetTimesPerWeek: byId.get(itemId)!.targetTimesPerWeek,
      })),
      this.clock.now(),
    );

    await this.routines.save(routine);
    return routine;
  }
}
