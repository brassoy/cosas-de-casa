import { createZodDto } from 'nestjs-zod';
import { MarkChallengeDoneInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `POST /couples/:coupleId/challenges` y `POST /couples/:coupleId/challenges/done`.
 * Ambos endpoints comparten la misma forma de entrada: `{ challengeKey: string }`.
 * Derivado de `MarkChallengeDoneInputSchema`, que define exactamente esa forma.
 * `.strict()` rechaza propiedades desconocidas.
 */
export class AddChallengeDto extends createZodDto(MarkChallengeDoneInputSchema.strict()) {}
