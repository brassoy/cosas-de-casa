import { createZodDto } from 'nestjs-zod';
import { PushSubscriptionInputSchema, UnsubscribePushInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `POST /families/:familyId/notifications/subscribe`. Derivado de
 * `PushSubscriptionInputSchema`: el schema cubre endpoint (URL) y las claves
 * de cifrado p256dh y auth (strings no vacíos). `.strict()` rechaza propiedades
 * desconocidas.
 */
export class SubscribePushDto extends createZodDto(PushSubscriptionInputSchema.strict()) {}

/**
 * Body de `DELETE /families/:familyId/notifications/subscribe`. Derivado de
 * `UnsubscribePushInputSchema`: valida endpoint como URL válida. `.strict()`
 * rechaza propiedades desconocidas.
 */
export class UnsubscribePushDto extends createZodDto(UnsubscribePushInputSchema.strict()) {}
