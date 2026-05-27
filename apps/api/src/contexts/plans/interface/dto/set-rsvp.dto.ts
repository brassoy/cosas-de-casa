import { createZodDto } from 'nestjs-zod';
import { SetRsvpInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `POST /plans/:planId/rsvp`. Derivado del contrato Zod compartido
 * (`SetRsvpInputSchema`). `status` acepta exactamente los valores del enum
 * `PlanRsvpStatusSchema`: 'going' | 'maybe' | 'declined'. El `.strict()`
 * rechaza propiedades desconocidas.
 */
export class SetRsvpDto extends createZodDto(SetRsvpInputSchema.strict()) {}
