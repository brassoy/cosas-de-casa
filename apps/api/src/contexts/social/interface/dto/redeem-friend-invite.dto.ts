import { createZodDto } from 'nestjs-zod';
import { RedeemFriendInviteInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `POST /friends/redeem`. Derivado de `RedeemFriendInviteInputSchema`:
 * el schema cubre el código Crockford Base32 (con trim y toUpperCase) y el UUID
 * de la familia que acepta la amistad. `.strict()` rechaza propiedades desconocidas.
 *
 * Nota: el schema Zod es MÁS estricto que el DTO anterior — añade trim y
 * toUpperCase al `code`, y valida `familyId` como UUID completo (no solo string).
 */
export class RedeemFriendInviteDto extends createZodDto(RedeemFriendInviteInputSchema.strict()) {}
