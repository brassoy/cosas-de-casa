import { Inject, Injectable } from '@nestjs/common';
import type { Routine, RoutineIncident } from '../domain/routine';
import { RoutineNotFoundError } from '../domain/routine.errors';
import {
  ROUTINE_REPOSITORY,
  type RoutineRepository,
} from '../domain/ports/routine.repository';
import { ROUTINES_CLOCK, type RoutinesClock } from './ports/clock';

export interface UpdateIncidentCommand {
  routineId: string;
  incidentId: string;
  description?: string;
  /** null borra los minutos perdidos; undefined no los toca. */
  lostMinutes?: number | null;
}

export interface UpdateIncidentResult {
  routine: Routine;
  incident: RoutineIncident;
}

/** Caso de uso: editar una incidencia (descripción y/o minutos perdidos). */
@Injectable()
export class UpdateIncidentUseCase {
  constructor(
    @Inject(ROUTINE_REPOSITORY) private readonly routines: RoutineRepository,
    @Inject(ROUTINES_CLOCK) private readonly clock: RoutinesClock,
  ) {}

  async execute(command: UpdateIncidentCommand): Promise<UpdateIncidentResult> {
    const routine = await this.routines.findById(command.routineId);
    if (!routine) {
      throw new RoutineNotFoundError();
    }

    const incident = routine.updateIncident(
      command.incidentId,
      { description: command.description, lostMinutes: command.lostMinutes },
      this.clock.now(),
    );

    await this.routines.save(routine);
    return { routine, incident };
  }
}
