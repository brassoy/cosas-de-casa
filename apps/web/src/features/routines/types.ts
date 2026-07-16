/**
 * Tipos y helpers de la feature `routines`.
 *
 * Los DTOs vienen de `@cosasdecasa/contracts` (fuente de verdad compartida con
 * la API). Aquí solo viven helpers de presentación y los espejos puros que la
 * UI necesita sin llamar a la API (duración con cruce de medianoche, fechas).
 */

export type {
  RoutineDto,
  RoutineListItemDto,
  RoutineItemDto,
  RoutineSelectionDto,
  RoutineAssignmentDto,
  RoutineIncidentDto,
  RoutineSummaryDto,
  RoutineStatsDto,
  CreateRoutineInput,
  CreateRoutineItemInput,
  UpdateRoutineItemInput,
  CreateAssignmentInput,
  UpdateAssignmentInput,
  CreateIncidentInput,
} from '@cosasdecasa/contracts';

/** Prefijo de los ids sintéticos del overlay del calendario. */
const ROUTINE_EVENT_PREFIX = 'routine_';

/** True si el id de evento es una asignación de rutina proyectada (overlay). */
export function isRoutineEventId(eventId: string): boolean {
  return eventId.startsWith(ROUTINE_EVENT_PREFIX);
}

/** Id sintético de evento para una asignación de rutina. */
export function routineEventId(assignmentId: string): string {
  return `${ROUTINE_EVENT_PREFIX}${assignmentId}`;
}

/** Suma días a una fecha "YYYY-MM-DD" con aritmética UTC (sin efectos de zona). */
export function addDaysYMD(ymd: string, days: number): string {
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(Date.UTC(year!, month! - 1, day! + days)).toISOString().slice(0, 10);
}

/** Fecha real (YYYY-MM-DD) del día `dayIndex` de una rutina. */
export function routineDayDate(startDate: string, dayIndex: number): string {
  return addDaysYMD(startDate, dayIndex);
}

/**
 * Duración en minutos de la ventana [start, end) — espejo puro del dominio de
 * la API: end <= start cruza medianoche ("22:00"→"12:00" = 840).
 */
export function computeDurationMinutes(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const start = (sh ?? 0) * 60 + (sm ?? 0);
  const end = (eh ?? 0) * 60 + (em ?? 0);
  return (end - start + 1440) % 1440;
}

/** Formatea minutos como "10h", "1h 30min" o "45min". */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

/** Nombre corto del día de la semana de una fecha "YYYY-MM-DD" (es-ES). */
export function weekdayLabel(ymd: string): string {
  const date = new Date(`${ymd}T00:00:00`);
  return date.toLocaleDateString('es-ES', { weekday: 'short' });
}

/** "14 jul" para cabeceras compactas. */
export function shortDateLabel(ymd: string): string {
  const date = new Date(`${ymd}T00:00:00`);
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

/** "Semana del 14 de julio" (etiqueta por defecto de una rutina sin nombre). */
export function routineDefaultName(startDate: string): string {
  const date = new Date(`${startDate}T00:00:00`);
  return `Semana del ${date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`;
}
