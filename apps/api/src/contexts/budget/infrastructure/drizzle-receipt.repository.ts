import { desc, eq, sql } from 'drizzle-orm';
import type { DatabaseExecutor } from '../../../db/db.types';
import { receipts, receiptLines } from '../../../db/schema';
import type { Receipt } from '../domain/receipt';
import type { ReceiptRepository, SpendSummaryRow } from '../domain/ports/receipt.repository';
import { BudgetMapper } from './budget.mapper';

export class DrizzleReceiptRepository implements ReceiptRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  async create(receipt: Receipt): Promise<void> {
    await this.db.insert(receipts).values({
      id: receipt.id,
      familyId: receipt.familyId,
      merchant: receipt.merchant ?? undefined,
      purchasedAt: receipt.purchasedAt,
      total: receipt.total,
      currency: receipt.currency,
      status: receipt.status,
      imagePath: receipt.imagePath ?? undefined,
      createdBy: receipt.createdBy,
      createdAt: receipt.createdAt,
      updatedAt: receipt.updatedAt,
    });

    if (receipt.lines.length > 0) {
      await this.db.insert(receiptLines).values(
        receipt.lines.map((l) => ({
          id: l.id,
          receiptId: l.receiptId,
          description: l.description,
          quantity: l.quantity ?? undefined,
          unitPrice: l.unitPrice ?? undefined,
          lineTotal: l.lineTotal,
          category: l.category,
          createdAt: l.createdAt,
        })),
      );
    }
  }

  async findById(receiptId: string): Promise<Receipt | null> {
    const rows = await this.db
      .select()
      .from(receipts)
      .where(eq(receipts.id, receiptId))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    const lineRows = await this.db
      .select()
      .from(receiptLines)
      .where(eq(receiptLines.receiptId, receiptId))
      .orderBy(receiptLines.createdAt);

    return BudgetMapper.toReceipt(row, lineRows);
  }

  async findByFamily(familyId: string): Promise<Receipt[]> {
    const rows = await this.db
      .select()
      .from(receipts)
      .where(eq(receipts.familyId, familyId))
      .orderBy(desc(receipts.purchasedAt));

    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id);
    const lineRows = await this.db
      .select()
      .from(receiptLines)
      .where(sql`${receiptLines.receiptId} = ANY(ARRAY[${sql.join(ids.map((id) => sql`${id}::uuid`), sql`, `)}])`);

    return rows.map((row) =>
      BudgetMapper.toReceipt(
        row,
        lineRows.filter((l) => l.receiptId === row.id),
      ),
    );
  }

  async update(receipt: Receipt): Promise<void> {
    await this.db
      .update(receipts)
      .set({
        merchant: receipt.merchant ?? null,
        purchasedAt: receipt.purchasedAt,
        total: receipt.total,
        currency: receipt.currency,
        status: receipt.status,
        imagePath: receipt.imagePath ?? null,
        updatedAt: receipt.updatedAt,
      })
      .where(eq(receipts.id, receipt.id));

    // Reemplaza líneas: elimina las existentes e inserta las nuevas
    await this.db
      .delete(receiptLines)
      .where(eq(receiptLines.receiptId, receipt.id));

    if (receipt.lines.length > 0) {
      await this.db.insert(receiptLines).values(
        receipt.lines.map((l) => ({
          id: l.id,
          receiptId: l.receiptId,
          description: l.description,
          quantity: l.quantity ?? undefined,
          unitPrice: l.unitPrice ?? undefined,
          lineTotal: l.lineTotal,
          category: l.category,
          createdAt: l.createdAt,
        })),
      );
    }
  }

  async deleteById(receiptId: string): Promise<void> {
    await this.db.delete(receipts).where(eq(receipts.id, receiptId));
    // receipt_lines se elimina en cascada
  }

  async getSpendSummary(familyId: string, from: string, to: string): Promise<SpendSummaryRow> {
    // Total global
    const totalResult = await this.db.execute(
      sql`
        SELECT COALESCE(SUM(r.total::numeric), 0) AS total, r.currency
        FROM receipts r
        WHERE r.family_id = ${familyId}
          AND r.purchased_at >= ${from}::date
          AND r.purchased_at <= ${to}::date
          AND r.status = 'confirmed'
        GROUP BY r.currency
        ORDER BY total DESC
        LIMIT 1
      `,
    );

    const totalRow = (totalResult.rows as Array<{ total: string; currency: string | null }>)[0];
    const totalAmount = totalRow ? parseFloat(totalRow.total) : 0;
    const currency = totalRow?.currency ?? 'EUR';

    // Por categoría
    const byCategoryResult = await this.db.execute(
      sql`
        SELECT rl.category, COALESCE(SUM(rl.line_total::numeric), 0) AS total
        FROM receipt_lines rl
        INNER JOIN receipts r ON r.id = rl.receipt_id
        WHERE r.family_id = ${familyId}
          AND r.purchased_at >= ${from}::date
          AND r.purchased_at <= ${to}::date
          AND r.status = 'confirmed'
        GROUP BY rl.category
        ORDER BY total DESC
      `,
    );

    const byCategory = (byCategoryResult.rows as Array<{ category: string; total: string }>).map(
      (row) => ({
        category: row.category,
        total: row.total,
      }),
    );

    // Por mes
    const byMonthResult = await this.db.execute(
      sql`
        SELECT TO_CHAR(r.purchased_at, 'YYYY-MM') AS month,
               COALESCE(SUM(r.total::numeric), 0) AS total
        FROM receipts r
        WHERE r.family_id = ${familyId}
          AND r.purchased_at >= ${from}::date
          AND r.purchased_at <= ${to}::date
          AND r.status = 'confirmed'
        GROUP BY month
        ORDER BY month ASC
      `,
    );

    const byMonth = (byMonthResult.rows as Array<{ month: string; total: string }>).map((row) => ({
      month: row.month,
      total: row.total,
    }));

    return {
      total: String(totalAmount),
      currency,
      byCategory,
      byMonth,
    };
  }
}
