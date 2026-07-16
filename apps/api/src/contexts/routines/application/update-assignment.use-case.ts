import { Inject, Injectable } from '@nestjs/common';
import type { Routine, RoutineAssignment } from '../domain/routine';
import { RoutineNotFoundError } from '../domain/routine.errors';
import {
  ROUTINE_REPOSITORY,
  type RoutineRepository,
} from '../domain/ports/routine.repository';
import { ROUTINES_CLOCK, type RoutinesClock } from './ports/clock';

export interface UpdateAssignmentCommand {
  routineId: string;
  assignmentId: string;
  dayIndex?: number;
  startTime?: string;
  endTime?: string;
}

export interface UpdateAssignmentResult {
  routine: Routine;
  assignment: RoutineAssignment;
}

/** Caso de uso: mover una asignación de día o ajustar su ventana horaria. */
@Injectable()
export class UpdateAssignmentUseCase {
  constructor(
    @Inject(ROUTINE_REPOSITORY) private readonly routines: RoutineRepository,
    @Inject(ROUTINES_CLOCK) private readonly clock: RoutinesClock,
  ) {}

  async execute(command: UpdateAssignmentCommand): Promise<UpdateAssignmentResult> {
    const routine = await this.routines.findById(command.routineId);
    if (!routine) {
      throw new RoutineNotFoundError();
    }

    const assignment = routine.updateAssignment(
      command.assignmentId,
      {
        dayIndex: command.dayIndex,
        startTime: command.startTime,
        endTime: command.endTime,
      },
      this.clock.now(),
    );

    await this.routines.save(routine);
    return { routine, assignment };
  }
}
