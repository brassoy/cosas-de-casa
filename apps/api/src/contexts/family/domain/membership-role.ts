/** Rol de un miembro dentro de una familia. */
export type MembershipRole = 'OWNER' | 'MEMBER';

export const MembershipRole = {
  OWNER: 'OWNER',
  MEMBER: 'MEMBER',
} as const satisfies Record<string, MembershipRole>;

export function isOwner(role: MembershipRole): boolean {
  return role === MembershipRole.OWNER;
}
