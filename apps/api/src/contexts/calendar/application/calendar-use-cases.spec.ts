/**
 * Tests unitarios de los casos de uso del contexto `calendar`.
 *
 * Usan repositorios en memoria (fake) para aislar la lógica de aplicación.
 *
 * Cobertura:
 *  ✓ CreateEvent: crea y persiste el evento
 *  ✓ CreateEvent: lanza CalendarEventTitleEmptyError si el título está vacío
 *  ✓ GetEvent: devuelve el evento por id
 *  ✓ GetEvent: lanza CalendarEventNotFoundError si no existe
 *  ✓ ListEvents: devuelve eventos en el rango
 *  ✓ ListEvents: filtra eventos fuera del rango
 *  ✓ UpdateEvent: actualiza el evento
 *  ✓ UpdateEvent: lanza CalendarEventNotFoundError si no existe
 *  ✓ DeleteEvent: elimina el evento
 *  ✓ DeleteEvent: lanza CalendarEventNotFoundError si no existe
 *  ✓ SetAttendees: reemplaza los asistentes
 */
import { describe, expect, it, beforeEach } from 'vitest';
import type { CalendarEventRepository, ListEventsFilter } from '../domain/ports/calendar-event.repository';
import type { CalendarClock } from './ports/clock';
import type { CalendarIdGenerator } from './ports/id-generator';
import { CalendarEvent } from '../domain/calendar-event';
import {
  CalendarEventNotFoundError,
  CalendarEventTitleEmptyError,
} from '../domain/calendar.errors';
import { CreateEventUseCase } from './create-event.use-case';
import { GetEventUseCase } from './get-event.use-case';
import { ListEventsUseCase } from './list-events.use-case';
import { UpdateEventUseCase } from './update-event.use-case';
import { DeleteEventUseCase } from './delete-event.use-case';
import { SetAttendeesUseCase } from './set-attendees.use-case';

// ── Fakes ──────────────────────────────────────────────────────────────────

let eventStore: CalendarEvent[] = [];
let idCounter = 0;
const FIXED_NOW = new Date('2026-05-26T10:00:00Z');
const STARTS_AT = new Date('2026-06-01T10:00:00Z');
const ENDS_AT = new Date('2026-06-01T11:00:00Z');

const fakeClock: CalendarClock = { now: () => FIXED_NOW };
const fakeIds: CalendarIdGenerator = { generate: () => `ev-${++idCounter}` };

const fakeRepo: CalendarEventRepository = {
  async create(event) { eventStore.push(event); },
  async findById(id) { return eventStore.find((e) => e.id === id) ?? null; },
  async findByFamilyInRange(familyId: string, filter: ListEventsFilter) {
    return eventStore.filter(
      (e) =>
        e.familyId === familyId &&
        e.startsAt >= filter.from &&
        e.startsAt <= filter.to,
    );
  },
  async update(event) {
    const idx = eventStore.findIndex((e) => e.id === event.id);
    if (idx !== -1) eventStore[idx] = event;
  },
  async deleteById(id) {
    eventStore = eventStore.filter((e) => e.id !== id);
  },
  async setAttendees(eventId, attendeeIds) {
    const event = eventStore.find((e) => e.id === eventId);
    if (event) event.setAttendees(attendeeIds, FIXED_NOW);
  },
};

// ── Setup ──────────────────────────────────────────────────────────────────

function makeUseCases() {
  return {
    createEvent: new CreateEventUseCase(fakeRepo, fakeClock, fakeIds),
    getEvent: new GetEventUseCase(fakeRepo),
    listEvents: new ListEventsUseCase(fakeRepo),
    updateEvent: new UpdateEventUseCase(fakeRepo, fakeClock),
    deleteEvent: new DeleteEventUseCase(fakeRepo),
    setAttendees: new SetAttendeesUseCase(fakeRepo, fakeClock),
  };
}

beforeEach(() => {
  eventStore = [];
  idCounter = 0;
});

// ── CreateEvent ───────────────────────────────────────────────────────────────

describe('CreateEventUseCase', () => {
  it('crea el evento y lo persiste', async () => {
    const { createEvent } = makeUseCases();
    const event = await createEvent.execute({
      familyId: 'fam-1',
      title: 'Cumpleaños',
      startsAt: STARTS_AT,
      endsAt: ENDS_AT,
      createdBy: 'user-1',
    });

    expect(event.title).toBe('Cumpleaños');
    expect(event.familyId).toBe('fam-1');
    expect(eventStore).toHaveLength(1);
  });

  it('lanza CalendarEventTitleEmptyError si el título está vacío', async () => {
    const { createEvent } = makeUseCases();
    await expect(
      createEvent.execute({ familyId: 'fam-1', title: '  ', startsAt: STARTS_AT, createdBy: 'user-1' }),
    ).rejects.toThrow(CalendarEventTitleEmptyError);
  });
});

// ── GetEvent ──────────────────────────────────────────────────────────────────

describe('GetEventUseCase', () => {
  it('devuelve el evento por id', async () => {
    const { createEvent, getEvent } = makeUseCases();
    const created = await createEvent.execute({
      familyId: 'fam-1',
      title: 'Reunión',
      startsAt: STARTS_AT,
      createdBy: 'user-1',
    });

    const found = await getEvent.execute({ eventId: created.id });
    expect(found.id).toBe(created.id);
  });

  it('lanza CalendarEventNotFoundError si no existe', async () => {
    const { getEvent } = makeUseCases();
    await expect(getEvent.execute({ eventId: 'ghost' })).rejects.toThrow(CalendarEventNotFoundError);
  });
});

// ── ListEvents ────────────────────────────────────────────────────────────────

describe('ListEventsUseCase', () => {
  it('devuelve eventos dentro del rango', async () => {
    const { createEvent, listEvents } = makeUseCases();
    await createEvent.execute({ familyId: 'fam-1', title: 'E1', startsAt: new Date('2026-06-01T10:00:00Z'), createdBy: 'user-1' });
    await createEvent.execute({ familyId: 'fam-1', title: 'E2', startsAt: new Date('2026-06-15T10:00:00Z'), createdBy: 'user-1' });
    await createEvent.execute({ familyId: 'fam-1', title: 'E3', startsAt: new Date('2026-07-01T10:00:00Z'), createdBy: 'user-1' });

    const result = await listEvents.execute({
      familyId: 'fam-1',
      from: new Date('2026-06-01T00:00:00Z'),
      to: new Date('2026-06-30T23:59:59Z'),
    });

    expect(result).toHaveLength(2);
    expect(result.map((e) => e.title)).toEqual(['E1', 'E2']);
  });

  it('filtra eventos fuera del rango', async () => {
    const { createEvent, listEvents } = makeUseCases();
    await createEvent.execute({ familyId: 'fam-1', title: 'Fuera', startsAt: new Date('2026-08-01T10:00:00Z'), createdBy: 'user-1' });

    const result = await listEvents.execute({
      familyId: 'fam-1',
      from: new Date('2026-06-01T00:00:00Z'),
      to: new Date('2026-06-30T23:59:59Z'),
    });

    expect(result).toHaveLength(0);
  });
});

// ── UpdateEvent ───────────────────────────────────────────────────────────────

describe('UpdateEventUseCase', () => {
  it('actualiza el título del evento', async () => {
    const { createEvent, updateEvent } = makeUseCases();
    const ev = await createEvent.execute({ familyId: 'fam-1', title: 'Viejo', startsAt: STARTS_AT, createdBy: 'user-1' });

    const updated = await updateEvent.execute({ eventId: ev.id, title: 'Nuevo' });
    expect(updated.title).toBe('Nuevo');
  });

  it('lanza CalendarEventNotFoundError si el evento no existe', async () => {
    const { updateEvent } = makeUseCases();
    await expect(updateEvent.execute({ eventId: 'ghost', title: 'X' })).rejects.toThrow(CalendarEventNotFoundError);
  });
});

// ── DeleteEvent ───────────────────────────────────────────────────────────────

describe('DeleteEventUseCase', () => {
  it('elimina el evento', async () => {
    const { createEvent, deleteEvent } = makeUseCases();
    const ev = await createEvent.execute({ familyId: 'fam-1', title: 'Borrar', startsAt: STARTS_AT, createdBy: 'user-1' });

    await deleteEvent.execute({ eventId: ev.id });
    expect(eventStore.find((e) => e.id === ev.id)).toBeUndefined();
  });

  it('lanza CalendarEventNotFoundError si el evento no existe', async () => {
    const { deleteEvent } = makeUseCases();
    await expect(deleteEvent.execute({ eventId: 'ghost' })).rejects.toThrow(CalendarEventNotFoundError);
  });
});

// ── SetAttendees ──────────────────────────────────────────────────────────────

describe('SetAttendeesUseCase', () => {
  it('reemplaza los asistentes del evento', async () => {
    const { createEvent, setAttendees } = makeUseCases();
    const ev = await createEvent.execute({ familyId: 'fam-1', title: 'Evento', startsAt: STARTS_AT, createdBy: 'user-1' });

    const updated = await setAttendees.execute({ eventId: ev.id, attendeeIds: ['user-2', 'user-3'] });
    expect(updated.attendeeIds).toEqual(['user-2', 'user-3']);
  });
});
