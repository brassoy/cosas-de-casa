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

/**
 * Alias semántico de {@link FamilyMemberDto}. El backend devuelve este DTO en
 * `GET /families/:id/members`; lo exponemos también como `MemberDto` porque es
 * el nombre con el que lo consume la interfaz.
 */
export const MemberDtoSchema = FamilyMemberDtoSchema;
export type MemberDto = FamilyMemberDto;

// ── Familia ──────────────────────────────────────────────────────────────────

export const FamilyDtoSchema = z.object({
  id: UuidSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().optional(),
  /** Rol del usuario autenticado dentro de esta familia. */
  role: MembershipRoleSchema,
  members: z.array(FamilyMemberDtoSchema),
  updatedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});

export type FamilyDto = z.infer<typeof FamilyDtoSchema>;

/**
 * Resumen de familia para listados (`GET /families`). No incluye la lista de
 * miembros para mantener la respuesta ligera; sí el rol del usuario actual.
 */
export const FamilySummaryDtoSchema = FamilyDtoSchema.omit({ members: true });
export type FamilySummaryDto = z.infer<typeof FamilySummaryDtoSchema>;

// ── PIN de invitación ────────────────────────────────────────────────────────

/**
 * Formato del código PIN de invitación: 8 caracteres en alfabeto Crockford
 * Base32 (dígitos + letras mayúsculas excluyendo I, L, O, U para evitar
 * ambigüedad visual). Alta entropía (~41 bits) y un solo uso.
 */
export const JOIN_PIN_LENGTH = 8;
export const JOIN_PIN_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const JoinPinCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .length(JOIN_PIN_LENGTH)
  .regex(
    /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{8}$/,
    'El código debe tener 8 caracteres (dígitos y letras, sin I, L, O ni U).',
  );
export type JoinPinCode = z.infer<typeof JoinPinCodeSchema>;

/**
 * Credenciales que el usuario introduce para unirse a una familia mediante un
 * código PIN de invitación.
 */
export const JoinFamilyInputSchema = z.object({
  /** Código PIN de invitación (8 caracteres Crockford Base32). */
  code: JoinPinCodeSchema,
});

export type JoinFamilyInput = z.infer<typeof JoinFamilyInputSchema>;

/**
 * Respuesta al generar un PIN de invitación. El código en claro se devuelve
 * UNA sola vez (luego solo persiste su hash); el cliente debe mostrarlo al
 * propietario en ese momento.
 */
export const GeneratePinResponseSchema = z.object({
  /** Código en claro, mostrado una única vez. */
  code: JoinPinCodeSchema,
  /** Fecha de caducidad en formato ISO 8601. */
  expiresAt: z.string().datetime(),
});

export type GeneratePinResponse = z.infer<typeof GeneratePinResponseSchema>;

// ── Payloads de entrada ──────────────────────────────────────────────────────

/** Payload para crear una nueva familia. */
export const CreateFamilyInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  imageUrl: z.string().url().optional(),
});
export type CreateFamilyInput = z.infer<typeof CreateFamilyInputSchema>;

// ── /auth/me ───────────────────────────────────────────────────────────────

/**
 * Respuesta de `GET /auth/me`: el usuario autenticado y el listado de familias
 * a las que pertenece (con su rol en cada una).
 */
export const AuthMeDtoSchema = z.object({
  id: UuidSchema,
  email: z.string().email(),
  displayName: z.string().min(1).max(100).nullable(),
  families: z.array(FamilySummaryDtoSchema),
});

export type AuthMeDto = z.infer<typeof AuthMeDtoSchema>;
