import { createZodDto } from 'nestjs-zod';
import { UpdateGroupInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `PATCH /groups/:groupId`. Derivado del contrato Zod compartido
 * (`UpdateGroupInputSchema`): actualización parcial de nombre y/o descripción,
 * con el `refine` que exige al menos un campo. Ya es `.strict()` en el schema.
 */
export class UpdateGroupDto extends createZodDto(UpdateGroupInputSchema) {}
