export const TASKS_ID_GENERATOR = Symbol('TASKS_ID_GENERATOR');

/** Puerto de generación de identificadores para el contexto tasks. */
export interface TasksIdGenerator {
  generate(): string;
}
