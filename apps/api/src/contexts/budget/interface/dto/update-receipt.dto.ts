import { createZodDto } from 'nestjs-zod';
import { UpdateReceiptInputSchema, UpdateReceiptLineInputSchema } from '@cosasdecasa/contracts';

/**
 * Body anidado de línea de ticket en `PATCH /families/:familyId/receipts/:id`.
 * Derivado de `UpdateReceiptLineInputSchema`. `.strict()` rechaza propiedades
 * desconocidas.
 */
export class UpdateReceiptLineDto extends createZodDto(UpdateReceiptLineInputSchema.strict()) {}

/**
 * Body de `PATCH /families/:familyId/receipts/:id`. Derivado del contrato Zod
 * compartido (`UpdateReceiptInputSchema`). `.strict()` rechaza propiedades
 * desconocidas.
 */
export class UpdateReceiptDto extends createZodDto(UpdateReceiptInputSchema.strict()) {}
