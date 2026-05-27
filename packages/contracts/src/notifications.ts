import { z } from 'zod';
import { UuidSchema } from './common';

// ── Suscripción push ──────────────────────────────────────────────────────────

export const PushSubscriptionKeysSchema = z.object({
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});
export type PushSubscriptionKeys = z.infer<typeof PushSubscriptionKeysSchema>;

export const PushSubscriptionInputSchema = z.object({
  endpoint: z.string().url(),
  keys: PushSubscriptionKeysSchema,
});
export type PushSubscriptionInput = z.infer<typeof PushSubscriptionInputSchema>;

export const PushSubscriptionDtoSchema = z.object({
  id: UuidSchema,
  userId: UuidSchema,
  familyId: UuidSchema,
  endpoint: z.string().url(),
  createdAt: z.string().datetime(),
});
export type PushSubscriptionDto = z.infer<typeof PushSubscriptionDtoSchema>;

// ── Cancelar suscripción push ─────────────────────────────────────────────────

/** Payload para eliminar una suscripción push por endpoint. */
export const UnsubscribePushInputSchema = z.object({
  endpoint: z.string().url(),
});
export type UnsubscribePushInput = z.infer<typeof UnsubscribePushInputSchema>;

// ── Respuesta de suscripción ──────────────────────────────────────────────────

/**
 * Respuesta del endpoint `POST /families/:familyId/notifications/subscribe`.
 *
 * Devuelve el identificador de la suscripción recién creada.
 */
export const SubscribePushResponseSchema = z.object({
  id: UuidSchema,
});
export type SubscribePushResponse = z.infer<typeof SubscribePushResponseSchema>;
