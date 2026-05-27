import { createZodDto } from 'nestjs-zod';
import { MenuToListInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `POST /families/:familyId/menu/to-list`. Derivado del contrato
 * Zod compartido (`MenuToListInputSchema`): el schema valida el array de
 * ingredientes (mín. 1 elemento, máx. 100, cada uno no vacío) y el
 * `listId` UUID opcional. `.strict()` rechaza propiedades desconocidas.
 */
export class MenuToListDto extends createZodDto(MenuToListInputSchema.strict()) {}
