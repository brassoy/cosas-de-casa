import { createZodDto } from 'nestjs-zod';
import { ListEventsQuerySchema } from '@cosasdecasa/contracts';

/**
 * Query params de `GET /families/:familyId/calendar/events`. Derivado del contrato Zod compartido
 * (`ListEventsQuerySchema`): rango de fechas obligatorio (`from` y `to`), ISO 8601 con offset.
 * `.strict()` rechaza parámetros desconocidos (equivale a `forbidNonWhitelisted`).
 */
export class ListEventsQueryDto extends createZodDto(ListEventsQuerySchema.strict()) {}
