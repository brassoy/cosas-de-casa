import { createZodDto } from 'nestjs-zod';
import { UpdateItemInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `PATCH /items/:itemId`. Derivado del contrato Zod compartido
 * (`UpdateItemInputSchema`): patch parcial, todos los campos son opcionales.
 * El schema hace el trim del nombre cuando se incluye. `.strict()` rechaza
 * propiedades desconocidas.
 */
export class UpdateItemDto extends createZodDto(UpdateItemInputSchema.strict()) {}
