import { createZodDto } from 'nestjs-zod';
import { UpdateProfileInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `PATCH /auth/me`. Derivado del contrato Zod compartido
 * (`UpdateProfileInputSchema`): el schema es la única fuente de verdad.
 * Actualización parcial de nombre y/o avatar, con `.strict()` (rechaza
 * propiedades desconocidas, equivale a `forbidNonWhitelisted`) y el `refine` que
 * exige al menos un campo. Se consume directo: ya trae `.strict()` incorporado.
 */
export class UpdateProfileDto extends createZodDto(UpdateProfileInputSchema) {}
