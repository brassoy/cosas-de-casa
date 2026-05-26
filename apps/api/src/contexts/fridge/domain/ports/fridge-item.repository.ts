import type { FridgeItem } from '../fridge-item';

export const FRIDGE_ITEM_REPOSITORY = Symbol('FRIDGE_ITEM_REPOSITORY');

/** Puerto de persistencia de ítems de la nevera. */
export interface FridgeItemRepository {
  /** Persiste un ítem nuevo. */
  create(item: FridgeItem): Promise<void>;

  /** Busca un ítem por su id. */
  findById(itemId: string): Promise<FridgeItem | null>;

  /**
   * Devuelve todos los ítems de una familia, ordenados por expiry_date ASC
   * con NULLs al final.
   */
  findByFamily(familyId: string): Promise<FridgeItem[]>;

  /**
   * Devuelve los ítems que caducan en los próximos `days` días (incluido hoy).
   * NULLs nunca aparecen. Orden: expiry_date ASC.
   */
  findExpiringSoon(familyId: string, days: number): Promise<FridgeItem[]>;

  /** Persiste los cambios de un ítem existente. */
  update(item: FridgeItem): Promise<void>;

  /** Elimina un ítem. */
  deleteById(itemId: string): Promise<void>;
}
