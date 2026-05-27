import { createZodDto } from 'nestjs-zod';
import { CreatePlanInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `POST /families/:familyId/plans`. Derivado del contrato Zod compartido
 * (`CreatePlanInputSchema`): el schema es la única fuente de verdad. El `.strict()`
 * rechaza propiedades desconocidas. El anidado `place` hereda la forma de
 * `PlaceDtoSchema` tal cual está definida en contracts.
 */
export class CreatePlanDto extends createZodDto(CreatePlanInputSchema.strict()) {}
