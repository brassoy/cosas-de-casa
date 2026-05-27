import { createZodDto } from 'nestjs-zod';
import { AddCommentInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `POST /items/:itemId/comments`. Derivado del contrato Zod compartido
 * (`AddCommentInputSchema`): el schema hace el trim del body y valida longitud.
 * `.strict()` rechaza propiedades desconocidas.
 */
export class AddCommentDto extends createZodDto(AddCommentInputSchema.strict()) {}
