import { z } from 'zod';
import { UuidSchema } from './common';

// ── Rol en la familia ────────────────────────────────────────────────────────

export const MembershipRoleSchema = z.enum(['OWNER', 'MEMBER']);
export type MembershipRole = z.infer<typeof MembershipRoleSchema>;

// ── Miembro ──────────────────────────────────────────────────────────────────

export const FamilyMemberDtoSchema = z.object({
  userId: UuidSchema,
  displayName: z.string().min(1).max(100),
  avatarUrl: z.string().url().optional(),
  role: MembershipRoleSchema,
  joinedAt: z.string().datetime(),
});

export type FamilyMemberDto = z.infer<typeof FamilyMemberDtoSchema>;

// ── Familia ──────────────────────────────────────────────────────────────────

export const FamilyDtoSchema = z.object({
  id: UuidSchema,
  name: z.string().min(1).max(100),
  members: z.array(FamilyMemberDtoSchema),
  updatedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});

export type FamilyDto = z.infer<typeof FamilyDtoSchema>;

// ── PIN de invitación ────────────────────────────────────────────────────────

/**
 * Credenciales que el usuario introduce para unirse a una familia
 * mediante un código PIN de invitación.
 */
export const JoinPinDtoSchema = z.object({
  /** Código PIN alfanumérico de 6 caracteres. */
  pin: z.string().length(6).regex(/^[A-Z0-9]{6}$/, 'El PIN debe tener 6 caracteres en mayúsculas o dígitos.'),
});

export type JoinPinDto = z.infer<typeof JoinPinDtoSchema>;

// ── Payloads de entrada ──────────────────────────────────────────────────────

/** Payload para crear una nueva familia. */
export const CreateFamilyInputSchema = z.object({
  name: z.string().min(1).max(100),
});
export type CreateFamilyInput = z.infer<typeof CreateFamilyInputSchema>;
