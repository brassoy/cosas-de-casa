import type { MembershipRole } from '../../domain/membership-role';

export const MEMBERS_READ_MODEL = Symbol('MEMBERS_READ_MODEL');

/** Vista de lectura de un miembro, enriquecida con datos del usuario. */
export interface MemberView {
  userId: string;
  displayName: string | null;
  /** URL pública de la foto de perfil; `null` si no tiene avatar. */
  avatarUrl: string | null;
  role: MembershipRole;
  joinedAt: Date;
}

/**
 * Puerto de lectura (CQRS): proyecta la lista de miembros de una familia
 * uniendo `memberships` con `app_users`. Se separa de los repositorios de
 * escritura porque cruza el límite con identity-access (datos del usuario) y
 * solo sirve para presentación.
 */
export interface MembersReadModel {
  listByFamily(familyId: string): Promise<MemberView[]>;
}
