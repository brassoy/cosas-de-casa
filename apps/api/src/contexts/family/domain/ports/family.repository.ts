import type { Family } from '../family';

export const FAMILY_REPOSITORY = Symbol('FAMILY_REPOSITORY');

/**
 * Puerto de persistencia del aggregate {@link Family}.
 *
 * Es un contrato de dominio: no menciona Drizzle ni SQL. Los métodos que cargan
 * la familia traen también sus memberships (el aggregate viene completo).
 */
export interface FamilyRepository {
  /** Persiste una familia recién creada junto con su membership OWNER inicial. */
  create(family: Family): Promise<void>;

  /** Carga una familia por id con todas sus memberships, o null si no existe. */
  findById(familyId: string): Promise<Family | null>;

  /** Familias a las que pertenece el usuario, con sus memberships cargadas. */
  findByMember(userId: string): Promise<Family[]>;
}
