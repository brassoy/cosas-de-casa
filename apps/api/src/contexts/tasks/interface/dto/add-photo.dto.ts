import { createZodDto } from 'nestjs-zod';
import { AddTaskPhotoInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `POST /tasks/:taskId/photos`. Derivado del contrato Zod compartido
 * (`AddTaskPhotoInputSchema`): registra la ruta de una foto en Supabase Storage.
 * `.strict()` rechaza propiedades desconocidas (equivale a `forbidNonWhitelisted`).
 */
export class AddPhotoDto extends createZodDto(AddTaskPhotoInputSchema.strict()) {}
