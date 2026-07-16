/**
 * Tests de integración del contexto `routines`.
 *
 * Usa una instancia Nest real contra Supabase local.
 *
 * Cobertura:
 *  ✓ CRUD del catálogo (tags normalizados, ventana overnight, includeArchived)
 *  ✓ DELETE de item referenciado → se archiva; sin referencias → se borra
 *  ✓ POST rutina con items → snapshot del target; solape → 409; semana +7 ok
 *  ✓ Asignaciones: ventana por defecto del item, duplicado item+día → 409,
 *    PATCH mueve de día y recalcula duración (overnight = 840)
 *  ✓ Incidencias: alta con lostMinutes; exceso sobre lo planificado → 422
 *  ✓ GET summary: planificado/perdido/real, agregado por tag y cumplimiento
 *  ✓ Duplicar rutina: copia selección+asignaciones sin incidencias
 *  ✓ GET stats con filtro de fechas
 *  ✓ GET routines/detailed (overlay del calendario)
 *  ✓ 401 sin token / 403 no-miembro
 */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, closeTestApp } from '../support/app-factory';
import { createTestUser, deleteTestUser, type TestUser } from '../support/supabase-admin';

let server: ReturnType<(typeof import('http'))['createServer']>;
let owner: TestUser;

beforeAll(async () => {
  const testApp = await createTestApp();
  server = testApp.server;
  owner = await createTestUser();
});

afterAll(async () => {
  if (owner) await deleteTestUser(owner.userId);
  await closeTestApp();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function makeFamily(token: string, name = 'Familia Routines Test'): Promise<string> {
  const res = await request(server)
    .post('/api/v1/families')
    .set('Authorization', `Bearer ${token}`)
    .send({ name });
  expect(res.status).toBe(201);
  return (res.body as { id: string }).id;
}

interface ItemBody {
  id: string;
  name: string;
  targetTimesPerWeek: number;
  defaultStartTime: string;
  defaultEndTime: string;
  tags: string[];
  archivedAt: string | null;
}

async function makeItem(
  token: string,
  familyId: string,
  overrides: Partial<Omit<ItemBody, 'id' | 'archivedAt'>> = {},
): Promise<ItemBody> {
  const res = await request(server)
    .post(`/api/v1/families/${familyId}/routine-items`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Trabajo ☀️ Pablo',
      targetTimesPerWeek: 5,
      defaultStartTime: '09:00',
      defaultEndTime: '14:00',
      tags: ['pablo'],
      ...overrides,
    });
  expect(res.status).toBe(201);
  return res.body as ItemBody;
}

interface RoutineBody {
  id: string;
  startDate: string;
  endDate: string;
  selections: Array<{
    routineItemId: string;
    name: string;
    tags: string[];
    targetTimesPerWeek: number;
    assignedCount: number;
    isCompliant: boolean;
  }>;
  assignments: Array<{
    id: string;
    routineItemId: string;
    dayIndex: number;
    date: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    incidents: Array<{ id: string; lostMinutes: number | null }>;
  }>;
}

async function makeRoutine(
  token: string,
  familyId: string,
  body: Record<string, unknown>,
): Promise<RoutineBody> {
  const res = await request(server)
    .post(`/api/v1/families/${familyId}/routines`)
    .set('Authorization', `Bearer ${token}`)
    .send(body);
  expect(res.status).toBe(201);
  return res.body as RoutineBody;
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('Routines context – integración', () => {
  describe('catálogo de items', () => {
    it('crea, lista, edita y borra items (tags normalizados, overnight válido)', async () => {
      const familyId = await makeFamily(owner.accessToken);
      const item = await makeItem(owner.accessToken, familyId, {
        name: 'Trabajo 🌙 Pablo',
        defaultStartTime: '22:00',
        defaultEndTime: '12:00',
        tags: [' pablo ', 'pablo', 'noche'],
      });
      expect(item.tags).toEqual(['pablo', 'noche']);

      const listRes = await request(server)
        .get(`/api/v1/families/${familyId}/routine-items`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body).toHaveLength(1);

      const patchRes = await request(server)
        .patch(`/api/v1/routine-items/${item.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ targetTimesPerWeek: 3 });
      expect(patchRes.status).toBe(200);
      expect((patchRes.body as ItemBody).targetTimesPerWeek).toBe(3);

      const deleteRes = await request(server)
        .delete(`/api/v1/routine-items/${item.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      expect(deleteRes.status).toBe(204);

      const afterDelete = await request(server)
        .get(`/api/v1/families/${familyId}/routine-items?includeArchived=true`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      expect(afterDelete.body).toHaveLength(0);
    });

    it('rechaza una ventana con inicio == fin (422)', async () => {
      const familyId = await makeFamily(owner.accessToken);
      const res = await request(server)
        .post(`/api/v1/families/${familyId}/routine-items`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({
          name: 'Inválido',
          targetTimesPerWeek: 1,
          defaultStartTime: '09:00',
          defaultEndTime: '09:00',
        });
      expect(res.status).toBe(422);
      expect((res.body as { error: string }).error).toBe('INVALID_TIME_WINDOW');
    });

    it('archiva (no borra) un item referenciado por una rutina', async () => {
      const familyId = await makeFamily(owner.accessToken);
      const item = await makeItem(owner.accessToken, familyId);
      await makeRoutine(owner.accessToken, familyId, {
        startDate: '2026-03-03',
        itemIds: [item.id],
      });

      const deleteRes = await request(server)
        .delete(`/api/v1/routine-items/${item.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      expect(deleteRes.status).toBe(204);

      const activeList = await request(server)
        .get(`/api/v1/families/${familyId}/routine-items`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      expect(activeList.body).toHaveLength(0);

      const archivedList = await request(server)
        .get(`/api/v1/families/${familyId}/routine-items?includeArchived=true`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      expect(archivedList.body).toHaveLength(1);
      expect((archivedList.body as ItemBody[])[0].archivedAt).not.toBeNull();
    });
  });

  describe('rutinas', () => {
    it('crea la rutina con snapshot del target y prohíbe el solape (409)', async () => {
      const familyId = await makeFamily(owner.accessToken);
      const item = await makeItem(owner.accessToken, familyId);

      // Martes → lunes.
      const routine = await makeRoutine(owner.accessToken, familyId, {
        startDate: '2026-03-03',
        itemIds: [item.id],
      });
      expect(routine.endDate).toBe('2026-03-09');
      expect(routine.selections).toHaveLength(1);
      expect(routine.selections[0].targetTimesPerWeek).toBe(5);
      expect(routine.selections[0].name).toBe('Trabajo ☀️ Pablo');

      // El target del catálogo cambia; el snapshot de la rutina NO.
      await request(server)
        .patch(`/api/v1/routine-items/${item.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ targetTimesPerWeek: 2 });
      const getRes = await request(server)
        .get(`/api/v1/routines/${routine.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      expect((getRes.body as RoutineBody).selections[0].targetTimesPerWeek).toBe(5);

      // Solape (dentro de la misma semana) → 409.
      const overlapRes = await request(server)
        .post(`/api/v1/families/${familyId}/routines`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ startDate: '2026-03-06' });
      expect(overlapRes.status).toBe(409);
      expect((overlapRes.body as { error: string }).error).toBe('ROUTINE_OVERLAP');

      // La semana siguiente exacta sí.
      await makeRoutine(owner.accessToken, familyId, { startDate: '2026-03-10' });
    });

    it('gestiona asignaciones: ventana por defecto, duplicado 409, mover de día', async () => {
      const familyId = await makeFamily(owner.accessToken);
      const item = await makeItem(owner.accessToken, familyId, {
        name: 'Trabajo 🌙 Pablo',
        defaultStartTime: '22:00',
        defaultEndTime: '12:00',
      });
      const routine = await makeRoutine(owner.accessToken, familyId, {
        startDate: '2026-03-03',
        itemIds: [item.id],
      });

      // Sin ventana → usa la del item (overnight, 840 min).
      const createRes = await request(server)
        .post(`/api/v1/routines/${routine.id}/assignments`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ routineItemId: item.id, dayIndex: 0 });
      expect(createRes.status).toBe(201);
      const created = (createRes.body as RoutineBody).assignments[0];
      expect(created).toMatchObject({
        dayIndex: 0,
        date: '2026-03-03',
        startTime: '22:00',
        endTime: '12:00',
        durationMinutes: 840,
      });

      // Mismo item, mismo día → 409.
      const dupRes = await request(server)
        .post(`/api/v1/routines/${routine.id}/assignments`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ routineItemId: item.id, dayIndex: 0, startTime: '08:00', endTime: '09:00' });
      expect(dupRes.status).toBe(409);

      // Mover de día y ajustar ventana.
      const moveRes = await request(server)
        .patch(`/api/v1/routines/${routine.id}/assignments/${created.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ dayIndex: 3, startTime: '18:00', endTime: '20:00' });
      expect(moveRes.status).toBe(200);
      const moved = (moveRes.body as RoutineBody).assignments[0];
      expect(moved).toMatchObject({
        dayIndex: 3,
        date: '2026-03-06',
        durationMinutes: 120,
      });
    });

    it('incidencias: descuenta minutos y rechaza excesos (422)', async () => {
      const familyId = await makeFamily(owner.accessToken);
      const item = await makeItem(owner.accessToken, familyId, { targetTimesPerWeek: 2 });
      const routine = await makeRoutine(owner.accessToken, familyId, {
        startDate: '2026-03-03',
        itemIds: [item.id],
      });
      const asgRes = await request(server)
        .post(`/api/v1/routines/${routine.id}/assignments`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ routineItemId: item.id, dayIndex: 1 });
      const assignment = (asgRes.body as RoutineBody).assignments[0];

      // 300 min planificados → 301 perdidos es exceso.
      const excessRes = await request(server)
        .post(`/api/v1/routines/${routine.id}/assignments/${assignment.id}/incidents`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ description: 'Demasiado', lostMinutes: 301 });
      expect(excessRes.status).toBe(422);

      const okRes = await request(server)
        .post(`/api/v1/routines/${routine.id}/assignments/${assignment.id}/incidents`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ description: 'Recogida del niño', lostMinutes: 120 });
      expect(okRes.status).toBe(201);
      const withIncident = (okRes.body as RoutineBody).assignments[0];
      expect(withIncident.incidents).toHaveLength(1);
      expect(withIncident.incidents[0].lostMinutes).toBe(120);

      // Y se puede eliminar.
      const delRes = await request(server)
        .delete(
          `/api/v1/routines/${routine.id}/incidents/${withIncident.incidents[0].id}`,
        )
        .set('Authorization', `Bearer ${owner.accessToken}`);
      expect(delRes.status).toBe(204);
    });

    it('summary: tiempos por item y por tag con descuento de incidencias', async () => {
      const familyId = await makeFamily(owner.accessToken);
      const item = await makeItem(owner.accessToken, familyId); // 09:00–14:00, target 5, tag pablo
      const routine = await makeRoutine(owner.accessToken, familyId, {
        startDate: '2026-03-03',
        itemIds: [item.id],
      });
      for (const dayIndex of [0, 1]) {
        await request(server)
          .post(`/api/v1/routines/${routine.id}/assignments`)
          .set('Authorization', `Bearer ${owner.accessToken}`)
          .send({ routineItemId: item.id, dayIndex });
      }
      const routineRes = await request(server)
        .get(`/api/v1/routines/${routine.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      const assignment = (routineRes.body as RoutineBody).assignments[1];
      await request(server)
        .post(`/api/v1/routines/${routine.id}/assignments/${assignment.id}/incidents`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ description: 'Salida a las 12', lostMinutes: 120 });

      const summaryRes = await request(server)
        .get(`/api/v1/routines/${routine.id}/summary`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      expect(summaryRes.status).toBe(200);
      const summary = summaryRes.body as {
        perItem: Array<Record<string, unknown>>;
        perTag: Array<Record<string, unknown>>;
        totals: Record<string, unknown>;
      };
      expect(summary.perItem[0]).toMatchObject({
        name: 'Trabajo ☀️ Pablo',
        targetTimesPerWeek: 5,
        assignedCount: 2,
        isCompliant: false,
        plannedMinutes: 600,
        lostMinutes: 120,
        actualMinutes: 480,
        incidentCount: 1,
      });
      expect(summary.perTag[0]).toMatchObject({ tag: 'pablo', actualMinutes: 480 });
      expect(summary.totals).toMatchObject({
        plannedMinutes: 600,
        actualMinutes: 480,
        complianceRate: 0.4,
      });
    });

    it('duplica una rutina (asignaciones sí, incidencias no)', async () => {
      const familyId = await makeFamily(owner.accessToken);
      const item = await makeItem(owner.accessToken, familyId);
      const source = await makeRoutine(owner.accessToken, familyId, {
        startDate: '2026-03-03',
        itemIds: [item.id],
      });
      const asgRes = await request(server)
        .post(`/api/v1/routines/${source.id}/assignments`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ routineItemId: item.id, dayIndex: 2 });
      const assignment = (asgRes.body as RoutineBody).assignments[0];
      await request(server)
        .post(`/api/v1/routines/${source.id}/assignments/${assignment.id}/incidents`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ description: 'No se hizo' });

      const copy = await makeRoutine(owner.accessToken, familyId, {
        startDate: '2026-03-10',
        duplicateFromRoutineId: source.id,
      });
      expect(copy.selections).toHaveLength(1);
      expect(copy.assignments).toHaveLength(1);
      expect(copy.assignments[0].id).not.toBe(assignment.id);
      expect(copy.assignments[0].dayIndex).toBe(2);
      expect(copy.assignments[0].date).toBe('2026-03-12');
      expect(copy.assignments[0].incidents).toHaveLength(0);
    });

    it('stats: agrega por item/tag y respeta el filtro de fechas', async () => {
      const familyId = await makeFamily(owner.accessToken);
      const item = await makeItem(owner.accessToken, familyId, { targetTimesPerWeek: 2 });
      const routine = await makeRoutine(owner.accessToken, familyId, {
        startDate: '2026-03-03',
        itemIds: [item.id],
      });
      const asgRes = await request(server)
        .post(`/api/v1/routines/${routine.id}/assignments`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ routineItemId: item.id, dayIndex: 0 });
      const assignment = (asgRes.body as RoutineBody).assignments[0];
      await request(server)
        .post(`/api/v1/routines/${routine.id}/assignments/${assignment.id}/incidents`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ description: 'Salida antes', lostMinutes: 60 });

      const statsRes = await request(server)
        .get(`/api/v1/families/${familyId}/routines/stats?from=2026-03-01&to=2026-03-31`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      expect(statsRes.status).toBe(200);
      const stats = statsRes.body as {
        totals: Record<string, number>;
        perItem: Array<Record<string, unknown>>;
        perTag: Array<Record<string, unknown>>;
      };
      expect(stats.totals).toMatchObject({
        routineCount: 1,
        plannedMinutes: 300,
        lostMinutes: 60,
        actualMinutes: 240,
        incidentCount: 1,
        targetTotal: 2,
        assignedTotal: 1,
        complianceRate: 0.5,
      });
      expect(stats.perItem[0]).toMatchObject({ name: 'Trabajo ☀️ Pablo', routineCount: 1 });
      expect(stats.perTag[0]).toMatchObject({ tag: 'pablo', plannedMinutes: 300 });

      // Fuera de rango → vacío.
      const emptyRes = await request(server)
        .get(`/api/v1/families/${familyId}/routines/stats?from=2026-05-01&to=2026-05-31`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      expect((emptyRes.body as { totals: { routineCount: number } }).totals.routineCount).toBe(0);
    });

    it('routines/detailed devuelve las rutinas hidratadas para el overlay', async () => {
      const familyId = await makeFamily(owner.accessToken);
      const item = await makeItem(owner.accessToken, familyId);
      const routine = await makeRoutine(owner.accessToken, familyId, {
        startDate: '2026-03-03',
        itemIds: [item.id],
      });
      await request(server)
        .post(`/api/v1/routines/${routine.id}/assignments`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ routineItemId: item.id, dayIndex: 4 });

      const res = await request(server)
        .get(
          `/api/v1/families/${familyId}/routines/detailed?from=2026-03-01&to=2026-03-31`,
        )
        .set('Authorization', `Bearer ${owner.accessToken}`);
      expect(res.status).toBe(200);
      const detailed = res.body as RoutineBody[];
      expect(detailed).toHaveLength(1);
      expect(detailed[0].assignments).toHaveLength(1);
      expect(detailed[0].assignments[0].date).toBe('2026-03-07');
      expect(detailed[0].selections[0].name).toBe('Trabajo ☀️ Pablo');
    });
  });

  describe('autorización', () => {
    it('devuelve 401 sin token y 403 para no-miembros', async () => {
      const familyId = await makeFamily(owner.accessToken);
      const routine = await makeRoutine(owner.accessToken, familyId, {
        startDate: '2026-03-03',
      });

      const noTokenRes = await request(server).get(`/api/v1/routines/${routine.id}`);
      expect(noTokenRes.status).toBe(401);

      const outsider = await createTestUser();
      const outsiderRes = await request(server)
        .get(`/api/v1/routines/${routine.id}`)
        .set('Authorization', `Bearer ${outsider.accessToken}`);
      expect(outsiderRes.status).toBe(403);

      const outsiderCreate = await request(server)
        .post(`/api/v1/families/${familyId}/routines`)
        .set('Authorization', `Bearer ${outsider.accessToken}`)
        .send({ startDate: '2026-04-01' });
      expect(outsiderCreate.status).toBe(403);

      await deleteTestUser(outsider.userId);
    });
  });
});
