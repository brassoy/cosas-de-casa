import { createZodDto } from 'nestjs-zod';
import { AddItemInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `POST /lists/:listId/items`. Derivado del contrato Zod compartido
 * (`AddItemInputSchema`): el schema hace el trim del nombre y valida todos los
 * campos opcionales. `.strict()` rechaza propiedades desconocidas.
 */
export class AddItemDto extends createZodDto(AddItemInputSchema.strict()) {}
