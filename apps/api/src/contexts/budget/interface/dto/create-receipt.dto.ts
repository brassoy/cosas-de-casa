import { createZodDto } from 'nestjs-zod';
import { CreateReceiptInputSchema, CreateReceiptLineInputSchema } from '@cosasdecasa/contracts';

/**
 * Body anidado de línea de ticket en `POST /families/:familyId/receipts`.
 * Derivado de `CreateReceiptLineInputSchema`. `.strict()` rechaza propiedades
 * desconocidas.
 */
export class CreateReceiptLineDto extends createZodDto(CreateReceiptLineInputSchema.strict()) {}

/**
 * Body de `POST /families/:familyId/receipts`. Derivado del contrato Zod compartido
 * (`CreateReceiptInputSchema`). `.strict()` rechaza propiedades desconocidas.
 */
export class CreateReceiptDto extends createZodDto(CreateReceiptInputSchema.strict()) {}
