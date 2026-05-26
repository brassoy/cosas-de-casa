/**
 * Tipos para la feature de calendario.
 *
 * Los DTOs e inputs de mutación vienen de @cosasdecasa/contracts.
 * Aquí solo se re-exportan y se añaden helpers de fecha propios de la UI.
 *
 * Endpoints reales del backend:
 *   GET    /families/:familyId/calendar/events?from=ISO&to=ISO → CalendarEventDto[]
 *   POST   /families/:familyId/calendar/events                 → 201 CalendarEventDto
 *   PATCH  /calendar/events/:eventId                           → CalendarEventDto
 *   DELETE /calendar/events/:eventId                           → 204
 *   PUT    /calendar/events/:eventId/attendees                 → CalendarEventDto
 *
 * Recurrencia:
 *   Las ocurrencias expandidas tienen un id con sufijo `_occ_N`.
 *   Son de solo lectura: la UI no permite editar ni borrar directamente una
 *   ocurrencia; el usuario debe operar sobre el evento padre (id sin sufijo).
 */

// ── Re-exports de contratos ───────────────────────────────────────────────────

export type {
  CalendarEventDto,
  CreateEventInput,
  UpdateEventInput,
  SetAttendeesInput,
  ListEventsQuery,
  EventAttendeeDto,
} from '@cosasdecasa/contracts';

// ── Helpers de recurrencia ────────────────────────────────────────────────────

/** Devuelve true si el id corresponde a una ocurrencia expandida (_occ_N). */
export function isOccurrenceId(id: string): boolean {
  return /_occ_\d+$/.test(id);
}

/** Extrae el id del evento padre quitando el sufijo _occ_N. */
export function parentEventId(id: string): string {
  return id.replace(/_occ_\d+$/, '');
}

// ── Helpers de fecha ──────────────────────────────────────────────────────────

/** Nombres de los días de la semana en español (lunes primero). */
export const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;

/** Nombres completos de los días (para aria-label). */
export const DAYS_FULL_ES = [
  'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo',
] as const;

/** Nombres de los meses en español. */
export const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
] as const;

/**
 * Devuelve el primer día (lunes) de la grilla del calendario para el mes dado.
 * La semana empieza en lunes (ISO 8601).
 */
export function getCalendarStart(year: number, month: number): Date {
  // month: 0-indexed (igual que Date)
  const firstDay = new Date(year, month, 1);
  // getDay(): 0=dom, 1=lun…6=sáb → queremos que lun=0
  const dayOfWeek = (firstDay.getDay() + 6) % 7; // convierte a lunes=0
  const start = new Date(firstDay);
  start.setDate(1 - dayOfWeek);
  return start;
}

/**
 * Devuelve el último día (domingo) de la grilla del calendario para el mes dado.
 * Siempre es al menos 35 días desde el inicio (5 semanas), o 42 (6 semanas).
 */
export function getCalendarEnd(year: number, month: number): Date {
  const lastDay = new Date(year, month + 1, 0); // último día del mes
  const dayOfWeek = (lastDay.getDay() + 6) % 7; // lunes=0
  const end = new Date(lastDay);
  end.setDate(lastDay.getDate() + (6 - dayOfWeek));
  return end;
}

/**
 * Calcula el rango ISO [from, to] del mes visible completo (incluyendo días
 * adyacentes visibles en la grilla).
 */
export function getMonthRangeISO(year: number, month: number): { from: string; to: string } {
  const start = getCalendarStart(year, month);
  start.setHours(0, 0, 0, 0);
  const end = getCalendarEnd(year, month);
  end.setHours(23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}

/**
 * Compara si dos fechas ISO pertenecen al mismo día en hora local.
 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Formatea una fecha ISO en hora local, p. ej. "15:30". */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

/** Formatea una fecha ISO en fecha local legible, p. ej. "15 de mayo de 2026". */
export function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Convierte una fecha ISO a valor de input datetime-local ("YYYY-MM-DDTHH:mm")
 * en hora local del navegador.
 */
export function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Devuelve la fecha ISO (solo fecha, sin hora) de hoy en hora local.
 * Útil para marcar el día actual en el grid.
 */
export function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
