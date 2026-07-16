import { Inject, Injectable } from '@nestjs/common';
import type { Routine, RoutineIncident } from '../domain/routine';
import { RoutineNotFoundError } from '../domain/routine.errors';
import {
  ROUTINE_REPOSITORY,
  type RoutineRepository,
} from '../domain/ports/routine.repository';
import { ROUTINES_CLOCK, type RoutinesClock } from './ports/clock';
import { ROUTINES_ID_GENERATOR, type RoutinesIdGenerator } from './ports/id-generator';

export interface CreateIncidentCommand {
  routineId: string;
  assignmentId: string;
  description: string;
  /** Minutos perdidos a descontar del tiempo real. */
  lostMinutes?: number;
  createdBy: string;
}

export interface CreateIncidentResult {
  routine: Routine;
  incident: RoutineIncident;
}

/** Caso de uso: abrir una incidencia sobre una asignación de la rutina. */
@Injectable()
export class CreateIncidentUseCase {
  constructor(
    @Inject(ROUTINE_REPOSITORY) private readonly routines: RoutineRepository,
    @Inject(ROUTINES_CLOCK) private readonly clock: RoutinesClock,
    @Inject(ROUTINES_ID_GENERATOR) private readonly ids: RoutinesIdGenerator,
  ) {}

  async execute(command: CreateIncidentCommand): Promise<CreateIncidentResult> {
    const routine = await this.routines.findById(command.routineId);
    if (!routine) {
      throw new RoutineNotFoundError();
    }

    const incident = routine.addIncident({
      id: this.ids.generate(),
      assignmentId: command.assignmentId,
      description: command.description,
      lostMinutes: command.lostMinutes ?? null,
      createdBy: command.createdBy,
      now: this.clock.now(),
    });

    await this.routines.save(routine);
    return { routine, incident };
  }
}
