import type { Task } from '../task';

export const TASK_REPOSITORY = Symbol('TASK_REPOSITORY');

export interface ListTasksFilter {
  status?: 'OPEN' | 'IN_PROGRESS' | 'DONE';
  assigneeId?: string;
}

/** Puerto de persistencia de tareas. */
export interface TaskRepository {
  /** Persiste una tarea nueva. */
  create(task: Task): Promise<void>;

  /** Busca una tarea por su id. */
  findById(taskId: string): Promise<Task | null>;

  /** Devuelve todas las tareas de una familia, opcionalmente filtradas. */
  findByFamily(familyId: string, filter?: ListTasksFilter): Promise<Task[]>;

  /** Persiste los cambios de una tarea existente (título, descripción, estado, fechas). */
  update(task: Task): Promise<void>;

  /** Elimina una tarea (y sus asignados / fotos en cascade). */
  deleteById(taskId: string): Promise<void>;

  /** Reemplaza todos los asignados de una tarea. */
  setAssignees(taskId: string, assigneeIds: string[]): Promise<void>;
}
