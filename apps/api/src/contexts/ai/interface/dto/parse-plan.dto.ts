import { createZodDto } from 'nestjs-zod';
import { ParsePlanInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `POST /ai/parse-plan`. Derivado del contrato Zod compartido
 * (`ParsePlanInputSchema`): valida `phrase` (1..1000) y `now` (ISO 8601).
 * `.strict()` rechaza propiedades desconocidas.
 */
export class ParsePlanDto extends createZodDto(ParsePlanInputSchema.strict()) {}
