/**
 * Tests unitarios del expansor de recurrencias RRULE básico.
 *
 * Cobertura:
 *  ✓ FREQ=DAILY sin límite: expande correctamente en el rango
 *  ✓ FREQ=DAILY con INTERVAL=2
 *  ✓ FREQ=WEEKLY: expande correctamente
 *  ✓ FREQ=MONTHLY: expande correctamente
 *  ✓ UNTIL: no incluye ocurrencias posteriores a UNTIL
 *  ✓ COUNT: limita el número de ocurrencias
 *  ✓ Evento no recurrente: devuelve el evento tal cual si está en rango
 *  ✓ Regla no soportada (FREQ=YEARLY): devuelve el evento base si está en rango
 *  ✓ Las ocurrencias tienen la misma duración que el evento base
 */
import { describe, expect, it } from 'vitest';
import { expandRecurrence } from './recurrence-expander';
import { CalendarEvent } from '../domain/calendar-event';

function makeEvent(overrides: Partial<{
  id: string;
  recurrenceRule: string | null;
  startsAt: Date;
  endsAt: Date | null;
}>): CalendarEvent {
  const startsAt = overrides.startsAt ?? new Date('2026-06-01T10:00:00Z');
  const endsAt = overrides.endsAt !== undefined ? overrides.endsAt : new Date('2026-06-01T11:00:00Z');
  return new CalendarEvent({
    id: overrides.id ?? 'ev-1',
    familyId: 'fam-1',
    title: 'Test',
    description: null,
    location: null,
    startsAt,
    endsAt,
    allDay: false,
    recurrenceRule: overrides.recurrenceRule ?? null,
    createdBy: 'user-1',
    attendeeIds: ['user-1'],
    createdAt: new Date('2026-05-01T00:00:00Z'),
    updatedAt: new Date('2026-05-01T00:00:00Z'),
  });
}

const FROM = new Date('2026-06-01T00:00:00Z');
const TO = new Date('2026-06-30T23:59:59Z');

describe('expandRecurrence', () => {
  it('devuelve el evento tal cual si no tiene recurrenceRule', () => {
    const ev = makeEvent({ recurrenceRule: null });
    const result = expandRecurrence(ev, FROM, TO);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('ev-1');
  });

  it('FREQ=DAILY: expande 5 ocurrencias en el rango [Jun 1–5]', () => {
    const ev = makeEvent({ recurrenceRule: 'FREQ=DAILY' });
    const from = new Date('2026-06-01T00:00:00Z');
    const to = new Date('2026-06-05T23:59:59Z');
    const result = expandRecurrence(ev, from, to);
    expect(result).toHaveLength(5);
    expect(result[0].startsAt.toISOString()).toBe('2026-06-01T10:00:00.000Z');
    expect(result[4].startsAt.toISOString()).toBe('2026-06-05T10:00:00.000Z');
  });

  it('FREQ=DAILY;INTERVAL=2: expande cada 2 días', () => {
    const ev = makeEvent({ recurrenceRule: 'FREQ=DAILY;INTERVAL=2' });
    const from = new Date('2026-06-01T00:00:00Z');
    const to = new Date('2026-06-10T23:59:59Z');
    const result = expandRecurrence(ev, from, to);
    // Jun 1, 3, 5, 7, 9 → 5 ocurrencias
    expect(result).toHaveLength(5);
    expect(result[1].startsAt.toISOString()).toBe('2026-06-03T10:00:00.000Z');
  });

  it('FREQ=WEEKLY: expande cada semana', () => {
    const ev = makeEvent({ recurrenceRule: 'FREQ=WEEKLY', startsAt: new Date('2026-06-01T10:00:00Z') });
    const from = new Date('2026-06-01T00:00:00Z');
    const to = new Date('2026-06-30T23:59:59Z');
    const result = expandRecurrence(ev, from, to);
    // Jun 1, 8, 15, 22, 29 → 5 ocurrencias
    expect(result).toHaveLength(5);
    expect(result[1].startsAt.toISOString()).toBe('2026-06-08T10:00:00.000Z');
  });

  it('FREQ=MONTHLY: expande cada mes', () => {
    const ev = makeEvent({ recurrenceRule: 'FREQ=MONTHLY', startsAt: new Date('2026-01-15T10:00:00Z') });
    const from = new Date('2026-01-01T00:00:00Z');
    const to = new Date('2026-06-30T23:59:59Z');
    const result = expandRecurrence(ev, from, to);
    // Ene 15, Feb 15, Mar 15, Abr 15, May 15, Jun 15 → 6
    expect(result).toHaveLength(6);
  });

  it('UNTIL: no incluye ocurrencias posteriores a UNTIL', () => {
    const ev = makeEvent({ recurrenceRule: 'FREQ=DAILY;UNTIL=20260603T000000Z' });
    const from = new Date('2026-06-01T00:00:00Z');
    const to = new Date('2026-06-10T23:59:59Z');
    const result = expandRecurrence(ev, from, to);
    // Jun 1, 2 (Jun 3 a las 10 > UNTIL 00:00 del 3) → 2
    expect(result).toHaveLength(2);
  });

  it('COUNT: limita el número de ocurrencias', () => {
    const ev = makeEvent({ recurrenceRule: 'FREQ=DAILY;COUNT=3' });
    const from = new Date('2026-06-01T00:00:00Z');
    const to = new Date('2026-06-30T23:59:59Z');
    const result = expandRecurrence(ev, from, to);
    expect(result).toHaveLength(3);
  });

  it('las ocurrencias mantienen la misma duración que el evento base', () => {
    const startsAt = new Date('2026-06-01T10:00:00Z');
    const endsAt = new Date('2026-06-01T12:00:00Z'); // 2 horas
    const ev = makeEvent({ recurrenceRule: 'FREQ=DAILY', startsAt, endsAt });
    const from = new Date('2026-06-01T00:00:00Z');
    const to = new Date('2026-06-02T23:59:59Z');
    const result = expandRecurrence(ev, from, to);
    expect(result).toHaveLength(2);
    // La segunda ocurrencia empieza el 2 y termina 2 horas después
    const occ2 = result[1];
    expect(occ2.startsAt.toISOString()).toBe('2026-06-02T10:00:00.000Z');
    expect(occ2.endsAt?.toISOString()).toBe('2026-06-02T12:00:00.000Z');
  });

  it('FREQ=YEARLY (no soportado): devuelve el evento base si está en rango', () => {
    const ev = makeEvent({ recurrenceRule: 'FREQ=YEARLY' });
    const result = expandRecurrence(ev, FROM, TO);
    // Jun 1 cae en [Jun 1, Jun 30] → devuelve el evento base
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('ev-1');
  });
});
