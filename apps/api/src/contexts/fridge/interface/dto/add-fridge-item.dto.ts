import { createZodDto } from 'nestjs-zod';
import { AddFridgeItemInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `POST /families/:familyId/fridge`. Derivado del contrato Zod compartido
 * (`AddFridgeItemInputSchema`): el schema es la única fuente de verdad.
 * Nota: `quantity` usa `regex(/^\d+(\.\d+)?$/)` — rechaza negativos, a diferencia
 * del anterior `@IsNumberString()` que los aceptaba (corrección de la divergencia M4).
 * `.strict()` rechaza propiedades desconocidas (equivale a `forbidNonWhitelisted`).
 */
export class AddFridgeItemDto extends createZodDto(AddFridgeItemInputSchema.strict()) {}
