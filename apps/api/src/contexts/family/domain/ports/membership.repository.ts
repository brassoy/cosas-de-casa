import type { Membership } from '../membership';

export const MEMBERSHIP_REPOSITORY = Symbol('MEMBERSHIP_REPOSITORY');

/**
 * Puerto de persistencia de {@link Membership}.
 *
 * Modela las altas/bajas individuales (unirse, salir) que no requieren cargar
 * la familia entera; las invariantes que dependen del conjunto (último OWNER)
 * las decide el aggregate {@link Family}.
 */
export interface MembershipRepository {
  /**
   * Inserta una membership. Devuelve `true` si se insertó y `false` si ya
   * existía (conflicto por UNIQUE(family,user)) — semántica de
   * `ON CONFLICT DO NOTHING`.
   */
  insert(membership: Membership): Promise<boolean>;

  /** Elimina una membership por id. */
  deleteById(membershipId: string): Promise<void>;

  /** Actualiza el rol de una membership por id. */
  updateRole(membershipId: string, role: Membership['role']): Promise<void>;

  /** Devuelve las memberships (con rol) de una familia. */
  listByFamily(familyId: string): Promise<Membership[]>;
}
