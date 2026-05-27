import { createZodDto } from 'nestjs-zod';
import { CreateCoupleInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `POST /families/:familyId/couple`. Derivado del contrato Zod compartido
 * (`CreateCoupleInputSchema`): valida que `partnerUserId` sea un UUID v4 válido.
 * `.strict()` rechaza propiedades desconocidas.
 */
export class CreateCoupleDto extends createZodDto(CreateCoupleInputSchema.strict()) {}
