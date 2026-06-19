import type { Couple } from '../couple';

export const COUPLE_REPOSITORY = Symbol('COUPLE_REPOSITORY');

export interface CoupleRepository {
  save(couple: Couple): Promise<void>;
  findById(coupleId: string): Promise<Couple | null>;
  /** Devuelve la pareja del usuario en una familia (un usuario tiene como mucho una). */
  findByFamilyAndUser(familyId: string, userId: string): Promise<Couple | null>;
  /**
   * Disuelve (elimina) la pareja. Notas y retos se borran en cascada por FK
   * (`onDelete: 'cascade'` en el schema).
   */
  delete(coupleId: string): Promise<void>;
}
