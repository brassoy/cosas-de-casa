/** Rol de un miembro dentro de una peña. */
export type GroupRole = 'OWNER' | 'MEMBER';

export const GroupRole = {
  OWNER: 'OWNER',
  MEMBER: 'MEMBER',
} as const satisfies Record<string, GroupRole>;

export function isOwner(role: GroupRole): boolean {
  return role === GroupRole.OWNER;
}
