import type { Group } from '../group';

export const GROUP_REPOSITORY = Symbol('GROUP_REPOSITORY');

/**
 * Puerto de persistencia del aggregate {@link Group}.
 *
 * Es un contrato de dominio: no menciona Drizzle ni SQL. Los métodos que cargan
 * la peña traen también sus memberships (el aggregate viene completo).
 */
export interface GroupRepository {
  /** Persiste una peña recién creada junto con su membership OWNER inicial. */
  create(group: Group): Promise<void>;

  /** Carga una peña por id con todas sus memberships, o null si no existe. */
  findById(groupId: string): Promise<Group | null>;

  /** Peñas a las que pertenece el usuario, con sus memberships cargadas. */
  findByMember(userId: string): Promise<Group[]>;

  /**
   * Persiste los campos editables de la peña (nombre, descripción,
   * `updatedAt`). No toca las memberships.
   */
  update(group: Group): Promise<void>;

  /**
   * Borra la peña por id. La BD elimina en cascada sus memberships, PINs,
   * etc. (FKs `ON DELETE CASCADE`).
   */
  delete(groupId: string): Promise<void>;
}
