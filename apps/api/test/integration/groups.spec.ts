/**
 * Tests de integración del contexto `groups` (peñas).
 *
 * Usa una instancia Nest real contra Supabase local y Postgres local.
 * Los usuarios se crean y eliminan en cada test para garantizar aislamiento.
 *
 * Cobertura:
 *  ✓ POST /api/v1/groups              → crea peña, creador queda como OWNER
 *  ✓ GET  /api/v1/groups              → lista peñas del usuario
 *  ✓ GET  /api/v1/groups/:id/members  → lista miembros (OWNER ve al OWNER)
 *  ✓ POST /api/v1/groups/:id/join-pins → OWNER genera PIN; no-OWNER → 403
 *  ✓ POST /api/v1/groups/join         → 2.º usuario se une con el código
 *  ✓ PIN de un solo uso: reusar el mismo código → 422
 *  ✓ Código inválido → 422
 *  ✓ Sin token → 401
 *  ✓ No-miembro en GET /:id/members → 403
 *  ✓ MEMBER no puede generar PIN → 403
 *  ✓ DELETE /:id/members/me → MEMBER sale de la peña
 *  ✓ Último OWNER no puede salir → 409
 */
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, closeTestApp } from '../support/app-factory';
import { createTestUser, deleteTestUser, type TestUser } from '../support/supabase-admin';

// ────────────────────────────────────────────────────────────────────────────
// Setup / teardown
// ────────────────────────────────────────────────────────────────────────────

let server: ReturnType<(typeof import('http'))['createServer']>;

beforeAll(async () => {
  const testApp = await createTestApp();
  server = testApp.server;
});

afterAll(async () => {
  await closeTestApp();
});

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

async function createGroup(
  token: string,
  name = 'Peña Test',
): Promise<{ id: string; role: string }> {
  const res = await request(server)
    .post('/api/v1/groups')
    .set('Authorization', `Bearer ${token}`)
    .send({ name });
  expect(res.status).toBe(201);
  return res.body as { id: string; role: string };
}

// ────────────────────────────────────────────────────────────────────────────
// Suite principal
// ────────────────────────────────────────────────────────────────────────────

describe('Groups context – integración', () => {

  describe('POST /api/v1/groups', () => {
    let owner: TestUser;

    beforeEach(async () => {
      owner = await createTestUser();
    });

    afterAll(async () => {
      if (owner) await deleteTestUser(owner.userId);
    });

    it('crea una peña y devuelve role OWNER', async () => {
      const res = await request(server)
        .post('/api/v1/groups')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ name: 'La Peña del Barrio', description: 'Descripción de prueba' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: expect.any(String),
        name: 'La Peña del Barrio',
        description: 'Descripción de prueba',
        role: 'OWNER',
      });
    });

    it('devuelve 401 sin token', async () => {
      const res = await request(server).post('/api/v1/groups').send({ name: 'Sin auth' });
      expect(res.status).toBe(401);
    });

    it('devuelve 400 si el nombre está vacío', async () => {
      const res = await request(server)
        .post('/api/v1/groups')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ name: '' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/groups', () => {
    let owner: TestUser;
    let groupId: string;

    beforeEach(async () => {
      owner = await createTestUser();
      const group = await createGroup(owner.accessToken);
      groupId = group.id;
    });

    afterAll(async () => {
      if (owner) await deleteTestUser(owner.userId);
    });

    it('lista las peñas del usuario autenticado', async () => {
      const res = await request(server)
        .get('/api/v1/groups')
        .set('Authorization', `Bearer ${owner.accessToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const group = (res.body as Array<{ id: string; role: string }>).find(
        (g) => g.id === groupId,
      );
      expect(group).toBeDefined();
      expect(group?.role).toBe('OWNER');
    });

    it('devuelve 401 sin token', async () => {
      const res = await request(server).get('/api/v1/groups');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/groups/:id/members', () => {
    let owner: TestUser;
    let outsider: TestUser;
    let groupId: string;

    beforeEach(async () => {
      [owner, outsider] = await Promise.all([createTestUser(), createTestUser()]);
      const group = await createGroup(owner.accessToken);
      groupId = group.id;
    });

    afterAll(async () => {
      await Promise.all([
        owner ? deleteTestUser(owner.userId) : Promise.resolve(),
        outsider ? deleteTestUser(outsider.userId) : Promise.resolve(),
      ]);
    });

    it('OWNER ve su propia membresía con role OWNER', async () => {
      const res = await request(server)
        .get(`/api/v1/groups/${groupId}/members`)
        .set('Authorization', `Bearer ${owner.accessToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const ownerEntry = (res.body as Array<{ userId: string; role: string }>).find(
        (m) => m.userId === owner.userId,
      );
      expect(ownerEntry).toBeDefined();
      expect(ownerEntry?.role).toBe('OWNER');
    });

    it('no-miembro recibe 403', async () => {
      const res = await request(server)
        .get(`/api/v1/groups/${groupId}/members`)
        .set('Authorization', `Bearer ${outsider.accessToken}`);

      expect(res.status).toBe(403);
    });

    it('sin token devuelve 401', async () => {
      const res = await request(server).get(`/api/v1/groups/${groupId}/members`);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/groups/:id/join-pins', () => {
    let owner: TestUser;
    let nonMember: TestUser;
    let groupId: string;

    beforeEach(async () => {
      [owner, nonMember] = await Promise.all([createTestUser(), createTestUser()]);
      const group = await createGroup(owner.accessToken);
      groupId = group.id;
    });

    afterAll(async () => {
      await Promise.all([
        owner ? deleteTestUser(owner.userId) : Promise.resolve(),
        nonMember ? deleteTestUser(nonMember.userId) : Promise.resolve(),
      ]);
    });

    it('OWNER genera un PIN con code y expiresAt', async () => {
      const res = await request(server)
        .post(`/api/v1/groups/${groupId}/join-pins`)
        .set('Authorization', `Bearer ${owner.accessToken}`);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        code: expect.stringMatching(/^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{8}$/),
        expiresAt: expect.any(String),
      });
    });

    it('no-miembro recibe 403 al intentar generar PIN', async () => {
      const res = await request(server)
        .post(`/api/v1/groups/${groupId}/join-pins`)
        .set('Authorization', `Bearer ${nonMember.accessToken}`);

      expect(res.status).toBe(403);
    });

    it('sin token devuelve 401', async () => {
      const res = await request(server).post(`/api/v1/groups/${groupId}/join-pins`);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/groups/join', () => {
    let owner: TestUser;
    let joiner: TestUser;
    let groupId: string;
    let pinCode: string;

    beforeEach(async () => {
      [owner, joiner] = await Promise.all([createTestUser(), createTestUser()]);
      const group = await createGroup(owner.accessToken);
      groupId = group.id;

      const pinRes = await request(server)
        .post(`/api/v1/groups/${groupId}/join-pins`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      expect(pinRes.status).toBe(201);
      pinCode = (pinRes.body as { code: string }).code;
    });

    afterAll(async () => {
      await Promise.all([
        owner ? deleteTestUser(owner.userId) : Promise.resolve(),
        joiner ? deleteTestUser(joiner.userId) : Promise.resolve(),
      ]);
    });

    it('2.º usuario se une con el código y queda como MEMBER', async () => {
      const joinRes = await request(server)
        .post('/api/v1/groups/join')
        .set('Authorization', `Bearer ${joiner.accessToken}`)
        .send({ code: pinCode });

      expect(joinRes.status).toBe(200);
      expect(joinRes.body).toMatchObject({
        groupId,
        joined: true,
      });

      const membersRes = await request(server)
        .get(`/api/v1/groups/${groupId}/members`)
        .set('Authorization', `Bearer ${owner.accessToken}`);

      expect(membersRes.status).toBe(200);
      const joinerEntry = (
        membersRes.body as Array<{ userId: string; role: string }>
      ).find((m) => m.userId === joiner.userId);
      expect(joinerEntry).toBeDefined();
      expect(joinerEntry?.role).toBe('MEMBER');
    });

    it('PIN de un solo uso: reusar el mismo código devuelve 422', async () => {
      const first = await request(server)
        .post('/api/v1/groups/join')
        .set('Authorization', `Bearer ${joiner.accessToken}`)
        .send({ code: pinCode });
      expect(first.status).toBe(200);

      const second = await request(server)
        .post('/api/v1/groups/join')
        .set('Authorization', `Bearer ${joiner.accessToken}`)
        .send({ code: pinCode });
      expect(second.status).toBe(422);
      expect(second.body.error).toBe('INVALID_GROUP_JOIN_PIN');
    });

    it('código de 8 chars válido en formato pero no existente → 422', async () => {
      const res = await request(server)
        .post('/api/v1/groups/join')
        .set('Authorization', `Bearer ${joiner.accessToken}`)
        .send({ code: 'AAAAAAAA' });

      expect(res.status).toBe(422);
      expect(res.body.error).toBe('INVALID_GROUP_JOIN_PIN');
    });

    it('código con formato inválido devuelve 400', async () => {
      const res = await request(server)
        .post('/api/v1/groups/join')
        .set('Authorization', `Bearer ${joiner.accessToken}`)
        .send({ code: 'TOOLONG!!' });

      expect(res.status).toBe(400);
    });

    it('sin token devuelve 401', async () => {
      const res = await request(server)
        .post('/api/v1/groups/join')
        .send({ code: pinCode });
      expect(res.status).toBe(401);
    });
  });

  describe('MEMBER ya unido a la peña', () => {
    let owner: TestUser;
    let member: TestUser;
    let groupId: string;

    beforeEach(async () => {
      [owner, member] = await Promise.all([createTestUser(), createTestUser()]);
      const group = await createGroup(owner.accessToken);
      groupId = group.id;

      const pinRes = await request(server)
        .post(`/api/v1/groups/${groupId}/join-pins`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      const code = (pinRes.body as { code: string }).code;

      await request(server)
        .post('/api/v1/groups/join')
        .set('Authorization', `Bearer ${member.accessToken}`)
        .send({ code });
    });

    afterAll(async () => {
      await Promise.all([
        owner ? deleteTestUser(owner.userId) : Promise.resolve(),
        member ? deleteTestUser(member.userId) : Promise.resolve(),
      ]);
    });

    it('MEMBER NO puede generar PIN (solo OWNER) → 403', async () => {
      const res = await request(server)
        .post(`/api/v1/groups/${groupId}/join-pins`)
        .set('Authorization', `Bearer ${member.accessToken}`);

      expect(res.status).toBe(403);
    });

    it('MEMBER puede salir de la peña → 204', async () => {
      const res = await request(server)
        .delete(`/api/v1/groups/${groupId}/members/me`)
        .set('Authorization', `Bearer ${member.accessToken}`);

      expect(res.status).toBe(204);
    });

    it('OWNER único no puede salir → 409', async () => {
      // El OWNER es el único OWNER; que salga provoca LastGroupOwnerError
      const res = await request(server)
        .delete(`/api/v1/groups/${groupId}/members/me`)
        .set('Authorization', `Bearer ${owner.accessToken}`);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('LAST_GROUP_OWNER');
    });
  });
});
