import { z } from 'zod';
import { UuidSchema } from './common';

// ── Pareja ────────────────────────────────────────────────────────────────────

export const CoupleDtoSchema = z.object({
  id: UuidSchema,
  familyId: UuidSchema,
  userA: UuidSchema,
  userB: UuidSchema,
  createdAt: z.string().datetime({ offset: true }),
});
export type CoupleDto = z.infer<typeof CoupleDtoSchema>;

// ── Nota de pareja ────────────────────────────────────────────────────────────

export const CoupleNoteDtoSchema = z.object({
  id: UuidSchema,
  coupleId: UuidSchema,
  authorId: UuidSchema,
  body: z.string().min(1).max(2000),
  createdAt: z.string().datetime({ offset: true }),
});
export type CoupleNoteDto = z.infer<typeof CoupleNoteDtoSchema>;

// ── Reto de pareja ────────────────────────────────────────────────────────────

export const CoupleChallengeStatusSchema = z.enum(['PENDING', 'DONE']);
export type CoupleChallengeStatus = z.infer<typeof CoupleChallengeStatusSchema>;

export const CoupleChallengeDtoSchema = z.object({
  id: UuidSchema,
  coupleId: UuidSchema,
  challengeKey: z.string().min(1),
  /** Descripción del reto (expandida desde el catálogo en código). */
  description: z.string(),
  done: z.boolean(),
  doneAt: z.string().datetime({ offset: true }).nullable(),
});
export type CoupleChallengeDto = z.infer<typeof CoupleChallengeDtoSchema>;

// ── Catálogo de retos ──────────────────────────────────────────────────────────

/**
 * Entrada del catálogo de retos disponibles (datos en código en el backend).
 * El frontend la usa para listar qué retos puede añadir la pareja.
 */
export const ChallengeCatalogEntryDtoSchema = z.object({
  key: z.string().min(1),
  description: z.string().min(1),
});
export type ChallengeCatalogEntryDto = z.infer<typeof ChallengeCatalogEntryDtoSchema>;

/** Catálogo completo de retos disponibles. */
export const ChallengeCatalogDtoSchema = z.array(ChallengeCatalogEntryDtoSchema);
export type ChallengeCatalogDto = z.infer<typeof ChallengeCatalogDtoSchema>;

// ── Payloads de entrada ───────────────────────────────────────────────────────

/** Payload para crear una pareja dentro de una familia. */
export const CreateCoupleInputSchema = z.object({
  /** ID del otro miembro (el que elige quien crea la pareja). */
  partnerUserId: UuidSchema,
});
export type CreateCoupleInput = z.infer<typeof CreateCoupleInputSchema>;

/** Payload para añadir una nota. */
export const CreateCoupleNoteInputSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});
export type CreateCoupleNoteInput = z.infer<typeof CreateCoupleNoteInputSchema>;

/** Payload para marcar un reto como hecho. */
export const MarkChallengeDoneInputSchema = z.object({
  challengeKey: z.string().min(1),
});
export type MarkChallengeDoneInput = z.infer<typeof MarkChallengeDoneInputSchema>;
