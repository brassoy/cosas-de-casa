import { Inject, Injectable } from '@nestjs/common';
import type { Receipt } from '../domain/receipt';
import { ReceiptNotFoundError } from '../domain/budget.errors';
import { RECEIPT_REPOSITORY, type ReceiptRepository } from '../domain/ports/receipt.repository';

export interface GetReceiptQuery {
  receiptId: string;
}

@Injectable()
export class GetReceiptUseCase {
  constructor(
    @Inject(RECEIPT_REPOSITORY) private readonly repo: ReceiptRepository,
  ) {}

  async execute(query: GetReceiptQuery): Promise<Receipt> {
    const receipt = await this.repo.findById(query.receiptId);
    if (!receipt) throw new ReceiptNotFoundError();
    return receipt;
  }
}
