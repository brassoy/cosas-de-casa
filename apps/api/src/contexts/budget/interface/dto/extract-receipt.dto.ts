import { createZodDto } from 'nestjs-zod';
import { ExtractReceiptInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `POST /families/:familyId/receipts/extract`. Derivado del contrato
 * Zod compartido (`ExtractReceiptInputSchema`): valida imageBase64 como string
 * no vacío de hasta ~4 MB. `.strict()` rechaza propiedades desconocidas.
 */
export class ExtractReceiptDto extends createZodDto(ExtractReceiptInputSchema.strict()) {}
