import { Inject, Injectable } from '@nestjs/common';
import type { Routine } from '../domain/routine';
import { RoutineNotFoundError } from '../domain/routine.errors';
import {
  ROUTINE_REPOSITORY,
  type RoutineRepository,
} from '../domain/ports/routine.repository';

export interface GetRoutineCommand {
  routineId: string;
}

/** Caso de uso: obtener una rutina hidratada por su id. */
@Injectable()
export class GetRoutineUseCase {
  constructor(
    @Inject(ROUTINE_REPOSITORY) private readonly routines: RoutineRepository,
  ) {}

  async execute(command: GetRoutineCommand): Promise<Routine> {
    const routine = await this.routines.findById(command.routineId);
    if (!routine) {
      throw new RoutineNotFoundError();
    }
    return routine;
  }
}
