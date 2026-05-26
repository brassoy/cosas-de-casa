import { z } from 'zod';
import { UuidSchema } from './common';

// ── Familias amigas ───────────────────────────────────────────────────────────

export const FriendFamilyDtoSchema = z.object({
  linkId: UuidSchema,
  familyId: UuidSchema,
  familyName: z.string().min(1).max(100),
  familyImageUrl: z.string().url().optional(),
  since: z.string().datetime(),
});
export type FriendFamilyDto = z.infer<typeof FriendFamilyDtoSchema>;

export const FriendInviteResponseSchema = z.object({
  code: z.string().length(8).regex(/^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{8}$/),
  expiresAt: z.string().datetime(),
});
export type FriendInviteResponse = z.infer<typeof FriendInviteResponseSchema>;

export const RedeemFriendInviteInputSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .length(8)
    .regex(
      /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{8}$/,
      'El código debe tener 8 caracteres Crockford Base32.',
    ),
  // La familia que canjea: un usuario puede pertenecer a varias, así que
  // indica explícitamente cuál acepta la amistad (el backend autoriza que el
  // que llama pertenece a ella).
  familyId: UuidSchema,
});
export type RedeemFriendInviteInput = z.infer<typeof RedeemFriendInviteInputSchema>;
