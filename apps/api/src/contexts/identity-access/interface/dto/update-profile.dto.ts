import { createZodDto } from 'nestjs-zod';
import { UpdateProfileInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `PATCH /auth/me`. Derivado del contrato Zod compartido
 * (`UpdateProfileInputSchema`): el schema es la única fuente de verdad.
 * `.strict()` rechaza propiedades desconocidas (equivale a `forbidNonWhitelisted`).
 */
export class UpdateProfileDto extends createZodDto(UpdateProfileInputSchema.strict()) {}
