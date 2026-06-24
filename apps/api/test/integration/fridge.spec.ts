/**
 * Tests de integración del contexto `fridge`.
 *
 * Usa una instancia Nest real contra Supabase local.
 *
 * Cobertura:
 *  ✓ POST /api/v1/families/:familyId/fridge    → crea ítem
 *  ✓ GET  /api/v1/families/:familyId/fridge    → lista ordenada por caducidad (ASC NULLS LAST)
 *  ✓ GET  /api/v1/fridge-items/:itemId         → obtiene el ítem
 *  ✓ PATCH /api/v1/fridge-items/:itemId        → actualiza el ítem
 *  ✓ POST /api/v1/fridge-items/:itemId/eat     → decrementa cantidad; deleted=false
 *  ✓ POST /api/v1/fridge-items/:itemId/eat     → sin cantidad → deleted=true
 *  ✓ POST /api/v1/fridge-items/:itemId/throw   → 200 y mueve el ítem a DISCARDED
 *  ✓ POST /api/v1/fridge-items/:itemId/freeze  → location=FREEZER
 *  ✓ DELETE /api/v1/fridge-items/:itemId       → 204
 *  ✓ 401 sin token
 *  ✓ 403 no-miembro
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

async function makeFamily(token: string, name = 'Familia Fridge Test'): Promise<string> {
  const res = await request(server)
    .post('/api/v1/families')
    .set('Authorization', `Bearer ${token}`)
    .send({ name });
  expect(res.status).toBe(201);
  return (res.body as { id: string }).id;
}

async function addItem(
  token: string,
  familyId: string,
  payload: Record<string, unknown> = { name: 'Leche' },
): Promise<{ id: string; name: string; location: string; quantity: string | null; expiryDate: string | null }> {
  const res = await request(server)
    .post(`/api/v1/families/${familyId}/fridge`)
    .set('Authorization', `Bearer ${token}`)
    .send(payload);
  expect(res.status).toBe(201);
  return res.body as { id: string; name: string; location: string; quantity: string | null; expiryDate: string | null };
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('Fridge context – integración', () => {
  describe('POST /api/v1/families/:familyId/fridge (crear ítem)', () => {
    let owner: TestUser;
    let familyId: string;

    beforeEach(async () => {
      owner = await createTestUser();
      familyId = await makeFamily(owner.accessToken);
    });

    afterAll(async () => {
      if (owner) await deleteTestUser(owner.userId);
    });

    it('crea el ítem con los campos correctos', async () => {
      const item = await addItem(owner.accessToken, familyId, {
        name: 'Leche entera',
        quantity: '2',
        unit: 'L',
        location: 'FRIDGE',
        expiryDate: '2026-06-01',
      });

      expect(item.id).toBeTruthy();
      expect(item.name).toBe('Leche entera');
      expect(item.location).toBe('FRIDGE');
      expect(item.expiryDate).toBe('2026-06-01');
    });

    it('devuelve 401 sin token', async () => {
      const res = await request(server)
        .post(`/api/v1/families/${familyId}/fridge`)
        .send({ name: 'Sin token' });
      expect(res.status).toBe(401);
    });

    it('devuelve 403 si el usuario no es miembro', async () => {
      const outsider = await createTestUser();
      const res = await request(server)
        .post(`/api/v1/families/${familyId}/fridge`)
        .set('Authorization', `Bearer ${outsider.accessToken}`)
        .send({ name: 'No miembro' });
      expect(res.status).toBe(403);
      await deleteTestUser(outsider.userId);
    });
  });

  describe('GET /api/v1/families/:familyId/fridge (listar ítems)', () => {
    let owner: TestUser;
    let familyId: string;

    beforeEach(async () => {
      owner = await createTestUser();
      familyId = await makeFamily(owner.accessToken);
      // Crear ítems en orden distinto al esperado
      await addItem(owner.accessToken, familyId, { name: 'Sin fecha' });
      await addItem(owner.accessToken, familyId, { name: 'Tarde', expiryDate: '2026-12-31' });
      await addItem(owner.accessToken, familyId, { name: 'Pronto', expiryDate: '2026-05-27' });
    });

    afterAll(async () => {
      if (owner) await deleteTestUser(owner.userId);
    });

    it('devuelve los ítems ordenados por caducidad ASC (NULLs al final)', async () => {
      const res = await request(server)
        .get(`/api/v1/families/${familyId}/fridge`)
        .set('Authorization', `Bearer ${owner.accessToken}`);

      expect(res.status).toBe(200);
      const items = res.body as Array<{ name: string; expiryDate: string | null }>;
      expect(items).toHaveLength(3);
      expect(items[0].name).toBe('Pronto');
      expect(items[1].name).toBe('Tarde');
      expect(items[2].name).toBe('Sin fecha');
      expect(items[2].expiryDate).toBeNull();
    });
  });

  describe('GET/PATCH/DELETE /api/v1/fridge-items/:itemId', () => {
    let owner: TestUser;
    let itemId: string;
    let familyId: string;

    beforeEach(async () => {
      owner = await createTestUser();
      familyId = await makeFamily(owner.accessToken);
      const item = await addItem(owner.accessToken, familyId, { name: 'Mantequilla', quantity: '500', unit: 'g' });
      itemId = item.id;
    });

    afterAll(async () => {
      if (owner) await deleteTestUser(owner.userId);
    });

    it('GET devuelve el ítem por id', async () => {
      const res = await request(server)
        .get(`/api/v1/fridge-items/${itemId}`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      expect(res.status).toBe(200);
      expect((res.body as { id: string }).id).toBe(itemId);
    });

    it('PATCH actualiza el nombre y la location', async () => {
      const res = await request(server)
        .patch(`/api/v1/fridge-items/${itemId}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ name: 'Mantequilla sin sal', location: 'FREEZER' });

      expect(res.status).toBe(200);
      const body = res.body as { name: string; location: string };
      expect(body.name).toBe('Mantequilla sin sal');
      expect(body.location).toBe('FREEZER');
    });

    it('DELETE elimina el ítem y responde 204', async () => {
      const res = await request(server)
        .delete(`/api/v1/fridge-items/${itemId}`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      expect(res.status).toBe(204);

      const getRes = await request(server)
        .get(`/api/v1/fridge-items/${itemId}`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      expect(getRes.status).toBe(404);
    });

    it('devuelve 401 sin token', async () => {
      const res = await request(server).get(`/api/v1/fridge-items/${itemId}`);
      expect(res.status).toBe(401);
    });

    it('devuelve 403 si el usuario no es miembro', async () => {
      const outsider = await createTestUser();
      const res = await request(server)
        .get(`/api/v1/fridge-items/${itemId}`)
        .set('Authorization', `Bearer ${outsider.accessToken}`);
      expect(res.status).toBe(403);
      await deleteTestUser(outsider.userId);
    });
  });

  describe('POST /fridge-items/:itemId/eat', () => {
    let owner: TestUser;
    let familyId: string;

    beforeEach(async () => {
      owner = await createTestUser();
      familyId = await makeFamily(owner.accessToken);
    });

    afterAll(async () => {
      if (owner) await deleteTestUser(owner.userId);
    });

    it('decrementa la cantidad; deleted=false', async () => {
      const item = await addItem(owner.accessToken, familyId, { name: 'Leche', quantity: '3', unit: 'L' });
      const res = await request(server)
        .post(`/api/v1/fridge-items/${item.id}/eat`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ amount: '1' });

      expect(res.status).toBe(200);
      const body = res.body as { deleted: boolean; itemId: string };
      expect(body.deleted).toBe(false);

      // Verificamos que la cantidad se actualizó (Postgres devuelve numeric con decimales)
      const getRes = await request(server)
        .get(`/api/v1/fridge-items/${item.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      const qty = (getRes.body as { quantity: string }).quantity;
      expect(parseFloat(qty)).toBe(2);
    });

    it('sin cantidad registrada → deleted=true', async () => {
      const item = await addItem(owner.accessToken, familyId, { name: 'Tomate' });
      const res = await request(server)
        .post(`/api/v1/fridge-items/${item.id}/eat`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({});

      expect(res.status).toBe(200);
      const body = res.body as { deleted: boolean };
      expect(body.deleted).toBe(true);
    });
  });

  describe('POST /fridge-items/:itemId/throw', () => {
    let owner: TestUser;
    let familyId: string;

    beforeEach(async () => {
      owner = await createTestUser();
      familyId = await makeFamily(owner.accessToken);
    });

    afterAll(async () => {
      if (owner) await deleteTestUser(owner.userId);
    });

    it('mueve el ítem a DISCARDED (desperdicio) y responde 200', async () => {
      const item = await addItem(owner.accessToken, familyId, { name: 'Pan caducado' });
      const res = await request(server)
        .post(`/api/v1/fridge-items/${item.id}/throw`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      expect(res.status).toBe(200);
      expect((res.body as { location: string }).location).toBe('DISCARDED');

      // El ítem sigue existiendo: es un registro de comida tirada.
      const getRes = await request(server)
        .get(`/api/v1/fridge-items/${item.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      expect(getRes.status).toBe(200);
      expect((getRes.body as { location: string }).location).toBe('DISCARDED');
    });
  });

  describe('POST /fridge-items/:itemId/freeze', () => {
    let owner: TestUser;
    let familyId: string;

    beforeEach(async () => {
      owner = await createTestUser();
      familyId = await makeFamily(owner.accessToken);
    });

    afterAll(async () => {
      if (owner) await deleteTestUser(owner.userId);
    });

    it('mueve el ítem al congelador', async () => {
      const item = await addItem(owner.accessToken, familyId, { name: 'Carne', location: 'FRIDGE' });
      const res = await request(server)
        .post(`/api/v1/fridge-items/${item.id}/freeze`)
        .set('Authorization', `Bearer ${owner.accessToken}`);

      expect(res.status).toBe(200);
      expect((res.body as { location: string }).location).toBe('FREEZER');
    });
  });
});
