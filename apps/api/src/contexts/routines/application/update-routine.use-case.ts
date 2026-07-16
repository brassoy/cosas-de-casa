import { Inject, Injectable } from '@nestjs/common';
import type { Routine } from '../domain/routine';
import { RoutineNotFoundError } from '../domain/routine.errors';
import {
  ROUTINE_REPOSITORY,
  type RoutineRepository,
} from '../domain/ports/routine.repository';
import { ROUTINES_CLOCK, type RoutinesClock } from './ports/clock';

export interface UpdateRoutineCommand {
  routineId: string;
  /** Nueva etiqueta; null la borra. startDate es inmutable. */
  name?: string | null;
}

/** Caso de uso: editar la etiqueta de una rutina. */
@Injectable()
export class UpdateRoutineUseCase {
  constructor(
    @Inject(ROUTINE_REPOSITORY) private readonly routines: RoutineRepository,
    @Inject(ROUTINES_CLOCK) private readonly clock: RoutinesClock,
  ) {}

  async execute(command: UpdateRoutineCommand): Promise<Routine> {
    const routine = await this.routines.findById(command.routineId);
    if (!routine) {
      throw new RoutineNotFoundError();
    }
    if (command.name !== undefined) {
      routine.rename(command.name, this.clock.now());
      await this.routines.save(routine);
    }
    return routine;
  }
}
