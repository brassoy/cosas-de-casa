import { Inject, Injectable } from '@nestjs/common';
import { RoutineItemNotFoundError } from '../domain/routine.errors';
import {
  ROUTINE_ITEM_REPOSITORY,
  type RoutineItemRepository,
} from '../domain/ports/routine-item.repository';
import { ROUTINES_CLOCK, type RoutinesClock } from './ports/clock';

export interface DeleteRoutineItemCommand {
  itemId: string;
}

export interface DeleteRoutineItemResult {
  /** true si el item estaba referenciado y se archivó en lugar de borrarse. */
  archived: boolean;
}

/**
 * Caso de uso: eliminar un item del catálogo.
 *
 * Si alguna rutina lo referencia (FK restrict protege el histórico de stats),
 * se ARCHIVA en su lugar; si nunca se usó, se borra de verdad.
 */
@Injectable()
export class DeleteRoutineItemUseCase {
  constructor(
    @Inject(ROUTINE_ITEM_REPOSITORY) private readonly items: RoutineItemRepository,
    @Inject(ROUTINES_CLOCK) private readonly clock: RoutinesClock,
  ) {}

  async execute(command: DeleteRoutineItemCommand): Promise<DeleteRoutineItemResult> {
    const item = await this.items.findById(command.itemId);
    if (!item) {
      throw new RoutineItemNotFoundError();
    }

    if (await this.items.isReferenced(item.id)) {
      item.archive(this.clock.now());
      await this.items.update(item);
      return { archived: true };
    }

    await this.items.deleteById(item.id);
    return { archived: false };
  }
}
