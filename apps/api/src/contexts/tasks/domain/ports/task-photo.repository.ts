import type { TaskPhoto } from '../task';

export const TASK_PHOTO_REPOSITORY = Symbol('TASK_PHOTO_REPOSITORY');

/** Puerto de persistencia de fotos de tarea. */
export interface TaskPhotoRepository {
  /** Persiste una foto nueva. */
  create(photo: TaskPhoto): Promise<void>;

  /** Devuelve todas las fotos de una tarea. */
  findByTask(taskId: string): Promise<TaskPhoto[]>;

  /** Busca una foto por id. */
  findById(photoId: string): Promise<TaskPhoto | null>;

  /** Elimina una foto por id. */
  deleteById(photoId: string): Promise<void>;
}
