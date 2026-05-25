import { z } from 'zod';
import { UuidSchema } from './common';

// ── Enumerados ───────────────────────────────────────────────────────────────

/**
 * Decisión que el sistema toma cuando el usuario añade un artículo que
 * ya existe o es muy similar a otro en la lista.
 *
 * - ADD_NEW: añade como artículo independiente.
 * - AUTO_MERGE: fusiona automáticamente con el existente.
 * - SUGGEST: propone al usuario si desea fusionar o añadir por separado.
 */
export const AddItemDecisionSchema = z.enum(['ADD_NEW', 'AUTO_MERGE', 'SUGGEST']);
export type AddItemDecision = z.infer<typeof AddItemDecisionSchema>;

// ── Artículo de la lista ─────────────────────────────────────────────────────

export const ShoppingItemDtoSchema = z.object({
  id: UuidSchema,
  name: z.string().min(1).max(200),
  quantity: z.number().positive().optional(),
  unit: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
  purchaseLink: z.string().url().optional(),
  checked: z.boolean(),
  /** Marca de tiempo ISO 8601 de la última modificación. */
  updatedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});

export type ShoppingItemDto = z.infer<typeof ShoppingItemDtoSchema>;

// ── Lista de la compra ───────────────────────────────────────────────────────

export const ShoppingListDtoSchema = z.object({
  id: UuidSchema,
  familyId: UuidSchema,
  name: z.string().min(1).max(100),
  items: z.array(ShoppingItemDtoSchema),
  /** Estrategia de deduplicación configurada para esta lista. */
  addItemDecision: AddItemDecisionSchema,
  updatedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});

export type ShoppingListDto = z.infer<typeof ShoppingListDtoSchema>;

// ── Payloads de entrada ──────────────────────────────────────────────────────

/** Payload para crear o editar un artículo. */
export const ShoppingItemInputSchema = ShoppingItemDtoSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type ShoppingItemInput = z.infer<typeof ShoppingItemInputSchema>;

/** Payload para crear una nueva lista de la compra. */
export const CreateShoppingListInputSchema = z.object({
  name: z.string().min(1).max(100),
  addItemDecision: AddItemDecisionSchema.default('SUGGEST'),
});
export type CreateShoppingListInput = z.infer<typeof CreateShoppingListInputSchema>;
