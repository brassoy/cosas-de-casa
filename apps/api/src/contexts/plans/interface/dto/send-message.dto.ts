import { createZodDto } from 'nestjs-zod';
import { SendMessageInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `POST /plans/:planId/messages`. Derivado del contrato Zod compartido
 * (`SendMessageInputSchema`). El `body` se valida por longitud (1–2000 chars) y
 * se aplica `.trim()` automáticamente; la sanitización de HTML es responsabilidad
 * del dominio, no del DTO. El `.strict()` rechaza propiedades desconocidas.
 */
export class SendMessageDto extends createZodDto(SendMessageInputSchema.strict()) {}
