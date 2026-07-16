import { Inject, Injectable } from '@nestjs/common';
import type { Routine } from '../domain/routine';
import {
  ROUTINE_REPOSITORY,
  type RoutineRepository,
} from '../domain/ports/routine.repository';

export interface ListRoutinesCommand {
  familyId: string;
  /** Rutinas cuyo rango solapa [from, to] (fechas YYYY-MM-DD). */
  from?: string;
  to?: string;
}

/** Caso de uso: listar las rutinas de una familia (hidratadas). */
@Injectable()
export class ListRoutinesUseCase {
  constructor(
    @Inject(ROUTINE_REPOSITORY) private readonly routines: RoutineRepository,
  ) {}

  async execute(command: ListRoutinesCommand): Promise<Routine[]> {
    return this.routines.findByFamily(command.familyId, {
      from: command.from,
      to: command.to,
    });
  }
}
