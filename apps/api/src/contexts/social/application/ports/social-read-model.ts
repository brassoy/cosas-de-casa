export const SOCIAL_READ_MODEL = Symbol('SOCIAL_READ_MODEL');

/** Vista de una familia amiga enriquecida con datos de `families`. */
export interface FriendFamilyView {
  linkId: string;
  familyId: string;
  familyName: string;
  familyImageUrl: string | null;
  since: Date;
}

/**
 * Puerto de lectura (CQRS): proyecta las familias amigas de una familia
 * uniendo `friend_links` con `families`.
 */
export interface SocialReadModel {
  listFriendFamilies(familyId: string): Promise<FriendFamilyView[]>;
}
