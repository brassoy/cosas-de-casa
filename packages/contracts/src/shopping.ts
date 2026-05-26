import { z } from 'zod';
import { UuidSchema } from './common';
import { DedupCandidateDtoSchema } from './ai';

// ── Enumerados ───────────────────────────────────────────────────────────────

/**
 * Tipo de lista de la compra.
 * - MAIN: lista principal de la familia (existe siempre, no se puede borrar).
 * - CUSTOM: lista personalizada creada por un miembro.
 */
export const ListTypeSchema = z.enum(['MAIN', 'CUSTOM']);
export type ListType = z.infer<typeof ListTypeSchema>;

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
  listId: UuidSchema,
  name: z.string().min(1).max(200),
  quantity: z.number().positive().optional(),
  unit: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
  purchaseLink: z.string().url().optional(),
  checked: z.boolean(),
  position: z.number().int().positive().optional(),
  /** Marca de tiempo ISO 8601 de la última modificación. */
  updatedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});

export type ShoppingItemDto = z.infer<typeof ShoppingItemDtoSchema>;

// ── Comentario de ítem ───────────────────────────────────────────────────────

export const ItemCommentDtoSchema = z.object({
  id: UuidSchema,
  itemId: UuidSchema,
  authorId: UuidSchema.optional(),
  body: z.string().min(1).max(1000),
  createdAt: z.string().datetime(),
});

export type ItemCommentDto = z.infer<typeof ItemCommentDtoSchema>;

// ── Lista de la compra (resumen) ─────────────────────────────────────────────

export const ShoppingListSummaryDtoSchema = z.object({
  id: UuidSchema,
  familyId: UuidSchema,
  name: z.string().min(1).max(100),
  type: ListTypeSchema,
  updatedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});

export type ShoppingListSummaryDto = z.infer<typeof ShoppingListSummaryDtoSchema>;

// ── Lista con ítems ──────────────────────────────────────────────────────────

export const ListWithItemsDtoSchema = ShoppingListSummaryDtoSchema.extend({
  items: z.array(ShoppingItemDtoSchema),
});

export type ListWithItemsDto = z.infer<typeof ListWithItemsDtoSchema>;

// ── Lista de la compra (legado, mantiene compatibilidad hacia atrás) ─────────
// @deprecated Usa ShoppingListSummaryDto o ListWithItemsDto.

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

/** Payload para crear una nueva lista personalizada. */
export const CreateListInputSchema = z.object({
  name: z.string().min(1).max(100),
});
export type CreateListInput = z.infer<typeof CreateListInputSchema>;

/**
 * Respuesta de añadir un artículo a una lista (incluye decisión de dedup).
 *
 * - ADD_NEW: ítem creado sin conflicto.
 * - AUTO_MERGE: fusión automática; `item` contiene el ítem resultante.
 * - SUGGEST: hay candidatos similares; el frontend debe pedir confirmación.
 */
export const AddItemResultDtoSchema = z.object({
  decision: AddItemDecisionSchema,
  item: ShoppingItemDtoSchema.optional(),
  candidates: z.array(DedupCandidateDtoSchema).optional(),
});
export type AddItemResultDto = z.infer<typeof AddItemResultDtoSchema>;

/** Payload para añadir un artículo a una lista. */
export const AddItemInputSchema = z.object({
  name: z.string().min(1).max(200),
  quantity: z.number().positive().optional(),
  unit: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
  purchaseLink: z.string().url().optional(),
  forceAdd: z.boolean().optional(),
});
export type AddItemInput = z.infer<typeof AddItemInputSchema>;

/** Payload para editar un artículo (patch parcial). */
export const UpdateItemInputSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  quantity: z.number().positive().nullable().optional(),
  unit: z.string().max(50).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  purchaseLink: z.string().url().nullable().optional(),
  checked: z.boolean().optional(),
  position: z.number().int().positive().nullable().optional(),
});
export type UpdateItemInput = z.infer<typeof UpdateItemInputSchema>;

/** Payload para añadir un comentario. */
export const AddCommentInputSchema = z.object({
  body: z.string().min(1).max(1000),
});
export type AddCommentInput = z.infer<typeof AddCommentInputSchema>;

/** Payload para crear o editar un artículo (legado). */
export const ShoppingItemInputSchema = ShoppingItemDtoSchema.omit({
  id: true,
  listId: true,
  createdAt: true,
  updatedAt: true,
});
export type ShoppingItemInput = z.infer<typeof ShoppingItemInputSchema>;

/** Payload para crear una nueva lista de la compra (legado). */
export const CreateShoppingListInputSchema = z.object({
  name: z.string().min(1).max(100),
  addItemDecision: AddItemDecisionSchema.default('SUGGEST'),
});
export type CreateShoppingListInput = z.infer<typeof CreateShoppingListInputSchema>;
