import type { ShoppingList } from '../shopping-list';

export const SHOPPING_LIST_REPOSITORY = Symbol('SHOPPING_LIST_REPOSITORY');

/** Puerto de persistencia de listas de la compra. */
export interface ShoppingListRepository {
  /** Persiste una lista nueva. */
  create(list: ShoppingList): Promise<void>;

  /** Busca una lista por su id. */
  findById(listId: string): Promise<ShoppingList | null>;

  /** Encuentra la lista MAIN de una familia, o null si no existe. */
  findMainByFamily(familyId: string): Promise<ShoppingList | null>;

  /** Devuelve todas las listas de una familia (MAIN primero, luego CUSTOM por nombre). */
  findByFamily(familyId: string): Promise<ShoppingList[]>;

  /** Elimina una lista (y sus ítems en cascade). */
  deleteById(listId: string): Promise<void>;
}
