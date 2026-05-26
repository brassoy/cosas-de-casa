import type { SpendCategory } from '../receipt';

export interface ExtractedLine {
  description: string;
  quantity?: number;
  unitPrice?: number;
  lineTotal: number;
  category: SpendCategory;
}

export interface ExtractReceiptResult {
  merchant?: string;
  purchasedAt?: string; // YYYY-MM-DD
  total?: number;
  currency?: string;
  lines: ExtractedLine[];
}

/**
 * Puerto de dominio para OCR de tickets.
 *
 * El adaptador recibe el base64 de la imagen y devuelve los datos extraídos.
 * Si la IA no está disponible, DEBE lanzar {@link AiUnavailableError}.
 */
export interface ReceiptOcrPort {
  extract(imageBase64: string): Promise<ExtractReceiptResult>;
}

export const RECEIPT_OCR_PORT = Symbol('ReceiptOcrPort');
