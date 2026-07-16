import { Inject, Injectable } from '@nestjs/common';
import { RoutineNotFoundError } from '../domain/routine.errors';
import {
  ROUTINE_REPOSITORY,
  type RoutineRepository,
} from '../domain/ports/routine.repository';

export interface DeleteRoutineCommand {
  routineId: string;
}

/** Caso de uso: eliminar una rutina (hijos en cascade). */
@Injectable()
export class DeleteRoutineUseCase {
  constructor(
    @Inject(ROUTINE_REPOSITORY) private readonly routines: RoutineRepository,
  ) {}

  async execute(command: DeleteRoutineCommand): Promise<void> {
    const routine = await this.routines.findById(command.routineId);
    if (!routine) {
      throw new RoutineNotFoundError();
    }
    await this.routines.deleteById(routine.id);
  }
}
