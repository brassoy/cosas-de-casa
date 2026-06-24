import { createZodDto } from 'nestjs-zod';
import { AddTaskCommentInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `POST /tasks/:taskId/comments`. Derivado del contrato Zod compartido
 * (`AddTaskCommentInputSchema`): el schema hace el trim del body y valida la
 * longitud. `.strict()` rechaza propiedades desconocidas.
 */
export class AddTaskCommentDto extends createZodDto(AddTaskCommentInputSchema.strict()) {}
