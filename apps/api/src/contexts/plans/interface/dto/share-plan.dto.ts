import { createZodDto } from 'nestjs-zod';
import { SharePlanInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `POST /plans/:planId/share`. Derivado del contrato Zod compartido
 * (`SharePlanInputSchema`). `familyId` se valida como UUID v4 mediante
 * `UuidSchema`. El `.strict()` rechaza propiedades desconocidas.
 */
export class SharePlanDto extends createZodDto(SharePlanInputSchema.strict()) {}
