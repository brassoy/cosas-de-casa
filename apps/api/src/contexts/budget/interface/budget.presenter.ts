import type {
  ReceiptDto,
  ReceiptSummaryDto,
  ReceiptLineDto,
  SpendSummaryDto,
  ExtractReceiptResponse,
} from '@cosasdecasa/contracts';
import type { Receipt, ReceiptLine } from '../domain/receipt';
import type { SpendSummaryRow } from '../domain/ports/receipt.repository';
import type { ExtractReceiptResult } from '../domain/ports/receipt-ocr.port';

export const BudgetPresenter = {
  toLineDto(line: ReceiptLine): ReceiptLineDto {
    return {
      id: line.id,
      description: line.description,
      quantity: line.quantity ? parseFloat(line.quantity) : undefined,
      unitPrice: line.unitPrice ? parseFloat(line.unitPrice) : undefined,
      lineTotal: parseFloat(line.lineTotal),
      category: line.category,
    };
  },

  toReceiptDto(receipt: Receipt): ReceiptDto {
    return {
      id: receipt.id,
      familyId: receipt.familyId,
      merchant: receipt.merchant ?? undefined,
      purchasedAt: receipt.purchasedAt,
      total: parseFloat(receipt.total),
      currency: receipt.currency,
      status: receipt.status,
      imagePath: receipt.imagePath ?? undefined,
      lines: receipt.lines.map(BudgetPresenter.toLineDto),
      createdBy: receipt.createdBy,
      createdAt: receipt.createdAt.toISOString(),
    };
  },

  toSummaryDto(receipt: Receipt): ReceiptSummaryDto {
    return {
      id: receipt.id,
      merchant: receipt.merchant ?? undefined,
      purchasedAt: receipt.purchasedAt,
      total: parseFloat(receipt.total),
      currency: receipt.currency,
      status: receipt.status,
      lineCount: receipt.lines.length,
    };
  },

  toSpendSummaryDto(row: SpendSummaryRow): SpendSummaryDto {
    return {
      total: parseFloat(row.total),
      currency: row.currency,
      byCategory: row.byCategory.map((c) => ({
        category: c.category as ReceiptLineDto['category'],
        total: parseFloat(c.total),
      })),
      byMonth: row.byMonth.map((m) => ({
        month: m.month,
        total: parseFloat(m.total),
      })),
    };
  },

  toExtractResponse(result: ExtractReceiptResult): ExtractReceiptResponse {
    return {
      merchant: result.merchant,
      purchasedAt: result.purchasedAt,
      total: result.total,
      currency: result.currency,
      lines: result.lines.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        lineTotal: l.lineTotal,
        category: l.category,
      })),
    };
  },
};
