import type { FridgeItemRow } from '../../../db/schema';
import { FridgeItem } from '../domain/fridge-item';

/** Traduce filas de BD a entidades de dominio. */
export const FridgeMapper = {
  toItem(row: FridgeItemRow): FridgeItem {
    return new FridgeItem({
      id: row.id,
      familyId: row.familyId,
      name: row.name,
      // Drizzle devuelve numeric como string
      quantity: row.quantity ?? null,
      unit: row.unit ?? null,
      location: row.location,
      // Drizzle devuelve date como string 'YYYY-MM-DD'
      expiryDate: row.expiryDate ?? null,
      createdBy: row.createdBy ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  },
};
