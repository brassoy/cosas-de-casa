import { z } from 'zod';
import { UuidSchema } from './common';

// ── Estado de la tarea ────────────────────────────────────────────────────────

/**
 * Estado del ciclo de vida de una tarea doméstica.
 * - OPEN: pendiente de realizar.
 * - IN_PROGRESS: alguien la ha comenzado.
 * - DONE: completada.
 */
export const TaskStatusSchema = z.enum(['OPEN', 'IN_PROGRESS', 'DONE']);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

// ── Asignado ──────────────────────────────────────────────────────────────────

export const TaskAssigneeDtoSchema = z.object({
  userId: UuidSchema,
  displayName: z.string().min(1).max(100).nullable(),
});
export type TaskAssigneeDto = z.infer<typeof TaskAssigneeDtoSchema>;

// ── Foto de tarea ─────────────────────────────────────────────────────────────

export const TaskPhotoDtoSchema = z.object({
  id: UuidSchema,
  taskId: UuidSchema,
  /** Ruta relativa en Supabase Storage (bucket task-photos). */
  storagePath: z.string().min(1),
  createdAt: z.string().datetime(),
});
export type TaskPhotoDto = z.infer<typeof TaskPhotoDtoSchema>;

// ── Tarea ─────────────────────────────────────────────────────────────────────

export const TaskDtoSchema = z.object({
  id: UuidSchema,
  familyId: UuidSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable(),
  status: TaskStatusSchema,
  /** Fecha recomendada para realizar la tarea (YYYY-MM-DD, sin hora). */
  recommendedDate: z.string().nullable(),
  /** Fecha límite (YYYY-MM-DD, sin hora). */
  deadlineDate: z.string().nullable(),
  createdBy: UuidSchema.nullable(),
  assignees: z.array(TaskAssigneeDtoSchema),
  photos: z.array(TaskPhotoDtoSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type TaskDto = z.infer<typeof TaskDtoSchema>;

// ── Payloads de entrada ───────────────────────────────────────────────────────

/** Payload para crear una tarea. Si no se envían asignados, se asigna al creador. */
export const CreateTaskInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  recommendedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD').optional(),
  deadlineDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD').optional(),
  /** IDs de los usuarios asignados. Si se omite, se asigna al creador. */
  assigneeIds: z.array(UuidSchema).optional(),
});
export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>;

/** Payload para editar una tarea (patch parcial). */
export const UpdateTaskInputSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  status: TaskStatusSchema.optional(),
  recommendedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD')
    .nullable()
    .optional(),
  deadlineDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD')
    .nullable()
    .optional(),
});
export type UpdateTaskInput = z.infer<typeof UpdateTaskInputSchema>;

/** Payload para establecer la lista de asignados de una tarea (reemplaza). */
export const AssigneesInputSchema = z.object({
  assigneeIds: z.array(UuidSchema).min(1, 'Al menos un asignado es obligatorio.'),
});
export type AssigneesInput = z.infer<typeof AssigneesInputSchema>;

/** Payload para añadir una foto (la ruta en Supabase Storage). */
export const AddTaskPhotoInputSchema = z.object({
  storagePath: z.string().min(1).max(500),
});
export type AddTaskPhotoInput = z.infer<typeof AddTaskPhotoInputSchema>;

/** Parámetros de filtrado para listar tareas. */
export const ListTasksQuerySchema = z.object({
  status: TaskStatusSchema.optional(),
  assigneeId: UuidSchema.optional(),
});
export type ListTasksQuery = z.infer<typeof ListTasksQuerySchema>;

// ── Comentario de tarea ────────────────────────────────────────────────────────

export const TaskCommentDtoSchema = z.object({
  id: UuidSchema,
  taskId: UuidSchema,
  authorId: UuidSchema.optional(),
  body: z.string().min(1).max(1000),
  createdAt: z.string().datetime(),
});
export type TaskCommentDto = z.infer<typeof TaskCommentDtoSchema>;

/** Payload para añadir un comentario a una tarea. */
export const AddTaskCommentInputSchema = z.object({
  body: z.string().trim().min(1).max(1000),
});
export type AddTaskCommentInput = z.infer<typeof AddTaskCommentInputSchema>;
