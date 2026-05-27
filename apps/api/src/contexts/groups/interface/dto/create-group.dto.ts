import { createZodDto } from 'nestjs-zod';
import { CreateGroupInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `POST /groups`. Derivado del contrato Zod compartido
 * (`CreateGroupInputSchema`): el schema es la única fuente de verdad, así que el
 * `trim` del nombre y la descripción vienen de él, no de decoradores duplicados.
 * `.strict()` rechaza propiedades desconocidas (equivale a `forbidNonWhitelisted`).
 */
export class CreateGroupDto extends createZodDto(CreateGroupInputSchema.strict()) {}
