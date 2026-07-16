import { Inject, Injectable } from '@nestjs/common';
import { Routine } from '../domain/routine';
import {
  RoutineItemArchivedError,
  RoutineItemNotFoundError,
  RoutineNotFoundError,
  RoutineOverlapError,
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
import { ROUTINES_ID_GENERATOR, type RoutinesIdGenerator } from './ports/id-generator';

export interface CreateRoutineCommand {
  familyId: string;
  startDate: string;
  name?: string;
  /** Items del catálogo seleccionados. Se ignora si hay duplicateFromRoutineId. */
  itemIds?: string[];
  /** Copia selección y asignaciones (sin incidencias) de otra rutina. */
  duplicateFromRoutineId?: string;
  createdBy: string;
}

/**
 * Caso de uso: crear la rutina de una semana.
 *
 * Las rutinas de una familia NO pueden solaparse: se valida contra el
 * repositorio (y el unique (family_id, start_date) actúa de backstop).
 */
@Injectable()
export class CreateRoutineUseCase {
  constructor(
    @Inject(ROUTINE_REPOSITORY) private readonly routines: RoutineRepository,
    @Inject(ROUTINE_ITEM_REPOSITORY) private readonly items: RoutineItemRepository,
    @Inject(ROUTINES_CLOCK) private readonly clock: RoutinesClock,
    @Inject(ROUTINES_ID_GENERATOR) private readonly ids: RoutinesIdGenerator,
  ) {}

  async execute(command: CreateRoutineCommand): Promise<Routine> {
    const now = this.clock.now();
    const routine = Routine.create({
      id: this.ids.generate(),
      familyId: command.familyId,
      startDate: command.startDate,
      name: command.name,
      createdBy: command.createdBy,
      now,
    });

    const overlapping = await this.routines.findOverlapping(
      command.familyId,
      command.startDate,
    );
    if (overlapping) {
      throw new RoutineOverlapError();
    }

    if (command.duplicateFromRoutineId) {
      await this.copyFrom(routine, command.duplicateFromRoutineId, command.familyId, now);
    } else if (command.itemIds && command.itemIds.length > 0) {
      await this.selectItems(routine, command.itemIds, command.familyId, now);
    }

    await this.routines.create(routine);
    return routine;
  }

  /** Copia selección (con sus snapshots) y asignaciones con ids nuevos. */
  private async copyFrom(
    routine: Routine,
    sourceRoutineId: string,
    familyId: string,
    now: Date,
  ): Promise<void> {
    const source = await this.routines.findById(sourceRoutineId);
    if (!source || source.familyId !== familyId) {
      throw new RoutineNotFoundError();
    }
    routine.setSelections(source.selections, now);
    for (const assignment of source.assignments) {
      routine.addAssignment(
        {
          id: this.ids.generate(),
          routineItemId: assignment.routineItemId,
          dayIndex: assignment.dayIndex,
          startTime: assignment.startTime,
          endTime: assignment.endTime,
        },
        now,
      );
    }
  }

  /** Selecciona items del catálogo tomando el snapshot de su regla actual. */
  private async selectItems(
    routine: Routine,
    itemIds: string[],
    familyId: string,
    now: Date,
  ): Promise<void> {
    const uniqueIds = [...new Set(itemIds)];
    const items = await this.items.findByIds(uniqueIds);
    const byId = new Map(items.map((item) => [item.id, item]));
    for (const itemId of uniqueIds) {
      const item = byId.get(itemId);
      if (!item || item.familyId !== familyId) {
        throw new RoutineItemNotFoundError();
      }
      if (item.isArchived) {
        throw new RoutineItemArchivedError();
      }
    }
    routine.setSelections(
      uniqueIds.map((itemId) => ({
        routineItemId: itemId,
        targetTimesPerWeek: byId.get(itemId)!.targetTimesPerWeek,
      })),
      now,
    );
  }
}
