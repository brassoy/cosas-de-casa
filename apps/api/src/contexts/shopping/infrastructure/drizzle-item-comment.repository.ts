import { asc, eq } from 'drizzle-orm';
import type { DatabaseExecutor } from '../../../db/db.types';
import { itemComments } from '../../../db/schema';
import type { ItemComment } from '../domain/shopping-list';
import type { ItemCommentRepository } from '../domain/ports/item-comment.repository';
import { ShoppingMapper } from './shopping.mapper';

/** Adaptador Drizzle de {@link ItemCommentRepository}. */
export class DrizzleItemCommentRepository implements ItemCommentRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  async create(comment: ItemComment): Promise<void> {
    await this.db.insert(itemComments).values({
      id: comment.id,
      itemId: comment.itemId,
      authorId: comment.authorId ?? undefined,
      body: comment.body,
      createdAt: comment.createdAt,
    });
  }

  async findByItem(itemId: string): Promise<ItemComment[]> {
    const rows = await this.db
      .select()
      .from(itemComments)
      .where(eq(itemComments.itemId, itemId))
      .orderBy(asc(itemComments.createdAt));
    return rows.map((r) => ShoppingMapper.toComment(r));
  }
}
