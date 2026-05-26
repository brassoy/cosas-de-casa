import { z } from 'zod';

// ── Enum de categorías ──────────────────────────────────────────────────────

export const SpendCategorySchema = z.enum([
  'groceries',
  'household',
  'dining_out',
  'leisure',
  'other',
]);

export type SpendCategory = z.infer<typeof SpendCategorySchema>;

// ── ReceiptLine ──────────────────────────────────────────────────────────────

export const ReceiptLineDtoSchema = z.object({
  id: z.string().uuid(),
  description: z.string(),
  quantity: z.number().positive().optional(),
  unitPrice: z.number().nonnegative().optional(),
  lineTotal: z.number(),
  category: SpendCategorySchema,
});

export type ReceiptLineDto = z.infer<typeof ReceiptLineDtoSchema>;

// ── Receipt ──────────────────────────────────────────────────────────────────

export const ReceiptStatusSchema = z.enum(['draft', 'confirmed']);
export type ReceiptStatus = z.infer<typeof ReceiptStatusSchema>;

export const ReceiptDtoSchema = z.object({
  id: z.string().uuid(),
  familyId: z.string().uuid(),
  merchant: z.string().optional(),
  purchasedAt: z.string(), // ISO date YYYY-MM-DD
  total: z.number(),
  currency: z.string(),
  status: ReceiptStatusSchema,
  imagePath: z.string().optional(),
  lines: z.array(ReceiptLineDtoSchema),
  createdBy: z.string().uuid(),
  createdAt: z.string(), // ISO timestamp
});

export type ReceiptDto = z.infer<typeof ReceiptDtoSchema>;

export const ReceiptSummaryDtoSchema = z.object({
  id: z.string().uuid(),
  merchant: z.string().optional(),
  purchasedAt: z.string(),
  total: z.number(),
  currency: z.string(),
  status: ReceiptStatusSchema,
  lineCount: z.number().int().nonnegative(),
});

export type ReceiptSummaryDto = z.infer<typeof ReceiptSummaryDtoSchema>;

// ── Inputs ───────────────────────────────────────────────────────────────────

export const CreateReceiptLineInputSchema = z.object({
  description: z.string().min(1).max(300),
  quantity: z.number().positive().optional(),
  unitPrice: z.number().nonnegative().optional(),
  lineTotal: z.number(),
  category: SpendCategorySchema.default('other'),
});

export type CreateReceiptLineInput = z.infer<typeof CreateReceiptLineInputSchema>;

export const CreateReceiptInputSchema = z.object({
  merchant: z.string().max(200).optional(),
  purchasedAt: z.string(), // YYYY-MM-DD
  total: z.number(),
  currency: z.string().max(3).default('EUR'),
  imagePath: z.string().optional(),
  lines: z.array(CreateReceiptLineInputSchema).default([]),
});

export type CreateReceiptInput = z.infer<typeof CreateReceiptInputSchema>;

export const UpdateReceiptLineInputSchema = z.object({
  id: z.string().uuid().optional(), // presente si es línea existente; ausente si es nueva
  description: z.string().min(1).max(300).optional(),
  quantity: z.number().positive().nullable().optional(),
  unitPrice: z.number().nonnegative().nullable().optional(),
  lineTotal: z.number().optional(),
  category: SpendCategorySchema.optional(),
});

export type UpdateReceiptLineInput = z.infer<typeof UpdateReceiptLineInputSchema>;

export const UpdateReceiptInputSchema = z.object({
  merchant: z.string().max(200).optional(),
  purchasedAt: z.string().optional(),
  total: z.number().optional(),
  currency: z.string().max(3).optional(),
  status: ReceiptStatusSchema.optional(),
  imagePath: z.string().optional(),
  lines: z.array(UpdateReceiptLineInputSchema).optional(),
});

export type UpdateReceiptInput = z.infer<typeof UpdateReceiptInputSchema>;

// ── OCR extract ───────────────────────────────────────────────────────────────

export const ExtractReceiptLineSchema = z.object({
  description: z.string(),
  quantity: z.number().positive().optional(),
  unitPrice: z.number().nonnegative().optional(),
  lineTotal: z.number(),
  category: SpendCategorySchema,
});

export type ExtractReceiptLine = z.infer<typeof ExtractReceiptLineSchema>;

export const ExtractReceiptResponseSchema = z.object({
  merchant: z.string().optional(),
  purchasedAt: z.string().optional(),
  total: z.number().optional(),
  currency: z.string().optional(),
  lines: z.array(ExtractReceiptLineSchema),
});

export type ExtractReceiptResponse = z.infer<typeof ExtractReceiptResponseSchema>;

// ── Spend summary ────────────────────────────────────────────────────────────

export const SpendSummaryDtoSchema = z.object({
  total: z.number(),
  currency: z.string(),
  byCategory: z.array(
    z.object({
      category: SpendCategorySchema,
      total: z.number(),
    }),
  ),
  byMonth: z.array(
    z.object({
      month: z.string(), // YYYY-MM
      total: z.number(),
    }),
  ),
});

export type SpendSummaryDto = z.infer<typeof SpendSummaryDtoSchema>;
