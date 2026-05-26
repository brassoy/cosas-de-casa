import type { GroupRole } from '../../domain/group-role';

export const GROUP_MEMBERS_READ_MODEL = Symbol('GROUP_MEMBERS_READ_MODEL');

/** Vista de lectura de un miembro de peña, enriquecida con datos del usuario. */
export interface GroupMemberView {
  userId: string;
  displayName: string | null;
  role: GroupRole;
  joinedAt: Date;
}

/**
 * Puerto de lectura (CQRS): proyecta la lista de miembros de una peña
 * uniendo `group_memberships` con `app_users`.
 */
export interface GroupMembersReadModel {
  listByGroup(groupId: string): Promise<GroupMemberView[]>;
}
