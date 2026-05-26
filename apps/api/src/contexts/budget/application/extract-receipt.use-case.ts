import { Inject, Injectable } from '@nestjs/common';
import { RECEIPT_OCR_PORT, type ReceiptOcrPort, type ExtractReceiptResult } from '../domain/ports/receipt-ocr.port';

export interface ExtractReceiptCommand {
  imageBase64: string;
}

/** Caso de uso: extraer datos de un ticket a partir de imagen (OCR por IA). */
@Injectable()
export class ExtractReceiptUseCase {
  constructor(
    @Inject(RECEIPT_OCR_PORT) private readonly ocr: ReceiptOcrPort,
  ) {}

  async execute(command: ExtractReceiptCommand): Promise<ExtractReceiptResult> {
    // El puerto lanza AiUnavailableError si la IA no está disponible.
    return this.ocr.extract(command.imageBase64);
  }
}
