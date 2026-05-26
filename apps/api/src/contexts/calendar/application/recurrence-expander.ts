/**
 * Expansor básico de reglas de recurrencia iCal (RRULE).
 *
 * Soporta:
 *   - FREQ=DAILY | WEEKLY | MONTHLY
 *   - INTERVAL=n (por defecto 1)
 *   - UNTIL=YYYYMMDDTHHmmssZ (fecha límite, opcional)
 *   - COUNT=n (número máximo de ocurrencias, opcional)
 *
 * Limitaciones conocidas:
 *   - No soporta BYDAY, BYMONTHDAY, BYSETPOS ni EXDATE.
 *   - No soporta FREQ=YEARLY.
 *   - Las recurrencias complejas se guardan en recurrence_rule pero no se expanden.
 *   - Para soporte completo, integrar la librería rrule.js en una fase posterior.
 *
 * TODO(Fase 4): sustituir por rrule.js para soporte RRULE completo (BYDAY, EXDATE, etc.)
 */

import { CalendarEvent } from '../domain/calendar-event';

/** Parsea los parámetros de una RRULE simple. */
interface ParsedRRule {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  interval: number;
  until: Date | null;
  count: number | null;
}

function parseRRule(rule: string): ParsedRRule | null {
  const parts = rule.split(';').reduce<Record<string, string>>((acc, part) => {
    const [key, val] = part.split('=');
    if (key && val !== undefined) acc[key.toUpperCase()] = val;
    return acc;
  }, {});

  const freq = parts['FREQ'] as ParsedRRule['freq'] | undefined;
  if (!freq || !['DAILY', 'WEEKLY', 'MONTHLY'].includes(freq)) {
    // Frecuencia no soportada → no expandir
    return null;
  }

  const interval = parts['INTERVAL'] ? parseInt(parts['INTERVAL'], 10) : 1;
  const count = parts['COUNT'] ? parseInt(parts['COUNT'], 10) : null;

  let until: Date | null = null;
  if (parts['UNTIL']) {
    // Formato: YYYYMMDDTHHmmssZ o YYYYMMDD
    const u = parts['UNTIL'];
    if (u.length >= 8) {
      const iso = `${u.slice(0, 4)}-${u.slice(4, 6)}-${u.slice(6, 8)}T${u.slice(9, 11) || '00'}:${u.slice(11, 13) || '00'}:${u.slice(13, 15) || '00'}Z`;
      until = new Date(iso);
      if (isNaN(until.getTime())) until = null;
    }
  }

  return { freq, interval: isNaN(interval) ? 1 : interval, until, count: count && !isNaN(count) ? count : null };
}

/** Avanza una fecha según la frecuencia e intervalo. */
function advance(date: Date, freq: ParsedRRule['freq'], interval: number): Date {
  const d = new Date(date);
  switch (freq) {
    case 'DAILY':
      d.setUTCDate(d.getUTCDate() + interval);
      break;
    case 'WEEKLY':
      d.setUTCDate(d.getUTCDate() + 7 * interval);
      break;
    case 'MONTHLY':
      d.setUTCMonth(d.getUTCMonth() + interval);
      break;
  }
  return d;
}

/**
 * Expande un evento recurrente en sus ocurrencias dentro del rango [from, to].
 *
 * Si la regla no se puede parsear, devuelve el evento base si su starts_at cae en el rango.
 */
export function expandRecurrence(
  event: CalendarEvent,
  from: Date,
  to: Date,
): CalendarEvent[] {
  if (!event.recurrenceRule) return [event];

  const parsed = parseRRule(event.recurrenceRule);
  if (!parsed) {
    // Regla compleja no soportada: devolvemos el evento base si aplica al rango
    if (event.startsAt >= from && event.startsAt <= to) return [event];
    return [];
  }

  const duration = event.endsAt
    ? event.endsAt.getTime() - event.startsAt.getTime()
    : 0;

  const results: CalendarEvent[] = [];
  let current = new Date(event.startsAt);
  let occurrenceCount = 0;
  const MAX_OCCURRENCES = 500; // guardia de seguridad

  while (occurrenceCount < MAX_OCCURRENCES) {
    // Comprobamos límites
    if (parsed.until && current > parsed.until) break;
    if (parsed.count !== null && occurrenceCount >= parsed.count) break;
    if (current > to) break;

    if (current >= from) {
      const endsAt = event.endsAt ? new Date(current.getTime() + duration) : null;

      // Creamos una copia virtual del evento con la fecha de esta ocurrencia.
      // Nota: reutilizamos el mismo id + sufijo de ocurrencia para identificar
      // la ocurrencia sin necesidad de persistirla (virtual).
      const occurrence = new CalendarEvent({
        id: `${event.id}_occ_${occurrenceCount}`,
        familyId: event.familyId,
        title: event.title,
        description: event.description,
        location: event.location,
        startsAt: current,
        endsAt,
        allDay: event.allDay,
        recurrenceRule: event.recurrenceRule,
        createdBy: event.createdBy,
        attendeeIds: event.attendeeIds,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      });
      results.push(occurrence);
    }

    occurrenceCount++;
    current = advance(current, parsed.freq, parsed.interval);
  }

  return results;
}
