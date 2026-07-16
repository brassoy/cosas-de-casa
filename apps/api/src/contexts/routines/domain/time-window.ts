import { InvalidTimeWindowError } from './routine.errors';

/**
 * Ventanas horarias "HH:mm" del contexto `routines`.
 *
 * Una ventana puede cruzar medianoche: "22:00" → "12:00" termina al día
 * siguiente y dura 840 minutos. La duración se calcula SIEMPRE con esta
 * aritmética modular; nadie más escribe `durationMinutes`.
 */

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const MINUTES_PER_DAY = 24 * 60;

/** Convierte "HH:mm" a minutos desde medianoche. Lanza si el formato no es válido. */
export function parseTimeToMinutes(time: string): number {
  if (!TIME_RE.test(time)) {
    throw new InvalidTimeWindowError();
  }
  const [hours, minutes] = time.split(':').map(Number);
  return hours! * 60 + minutes!;
}

/**
 * Duración en minutos de la ventana [startTime, endTime).
 * end <= start se interpreta como fin al día siguiente; inicio == fin es inválido.
 */
export function computeDurationMinutes(startTime: string, endTime: string): number {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (start === end) {
    throw new InvalidTimeWindowError();
  }
  return (end - start + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}
