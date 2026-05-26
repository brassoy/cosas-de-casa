import type {
  ShoppingListSummaryDto,
  ListWithItemsDto,
  ShoppingItemDto,
  ItemCommentDto,
  AddItemResultDto,
} from '@cosasdecasa/contracts';
import type { ItemComment, ShoppingItem, ShoppingList } from '../domain/shopping-list';
import type { AddItemToListResult } from '../application/add-item-to-list.use-case';

/** Presenters: traducen entidades de dominio a DTOs del contrato público. */
export const ShoppingPresenter = {
  toListSummaryDto(list: ShoppingList): ShoppingListSummaryDto {
    return {
      id: list.id,
      familyId: list.familyId,
      name: list.name,
      type: list.type,
      createdAt: list.createdAt.toISOString(),
      updatedAt: list.updatedAt.toISOString(),
    };
  },

  toItemDto(item: ShoppingItem): ShoppingItemDto {
    return {
      id: item.id,
      listId: item.listId,
      name: item.name,
      quantity: item.quantity ?? undefined,
      unit: item.unit ?? undefined,
      description: item.description ?? undefined,
      purchaseLink: item.purchaseLink ?? undefined,
      checked: item.checked,
      position: item.position ?? undefined,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  },

  toListWithItemsDto(list: ShoppingList, items: ShoppingItem[]): ListWithItemsDto {
    return {
      ...ShoppingPresenter.toListSummaryDto(list),
      items: items.map((i) => ShoppingPresenter.toItemDto(i)),
    };
  },

  toAddItemResultDto(result: AddItemToListResult): AddItemResultDto {
    return {
      decision: result.decision,
      item: result.item ? ShoppingPresenter.toItemDto(result.item) : undefined,
      candidates: result.candidates,
    };
  },

  toCommentDto(comment: ItemComment): ItemCommentDto {
    return {
      id: comment.id,
      itemId: comment.itemId,
      authorId: comment.authorId ?? undefined,
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
    };
  },
};
