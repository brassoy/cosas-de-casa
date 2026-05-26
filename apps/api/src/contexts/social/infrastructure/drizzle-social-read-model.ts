import { asc, eq, or } from 'drizzle-orm';
import { Inject, Injectable } from '@nestjs/common';
import type { Database } from '../../../db/db.types';
import { DRIZZLE } from '../../../db/drizzle.tokens';
import { families, friendLinks } from '../../../db/schema';
import type { SocialReadModel, FriendFamilyView } from '../application/ports/social-read-model';

/**
 * Adaptador Drizzle del read-model de familias amigas.
 * Une `friend_links` con `families` para devolver el nombre e imagen de la
 * familia "contraria" al id dado.
 */
@Injectable()
export class DrizzleSocialReadModel implements SocialReadModel {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async listFriendFamilies(familyId: string): Promise<FriendFamilyView[]> {
    // Trae todos los vínculos donde participa la familia.
    const linkRows = await this.db
      .select()
      .from(friendLinks)
      .where(or(eq(friendLinks.familyAId, familyId), eq(friendLinks.familyBId, familyId)))
      .orderBy(asc(friendLinks.createdAt));

    if (linkRows.length === 0) return [];

    // Obtiene los ids de las familias "contrarias".
    const otherIds = linkRows.map((link) =>
      link.familyAId === familyId ? link.familyBId : link.familyAId,
    );

    // Carga los datos de esas familias (IN).
    const familyRows = await this.db
      .select({ id: families.id, name: families.name, imageUrl: families.imageUrl })
      .from(families)
      .where(or(...otherIds.map((id) => eq(families.id, id))));

    const familyMap = new Map(familyRows.map((f) => [f.id, f]));

    return linkRows
      .map((link) => {
        const otherId = link.familyAId === familyId ? link.familyBId : link.familyAId;
        const other = familyMap.get(otherId);
        if (!other) return null;
        return {
          linkId: link.id,
          familyId: otherId,
          familyName: other.name,
          familyImageUrl: other.imageUrl,
          since: link.createdAt,
        } satisfies FriendFamilyView;
      })
      .filter((v): v is FriendFamilyView => v !== null);
  }
}
