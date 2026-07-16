import { Inject, Injectable } from '@nestjs/common';
import { RoutineNotFoundError } from '../domain/routine.errors';
import {
  ROUTINE_REPOSITORY,
  type RoutineRepository,
} from '../domain/ports/routine.repository';
import { ROUTINES_CLOCK, type RoutinesClock } from './ports/clock';

export interface DeleteIncidentCommand {
  routineId: string;
  incidentId: string;
}

/** Caso de uso: eliminar una incidencia de la rutina. */
@Injectable()
export class DeleteIncidentUseCase {
  constructor(
    @Inject(ROUTINE_REPOSITORY) private readonly routines: RoutineRepository,
    @Inject(ROUTINES_CLOCK) private readonly clock: RoutinesClock,
  ) {}

  async execute(command: DeleteIncidentCommand): Promise<void> {
    const routine = await this.routines.findById(command.routineId);
    if (!routine) {
      throw new RoutineNotFoundError();
    }
    routine.removeIncident(command.incidentId, this.clock.now());
    await this.routines.save(routine);
  }
}
