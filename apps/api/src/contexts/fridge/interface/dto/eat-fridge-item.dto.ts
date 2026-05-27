import { createZodDto } from 'nestjs-zod';
import { EatFridgeItemInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `POST /fridge-items/:itemId/eat`. Derivado del contrato Zod compartido
 * (`EatFridgeItemInputSchema`): `amount` es opcional; si se omite, se elimina el ítem.
 * Nota: el schema exige `regex(/^\d+(\.\d+)?$/)` — más estricto que el anterior
 * `@IsNumberString()` que no garantizaba que el número fuera positivo.
 * `.strict()` rechaza propiedades desconocidas (equivale a `forbidNonWhitelisted`).
 */
export class EatFridgeItemDto extends createZodDto(EatFridgeItemInputSchema.strict()) {}
