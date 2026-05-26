import { Inject, Injectable } from '@nestjs/common';
import type { Receipt } from '../domain/receipt';
import { RECEIPT_REPOSITORY, type ReceiptRepository } from '../domain/ports/receipt.repository';

export interface ListReceiptsQuery {
  familyId: string;
}

@Injectable()
export class ListReceiptsUseCase {
  constructor(
    @Inject(RECEIPT_REPOSITORY) private readonly repo: ReceiptRepository,
  ) {}

  async execute(query: ListReceiptsQuery): Promise<Receipt[]> {
    return this.repo.findByFamily(query.familyId);
  }
}
