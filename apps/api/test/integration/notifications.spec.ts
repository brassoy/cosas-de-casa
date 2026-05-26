/**
 * Tests de integración del contexto `notifications`.
 *
 * Cobertura:
 *  ✓ POST /api/v1/families/:familyId/notifications/subscribe → 201 con id
 *  ✓ POST idempotente (misma suscripción dos veces) → 201 en ambos casos
 *  ✓ DELETE /api/v1/families/:familyId/notifications/subscribe → 204
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

async function makeFamily(token: string, name = 'Familia Notif Test'): Promise<string> {
  const res = await request(server)
    .post('/api/v1/families')
    .set('Authorization', `Bearer ${token}`)
    .send({ name });
  expect(res.status).toBe(201);
  return (res.body as { id: string }).id;
}

const FAKE_SUB = {
  endpoint: 'https://push.example.com/fake-endpoint-integration-test',
  keys: { p256dh: 'fake-p256dh-key', auth: 'fake-auth-key' },
};

describe('Notifications context – integración', () => {
  describe('POST /api/v1/families/:familyId/notifications/subscribe', () => {
    let owner: TestUser;
    let familyId: string;

    beforeEach(async () => {
      owner = await createTestUser();
      familyId = await makeFamily(owner.accessToken);
    });

    afterAll(async () => {
      if (owner) await deleteTestUser(owner.userId);
    });

    it('guarda la suscripción y devuelve id', async () => {
      const res = await request(server)
        .post(`/api/v1/families/${familyId}/notifications/subscribe`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send(FAKE_SUB);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(typeof (res.body as { id: string }).id).toBe('string');
    });

    it('es idempotente: dos veces el mismo endpoint → 201 en ambos', async () => {
      await request(server)
        .post(`/api/v1/families/${familyId}/notifications/subscribe`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send(FAKE_SUB);

      const res2 = await request(server)
        .post(`/api/v1/families/${familyId}/notifications/subscribe`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send(FAKE_SUB);

      expect(res2.status).toBe(201);
    });

    it('devuelve 401 sin token', async () => {
      const res = await request(server)
        .post(`/api/v1/families/${familyId}/notifications/subscribe`)
        .send(FAKE_SUB);
      expect(res.status).toBe(401);
    });

    it('devuelve 403 si el usuario no es miembro', async () => {
      const outsider = await createTestUser();
      const res = await request(server)
        .post(`/api/v1/families/${familyId}/notifications/subscribe`)
        .set('Authorization', `Bearer ${outsider.accessToken}`)
        .send(FAKE_SUB);
      expect(res.status).toBe(403);
      await deleteTestUser(outsider.userId);
    });
  });

  describe('DELETE /api/v1/families/:familyId/notifications/subscribe', () => {
    let owner: TestUser;
    let familyId: string;

    beforeEach(async () => {
      owner = await createTestUser();
      familyId = await makeFamily(owner.accessToken);
      // Crear suscripción previa
      await request(server)
        .post(`/api/v1/families/${familyId}/notifications/subscribe`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send(FAKE_SUB);
    });

    afterAll(async () => {
      if (owner) await deleteTestUser(owner.userId);
    });

    it('elimina la suscripción y devuelve 204', async () => {
      const res = await request(server)
        .delete(`/api/v1/families/${familyId}/notifications/subscribe`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ endpoint: FAKE_SUB.endpoint });

      expect(res.status).toBe(204);
    });

    it('devuelve 401 sin token', async () => {
      const res = await request(server)
        .delete(`/api/v1/families/${familyId}/notifications/subscribe`)
        .send({ endpoint: FAKE_SUB.endpoint });
      expect(res.status).toBe(401);
    });
  });
});
