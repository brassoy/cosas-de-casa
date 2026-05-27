import { createZodDto } from 'nestjs-zod';
import { DedupCheckInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `POST /families/:familyId/catalog/dedup-check`. Derivado del contrato
 * Zod compartido (`DedupCheckInputSchema`): valida que `name` sea una cadena
 * de entre 1 y 200 caracteres. `.strict()` rechaza propiedades desconocidas.
 */
export class DedupCheckDto extends createZodDto(DedupCheckInputSchema.strict()) {}
