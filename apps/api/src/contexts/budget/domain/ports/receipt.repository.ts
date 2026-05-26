import type { Receipt } from '../receipt';

export interface SpendSummaryRow {
  total: string;
  currency: string;
  byCategory: Array<{ category: string; total: string }>;
  byMonth: Array<{ month: string; total: string }>;
}

export interface ReceiptRepository {
  create(receipt: Receipt): Promise<void>;
  findById(receiptId: string): Promise<Receipt | null>;
  findByFamily(familyId: string): Promise<Receipt[]>;
  update(receipt: Receipt): Promise<void>;
  deleteById(receiptId: string): Promise<void>;
  getSpendSummary(familyId: string, from: string, to: string): Promise<SpendSummaryRow>;
}

export const RECEIPT_REPOSITORY = Symbol('ReceiptRepository');
