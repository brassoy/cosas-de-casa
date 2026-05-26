import { z } from 'zod';
import { UuidSchema } from './common';

// ── Enumerados ────────────────────────────────────────────────────────────────

export const PlanRsvpStatusSchema = z.enum(['going', 'maybe', 'declined']);
export type PlanRsvpStatus = z.infer<typeof PlanRsvpStatusSchema>;

export const PlanStatusSchema = z.enum(['proposed', 'confirmed', 'cancelled']);
export type PlanStatus = z.infer<typeof PlanStatusSchema>;

// ── Lugar ─────────────────────────────────────────────────────────────────────

export const PlaceDtoSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().max(500).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});
export type PlaceDto = z.infer<typeof PlaceDtoSchema>;

export const SavedPlaceDtoSchema = PlaceDtoSchema.extend({
  id: UuidSchema,
});
export type SavedPlaceDto = z.infer<typeof SavedPlaceDtoSchema>;

export const CreateSavedPlaceInputSchema = PlaceDtoSchema;
export type CreateSavedPlaceInput = z.infer<typeof CreateSavedPlaceInputSchema>;

// ── Participante ──────────────────────────────────────────────────────────────

export const PlanParticipantDtoSchema = z.object({
  userId: UuidSchema,
  displayName: z.string().min(1).max(100),
  status: PlanRsvpStatusSchema,
});
export type PlanParticipantDto = z.infer<typeof PlanParticipantDtoSchema>;

// ── Plan ──────────────────────────────────────────────────────────────────────

export const PlanSummaryDtoSchema = z.object({
  id: UuidSchema,
  title: z.string().min(1).max(200),
  scheduledAt: z.string().datetime().optional(),
  placeName: z.string().optional(),
  ownerFamilyId: UuidSchema,
  status: PlanStatusSchema,
  participantCount: z.number().int().min(0),
});
export type PlanSummaryDto = z.infer<typeof PlanSummaryDtoSchema>;

export const PlanDtoSchema = z.object({
  id: UuidSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  place: PlaceDtoSchema.optional(),
  scheduledAt: z.string().datetime().optional(),
  status: PlanStatusSchema,
  ownerFamilyId: UuidSchema,
  createdBy: UuidSchema,
  participants: z.array(PlanParticipantDtoSchema),
  sharedWithFamilyIds: z.array(UuidSchema),
  createdAt: z.string().datetime(),
});
export type PlanDto = z.infer<typeof PlanDtoSchema>;

// ── Inputs ────────────────────────────────────────────────────────────────────

export const CreatePlanInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  place: PlaceDtoSchema.optional(),
  savePlace: z.boolean().optional(),
  scheduledAt: z.string().datetime().optional(),
});
export type CreatePlanInput = z.infer<typeof CreatePlanInputSchema>;

export const UpdatePlanInputSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  place: PlaceDtoSchema.optional(),
  scheduledAt: z.string().datetime().optional(),
  status: PlanStatusSchema.optional(),
});
export type UpdatePlanInput = z.infer<typeof UpdatePlanInputSchema>;

export const SetRsvpInputSchema = z.object({
  status: PlanRsvpStatusSchema,
});
export type SetRsvpInput = z.infer<typeof SetRsvpInputSchema>;

export const SharePlanInputSchema = z.object({
  familyId: UuidSchema,
});
export type SharePlanInput = z.infer<typeof SharePlanInputSchema>;

// ── Chat ──────────────────────────────────────────────────────────────────────

export const PlanMessageDtoSchema = z.object({
  id: UuidSchema,
  planId: UuidSchema,
  userId: UuidSchema,
  displayName: z.string().min(1).max(100),
  body: z.string().min(1).max(2000),
  createdAt: z.string().datetime(),
});
export type PlanMessageDto = z.infer<typeof PlanMessageDtoSchema>;

export const SendMessageInputSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1)
    .max(2000),
});
export type SendMessageInput = z.infer<typeof SendMessageInputSchema>;
