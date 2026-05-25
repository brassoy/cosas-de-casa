import type { ShoppingListRow, ShoppingItemRow, ItemCommentRow } from '../../../db/schema';
import { ShoppingList, ShoppingItem, ItemComment } from '../domain/shopping-list';

/** Traduce filas de BD a entidades de dominio. */
export const ShoppingMapper = {
  toList(row: ShoppingListRow): ShoppingList {
    return new ShoppingList({
      id: row.id,
      familyId: row.familyId,
      name: row.name,
      type: row.type,
      createdBy: row.createdBy ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  },

  toItem(row: ShoppingItemRow): ShoppingItem {
    return new ShoppingItem({
      id: row.id,
      listId: row.listId,
      name: row.name,
      // Drizzle devuelve numeric como string
      quantity: row.quantity !== null ? Number(row.quantity) : null,
      unit: row.unit ?? null,
      description: row.description ?? null,
      purchaseLink: row.purchaseLink ?? null,
      checked: row.checked,
      position: row.position ?? null,
      createdBy: row.createdBy ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  },

  toComment(row: ItemCommentRow): ItemComment {
    return new ItemComment({
      id: row.id,
      itemId: row.itemId,
      authorId: row.authorId ?? null,
      body: row.body,
      createdAt: row.createdAt,
    });
  },
};
