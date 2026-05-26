/**
 * Tipos locales para la feature de tareas.
 *
 * Los tipos de dominio (TaskDto, TaskStatus, CreateTaskInput, UpdateTaskInput,
 * AssigneesInput, TaskPhotoDto) se importan directamente de @cosasdecasa/contracts.
 * Aquí sólo viven las constantes de UI y los tipos puramente de presentación.
 */

export type { TaskDto, TaskStatus, CreateTaskInput, UpdateTaskInput, AssigneesInput, TaskPhotoDto } from '@cosasdecasa/contracts';

// ── Constantes de UI ──────────────────────────────────────────────────────────

import type { TaskStatus } from '@cosasdecasa/contracts';

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  OPEN: 'Pendiente',
  IN_PROGRESS: 'En curso',
  DONE: 'Hecho',
};

// ── Tipos de UI ───────────────────────────────────────────────────────────────

/** Payload local para añadir una foto (sólo la ruta en Supabase Storage). */
export interface AddTaskPhotoInput {
  /** Ruta relativa dentro del bucket `task-photos` en Supabase Storage. */
  storagePath: string;
}
