import { z } from 'zod';
import { UuidSchema } from './common';

// ── Rol en la peña ────────────────────────────────────────────────────────────

export const GroupRoleSchema = z.enum(['OWNER', 'MEMBER']);
export type GroupRole = z.infer<typeof GroupRoleSchema>;

// ── Miembro de peña ───────────────────────────────────────────────────────────

export const GroupMemberDtoSchema = z.object({
  userId: UuidSchema,
  displayName: z.string().min(1).max(100),
  avatarUrl: z.string().url().optional(),
  role: GroupRoleSchema,
  joinedAt: z.string().datetime(),
});

export type GroupMemberDto = z.infer<typeof GroupMemberDtoSchema>;

// ── Peña ──────────────────────────────────────────────────────────────────────

export const GroupDtoSchema = z.object({
  id: UuidSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().optional(),
  /** Rol del usuario autenticado dentro de esta peña. */
  role: GroupRoleSchema,
  members: z.array(GroupMemberDtoSchema),
  updatedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});

export type GroupDto = z.infer<typeof GroupDtoSchema>;

/**
 * Resumen de peña para listados (`GET /groups`). No incluye la lista de
 * miembros para mantener la respuesta ligera; sí el rol del usuario actual.
 */
export const GroupSummaryDtoSchema = GroupDtoSchema.omit({ members: true });
export type GroupSummaryDto = z.infer<typeof GroupSummaryDtoSchema>;

// ── PIN de invitación de peña ─────────────────────────────────────────────────

/**
 * Respuesta al generar un PIN de invitación para una peña. El código en claro
 * se devuelve UNA sola vez; el cliente debe mostrarlo al propietario en ese
 * momento.
 */
export const GenerateGroupPinResponseSchema = z.object({
  /** Código en claro, mostrado una única vez. */
  code: z
    .string()
    .trim()
    .toUpperCase()
    .length(8)
    .regex(
      /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{8}$/,
      'El código debe tener 8 caracteres (dígitos y letras, sin I, L, O ni U).',
    ),
  /** Fecha de caducidad en formato ISO 8601. */
  expiresAt: z.string().datetime(),
});

export type GenerateGroupPinResponse = z.infer<typeof GenerateGroupPinResponseSchema>;

// ── Payloads de entrada ──────────────────────────────────────────────────────

/** Payload para crear una nueva peña. */
export const CreateGroupInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  imageUrl: z.string().url().optional(),
});
export type CreateGroupInput = z.infer<typeof CreateGroupInputSchema>;

/** Payload para unirse a una peña mediante código PIN. */
export const JoinGroupInputSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .length(8)
    .regex(
      /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{8}$/,
      'El código debe tener 8 caracteres (dígitos y letras, sin I, L, O ni U).',
    ),
});
export type JoinGroupInput = z.infer<typeof JoinGroupInputSchema>;
