import { createZodDto } from 'nestjs-zod';
import { ListTasksQuerySchema } from '@cosasdecasa/contracts';

/**
 * Query params de `GET /families/:familyId/tasks`. Derivado del contrato Zod compartido
 * (`ListTasksQuerySchema`): filtra por estado y/o asignado.
 * `.strict()` rechaza parámetros desconocidos (equivale a `forbidNonWhitelisted`).
 */
export class ListTasksQueryDto extends createZodDto(ListTasksQuerySchema.strict()) {}
