import { createZodDto } from 'nestjs-zod';
import { CreateListInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `POST /families/:familyId/lists`. Derivado del contrato Zod compartido
 * (`CreateListInputSchema`): el schema hace el trim del nombre, así que no
 * necesitamos decoradores duplicados. `.strict()` rechaza propiedades desconocidas.
 */
export class CreateListDto extends createZodDto(CreateListInputSchema.strict()) {}
