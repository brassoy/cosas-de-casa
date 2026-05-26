import { Inject, Injectable } from '@nestjs/common';
import { ReceiptNotFoundError } from '../domain/budget.errors';
import { RECEIPT_REPOSITORY, type ReceiptRepository } from '../domain/ports/receipt.repository';

export interface DeleteReceiptCommand {
  receiptId: string;
}

@Injectable()
export class DeleteReceiptUseCase {
  constructor(
    @Inject(RECEIPT_REPOSITORY) private readonly repo: ReceiptRepository,
  ) {}

  async execute(command: DeleteReceiptCommand): Promise<void> {
    const receipt = await this.repo.findById(command.receiptId);
    if (!receipt) throw new ReceiptNotFoundError();
    await this.repo.deleteById(command.receiptId);
  }
}
