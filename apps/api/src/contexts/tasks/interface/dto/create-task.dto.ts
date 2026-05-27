import { createZodDto } from 'nestjs-zod';
import { CreateTaskInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `POST /families/:familyId/tasks`. Derivado del contrato Zod compartido
 * (`CreateTaskInputSchema`): el schema es la única fuente de verdad.
 * `.strict()` rechaza propiedades desconocidas (equivale a `forbidNonWhitelisted`).
 */
export class CreateTaskDto extends createZodDto(CreateTaskInputSchema.strict()) {}
