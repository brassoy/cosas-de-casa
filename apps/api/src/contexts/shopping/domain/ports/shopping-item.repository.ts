import type { ShoppingItem } from '../shopping-list';

export const SHOPPING_ITEM_REPOSITORY = Symbol('SHOPPING_ITEM_REPOSITORY');

/** Puerto de persistencia de ítems. */
export interface ShoppingItemRepository {
  /** Persiste un ítem nuevo. */
  create(item: ShoppingItem): Promise<void>;

  /** Busca un ítem por su id. */
  findById(itemId: string): Promise<ShoppingItem | null>;

  /** Devuelve todos los ítems de una lista ordenados por posición, luego por createdAt. */
  findByList(listId: string): Promise<ShoppingItem[]>;

  /** Persiste cambios de un ítem ya existente (checked, name, quantity, etc.). */
  update(item: ShoppingItem): Promise<void>;

  /** Elimina un ítem. */
  deleteById(itemId: string): Promise<void>;
}
