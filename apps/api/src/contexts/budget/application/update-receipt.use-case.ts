import { Inject, Injectable } from '@nestjs/common';
import { Receipt, ReceiptLine, type SpendCategory, type ReceiptStatus } from '../domain/receipt';
import { ReceiptNotFoundError } from '../domain/budget.errors';
import { RECEIPT_REPOSITORY, type ReceiptRepository } from '../domain/ports/receipt.repository';
import { BUDGET_CLOCK, type BudgetClock } from './ports/clock';
import { BUDGET_ID_GENERATOR, type BudgetIdGenerator } from './ports/id-generator';

export interface UpdateReceiptLineCommand {
  id?: string; // si viene id, actualiza la existente; si no, crea nueva
  description?: string;
  quantity?: string | null;
  unitPrice?: string | null;
  lineTotal?: string;
  category?: SpendCategory;
}

export interface UpdateReceiptCommand {
  receiptId: string;
  merchant?: string | null;
  purchasedAt?: string;
  total?: string;
  currency?: string;
  status?: ReceiptStatus;
  imagePath?: string | null;
  lines?: UpdateReceiptLineCommand[];
}

@Injectable()
export class UpdateReceiptUseCase {
  constructor(
    @Inject(RECEIPT_REPOSITORY) private readonly repo: ReceiptRepository,
    @Inject(BUDGET_CLOCK) private readonly clock: BudgetClock,
    @Inject(BUDGET_ID_GENERATOR) private readonly ids: BudgetIdGenerator,
  ) {}

  async execute(command: UpdateReceiptCommand): Promise<Receipt> {
    const receipt = await this.repo.findById(command.receiptId);
    if (!receipt) throw new ReceiptNotFoundError();

    const now = this.clock.now();

    receipt.update({
      merchant: command.merchant,
      purchasedAt: command.purchasedAt,
      total: command.total,
      currency: command.currency,
      status: command.status,
      imagePath: command.imagePath,
    }, now);

    if (command.lines !== undefined) {
      const newLines: ReceiptLine[] = command.lines.map((l) => {
        // Si trae id y coincide con una línea existente, la preserva con cambios
        const existing = l.id ? receipt.lines.find((el) => el.id === l.id) : undefined;
        return ReceiptLine.create({
          id: existing?.id ?? this.ids.generate(),
          receiptId: receipt.id,
          description: l.description ?? existing?.description ?? '',
          quantity: l.quantity !== undefined ? l.quantity : (existing?.quantity ?? null),
          unitPrice: l.unitPrice !== undefined ? l.unitPrice : (existing?.unitPrice ?? null),
          lineTotal: l.lineTotal ?? existing?.lineTotal ?? '0',
          category: l.category ?? existing?.category ?? 'other',
          now,
        });
      });
      receipt.replaceLines(newLines, now);
    }

    await this.repo.update(receipt);
    return receipt;
  }
}
