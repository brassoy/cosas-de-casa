/**
 * Puerto del historial de cambios de rutinas (auditoría append-only).
 *
 * El servicio de aplicación registra un evento por cada modificación de la
 * rutina (quién, qué y cuándo) y lo lee para la pestaña «Historial». La infra lo
 * implementa contra Drizzle (tabla `routine_events`).
 */

export const ROUTINE_HISTORY_REPOSITORY = Symbol('ROUTINE_HISTORY_REPOSITORY');

export type RoutineEventEntity = 'routine' | 'items' | 'assignment' | 'incident';
export type RoutineEventAction = 'created' | 'updated' | 'deleted';

/** Un campo modificado (antes → después) dentro de un evento. */
export interface RoutineChange {
  label: string;
  before: string | null;
  after: string | null;
}

/** Evento a persistir. `createdAt` lo pone la BD (defaultNow). */
export interface NewRoutineEvent {
  routineId: string;
  entity: RoutineEventEntity;
  action: RoutineEventAction;
  summary: string;
  changes: RoutineChange[];
  createdBy: string | null;
}

/** Evento leído, con el nombre del autor ya resuelto (join a app_user). */
export interface RoutineEventRecord extends NewRoutineEvent {
  id: string;
  createdByName: string | null;
  createdAt: Date;
}

export interface RoutineHistoryRepository {
  append(event: NewRoutineEvent): Promise<void>;
  /** Entradas de la rutina, más recientes primero. */
  list(routineId: string, options?: { limit?: number }): Promise<RoutineEventRecord[]>;
}
