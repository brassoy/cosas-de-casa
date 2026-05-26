import type { GroupMembership } from '../group-membership';

export const GROUP_MEMBERSHIP_REPOSITORY = Symbol('GROUP_MEMBERSHIP_REPOSITORY');

/**
 * Puerto de persistencia de {@link GroupMembership}.
 *
 * Modela las altas/bajas individuales (unirse, salir) que no requieren cargar
 * la peña entera; las invariantes que dependen del conjunto (último OWNER)
 * las decide el aggregate {@link Group}.
 */
export interface GroupMembershipRepository {
  /**
   * Inserta una membership. Devuelve `true` si se insertó y `false` si ya
   * existía (conflicto por UNIQUE(group,user)) — semántica de
   * `ON CONFLICT DO NOTHING`.
   */
  insert(membership: GroupMembership): Promise<boolean>;

  /** Elimina una membership por id. */
  deleteById(membershipId: string): Promise<void>;

  /** Devuelve las memberships (con rol) de una peña. */
  listByGroup(groupId: string): Promise<GroupMembership[]>;
}
