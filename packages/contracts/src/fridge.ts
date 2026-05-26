import { z } from 'zod';
import { UuidSchema } from './common';

// ── Ubicación del ítem ────────────────────────────────────────────────────────

/**
 * Dónde está guardado el producto:
 * - FRIDGE: nevera (refrigerador).
 * - FREEZER: congelador.
 * - PANTRY: despensa.
 */
export const FridgeLocationSchema = z.enum(['FRIDGE', 'FREEZER', 'PANTRY']);
export type FridgeLocation = z.infer<typeof FridgeLocationSchema>;

// ── DTO público ───────────────────────────────────────────────────────────────

export const FridgeItemDtoSchema = z.object({
  id: UuidSchema,
  familyId: UuidSchema,
  name: z.string().min(1).max(200),
  /** Cantidad en la unidad indicada. Null si no se especificó. */
  quantity: z.string().nullable(),
  unit: z.string().max(50).nullable(),
  location: FridgeLocationSchema,
  /** Fecha de caducidad (YYYY-MM-DD). Null si no se especificó. */
  expiryDate: z.string().nullable(),
  createdBy: UuidSchema.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type FridgeItemDto = z.infer<typeof FridgeItemDtoSchema>;

// ── Payloads de entrada ───────────────────────────────────────────────────────

/** Payload para añadir un ítem a la nevera/despensa. */
export const AddFridgeItemInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  quantity: z.string().regex(/^\d+(\.\d+)?$/, 'La cantidad debe ser un número positivo.').optional(),
  unit: z.string().trim().max(50).optional(),
  location: FridgeLocationSchema.optional(),
  expiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD')
    .optional(),
});
export type AddFridgeItemInput = z.infer<typeof AddFridgeItemInputSchema>;

/** Payload para editar un ítem de la nevera (patch parcial). */
export const UpdateFridgeItemInputSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  quantity: z
    .string()
    .regex(/^\d+(\.\d+)?$/, 'La cantidad debe ser un número positivo.')
    .nullable()
    .optional(),
  unit: z.string().trim().max(50).nullable().optional(),
  location: FridgeLocationSchema.optional(),
  expiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD')
    .nullable()
    .optional(),
});
export type UpdateFridgeItemInput = z.infer<typeof UpdateFridgeItemInputSchema>;

/** Payload para la acción "comer" (reducir cantidad). */
export const EatFridgeItemInputSchema = z.object({
  /** Cantidad consumida. Si se omite, se elimina el ítem directamente. */
  amount: z.string().regex(/^\d+(\.\d+)?$/, 'La cantidad debe ser un número positivo.').optional(),
});
export type EatFridgeItemInput = z.infer<typeof EatFridgeItemInputSchema>;
