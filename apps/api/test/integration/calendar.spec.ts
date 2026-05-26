/**
 * Tests de integración del contexto `calendar`.
 *
 * Usa una instancia Nest real contra Supabase local.
 *
 * Cobertura:
 *  ✓ POST /api/v1/families/:familyId/calendar/events    → crea evento
 *  ✓ GET  /api/v1/families/:familyId/calendar/events    → lista en rango (?from&to)
 *  ✓ GET  /api/v1/calendar/events/:eventId              → obtiene el evento
 *  ✓ PATCH /api/v1/calendar/events/:eventId             → actualiza el evento
 *  ✓ DELETE /api/v1/calendar/events/:eventId            → 204
 *  ✓ PATCH /api/v1/calendar/events/:eventId/attendees  → actualiza asistentes
 *  ✓ 401 sin token
 *  ✓ 403 no-miembro
 *  ✓ Listar: no devuelve eventos fuera del rango
 *  ✓ Listar: expande recurrencias DAILY en el rango
 */
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, closeTestApp } from '../support/app-factory';
import { createTestUser, deleteTestUser, type TestUser } from '../support/supabase-admin';

let server: ReturnType<(typeof import('http'))['createServer']>;

beforeAll(async () => {
  const testApp = await createTestApp();
  server = testApp.server;
});

afterAll(async () => {
  await closeTestApp();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function makeFamily(token: string, name = 'Familia Calendar Test'): Promise<string> {
  const res = await request(server)
    .post('/api/v1/families')
    .set('Authorization', `Bearer ${token}`)
    .send({ name });
  expect(res.status).toBe(201);
  return (res.body as { id: string }).id;
}

async function createEvent(
  token: string,
  familyId: string,
  payload: Record<string, unknown>,
): Promise<{ id: string; title: string; startsAt: string; endsAt: string | null; allDay: boolean; attendees: Array<{ userId: string }>; recurrenceRule: string | null }> {
  const res = await request(server)
    .post(`/api/v1/families/${familyId}/calendar/events`)
    .set('Authorization', `Bearer ${token}`)
    .send(payload);
  expect(res.status).toBe(201);
  return res.body as { id: string; title: string; startsAt: string; endsAt: string | null; allDay: boolean; attendees: Array<{ userId: string }>; recurrenceRule: string | null };
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('Calendar context – integración', () => {
  describe('POST /api/v1/families/:familyId/calendar/events (crear evento)', () => {
    let owner: TestUser;
    let familyId: string;

    beforeEach(async () => {
      owner = await createTestUser();
      familyId = await makeFamily(owner.accessToken);
    });

    afterAll(async () => {
      if (owner) await deleteTestUser(owner.userId);
    });

    it('crea el evento con los campos correctos', async () => {
      const ev = await createEvent(owner.accessToken, familyId, {
        title: 'Reunión familiar',
        description: 'Hablamos del presupuesto.',
        location: 'Salón',
        startsAt: '2026-07-01T10:00:00Z',
        endsAt: '2026-07-01T11:00:00Z',
        allDay: false,
      });

      expect(ev.id).toBeTruthy();
      expect(ev.title).toBe('Reunión familiar');
      expect(ev.allDay).toBe(false);
      expect(ev.endsAt).toBeTruthy();
      expect(ev.recurrenceRule).toBeNull();
      // El creador queda como asistente por defecto
      expect(ev.attendees.some((a) => a.userId === owner.userId)).toBe(true);
    });

    it('crea un evento de día completo', async () => {
      const ev = await createEvent(owner.accessToken, familyId, {
        title: 'Vacaciones',
        startsAt: '2026-08-01T00:00:00Z',
        endsAt: '2026-08-15T00:00:00Z',
        allDay: true,
      });
      expect(ev.allDay).toBe(true);
    });

    it('crea un evento recurrente con recurrenceRule', async () => {
      const ev = await createEvent(owner.accessToken, familyId, {
        title: 'Yoga',
        startsAt: '2026-06-01T09:00:00Z',
        endsAt: '2026-06-01T10:00:00Z',
        recurrenceRule: 'FREQ=WEEKLY',
      });
      expect(ev.recurrenceRule).toBe('FREQ=WEEKLY');
    });

    it('devuelve 401 sin token', async () => {
      const res = await request(server)
        .post(`/api/v1/families/${familyId}/calendar/events`)
        .send({ title: 'Sin token', startsAt: '2026-07-01T10:00:00Z' });
      expect(res.status).toBe(401);
    });

    it('devuelve 403 si el usuario no es miembro', async () => {
      const outsider = await createTestUser();
      const res = await request(server)
        .post(`/api/v1/families/${familyId}/calendar/events`)
        .set('Authorization', `Bearer ${outsider.accessToken}`)
        .send({ title: 'Intruso', startsAt: '2026-07-01T10:00:00Z' });
      expect(res.status).toBe(403);
      await deleteTestUser(outsider.userId);
    });
  });

  describe('GET /api/v1/families/:familyId/calendar/events?from&to (listar en rango)', () => {
    let owner: TestUser;
    let familyId: string;

    beforeEach(async () => {
      owner = await createTestUser();
      familyId = await makeFamily(owner.accessToken);
      // Crear eventos: uno dentro del rango y uno fuera
      await createEvent(owner.accessToken, familyId, {
        title: 'Dentro del rango',
        startsAt: '2026-07-15T10:00:00Z',
      });
      await createEvent(owner.accessToken, familyId, {
        title: 'Fuera del rango',
        startsAt: '2026-08-15T10:00:00Z',
      });
    });

    afterAll(async () => {
      if (owner) await deleteTestUser(owner.userId);
    });

    it('devuelve solo los eventos en el rango', async () => {
      const res = await request(server)
        .get(`/api/v1/families/${familyId}/calendar/events`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .query({ from: '2026-07-01T00:00:00Z', to: '2026-07-31T23:59:59Z' });

      expect(res.status).toBe(200);
      const events = res.body as Array<{ title: string }>;
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('Dentro del rango');
    });

    it('no devuelve eventos fuera del rango', async () => {
      const res = await request(server)
        .get(`/api/v1/families/${familyId}/calendar/events`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .query({ from: '2026-09-01T00:00:00Z', to: '2026-09-30T23:59:59Z' });

      expect(res.status).toBe(200);
      expect((res.body as unknown[]).length).toBe(0);
    });

    it('expande recurrencias DAILY en el rango', async () => {
      // Crear evento que empieza el 1 Jul y recur cada día; pedimos Jun 1–3
      await createEvent(owner.accessToken, familyId, {
        title: 'Diario',
        startsAt: '2026-06-01T08:00:00Z',
        recurrenceRule: 'FREQ=DAILY;COUNT=3',
      });

      const res = await request(server)
        .get(`/api/v1/families/${familyId}/calendar/events`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .query({ from: '2026-06-01T00:00:00Z', to: '2026-06-30T23:59:59Z' });

      expect(res.status).toBe(200);
      const events = res.body as Array<{ title: string }>;
      // 3 ocurrencias del evento diario (COUNT=3)
      const diarios = events.filter((e) => e.title === 'Diario');
      expect(diarios.length).toBe(3);
    });
  });

  describe('GET/PATCH/DELETE /api/v1/calendar/events/:eventId', () => {
    let owner: TestUser;
    let eventId: string;
    let familyId: string;

    beforeEach(async () => {
      owner = await createTestUser();
      familyId = await makeFamily(owner.accessToken);
      const ev = await createEvent(owner.accessToken, familyId, {
        title: 'Evento editable',
        startsAt: '2026-07-10T10:00:00Z',
        endsAt: '2026-07-10T11:00:00Z',
      });
      eventId = ev.id;
    });

    afterAll(async () => {
      if (owner) await deleteTestUser(owner.userId);
    });

    it('GET devuelve el evento por id', async () => {
      const res = await request(server)
        .get(`/api/v1/calendar/events/${eventId}`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      expect(res.status).toBe(200);
      expect((res.body as { id: string }).id).toBe(eventId);
    });

    it('PATCH actualiza el título y la location', async () => {
      const res = await request(server)
        .patch(`/api/v1/calendar/events/${eventId}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ title: 'Evento actualizado', location: 'Cocina' });

      expect(res.status).toBe(200);
      const body = res.body as { title: string; location: string };
      expect(body.title).toBe('Evento actualizado');
      expect(body.location).toBe('Cocina');
    });

    it('DELETE elimina el evento y responde 204', async () => {
      const res = await request(server)
        .delete(`/api/v1/calendar/events/${eventId}`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      expect(res.status).toBe(204);

      const getRes = await request(server)
        .get(`/api/v1/calendar/events/${eventId}`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      expect(getRes.status).toBe(404);
    });

    it('devuelve 401 sin token', async () => {
      const res = await request(server).get(`/api/v1/calendar/events/${eventId}`);
      expect(res.status).toBe(401);
    });

    it('devuelve 403 si el usuario no es miembro', async () => {
      const outsider = await createTestUser();
      const res = await request(server)
        .get(`/api/v1/calendar/events/${eventId}`)
        .set('Authorization', `Bearer ${outsider.accessToken}`);
      expect(res.status).toBe(403);
      await deleteTestUser(outsider.userId);
    });
  });

  describe('PATCH /api/v1/calendar/events/:eventId/attendees', () => {
    let owner: TestUser;
    let member: TestUser;
    let eventId: string;
    let familyId: string;

    beforeEach(async () => {
      owner = await createTestUser();
      member = await createTestUser();
      familyId = await makeFamily(owner.accessToken);

      // Que member se una a la familia
      const pinRes = await request(server)
        .post(`/api/v1/families/${familyId}/join-pin`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({});
      const pin = (pinRes.body as { code: string }).code;
      await request(server)
        .post('/api/v1/families/join')
        .set('Authorization', `Bearer ${member.accessToken}`)
        .send({ code: pin });

      const ev = await createEvent(owner.accessToken, familyId, {
        title: 'Evento asistentes',
        startsAt: '2026-07-20T10:00:00Z',
      });
      eventId = ev.id;
    });

    afterAll(async () => {
      if (owner) await deleteTestUser(owner.userId);
      if (member) await deleteTestUser(member.userId);
    });

    it('reemplaza los asistentes del evento', async () => {
      const res = await request(server)
        .patch(`/api/v1/calendar/events/${eventId}/attendees`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ attendeeIds: [member.userId] });

      expect(res.status).toBe(200);
      const body = res.body as { attendees: Array<{ userId: string }> };
      expect(body.attendees.some((a) => a.userId === member.userId)).toBe(true);
      expect(body.attendees.some((a) => a.userId === owner.userId)).toBe(false);
    });
  });
});
