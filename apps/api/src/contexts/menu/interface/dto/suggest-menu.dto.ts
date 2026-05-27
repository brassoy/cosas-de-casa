import { createZodDto } from 'nestjs-zod';
import { SuggestMenuInputSchema } from '@cosasdecasa/contracts';

/**
 * Query/body de `POST /families/:familyId/menu/suggest`. Derivado del contrato
 * Zod compartido (`SuggestMenuInputSchema`): el schema es la única fuente de
 * verdad para la validación. `.strict()` rechaza propiedades desconocidas.
 */
export class SuggestMenuDto extends createZodDto(SuggestMenuInputSchema.strict()) {}
