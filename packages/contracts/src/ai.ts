import { z } from 'zod';
import { UuidSchema } from './common';

// ── Extracción de ítems por IA ────────────────────────────────────────────────

/** Payload para extraer artículos de una frase en lenguaje natural. */
export const ExtractItemsInputSchema = z.object({
  phrase: z.string().min(1).max(500),
});
export type ExtractItemsInput = z.infer<typeof ExtractItemsInputSchema>;

/** Respuesta del endpoint de extracción de artículos. */
export const ExtractItemsResponseSchema = z.object({
  items: z.array(z.string().min(1).max(200)),
});
export type ExtractItemsResponse = z.infer<typeof ExtractItemsResponseSchema>;

// ── Autocompletado de plan por IA ─────────────────────────────────────────────

/**
 * Payload para deducir los campos de un plan a partir de lenguaje natural.
 * `phrase` es lo que el usuario dijo o escribió; `now` es el instante de
 * referencia (ISO) para resolver expresiones relativas ("en dos horas").
 */
export const ParsePlanInputSchema = z.object({
  phrase: z.string().min(1).max(1000),
  now: z.string().datetime(),
});
export type ParsePlanInput = z.infer<typeof ParsePlanInputSchema>;

/**
 * Respuesta del autocompletado de plan. Cada campo es `null` cuando la IA no
 * puede inferirlo. `scheduledAt` es ISO 8601; `placeQuery` es texto buscable en
 * mapas (nombre del sitio + ciudad), no una dirección resuelta: el cliente la
 * geocodifica a coordenadas reales con Google Maps.
 */
export const ParsePlanResponseSchema = z.object({
  title: z.string().nullable(),
  description: z.string().nullable(),
  scheduledAt: z.string().datetime().nullable(),
  placeQuery: z.string().nullable(),
});
export type ParsePlanResponse = z.infer<typeof ParsePlanResponseSchema>;

// ── Deduplicación ────────────────────────────────────────────────────────────

/**
 * Decisión de deduplicación semántica.
 * - ADD_NEW: no hay solapamiento suficiente; añadir como ítem independiente.
 * - AUTO_MERGE: coincidencia muy alta (≥ 0.92 coseno + atributos compatibles); fusionar automáticamente.
 * - SUGGEST: coincidencia media (0.82–0.92) o atributos distintos; pedir confirmación al usuario.
 */
export const DedupDecisionSchema = z.enum(['ADD_NEW', 'AUTO_MERGE', 'SUGGEST']);
export type DedupDecision = z.infer<typeof DedupDecisionSchema>;

/** Candidato de deduplicación devuelto en decisión SUGGEST. */
export const DedupCandidateDtoSchema = z.object({
  catalogItemId: UuidSchema,
  normalizedName: z.string(),
  displayName: z.string(),
  similarity: z.number().min(0).max(1),
  frequency: z.number().int().nonnegative(),
});
export type DedupCandidateDto = z.infer<typeof DedupCandidateDtoSchema>;

/** Payload para la comprobación de deduplicación de un ítem. */
export const DedupCheckInputSchema = z.object({
  name: z.string().min(1).max(200),
});
export type DedupCheckInput = z.infer<typeof DedupCheckInputSchema>;

/** Respuesta del endpoint de dedup-check. */
export const DedupCheckResponseSchema = z.object({
  decision: DedupDecisionSchema,
  normalizedName: z.string(),
  candidates: z.array(DedupCandidateDtoSchema),
});
export type DedupCheckResponse = z.infer<typeof DedupCheckResponseSchema>;

// ── Ítems frecuentes ─────────────────────────────────────────────────────────

/** Ítem frecuente del catálogo de una familia. */
export const FrequentItemDtoSchema = z.object({
  catalogItemId: UuidSchema,
  normalizedName: z.string(),
  displayName: z.string(),
  frequency: z.number().int().positive(),
  lastAddedAt: z.string().datetime(),
  attributes: z.record(z.string(), z.string()).optional(),
});
export type FrequentItemDto = z.infer<typeof FrequentItemDtoSchema>;
