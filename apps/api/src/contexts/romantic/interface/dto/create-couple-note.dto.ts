import { createZodDto } from 'nestjs-zod';
import { CreateCoupleNoteInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `POST /couples/:coupleId/notes`. Derivado del contrato Zod compartido
 * (`CreateCoupleNoteInputSchema`): valida `body` con `trim()`, `min(1)` y `max(2000)`.
 * El `.trim()` del schema es un beneficio respecto al DTO anterior (no hacía trim).
 * `.strict()` rechaza propiedades desconocidas.
 */
export class CreateCoupleNoteDto extends createZodDto(CreateCoupleNoteInputSchema.strict()) {}
