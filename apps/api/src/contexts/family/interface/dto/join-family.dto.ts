import { createZodDto } from 'nestjs-zod';
import { JoinFamilyInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `POST /families/join`. Derivado de `JoinFamilyInputSchema`, que ya incluye
 * el recorte de espacios, el paso a mayúsculas y la validación Crockford Base32
 * (sin I, L, O ni U). `.strict()` rechaza propiedades desconocidas.
 */
export class JoinFamilyDto extends createZodDto(JoinFamilyInputSchema.strict()) {}
