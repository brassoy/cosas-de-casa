import { createZodDto } from 'nestjs-zod';
import { UpdateTaskInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `PATCH /tasks/:taskId`. Derivado del contrato Zod compartido
 * (`UpdateTaskInputSchema`): patch parcial, todos los campos son opcionales.
 * `.strict()` rechaza propiedades desconocidas (equivale a `forbidNonWhitelisted`).
 */
export class UpdateTaskDto extends createZodDto(UpdateTaskInputSchema.strict()) {}
