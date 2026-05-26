import type { FriendLink } from '../friend-link';

export const FRIEND_LINK_REPOSITORY = Symbol('FRIEND_LINK_REPOSITORY');

export interface FriendLinkRepository {
  insert(link: FriendLink): Promise<void>;

  /** Busca un vínculo por el par (sin importar el orden). */
  findByPair(familyAId: string, familyBId: string): Promise<FriendLink | null>;

  /** Devuelve todos los vínculos en los que participa una familia. */
  listByFamily(familyId: string): Promise<FriendLink[]>;

  /** Busca un vínculo concreto por id. */
  findById(linkId: string): Promise<FriendLink | null>;

  /** Elimina un vínculo por id. */
  deleteById(linkId: string): Promise<void>;

  /** Comprueba si dos familias son amigas. */
  areFriends(familyAId: string, familyBId: string): Promise<boolean>;
}
