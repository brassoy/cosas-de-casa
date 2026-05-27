import { createZodDto } from 'nestjs-zod';
import { AssigneesInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `PATCH /tasks/:taskId/assignees`. Derivado del contrato Zod compartido
 * (`AssigneesInputSchema`): reemplaza la lista completa de asignados.
 * `.strict()` rechaza propiedades desconocidas (equivale a `forbidNonWhitelisted`).
 */
export class AssigneesDto extends createZodDto(AssigneesInputSchema.strict()) {}
