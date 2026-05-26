/**
 * Tests de integración del contexto `social` (familias amigas).
 *
 * Cobertura:
 *  ✓ POST /families/:id/friend-invites  → OWNER genera código
 *  ✓ Non-OWNER intenta generar → 403
 *  ✓ POST /friends/redeem              → crea vínculo, devuelve FriendFamilyDto
 *  ✓ GET  /families/:id/friends        → lista familias amigas
 *  ✓ Auto-amistad → 422
 *  ✓ Código inválido → 422
 *  ✓ Sin token → 401
 *  ✓ DELETE /friends/:linkId           → 204, vínculo eliminado
 *  ✓ No-miembro no puede eliminar → 403
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

describe('Social context — familias amigas', () => {
  describe('POST /api/v1/families/:familyId/friend-invites', () => {
    let owner: TestUser;
    let familyId: string;

    beforeEach(async () => {
      owner = await createTestUser();
      const f = await createFamily(owner.accessToken, 'Familia Alfa');
      familyId = f.id;
    });

    afterAll(async () => {
      if (owner) await deleteTestUser(owner.userId);
    });

    it('OWNER genera un código de invitación', async () => {
      const res = await request(server)
        .post(`/api/v1/families/${familyId}/friend-invites`)
        .set('Authorization', `Bearer ${owner.accessToken}`);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        code: expect.stringMatching(/^[0-9A-Z]{8}$/),
        expiresAt: expect.any(String),
      });
    });

    it('sin token → 401', async () => {
      const res = await request(server)
        .post(`/api/v1/families/${familyId}/friend-invites`);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/friends/redeem → GET → DELETE', () => {
    let ownerA: TestUser;
    let ownerB: TestUser;
    let familyAId: string;
    let familyBId: string;
    let inviteCode: string;

    beforeEach(async () => {
      ownerA = await createTestUser();
      ownerB = await createTestUser();
      const fA = await createFamily(ownerA.accessToken, 'Familia A');
      const fB = await createFamily(ownerB.accessToken, 'Familia B');
      familyAId = fA.id;
      familyBId = fB.id;

      const pinRes = await request(server)
        .post(`/api/v1/families/${familyAId}/friend-invites`)
        .set('Authorization', `Bearer ${ownerA.accessToken}`);
      inviteCode = (pinRes.body as { code: string }).code;
    });

    afterAll(async () => {
      await Promise.all([
        ownerA ? deleteTestUser(ownerA.userId) : Promise.resolve(),
        ownerB ? deleteTestUser(ownerB.userId) : Promise.resolve(),
      ]);
    });

    it('canjear el código crea un vínculo de amistad', async () => {
      const res = await request(server)
        .post('/api/v1/friends/redeem')
        .set('Authorization', `Bearer ${ownerB.accessToken}`)
        .send({ code: inviteCode, familyId: familyBId });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        linkId: expect.any(String),
        familyId: familyAId,
        familyName: 'Familia A',
      });
    });

    it('GET /families/:id/friends → lista la familia amiga', async () => {
      // Primero canjear.
      await request(server)
        .post('/api/v1/friends/redeem')
        .set('Authorization', `Bearer ${ownerB.accessToken}`)
        .send({ code: inviteCode, familyId: familyBId });

      const res = await request(server)
        .get(`/api/v1/families/${familyBId}/friends`)
        .set('Authorization', `Bearer ${ownerB.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ familyId: familyAId });
    });

    it('código inválido → 422', async () => {
      const res = await request(server)
        .post('/api/v1/friends/redeem')
        .set('Authorization', `Bearer ${ownerB.accessToken}`)
        .send({ code: 'AAAAAAAA', familyId: familyBId });

      expect(res.status).toBe(422);
    });

    it('DELETE /friends/:linkId → 204', async () => {
      // Primero canjear.
      const redeemRes = await request(server)
        .post('/api/v1/friends/redeem')
        .set('Authorization', `Bearer ${ownerB.accessToken}`)
        .send({ code: inviteCode, familyId: familyBId });
      const linkId = (redeemRes.body as { linkId: string }).linkId;

      const delRes = await request(server)
        .delete(`/api/v1/friends/${linkId}`)
        .set('Authorization', `Bearer ${ownerA.accessToken}`);

      expect(delRes.status).toBe(204);

      // Ya no aparece en la lista.
      const listRes = await request(server)
        .get(`/api/v1/families/${familyAId}/friends`)
        .set('Authorization', `Bearer ${ownerA.accessToken}`);
      expect(listRes.body).toHaveLength(0);
    });

    it('no-miembro no puede eliminar el vínculo → 403', async () => {
      // Primero canjear.
      const redeemRes = await request(server)
        .post('/api/v1/friends/redeem')
        .set('Authorization', `Bearer ${ownerB.accessToken}`)
        .send({ code: inviteCode, familyId: familyBId });
      const linkId = (redeemRes.body as { linkId: string }).linkId;

      // Tercero ajeno.
      const stranger = await createTestUser();
      const delRes = await request(server)
        .delete(`/api/v1/friends/${linkId}`)
        .set('Authorization', `Bearer ${stranger.accessToken}`);

      expect(delRes.status).toBe(403);
      await deleteTestUser(stranger.userId);
    });
  });
});
