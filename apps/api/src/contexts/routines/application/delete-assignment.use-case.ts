import { Inject, Injectable } from '@nestjs/common';
import { RoutineNotFoundError } from '../domain/routine.errors';
import {
  ROUTINE_REPOSITORY,
  type RoutineRepository,
} from '../domain/ports/routine.repository';
import { ROUTINES_CLOCK, type RoutinesClock } from './ports/clock';

export interface DeleteAssignmentCommand {
  routineId: string;
  assignmentId: string;
}

/** Caso de uso: quitar una asignación (sus incidencias caen en cascada). */
@Injectable()
export class DeleteAssignmentUseCase {
  constructor(
    @Inject(ROUTINE_REPOSITORY) private readonly routines: RoutineRepository,
    @Inject(ROUTINES_CLOCK) private readonly clock: RoutinesClock,
  ) {}

  async execute(command: DeleteAssignmentCommand): Promise<void> {
    const routine = await this.routines.findById(command.routineId);
    if (!routine) {
      throw new RoutineNotFoundError();
    }
    routine.removeAssignment(command.assignmentId, this.clock.now());
    await this.routines.save(routine);
  }
}
