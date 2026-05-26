import { and, eq, or } from 'drizzle-orm';
import type { DatabaseExecutor } from '../../../db/db.types';
import { friendLinks } from '../../../db/schema';
import { FriendLink } from '../domain/friend-link';
import type { FriendLinkRepository } from '../domain/ports/friend-link.repository';

export class DrizzleFriendLinkRepository implements FriendLinkRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  async insert(link: FriendLink): Promise<void> {
    await this.db.insert(friendLinks).values({
      id: link.id,
      familyAId: link.familyAId,
      familyBId: link.familyBId,
      createdAt: link.createdAt,
    });
  }

  async findByPair(fa: string, fb: string): Promise<FriendLink | null> {
    const { familyAId, familyBId } = FriendLink.normalizedPair(fa, fb);
    const rows = await this.db
      .select()
      .from(friendLinks)
      .where(and(eq(friendLinks.familyAId, familyAId), eq(friendLinks.familyBId, familyBId)))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return new FriendLink(row);
  }

  async listByFamily(familyId: string): Promise<FriendLink[]> {
    const rows = await this.db
      .select()
      .from(friendLinks)
      .where(or(eq(friendLinks.familyAId, familyId), eq(friendLinks.familyBId, familyId)));
    return rows.map((row) => new FriendLink(row));
  }

  async findById(linkId: string): Promise<FriendLink | null> {
    const rows = await this.db
      .select()
      .from(friendLinks)
      .where(eq(friendLinks.id, linkId))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return new FriendLink(row);
  }

  async deleteById(linkId: string): Promise<void> {
    await this.db.delete(friendLinks).where(eq(friendLinks.id, linkId));
  }

  async areFriends(fa: string, fb: string): Promise<boolean> {
    const link = await this.findByPair(fa, fb);
    return link !== null;
  }
}
