import { createZodDto } from 'nestjs-zod';
import { UpdateFridgeItemInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `PATCH /fridge-items/:itemId`. Derivado del contrato Zod compartido
 * (`UpdateFridgeItemInputSchema`): patch parcial, todos los campos son opcionales.
 * Nota: `quantity` usa `regex(/^\d+(\.\d+)?$/)` — rechaza negativos, a diferencia
 * del anterior `@IsNumberString()` que los aceptaba (corrección de la divergencia M4).
 * `.strict()` rechaza propiedades desconocidas (equivale a `forbidNonWhitelisted`).
 */
export class UpdateFridgeItemDto extends createZodDto(UpdateFridgeItemInputSchema.strict()) {}
