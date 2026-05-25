import { Inject, Injectable } from '@nestjs/common';
import { ShoppingList } from '../domain/shopping-list';
import {
  SHOPPING_LIST_REPOSITORY,
  type ShoppingListRepository,
} from '../domain/ports/shopping-list.repository';
import { SHOPPING_CLOCK, type ShoppingClock } from './ports/clock';
import { SHOPPING_ID_GENERATOR, type ShoppingIdGenerator } from './ports/id-generator';

export interface CreateCustomListCommand {
  familyId: string;
  name: string;
  actingUserId: string;
}

/** Caso de uso: crear una lista CUSTOM para una familia. */
@Injectable()
export class CreateCustomListUseCase {
  constructor(
    @Inject(SHOPPING_LIST_REPOSITORY) private readonly lists: ShoppingListRepository,
    @Inject(SHOPPING_CLOCK) private readonly clock: ShoppingClock,
    @Inject(SHOPPING_ID_GENERATOR) private readonly ids: ShoppingIdGenerator,
  ) {}

  async execute(command: CreateCustomListCommand): Promise<ShoppingList> {
    const list = ShoppingList.create({
      id: this.ids.generate(),
      familyId: command.familyId,
      name: command.name,
      type: 'CUSTOM',
      createdBy: command.actingUserId,
      now: this.clock.now(),
    });

    await this.lists.create(list);
    return list;
  }
}
