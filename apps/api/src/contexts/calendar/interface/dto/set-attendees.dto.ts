import { createZodDto } from 'nestjs-zod';
import { SetAttendeesInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `PATCH /calendar/events/:eventId/attendees`. Derivado del contrato Zod compartido
 * (`SetAttendeesInputSchema`): reemplaza la lista completa de asistentes (puede ser vacía).
 * `.strict()` rechaza propiedades desconocidas (equivale a `forbidNonWhitelisted`).
 */
export class SetAttendeesDto extends createZodDto(SetAttendeesInputSchema.strict()) {}
