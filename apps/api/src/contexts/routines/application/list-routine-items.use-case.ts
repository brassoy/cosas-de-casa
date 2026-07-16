import { Inject, Injectable } from '@nestjs/common';
import type { RoutineItem } from '../domain/routine-item';
import {
  ROUTINE_ITEM_REPOSITORY,
  type RoutineItemRepository,
} from '../domain/ports/routine-item.repository';

export interface ListRoutineItemsCommand {
  familyId: string;
  includeArchived?: boolean;
}

/** Caso de uso: listar el catálogo de items de rutina de una familia. */
@Injectable()
export class ListRoutineItemsUseCase {
  constructor(
    @Inject(ROUTINE_ITEM_REPOSITORY) private readonly items: RoutineItemRepository,
  ) {}

  async execute(command: ListRoutineItemsCommand): Promise<RoutineItem[]> {
    return this.items.findByFamily(command.familyId, {
      includeArchived: command.includeArchived ?? false,
    });
  }
}
