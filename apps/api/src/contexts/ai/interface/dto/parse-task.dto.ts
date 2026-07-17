import { createZodDto } from 'nestjs-zod';
import { ParseTaskInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `POST /ai/parse-task`. Derivado del contrato Zod compartido
 * (`ParseTaskInputSchema`): valida `phrase` (1..1000) y `now` (ISO 8601).
 * `.strict()` rechaza propiedades desconocidas.
 */
export class ParseTaskDto extends createZodDto(ParseTaskInputSchema.strict()) {}
