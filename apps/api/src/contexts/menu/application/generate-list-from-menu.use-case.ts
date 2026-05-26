import { Inject, Injectable } from '@nestjs/common';
import {
  SHOPPING_LIST_REPOSITORY,
  type ShoppingListRepository,
} from '../../shopping/domain/ports/shopping-list.repository';
import { AddItemUseCase } from '../../shopping/application/add-item.use-case';
import { EnsureAndListListsUseCase } from '../../shopping/application/ensure-and-list-lists.use-case';

export interface GenerateListFromMenuCommand {
  familyId: string;
  actingUserId: string;
  ingredients: string[];
  listId?: string;
}

export interface GenerateListFromMenuResult {
  listId: string;
  listName: string;
  itemsAdded: number;
  ingredients: string[];
}

/**
 * Caso de uso: añadir los ingredientes de un menú a una lista de la compra.
 *
 * NO usa IA → 100% funcional y testeable sin mocks de IA.
 * Reutiliza AddItemUseCase del contexto shopping.
 */
@Injectable()
export class GenerateListFromMenuUseCase {
  constructor(
    @Inject(SHOPPING_LIST_REPOSITORY) private readonly lists: ShoppingListRepository,
    private readonly addItem: AddItemUseCase,
    private readonly ensureAndListLists: EnsureAndListListsUseCase,
  ) {}

  async execute(command: GenerateListFromMenuCommand): Promise<GenerateListFromMenuResult> {
    let targetListId = command.listId;

    if (targetListId) {
      // Verificar que la lista existe y pertenece a la familia
      const list = await this.lists.findById(targetListId);
      if (!list || list.familyId !== command.familyId) {
        // Si no existe o es de otra familia, usar la lista principal
        targetListId = undefined;
      }
    }

    if (!targetListId) {
      // Obtener o crear la lista principal de la familia
      const familyLists = await this.ensureAndListLists.execute({
        familyId: command.familyId,
        actingUserId: command.actingUserId,
      });
      const mainList = familyLists.find((l) => l.isMain) ?? familyLists[0] ?? null;
      if (!mainList) {
        throw new Error('No se encontró ninguna lista de la compra para esta familia.');
      }
      targetListId = mainList.id;
    }

    const targetList = await this.lists.findById(targetListId);
    const listName = targetList?.name ?? 'Lista de la compra';

    // Añadir cada ingrediente como ítem a la lista
    let added = 0;
    for (const ingredient of command.ingredients) {
      if (ingredient.trim()) {
        await this.addItem.execute({
          listId: targetListId,
          actingUserId: command.actingUserId,
          name: ingredient.trim(),
        });
        added++;
      }
    }

    return {
      listId: targetListId,
      listName,
      itemsAdded: added,
      ingredients: command.ingredients,
    };
  }
}
