import { createZodDto } from 'nestjs-zod';
import { UpdatePlanInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `PATCH /plans/:planId`. Derivado del contrato Zod compartido
 * (`UpdatePlanInputSchema`): todos los campos son opcionales, incluido `place`
 * (objeto anidado con la forma de `PlaceDtoSchema`). El `.strict()` rechaza
 * propiedades desconocidas.
 */
export class UpdatePlanDto extends createZodDto(UpdatePlanInputSchema.strict()) {}
