import { Inject, Injectable } from '@nestjs/common';
import { RECEIPT_REPOSITORY, type ReceiptRepository, type SpendSummaryRow } from '../domain/ports/receipt.repository';

export interface GetSpendSummaryQuery {
  familyId: string;
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

@Injectable()
export class GetSpendSummaryUseCase {
  constructor(
    @Inject(RECEIPT_REPOSITORY) private readonly repo: ReceiptRepository,
  ) {}

  async execute(query: GetSpendSummaryQuery): Promise<SpendSummaryRow> {
    return this.repo.getSpendSummary(query.familyId, query.from, query.to);
  }
}
