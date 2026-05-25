import { asc, eq, sql } from 'drizzle-orm';
import type { DatabaseExecutor } from '../../../db/db.types';
import { shoppingLists } from '../../../db/schema';
import type { ShoppingList } from '../domain/shopping-list';
import type { ShoppingListRepository } from '../domain/ports/shopping-list.repository';
import { ShoppingMapper } from './shopping.mapper';

/** Adaptador Drizzle de {@link ShoppingListRepository}. */
export class DrizzleShoppingListRepository implements ShoppingListRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  async create(list: ShoppingList): Promise<void> {
    await this.db.insert(shoppingLists).values({
      id: list.id,
      familyId: list.familyId,
      name: list.name,
      type: list.type,
      createdBy: list.createdBy ?? undefined,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
    });
  }

  async findById(listId: string): Promise<ShoppingList | null> {
    const rows = await this.db
      .select()
      .from(shoppingLists)
      .where(eq(shoppingLists.id, listId))
      .limit(1);
    const row = rows[0];
    return row ? ShoppingMapper.toList(row) : null;
  }

  async findMainByFamily(familyId: string): Promise<ShoppingList | null> {
    const rows = await this.db
      .select()
      .from(shoppingLists)
      .where(
        sql`${shoppingLists.familyId} = ${familyId} AND ${shoppingLists.type} = 'MAIN'`,
      )
      .limit(1);
    const row = rows[0];
    return row ? ShoppingMapper.toList(row) : null;
  }

  async findByFamily(familyId: string): Promise<ShoppingList[]> {
    const rows = await this.db
      .select()
      .from(shoppingLists)
      .where(eq(shoppingLists.familyId, familyId))
      .orderBy(asc(shoppingLists.type), asc(shoppingLists.name));
    return rows.map((r) => ShoppingMapper.toList(r));
  }

  async deleteById(listId: string): Promise<void> {
    await this.db.delete(shoppingLists).where(eq(shoppingLists.id, listId));
  }
}
