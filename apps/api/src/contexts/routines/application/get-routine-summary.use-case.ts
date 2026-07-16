import { Inject, Injectable } from '@nestjs/common';
import type { RoutineSummaryDto } from '@cosasdecasa/contracts';
import { RoutineNotFoundError } from '../domain/routine.errors';
import {
  ROUTINE_REPOSITORY,
  type RoutineRepository,
} from '../domain/ports/routine.repository';
import {
  ROUTINE_ITEM_REPOSITORY,
  type RoutineItemRepository,
} from '../domain/ports/routine-item.repository';
import { computeRoutineSummary } from './routine-summary';

export interface GetRoutineSummaryCommand {
  routineId: string;
}

/** Caso de uso: resumen de tiempos y cumplimiento de una rutina. */
@Injectable()
export class GetRoutineSummaryUseCase {
  constructor(
    @Inject(ROUTINE_REPOSITORY) private readonly routines: RoutineRepository,
    @Inject(ROUTINE_ITEM_REPOSITORY) private readonly items: RoutineItemRepository,
  ) {}

  async execute(command: GetRoutineSummaryCommand): Promise<RoutineSummaryDto> {
    const routine = await this.routines.findById(command.routineId);
    if (!routine) {
      throw new RoutineNotFoundError();
    }
    const items = await this.items.findByIds(
      routine.selections.map((s) => s.routineItemId),
    );
    return computeRoutineSummary(routine, items);
  }
}
