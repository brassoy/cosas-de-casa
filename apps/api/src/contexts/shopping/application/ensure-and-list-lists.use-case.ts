import { Inject, Injectable } from '@nestjs/common';
import { ShoppingList } from '../domain/shopping-list';
import {
  SHOPPING_LIST_REPOSITORY,
  type ShoppingListRepository,
} from '../domain/ports/shopping-list.repository';
import { SHOPPING_CLOCK, type ShoppingClock } from './ports/clock';
import { SHOPPING_ID_GENERATOR, type ShoppingIdGenerator } from './ports/id-generator';

export interface EnsureAndListListsCommand {
  familyId: string;
  actingUserId: string;
}

/**
 * Caso de uso: listar todas las listas de la compra de una familia.
 *
 * Si la familia no tiene todavía lista MAIN, la crea en este momento
 * (provisioning perezoso). Así el frontend siempre recibe al menos una lista.
 */
@Injectable()
export class EnsureAndListListsUseCase {
  constructor(
    @Inject(SHOPPING_LIST_REPOSITORY) private readonly lists: ShoppingListRepository,
    @Inject(SHOPPING_CLOCK) private readonly clock: ShoppingClock,
    @Inject(SHOPPING_ID_GENERATOR) private readonly ids: ShoppingIdGenerator,
  ) {}

  async execute(command: EnsureAndListListsCommand): Promise<ShoppingList[]> {
    let all = await this.lists.findByFamily(command.familyId);

    const hasMain = all.some((l) => l.isMain);
    if (!hasMain) {
      const mainList = ShoppingList.createMain(
        {
          id: this.ids.generate(),
          familyId: command.familyId,
          createdBy: command.actingUserId,
          now: this.clock.now(),
        },
        null,
      );
      await this.lists.create(mainList);
      all = [mainList, ...all];
    }

    return all;
  }
}
