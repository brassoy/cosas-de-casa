import { Inject, Injectable } from '@nestjs/common';
import type { Routine, RoutineAssignment } from '../domain/routine';
import {
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
import { ROUTINES_ID_GENERATOR, type RoutinesIdGenerator } from './ports/id-generator';

export interface CreateAssignmentCommand {
  routineId: string;
  routineItemId: string;
  dayIndex: number;
  /** Si se omite la ventana, se usa la del item del catálogo. */
  startTime?: string;
  endTime?: string;
}

export interface CreateAssignmentResult {
  routine: Routine;
  assignment: RoutineAssignment;
}

/** Caso de uso: asignar un item seleccionado a un día de la rutina. */
@Injectable()
export class CreateAssignmentUseCase {
  constructor(
    @Inject(ROUTINE_REPOSITORY) private readonly routines: RoutineRepository,
    @Inject(ROUTINE_ITEM_REPOSITORY) private readonly items: RoutineItemRepository,
    @Inject(ROUTINES_CLOCK) private readonly clock: RoutinesClock,
    @Inject(ROUTINES_ID_GENERATOR) private readonly ids: RoutinesIdGenerator,
  ) {}

  async execute(command: CreateAssignmentCommand): Promise<CreateAssignmentResult> {
    const routine = await this.routines.findById(command.routineId);
    if (!routine) {
      throw new RoutineNotFoundError();
    }

    let startTime = command.startTime;
    let endTime = command.endTime;
    if (startTime === undefined || endTime === undefined) {
      const item = await this.items.findById(command.routineItemId);
      if (!item) {
        throw new RoutineItemNotFoundError();
      }
      startTime ??= item.defaultStartTime;
      endTime ??= item.defaultEndTime;
    }

    const assignment = routine.addAssignment(
      {
        id: this.ids.generate(),
        routineItemId: command.routineItemId,
        dayIndex: command.dayIndex,
        startTime,
        endTime,
      },
      this.clock.now(),
    );

    await this.routines.save(routine);
    return { routine, assignment };
  }
}
