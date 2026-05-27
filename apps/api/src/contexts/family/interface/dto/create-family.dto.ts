import { createZodDto } from 'nestjs-zod';
import { CreateFamilyInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `POST /families`. Derivado del contrato Zod compartido
 * (`CreateFamilyInputSchema`): el schema es la única fuente de verdad, así que el
 * trim del nombre y la descripción vienen de él, no de decoradores duplicados.
 * `.strict()` rechaza propiedades desconocidas (equivale a `forbidNonWhitelisted`).
 */
export class CreateFamilyDto extends createZodDto(CreateFamilyInputSchema.strict()) {}
