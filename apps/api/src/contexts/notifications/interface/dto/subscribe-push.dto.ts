import { createZodDto } from 'nestjs-zod';
import { PushSubscriptionInputSchema } from '@cosasdecasa/contracts';
import { IsUrl } from 'class-validator';

/**
 * Body de `POST /families/:familyId/notifications/subscribe`. Derivado de
 * `PushSubscriptionInputSchema`: el schema cubre endpoint (URL) y las claves
 * de cifrado p256dh y auth (strings no vacíos). `.strict()` rechaza propiedades
 * desconocidas.
 */
export class SubscribePushDto extends createZodDto(PushSubscriptionInputSchema.strict()) {}

/**
 * Body de `DELETE /families/:familyId/notifications/subscribe`.
 *
 * NO migrado a nestjs-zod: no existe `UnsubscribePushInputSchema` en
 * `@cosasdecasa/contracts`. Migrar en cuanto se añada el schema al contrato.
 */
export class UnsubscribePushDto {
  @IsUrl()
  endpoint!: string;
}
