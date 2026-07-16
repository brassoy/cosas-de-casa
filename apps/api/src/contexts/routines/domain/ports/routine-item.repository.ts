import type { RoutineItem } from '../routine-item';

export const ROUTINE_ITEM_REPOSITORY = Symbol('ROUTINE_ITEM_REPOSITORY');

/** Puerto de persistencia del catálogo de items de rutina. */
export interface RoutineItemRepository {
  /** Persiste un item nuevo. */
  create(item: RoutineItem): Promise<void>;

  /** Busca un item por su id. */
  findById(itemId: string): Promise<RoutineItem | null>;

  /** Devuelve el catálogo de una familia (sin archivados salvo que se pidan). */
  findByFamily(familyId: string, opts?: { includeArchived?: boolean }): Promise<RoutineItem[]>;

  /** Devuelve los items cuyos ids se indican (los inexistentes se omiten). */
  findByIds(itemIds: string[]): Promise<RoutineItem[]>;

  /** Persiste los cambios de un item existente. */
  update(item: RoutineItem): Promise<void>;

  /** Elimina un item (solo si ninguna rutina lo referencia; FK restrict). */
  deleteById(itemId: string): Promise<void>;

  /** True si alguna rutina (selección o asignación) referencia el item. */
  isReferenced(itemId: string): Promise<boolean>;
}
