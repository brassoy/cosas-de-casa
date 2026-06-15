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

  /**
   * Carga varias familias por id en una sola consulta (batch), cada una con sus
   * memberships. Evita el patrón N+1 de hacer un `findById` por id. El orden del
   * resultado no está garantizado y solo incluye las familias que existen.
   */
  findByIds(familyIds: string[]): Promise<Family[]>;

  /** Familias a las que pertenece el usuario, con sus memberships cargadas. */
  findByMember(userId: string): Promise<Family[]>;
}
