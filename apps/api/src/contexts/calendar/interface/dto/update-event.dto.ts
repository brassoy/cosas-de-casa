import { createZodDto } from 'nestjs-zod';
import { UpdateEventInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `PATCH /calendar/events/:eventId`. Derivado del contrato Zod compartido
 * (`UpdateEventInputSchema`): patch parcial, todos los campos son opcionales.
 * Nota: `startsAt`/`endsAt` usan `datetime({offset:true})`, más estricto que el anterior
 * `@IsISO8601({strict:true})` que no exigía zona horaria.
 * `.strict()` rechaza propiedades desconocidas (equivale a `forbidNonWhitelisted`).
 */
export class UpdateEventDto extends createZodDto(UpdateEventInputSchema.strict()) {}
