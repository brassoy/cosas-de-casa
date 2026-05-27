import { createZodDto } from 'nestjs-zod';
import { JoinGroupInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `POST /groups/join`. Derivado de `JoinGroupInputSchema`, que ya incluye
 * el recorte de espacios, el paso a mayúsculas y la validación Crockford Base32
 * (sin I, L, O ni U). `.strict()` rechaza propiedades desconocidas.
 */
export class JoinGroupDto extends createZodDto(JoinGroupInputSchema.strict()) {}
