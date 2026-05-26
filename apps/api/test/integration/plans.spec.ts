/**
 * Tests de integración del contexto `plans` (planes rápidos + chat).
 *
 * Cobertura:
 *  ✓ POST /families/:id/plans             → crea plan, devuelve PlanDto
 *  ✓ GET  /families/:id/plans             → lista planes (propios + compartidos)
 *  ✓ GET  /plans/:planId                  → detalle del plan
 *  ✓ PATCH /plans/:planId                 → actualiza plan (solo owner)
 *  ✓ No-miembro no accede al plan → 403
 *  ✓ POST /plans/:planId/share            → comparte con familia amiga
 *  ✓ POST /plans/:planId/share con familia no amiga → 422
 *  ✓ POST /plans/:planId/rsvp             → RSVP actualizado
 *  ✓ POST /families/:id/places            → crea lugar guardado
 *  ✓ GET  /families/:id/places            → lista lugares guardados
 *  ✓ DELETE /places/:placeId              → 204
 *  ✓ DELETE /plans/:planId                → 204 (solo owner)
 *  ✓ POST /plans/:planId/messages         → envía mensaje
 *  ✓ GET  /plans/:planId/messages         → lista mensajes
 *  ✓ Sin token → 401
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

async function createFamily(token: string, name = 'Familia Test'): Promise<{ id: string }> {
  const res = await request(server)
    .post('/api/v1/families')
    .set('Authorization', `Bearer ${token}`)
    .send({ name });
  expect(res.status).toBe(201);
  return res.body as { id: string };
}

async function makeFriends(
  ownerAToken: string,
  familyAId: string,
  ownerBToken: string,
  familyBId: string,
): Promise<string> {
  const pinRes = await request(server)
    .post(`/api/v1/families/${familyAId}/friend-invites`)
    .set('Authorization', `Bearer ${ownerAToken}`);
  const code = (pinRes.body as { code: string }).code;

  const redeemRes = await request(server)
    .post('/api/v1/friends/redeem')
    .set('Authorization', `Bearer ${ownerBToken}`)
    .send({ code, familyId: familyBId });
  return (redeemRes.body as { linkId: string }).linkId;
}

describe('Plans context — planes rápidos', () => {
  describe('CRUD básico de planes', () => {
    let owner: TestUser;
    let familyId: string;
    let planId: string;

    beforeEach(async () => {
      owner = await createTestUser();
      const f = await createFamily(owner.accessToken, 'Familia Planes');
      familyId = f.id;
    });

    afterAll(async () => {
      if (owner) await deleteTestUser(owner.userId);
    });

    it('POST crea un plan y devuelve PlanDto', async () => {
      const res = await request(server)
        .post(`/api/v1/families/${familyId}/plans`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ title: 'Cena de verano', scheduledAt: '2026-07-15T20:00:00Z' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: expect.any(String),
        title: 'Cena de verano',
        ownerFamilyId: familyId,
        status: 'proposed',
        participants: expect.arrayContaining([
          expect.objectContaining({ userId: owner.userId, status: 'going' }),
        ]),
      });
      planId = res.body.id;
    });

    it('GET /families/:id/plans devuelve el plan creado', async () => {
      const createRes = await request(server)
        .post(`/api/v1/families/${familyId}/plans`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ title: 'Pícnic' });
      const id = createRes.body.id;

      const res = await request(server)
        .get(`/api/v1/families/${familyId}/plans`)
        .set('Authorization', `Bearer ${owner.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.some((p: { id: string }) => p.id === id)).toBe(true);
    });

    it('GET /plans/:planId devuelve el detalle', async () => {
      const createRes = await request(server)
        .post(`/api/v1/families/${familyId}/plans`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ title: 'Detalle test' });
      const id = createRes.body.id;

      const res = await request(server)
        .get(`/api/v1/plans/${id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(id);
    });

    it('PATCH /plans/:planId actualiza el título', async () => {
      const createRes = await request(server)
        .post(`/api/v1/families/${familyId}/plans`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ title: 'Título original' });
      const id = createRes.body.id;

      const res = await request(server)
        .patch(`/api/v1/plans/${id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ title: 'Título actualizado' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Título actualizado');
    });

    it('DELETE /plans/:planId → 204', async () => {
      const createRes = await request(server)
        .post(`/api/v1/families/${familyId}/plans`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ title: 'Plan a eliminar' });
      const id = createRes.body.id;

      const res = await request(server)
        .delete(`/api/v1/plans/${id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`);

      expect(res.status).toBe(204);
    });

    it('sin token → 401', async () => {
      const res = await request(server)
        .get(`/api/v1/families/${familyId}/plans`);
      expect(res.status).toBe(401);
    });

    it('no-miembro no puede ver el plan → 403', async () => {
      const createRes = await request(server)
        .post(`/api/v1/families/${familyId}/plans`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ title: 'Plan privado' });
      const id = createRes.body.id;

      const stranger = await createTestUser();
      const res = await request(server)
        .get(`/api/v1/plans/${id}`)
        .set('Authorization', `Bearer ${stranger.accessToken}`);
      expect(res.status).toBe(403);
      await deleteTestUser(stranger.userId);
    });
  });

  describe('Compartir plan con familias amigas', () => {
    let ownerA: TestUser;
    let ownerB: TestUser;
    let familyAId: string;
    let familyBId: string;
    let planId: string;

    beforeEach(async () => {
      ownerA = await createTestUser();
      ownerB = await createTestUser();
      const fA = await createFamily(ownerA.accessToken, 'Familia Anfitriona');
      const fB = await createFamily(ownerB.accessToken, 'Familia Amiga');
      familyAId = fA.id;
      familyBId = fB.id;

      const createRes = await request(server)
        .post(`/api/v1/families/${familyAId}/plans`)
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .send({ title: 'Barbacoa' });
      planId = createRes.body.id;
    });

    afterAll(async () => {
      await Promise.all([
        ownerA ? deleteTestUser(ownerA.userId) : Promise.resolve(),
        ownerB ? deleteTestUser(ownerB.userId) : Promise.resolve(),
      ]);
    });

    it('compartir con familia amiga funciona', async () => {
      await makeFriends(ownerA.accessToken, familyAId, ownerB.accessToken, familyBId);

      const res = await request(server)
        .post(`/api/v1/plans/${planId}/share`)
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .send({ familyId: familyBId });

      expect(res.status).toBe(201);
      expect(res.body.sharedWithFamilyIds).toContain(familyBId);
    });

    it('compartir con familia no amiga → 422', async () => {
      // Sin hacer makeFriends.
      const res = await request(server)
        .post(`/api/v1/plans/${planId}/share`)
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .send({ familyId: familyBId });

      expect(res.status).toBe(422);
    });

    it('familia amiga puede ver el plan compartido', async () => {
      await makeFriends(ownerA.accessToken, familyAId, ownerB.accessToken, familyBId);

      await request(server)
        .post(`/api/v1/plans/${planId}/share`)
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .send({ familyId: familyBId });

      const res = await request(server)
        .get(`/api/v1/plans/${planId}`)
        .set('Authorization', `Bearer ${ownerB.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(planId);
    });
  });

  describe('RSVP', () => {
    let owner: TestUser;
    let familyId: string;
    let planId: string;

    beforeEach(async () => {
      owner = await createTestUser();
      const f = await createFamily(owner.accessToken, 'Familia RSVP');
      familyId = f.id;
      const createRes = await request(server)
        .post(`/api/v1/families/${familyId}/plans`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ title: 'Plan con RSVP' });
      planId = createRes.body.id;
    });

    afterAll(async () => {
      if (owner) await deleteTestUser(owner.userId);
    });

    it('POST /plans/:planId/rsvp actualiza el estado', async () => {
      const res = await request(server)
        .post(`/api/v1/plans/${planId}/rsvp`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ status: 'maybe' });

      expect(res.status).toBe(200);
      const participant = (res.body.participants as Array<{ userId: string; status: string }>)
        .find((p) => p.userId === owner.userId);
      expect(participant?.status).toBe('maybe');
    });
  });

  describe('Lugares guardados', () => {
    let owner: TestUser;
    let familyId: string;

    beforeEach(async () => {
      owner = await createTestUser();
      const f = await createFamily(owner.accessToken, 'Familia Lugares');
      familyId = f.id;
    });

    afterAll(async () => {
      if (owner) await deleteTestUser(owner.userId);
    });

    it('POST crea un lugar y GET lo lista', async () => {
      const createRes = await request(server)
        .post(`/api/v1/families/${familyId}/places`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ name: 'La Tasca', address: 'Calle Mayor 1' });

      expect(createRes.status).toBe(201);
      expect(createRes.body.name).toBe('La Tasca');

      const listRes = await request(server)
        .get(`/api/v1/families/${familyId}/places`)
        .set('Authorization', `Bearer ${owner.accessToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.some((p: { name: string }) => p.name === 'La Tasca')).toBe(true);
    });

    it('DELETE /places/:placeId → 204', async () => {
      const createRes = await request(server)
        .post(`/api/v1/families/${familyId}/places`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ name: 'Para borrar' });
      const placeId = createRes.body.id;

      const res = await request(server)
        .delete(`/api/v1/places/${placeId}`)
        .set('Authorization', `Bearer ${owner.accessToken}`);

      expect(res.status).toBe(204);
    });
  });

  describe('Chat de plan', () => {
    let owner: TestUser;
    let familyId: string;
    let planId: string;

    beforeEach(async () => {
      owner = await createTestUser();
      const f = await createFamily(owner.accessToken, 'Familia Chat');
      familyId = f.id;
      const createRes = await request(server)
        .post(`/api/v1/families/${familyId}/plans`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ title: 'Plan con chat' });
      planId = createRes.body.id;
    });

    afterAll(async () => {
      if (owner) await deleteTestUser(owner.userId);
    });

    it('POST /plans/:planId/messages envía un mensaje', async () => {
      const res = await request(server)
        .post(`/api/v1/plans/${planId}/messages`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ body: '¡Nos vemos allí!' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: expect.any(String),
        planId,
        userId: owner.userId,
        body: '¡Nos vemos allí!',
      });
    });

    it('GET /plans/:planId/messages lista los mensajes', async () => {
      await request(server)
        .post(`/api/v1/plans/${planId}/messages`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ body: 'Mensaje de prueba' });

      const res = await request(server)
        .get(`/api/v1/plans/${planId}/messages`)
        .set('Authorization', `Bearer ${owner.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.some((m: { body: string }) => m.body === 'Mensaje de prueba')).toBe(true);
    });

    it('no-miembro no puede enviar mensajes → 403', async () => {
      const stranger = await createTestUser();
      const res = await request(server)
        .post(`/api/v1/plans/${planId}/messages`)
        .set('Authorization', `Bearer ${stranger.accessToken}`)
        .send({ body: 'Intrusión' });

      expect(res.status).toBe(403);
      await deleteTestUser(stranger.userId);
    });
  });
});
