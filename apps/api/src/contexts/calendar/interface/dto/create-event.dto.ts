import { createZodDto } from 'nestjs-zod';
import { CreateEventInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `POST /families/:familyId/calendar/events`. Derivado del contrato Zod compartido
 * (`CreateEventInputSchema`): el schema es la única fuente de verdad.
 * Nota: `startsAt`/`endsAt` usan `datetime({offset:true})`, más estricto que el anterior
 * `@IsISO8601({strict:true})` que no exigía zona horaria.
 * `.strict()` rechaza propiedades desconocidas (equivale a `forbidNonWhitelisted`).
 */
export class CreateEventDto extends createZodDto(CreateEventInputSchema.strict()) {}
