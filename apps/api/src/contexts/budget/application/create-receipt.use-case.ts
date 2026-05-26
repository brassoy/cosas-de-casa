import { Inject, Injectable } from '@nestjs/common';
import { Receipt, type SpendCategory } from '../domain/receipt';
import { RECEIPT_REPOSITORY, type ReceiptRepository } from '../domain/ports/receipt.repository';
import { BUDGET_CLOCK, type BudgetClock } from './ports/clock';
import { BUDGET_ID_GENERATOR, type BudgetIdGenerator } from './ports/id-generator';

export interface CreateReceiptLineCommand {
  description: string;
  quantity?: string | null;
  unitPrice?: string | null;
  lineTotal: string;
  category?: SpendCategory;
}

export interface CreateReceiptCommand {
  familyId: string;
  actingUserId: string;
  merchant?: string | null;
  purchasedAt: string;
  total: string;
  currency?: string;
  imagePath?: string | null;
  lines?: CreateReceiptLineCommand[];
}

@Injectable()
export class CreateReceiptUseCase {
  constructor(
    @Inject(RECEIPT_REPOSITORY) private readonly repo: ReceiptRepository,
    @Inject(BUDGET_CLOCK) private readonly clock: BudgetClock,
    @Inject(BUDGET_ID_GENERATOR) private readonly ids: BudgetIdGenerator,
  ) {}

  async execute(command: CreateReceiptCommand): Promise<Receipt> {
    const now = this.clock.now();
    const receiptId = this.ids.generate();

    const receipt = Receipt.create({
      id: receiptId,
      familyId: command.familyId,
      merchant: command.merchant,
      purchasedAt: command.purchasedAt,
      total: command.total,
      currency: command.currency,
      imagePath: command.imagePath,
      createdBy: command.actingUserId,
      now,
      lines: (command.lines ?? []).map((l) => ({
        id: this.ids.generate(),
        receiptId,
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        lineTotal: l.lineTotal,
        category: l.category,
        now,
      })),
    });

    await this.repo.create(receipt);
    return receipt;
  }
}
