import { createZodDto } from 'nestjs-zod';
import { ExtractItemsInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `POST /ai/extract-items`. Derivado del contrato Zod compartido
 * (`ExtractItemsInputSchema`): valida que `phrase` sea una cadena de entre
 * 1 y 500 caracteres. `.strict()` rechaza propiedades desconocidas.
 */
export class ExtractItemsDto extends createZodDto(ExtractItemsInputSchema.strict()) {}
