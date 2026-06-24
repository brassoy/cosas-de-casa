import { asc, eq, sql } from 'drizzle-orm';
import type { DatabaseExecutor } from '../../../db/db.types';
import { fridgeItems } from '../../../db/schema';
import type { FridgeItem } from '../domain/fridge-item';
import type { FridgeItemRepository } from '../domain/ports/fridge-item.repository';
import { FridgeMapper } from './fridge.mapper';

/** Adaptador Drizzle de {@link FridgeItemRepository}. */
export class DrizzleFridgeItemRepository implements FridgeItemRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  async create(item: FridgeItem): Promise<void> {
    await this.db.insert(fridgeItems).values({
      id: item.id,
      familyId: item.familyId,
      name: item.name,
      quantity: item.quantity ?? undefined,
      unit: item.unit ?? undefined,
      location: item.location,
      expiryDate: item.expiryDate ?? undefined,
      createdBy: item.createdBy ?? undefined,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    });
  }

  async findById(itemId: string): Promise<FridgeItem | null> {
    const rows = await this.db
      .select()
      .from(fridgeItems)
      .where(eq(fridgeItems.id, itemId))
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    return FridgeMapper.toItem(row);
  }

  async findByFamily(familyId: string): Promise<FridgeItem[]> {
    // Ordenar por expiry_date ASC NULLS LAST
    const rows = await this.db
      .select()
      .from(fridgeItems)
      .where(eq(fridgeItems.familyId, familyId))
      .orderBy(
        sql`${fridgeItems.expiryDate} ASC NULLS LAST`,
      );

    return rows.map(FridgeMapper.toItem);
  }

  async findExpiringSoon(familyId: string, days: number): Promise<FridgeItem[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);
    // Formato YYYY-MM-DD
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const rows = await this.db
      .select()
      .from(fridgeItems)
      .where(
        // Los productos tirados (DISCARDED) no caducan: se excluyen de las
        // notificaciones de caducidad.
        sql`${fridgeItems.familyId} = ${familyId}
          AND ${fridgeItems.location} <> 'DISCARDED'
          AND ${fridgeItems.expiryDate} IS NOT NULL
          AND ${fridgeItems.expiryDate} <= ${cutoffStr}`,
      )
      .orderBy(asc(fridgeItems.expiryDate));

    return rows.map(FridgeMapper.toItem);
  }

  async update(item: FridgeItem): Promise<void> {
    await this.db
      .update(fridgeItems)
      .set({
        name: item.name,
        quantity: item.quantity ?? null,
        unit: item.unit ?? null,
        location: item.location,
        expiryDate: item.expiryDate ?? null,
        updatedAt: item.updatedAt,
      })
      .where(eq(fridgeItems.id, item.id));
  }

  async deleteById(itemId: string): Promise<void> {
    await this.db.delete(fridgeItems).where(eq(fridgeItems.id, itemId));
  }
}
