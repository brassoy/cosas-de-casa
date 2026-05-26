import { Receipt, ReceiptLine } from '../domain/receipt';
import type { ReceiptRow, ReceiptLineRow } from '../../../db/schema';

export const BudgetMapper = {
  toReceipt(row: ReceiptRow, lineRows: ReceiptLineRow[]): Receipt {
    const lines = lineRows.map((l) => BudgetMapper.toLine(l));
    return new Receipt({
      id: row.id,
      familyId: row.familyId,
      merchant: row.merchant ?? null,
      purchasedAt: row.purchasedAt,
      total: row.total,
      currency: row.currency,
      status: row.status as 'draft' | 'confirmed',
      imagePath: row.imagePath ?? null,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lines,
    });
  },

  toLine(row: ReceiptLineRow): ReceiptLine {
    return new ReceiptLine({
      id: row.id,
      receiptId: row.receiptId,
      description: row.description,
      quantity: row.quantity ?? null,
      unitPrice: row.unitPrice ?? null,
      lineTotal: row.lineTotal,
      category: row.category as ReceiptLine['category'],
      createdAt: row.createdAt,
    });
  },
};
