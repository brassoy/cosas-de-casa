/**
 * Tests de integración del contexto `romantic`.
 *
 * Usa una instancia Nest real contra Supabase local.
 *
 * Cobertura:
 *  ✓ POST /api/v1/families/:familyId/couple          → crea pareja
 *  ✓ GET  /api/v1/families/:familyId/couple          → obtiene mi pareja
 *  ✓ POST /api/v1/couples/:coupleId/notes             → añade nota
 *  ✓ GET  /api/v1/couples/:coupleId/notes             → lista notas
 *  ✓ POST /api/v1/couples/:coupleId/challenges        → añade reto
 *  ✓ GET  /api/v1/couples/:coupleId/challenges        → lista retos
 *  ✓ POST /api/v1/couples/:coupleId/challenges/done   → marca reto como hecho
 *  ✓ GET  /api/v1/couples/challenge-catalog           → catálogo de retos
 *  ✓ DELETE /api/v1/couples/:coupleId/notes/:noteId   → borra nota
 *  ✓ DELETE /api/v1/couples/:coupleId                 → disuelve pareja
 *  ✓ POST /api/v1/couples/:coupleId/mischief          → 204 (sender stub)
 *  ✓ 401 sin token
 *  ✓ 403 no-miembro de la pareja (couple-scope guard)
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

async function makeFamily(token: string, name = 'Familia Romántica Test'): Promise<string> {
  const res = await request(server)
    .post('/api/v1/families')
    .set('Authorization', `Bearer ${token}`)
    .send({ name });
  expect(res.status).toBe(201);
  return (res.body as { id: string }).id;
}

async function joinFamily(ownerToken: string, memberToken: string, familyId: string): Promise<void> {
  const pinRes = await request(server)
    .post(`/api/v1/families/${familyId}/join-pins`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({});
  const pin = (pinRes.body as { code: string }).code;
  await request(server)
    .post('/api/v1/families/join')
    .set('Authorization', `Bearer ${memberToken}`)
    .send({ code: pin });
}

async function createCouple(token: string, familyId: string, partnerUserId: string): Promise<{ id: string }> {
  const res = await request(server)
    .post(`/api/v1/families/${familyId}/couple`)
    .set('Authorization', `Bearer ${token}`)
    .send({ partnerUserId });
  expect(res.status).toBe(201);
  return res.body as { id: string };
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('Romantic context – integración', () => {
  describe('POST/GET /api/v1/families/:familyId/couple', () => {
    let owner: TestUser;
    let partner: TestUser;
    let familyId: string;

    beforeEach(async () => {
      owner = await createTestUser();
      partner = await createTestUser();
      familyId = await makeFamily(owner.accessToken);
      await joinFamily(owner.accessToken, partner.accessToken, familyId);
    });

    afterAll(async () => {
      if (owner) await deleteTestUser(owner.userId);
      if (partner) await deleteTestUser(partner.userId);
    });

    it('crea una pareja y devuelve los datos correctos', async () => {
      const couple = await createCouple(owner.accessToken, familyId, partner.userId);
      expect(couple.id).toBeTruthy();
    });

    it('devuelve la pareja del usuario autenticado', async () => {
      const created = await createCouple(owner.accessToken, familyId, partner.userId);

      const res = await request(server)
        .get(`/api/v1/families/${familyId}/couple`)
        .set('Authorization', `Bearer ${owner.accessToken}`);

      expect(res.status).toBe(200);
      expect((res.body as { id: string }).id).toBe(created.id);
    });

    it('devuelve 401 sin token', async () => {
      const res = await request(server)
        .post(`/api/v1/families/${familyId}/couple`)
        .send({ partnerUserId: partner.userId });
      expect(res.status).toBe(401);
    });

    it('devuelve 403 si el usuario no es miembro de la familia', async () => {
      const outsider = await createTestUser();
      const res = await request(server)
        .post(`/api/v1/families/${familyId}/couple`)
        .set('Authorization', `Bearer ${outsider.accessToken}`)
        .send({ partnerUserId: partner.userId });
      expect(res.status).toBe(403);
      await deleteTestUser(outsider.userId);
    });

    it('devuelve 409 si ya pertenece a una pareja en esa familia', async () => {
      await createCouple(owner.accessToken, familyId, partner.userId);
      const res = await request(server)
        .post(`/api/v1/families/${familyId}/couple`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ partnerUserId: partner.userId });
      expect(res.status).toBe(409);
    });
  });

  describe('GET /api/v1/couples/challenge-catalog', () => {
    let user: TestUser;

    beforeEach(async () => {
      user = await createTestUser();
    });

    afterAll(async () => {
      if (user) await deleteTestUser(user.userId);
    });

    it('devuelve el catálogo de retos (key + descripción)', async () => {
      const res = await request(server)
        .get('/api/v1/couples/challenge-catalog')
        .set('Authorization', `Bearer ${user.accessToken}`);

      expect(res.status).toBe(200);
      const body = res.body as Array<{ key: string; description: string }>;
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
      expect(body[0]).toHaveProperty('key');
      expect(body[0]).toHaveProperty('description');
    });

    it('devuelve 401 sin token', async () => {
      const res = await request(server).get('/api/v1/couples/challenge-catalog');
      expect(res.status).toBe(401);
    });
  });

  describe('Notas, retos y maldad con CoupleScopeGuard', () => {
    let owner: TestUser;
    let partner: TestUser;
    let outsider: TestUser;
    let familyId: string;
    let coupleId: string;

    beforeEach(async () => {
      owner = await createTestUser();
      partner = await createTestUser();
      outsider = await createTestUser();
      familyId = await makeFamily(owner.accessToken);
      await joinFamily(owner.accessToken, partner.accessToken, familyId);
      const couple = await createCouple(owner.accessToken, familyId, partner.userId);
      coupleId = couple.id;
    });

    afterAll(async () => {
      if (owner) await deleteTestUser(owner.userId);
      if (partner) await deleteTestUser(partner.userId);
      if (outsider) await deleteTestUser(outsider.userId);
    });

    // ── Notas ──────────────────────────────────────────────────────────────────

    it('POST /couples/:coupleId/notes → crea una nota', async () => {
      const res = await request(server)
        .post(`/api/v1/couples/${coupleId}/notes`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ body: 'Te quiero mucho. ❤️' });

      expect(res.status).toBe(201);
      const body = res.body as { body: string; authorId: string };
      expect(body.body).toBe('Te quiero mucho. ❤️');
      expect(body.authorId).toBe(owner.userId);
    });

    it('GET /couples/:coupleId/notes → lista las notas', async () => {
      await request(server)
        .post(`/api/v1/couples/${coupleId}/notes`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ body: 'Nota 1' });
      await request(server)
        .post(`/api/v1/couples/${coupleId}/notes`)
        .set('Authorization', `Bearer ${partner.accessToken}`)
        .send({ body: 'Nota 2' });

      const res = await request(server)
        .get(`/api/v1/couples/${coupleId}/notes`)
        .set('Authorization', `Bearer ${owner.accessToken}`);

      expect(res.status).toBe(200);
      expect((res.body as unknown[]).length).toBeGreaterThanOrEqual(2);
    });

    it('GET /couples/:coupleId/notes → 403 si no eres de la pareja', async () => {
      const res = await request(server)
        .get(`/api/v1/couples/${coupleId}/notes`)
        .set('Authorization', `Bearer ${outsider.accessToken}`);
      expect(res.status).toBe(403);
    });

    it('GET /couples/:coupleId/notes → 401 sin token', async () => {
      const res = await request(server)
        .get(`/api/v1/couples/${coupleId}/notes`);
      expect(res.status).toBe(401);
    });

    it('DELETE /couples/:coupleId/notes/:noteId → 204 y la nota desaparece', async () => {
      const created = await request(server)
        .post(`/api/v1/couples/${coupleId}/notes`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ body: 'Nota a borrar' });
      const noteId = (created.body as { id: string }).id;

      const del = await request(server)
        .delete(`/api/v1/couples/${coupleId}/notes/${noteId}`)
        .set('Authorization', `Bearer ${partner.accessToken}`);
      expect(del.status).toBe(204);

      const list = await request(server)
        .get(`/api/v1/couples/${coupleId}/notes`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      const ids = (list.body as Array<{ id: string }>).map((n) => n.id);
      expect(ids).not.toContain(noteId);
    });

    it('DELETE /couples/:coupleId/notes/:noteId → 404 si la nota no existe', async () => {
      const res = await request(server)
        .delete(`/api/v1/couples/${coupleId}/notes/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      expect(res.status).toBe(404);
    });

    it('DELETE /couples/:coupleId/notes/:noteId → 403 si no eres de la pareja', async () => {
      const created = await request(server)
        .post(`/api/v1/couples/${coupleId}/notes`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ body: 'Nota privada' });
      const noteId = (created.body as { id: string }).id;

      const res = await request(server)
        .delete(`/api/v1/couples/${coupleId}/notes/${noteId}`)
        .set('Authorization', `Bearer ${outsider.accessToken}`);
      expect(res.status).toBe(403);
    });

    // ── Retos ──────────────────────────────────────────────────────────────────

    it('POST /couples/:coupleId/challenges → añade un reto del catálogo', async () => {
      const res = await request(server)
        .post(`/api/v1/couples/${coupleId}/challenges`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ challengeKey: 'COCINAMOS_JUNTOS' });

      expect(res.status).toBe(201);
      const body = res.body as { challengeKey: string; done: boolean; description: string };
      expect(body.challengeKey).toBe('COCINAMOS_JUNTOS');
      expect(body.done).toBe(false);
      expect(body.description).toBeTruthy();
    });

    it('POST /couples/:coupleId/challenges → 404 si la clave no existe en el catálogo', async () => {
      const res = await request(server)
        .post(`/api/v1/couples/${coupleId}/challenges`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ challengeKey: 'CLAVE_INVENTADA' });
      expect(res.status).toBe(404);
    });

    it('GET /couples/:coupleId/challenges → lista los retos', async () => {
      await request(server)
        .post(`/api/v1/couples/${coupleId}/challenges`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ challengeKey: 'COCINAMOS_JUNTOS' });

      const res = await request(server)
        .get(`/api/v1/couples/${coupleId}/challenges`)
        .set('Authorization', `Bearer ${owner.accessToken}`);

      expect(res.status).toBe(200);
      expect((res.body as unknown[]).length).toBeGreaterThanOrEqual(1);
    });

    it('POST /couples/:coupleId/challenges/done → marca el reto como hecho', async () => {
      await request(server)
        .post(`/api/v1/couples/${coupleId}/challenges`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ challengeKey: 'COCINAMOS_JUNTOS' });

      const res = await request(server)
        .post(`/api/v1/couples/${coupleId}/challenges/done`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ challengeKey: 'COCINAMOS_JUNTOS' });

      expect(res.status).toBe(201);
      expect((res.body as { done: boolean }).done).toBe(true);
    });

    // ── Maldad ─────────────────────────────────────────────────────────────────

    it('POST /couples/:coupleId/mischief → 204 (push stub no falla)', async () => {
      const res = await request(server)
        .post(`/api/v1/couples/${coupleId}/mischief`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      expect(res.status).toBe(204);
    });

    it('POST /couples/:coupleId/mischief → 403 si no eres de la pareja', async () => {
      const res = await request(server)
        .post(`/api/v1/couples/${coupleId}/mischief`)
        .set('Authorization', `Bearer ${outsider.accessToken}`);
      expect(res.status).toBe(403);
    });

    it('POST /couples/:coupleId/mischief → 401 sin token', async () => {
      const res = await request(server)
        .post(`/api/v1/couples/${coupleId}/mischief`);
      expect(res.status).toBe(401);
    });

    // ── Disolver pareja ─────────────────────────────────────────────────────────

    it('DELETE /couples/:coupleId → 403 si no eres de la pareja', async () => {
      const res = await request(server)
        .delete(`/api/v1/couples/${coupleId}`)
        .set('Authorization', `Bearer ${outsider.accessToken}`);
      expect(res.status).toBe(403);
    });

    it('DELETE /couples/:coupleId → 401 sin token', async () => {
      const res = await request(server).delete(`/api/v1/couples/${coupleId}`);
      expect(res.status).toBe(401);
    });

    it('DELETE /couples/:coupleId → 204 y la pareja deja de existir (cascada de notas/retos)', async () => {
      // Sembramos una nota y un reto para comprobar la cascada.
      await request(server)
        .post(`/api/v1/couples/${coupleId}/notes`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ body: 'Adiós' });
      await request(server)
        .post(`/api/v1/couples/${coupleId}/challenges`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ challengeKey: 'COCINAMOS_JUNTOS' });

      const del = await request(server)
        .delete(`/api/v1/couples/${coupleId}`)
        .set('Authorization', `Bearer ${partner.accessToken}`);
      expect(del.status).toBe(204);

      // Tras disolver, el CoupleScopeGuard ya no encuentra la pareja → 404.
      const after = await request(server)
        .get(`/api/v1/couples/${coupleId}/notes`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      expect(after.status).toBe(404);

      // Y el usuario ya no tiene pareja en la familia.
      const myCouple = await request(server)
        .get(`/api/v1/families/${familyId}/couple`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      expect(myCouple.status).toBe(404);
    });
  });
});
