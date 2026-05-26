/**
 * Tests unitarios de la entidad CalendarEvent.
 *
 * Cobertura:
 *  ✓ create: crea evento con datos válidos
 *  ✓ create: lanza CalendarEventTitleEmptyError si el título está vacío
 *  ✓ create: lanza CalendarEventInvalidRangeError si ends_at < starts_at
 *  ✓ create: permite ends_at === starts_at (evento puntual)
 *  ✓ create: attendeeIds por defecto incluye al creador
 *  ✓ update: actualiza título y fechas correctamente
 *  ✓ update: lanza CalendarEventTitleEmptyError si el título queda vacío
 *  ✓ update: lanza CalendarEventInvalidRangeError en update si ends_at < starts_at
 *  ✓ setAttendees: reemplaza la lista
 */
import { describe, expect, it } from 'vitest';
import { CalendarEvent } from './calendar-event';
import {
  CalendarEventTitleEmptyError,
  CalendarEventInvalidRangeError,
} from './calendar.errors';

const NOW = new Date('2026-05-26T10:00:00Z');
const STARTS_AT = new Date('2026-06-01T10:00:00Z');
const ENDS_AT = new Date('2026-06-01T11:00:00Z');

function makeEvent(overrides: Partial<Parameters<typeof CalendarEvent.create>[0]> = {}): CalendarEvent {
  return CalendarEvent.create({
    id: 'ev-1',
    familyId: 'fam-1',
    title: 'Reunión familiar',
    startsAt: STARTS_AT,
    createdBy: 'user-1',
    now: NOW,
    ...overrides,
  });
}

describe('CalendarEvent.create', () => {
  it('crea un evento con datos válidos', () => {
    const ev = makeEvent({ endsAt: ENDS_AT });
    expect(ev.title).toBe('Reunión familiar');
    expect(ev.startsAt).toEqual(STARTS_AT);
    expect(ev.endsAt).toEqual(ENDS_AT);
    expect(ev.allDay).toBe(false);
    expect(ev.recurrenceRule).toBeNull();
    expect(ev.attendeeIds).toEqual(['user-1']);
  });

  it('lanza CalendarEventTitleEmptyError si el título está vacío', () => {
    expect(() => makeEvent({ title: '   ' })).toThrow(CalendarEventTitleEmptyError);
  });

  it('lanza CalendarEventInvalidRangeError si ends_at < starts_at', () => {
    const before = new Date(STARTS_AT.getTime() - 1000);
    expect(() => makeEvent({ endsAt: before })).toThrow(CalendarEventInvalidRangeError);
  });

  it('permite ends_at === starts_at (evento puntual)', () => {
    const ev = makeEvent({ endsAt: STARTS_AT });
    expect(ev.endsAt).toEqual(STARTS_AT);
  });

  it('el creador queda como asistente por defecto si no se pasan attendeeIds', () => {
    const ev = makeEvent();
    expect(ev.attendeeIds).toEqual(['user-1']);
  });

  it('respeta attendeeIds si se pasan explícitamente', () => {
    const ev = makeEvent({ attendeeIds: ['user-2', 'user-3'] });
    expect(ev.attendeeIds).toEqual(['user-2', 'user-3']);
  });

  it('recorta el título', () => {
    const ev = makeEvent({ title: '  Reunión  ' });
    expect(ev.title).toBe('Reunión');
  });
});

describe('CalendarEvent.update', () => {
  it('actualiza el título', () => {
    const ev = makeEvent();
    ev.update({ title: 'Nueva reunión' }, NOW);
    expect(ev.title).toBe('Nueva reunión');
  });

  it('lanza CalendarEventTitleEmptyError si el título queda vacío', () => {
    const ev = makeEvent();
    expect(() => ev.update({ title: '' }, NOW)).toThrow(CalendarEventTitleEmptyError);
  });

  it('lanza CalendarEventInvalidRangeError si ends_at < starts_at en update', () => {
    const ev = makeEvent({ endsAt: ENDS_AT });
    const before = new Date(STARTS_AT.getTime() - 1000);
    expect(() => ev.update({ endsAt: before }, NOW)).toThrow(CalendarEventInvalidRangeError);
  });

  it('actualiza la recurrence_rule', () => {
    const ev = makeEvent();
    ev.update({ recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO' }, NOW);
    expect(ev.recurrenceRule).toBe('FREQ=WEEKLY;BYDAY=MO');
  });
});

describe('CalendarEvent.setAttendees', () => {
  it('reemplaza la lista de asistentes', () => {
    const ev = makeEvent();
    ev.setAttendees(['user-2', 'user-3'], NOW);
    expect(ev.attendeeIds).toEqual(['user-2', 'user-3']);
  });
});
