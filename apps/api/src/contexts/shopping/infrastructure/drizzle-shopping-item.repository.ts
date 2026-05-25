import { asc, eq } from 'drizzle-orm';
import type { DatabaseExecutor } from '../../../db/db.types';
import { shoppingItems } from '../../../db/schema';
import type { ShoppingItem } from '../domain/shopping-list';
import type { ShoppingItemRepository } from '../domain/ports/shopping-item.repository';
import { ShoppingMapper } from './shopping.mapper';

/** Adaptador Drizzle de {@link ShoppingItemRepository}. */
export class DrizzleShoppingItemRepository implements ShoppingItemRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  async create(item: ShoppingItem): Promise<void> {
    await this.db.insert(shoppingItems).values({
      id: item.id,
      listId: item.listId,
      name: item.name,
      quantity: item.quantity !== null ? String(item.quantity) : undefined,
      unit: item.unit ?? undefined,
      description: item.description ?? undefined,
      purchaseLink: item.purchaseLink ?? undefined,
      checked: item.checked,
      position: item.position ?? undefined,
      createdBy: item.createdBy ?? undefined,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    });
  }

  async findById(itemId: string): Promise<ShoppingItem | null> {
    const rows = await this.db
      .select()
      .from(shoppingItems)
      .where(eq(shoppingItems.id, itemId))
      .limit(1);
    const row = rows[0];
    return row ? ShoppingMapper.toItem(row) : null;
  }

  async findByList(listId: string): Promise<ShoppingItem[]> {
    const rows = await this.db
      .select()
      .from(shoppingItems)
      .where(eq(shoppingItems.listId, listId))
      .orderBy(asc(shoppingItems.position), asc(shoppingItems.createdAt));
    return rows.map((r) => ShoppingMapper.toItem(r));
  }

  async update(item: ShoppingItem): Promise<void> {
    await this.db
      .update(shoppingItems)
      .set({
        name: item.name,
        quantity: item.quantity !== null ? String(item.quantity) : null,
        unit: item.unit,
        description: item.description,
        purchaseLink: item.purchaseLink,
        checked: item.checked,
        position: item.position,
        updatedAt: item.updatedAt,
      })
      .where(eq(shoppingItems.id, item.id));
  }

  async deleteById(itemId: string): Promise<void> {
    await this.db.delete(shoppingItems).where(eq(shoppingItems.id, itemId));
  }
}
