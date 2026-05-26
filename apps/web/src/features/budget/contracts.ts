/**
 * Contratos de la feature budget — re-exportados desde @cosasdecasa/contracts.
 * Solo se mantienen aquí los helpers de UI que no pertenecen al contrato compartido.
 */

import type { SpendCategory } from '@cosasdecasa/contracts';

export type {
  SpendCategory,
  ReceiptLineDto,
  ReceiptDto,
  ReceiptSummaryDto,
  ExtractReceiptResponse,
  ExtractReceiptLine,
  CreateReceiptInput,
  CreateReceiptLineInput,
  UpdateReceiptInput,
  UpdateReceiptLineInput,
  SpendSummaryDto,
  ReceiptStatus,
} from '@cosasdecasa/contracts';

// ── Helper de UI: etiquetas de categoría ──────────────────────────────────────

export const SPEND_CATEGORY_LABELS: Record<SpendCategory, string> = {
  groceries: 'Supermercado',
  household: 'Hogar',
  dining_out: 'Restauración',
  leisure: 'Ocio',
  other: 'Otros',
};
