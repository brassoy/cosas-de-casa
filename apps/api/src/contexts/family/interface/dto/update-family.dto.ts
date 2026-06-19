import { createZodDto } from 'nestjs-zod';
import { UpdateFamilyInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `PATCH /families/:familyId`. Derivado del contrato Zod compartido
 * (`UpdateFamilyInputSchema`): actualización parcial de nombre y/o descripción,
 * con el `refine` que exige al menos un campo. `.strict()` rechaza propiedades
 * desconocidas.
 */
export class UpdateFamilyDto extends createZodDto(UpdateFamilyInputSchema) {}
