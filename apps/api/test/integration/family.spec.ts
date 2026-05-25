/**
 * Tests de integración del contexto `family`.
 *
 * Usa una instancia Nest real contra Supabase local y Postgres local.
 * Los usuarios se crean y eliminan en cada test para garantizar aislamiento.
 *
 * Cobertura:
 *  ✓ POST /api/v1/families          → crea familia, creador queda como OWNER
 *  ✓ GET  /api/v1/families           → lista familias del usuario
 *  ✓ GET  /api/v1/families/:id/members → lista miembros (OWNER ve al OWNER)
 *  ✓ POST /api/v1/families/:id/join-pins → OWNER genera PIN; no-OWNER → 403
 *  ✓ POST /api/v1/families/join      → 2.º usuario se une con el código
 *  ✓ PIN de un solo uso: reusar el mismo código → 422
 *  ✓ Código inválido → 422
 *  ✓ Sin token → 401
 *  ✓ No-miembro en GET /:id/members → 403
 *
 * Nota: la expiración real del PIN (24 h) no se prueba aquí porque no se puede
 * manipular el reloj del sistema en un proceso Node real sin mocks. La lógica
 * de expiración está cubierta por los unit tests del dominio (join-pin.spec.ts).
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

/** Crea una familia y devuelve su id y el FamilySummaryDto del creador. */
async function createFamily(
  token: string,
  name = 'Familia Test',
): Promise<{ id: string; role: string }> {
  const res = await request(server)
    .post('/api/v1/families')
    .set('Authorization', `Bearer ${token}`)
    .send({ name });
  expect(res.status).toBe(201);
  return res.body as { id: string; role: string };
}

// ────────────────────────────────────────────────────────────────────────────
// Suite principal
// ────────────────────────────────────────────────────────────────────────────

describe('Family context – integración', () => {
  // Usuarios creados fresh por cada test group para evitar colisiones de estado.
  // Se declaran aquí y se asignan en beforeEach para poder limpiar en afterEach.

  describe('POST /api/v1/families', () => {
    let owner: TestUser;

    beforeEach(async () => {
      owner = await createTestUser();
    });

    afterAll(async () => {
      if (owner) await deleteTestUser(owner.userId);
    });

    it('crea una familia y devuelve role OWNER', async () => {
      const res = await request(server)
        .post('/api/v1/families')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ name: 'Los García', description: 'Familia test' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: expect.any(String),
        name: 'Los García',
        description: 'Familia test',
        role: 'OWNER',
      });
    });

    it('devuelve 401 sin token', async () => {
      const res = await request(server).post('/api/v1/families').send({ name: 'Sin auth' });
      expect(res.status).toBe(401);
    });

    it('devuelve 400 si el nombre está vacío', async () => {
      const res = await request(server)
        .post('/api/v1/families')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ name: '' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/families', () => {
    let owner: TestUser;
    let familyId: string;

    beforeEach(async () => {
      owner = await createTestUser();
      const family = await createFamily(owner.accessToken);
      familyId = family.id;
    });

    afterAll(async () => {
      if (owner) await deleteTestUser(owner.userId);
    });

    it('lista las familias del usuario autenticado', async () => {
      const res = await request(server)
        .get('/api/v1/families')
        .set('Authorization', `Bearer ${owner.accessToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const family = (res.body as Array<{ id: string; role: string }>).find(
        (f) => f.id === familyId,
      );
      expect(family).toBeDefined();
      expect(family?.role).toBe('OWNER');
    });

    it('devuelve 401 sin token', async () => {
      const res = await request(server).get('/api/v1/families');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/families/:id/members', () => {
    let owner: TestUser;
    let outsider: TestUser;
    let familyId: string;

    beforeEach(async () => {
      [owner, outsider] = await Promise.all([createTestUser(), createTestUser()]);
      const family = await createFamily(owner.accessToken);
      familyId = family.id;
    });

    afterAll(async () => {
      await Promise.all([
        owner ? deleteTestUser(owner.userId) : Promise.resolve(),
        outsider ? deleteTestUser(outsider.userId) : Promise.resolve(),
      ]);
    });

    it('OWNER ve su propio membresía con role OWNER', async () => {
      const res = await request(server)
        .get(`/api/v1/families/${familyId}/members`)
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
        .get(`/api/v1/families/${familyId}/members`)
        .set('Authorization', `Bearer ${outsider.accessToken}`);

      expect(res.status).toBe(403);
    });

    it('sin token devuelve 401', async () => {
      const res = await request(server).get(`/api/v1/families/${familyId}/members`);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/families/:id/join-pins', () => {
    let owner: TestUser;
    let member: TestUser;
    let familyId: string;

    beforeEach(async () => {
      [owner, member] = await Promise.all([createTestUser(), createTestUser()]);
      const family = await createFamily(owner.accessToken);
      familyId = family.id;
    });

    afterAll(async () => {
      await Promise.all([
        owner ? deleteTestUser(owner.userId) : Promise.resolve(),
        member ? deleteTestUser(member.userId) : Promise.resolve(),
      ]);
    });

    it('OWNER genera un PIN con code y expiresAt', async () => {
      const res = await request(server)
        .post(`/api/v1/families/${familyId}/join-pins`)
        .set('Authorization', `Bearer ${owner.accessToken}`);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        code: expect.stringMatching(/^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{8}$/),
        expiresAt: expect.any(String),
      });
    });

    it('no-miembro recibe 403 al intentar generar PIN', async () => {
      // `member` aún no pertenece a la familia
      const res = await request(server)
        .post(`/api/v1/families/${familyId}/join-pins`)
        .set('Authorization', `Bearer ${member.accessToken}`);

      expect(res.status).toBe(403);
    });

    it('sin token devuelve 401', async () => {
      const res = await request(server).post(`/api/v1/families/${familyId}/join-pins`);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/families/join', () => {
    let owner: TestUser;
    let joiner: TestUser;
    let familyId: string;
    let pinCode: string;

    beforeEach(async () => {
      [owner, joiner] = await Promise.all([createTestUser(), createTestUser()]);
      const family = await createFamily(owner.accessToken);
      familyId = family.id;

      // Generar el PIN como OWNER
      const pinRes = await request(server)
        .post(`/api/v1/families/${familyId}/join-pins`)
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
        .post('/api/v1/families/join')
        .set('Authorization', `Bearer ${joiner.accessToken}`)
        .send({ code: pinCode });

      expect(joinRes.status).toBe(200);
      expect(joinRes.body).toMatchObject({
        familyId,
        joined: true,
      });

      // Verificar que aparece como MEMBER en la lista de miembros
      const membersRes = await request(server)
        .get(`/api/v1/families/${familyId}/members`)
        .set('Authorization', `Bearer ${owner.accessToken}`);

      expect(membersRes.status).toBe(200);
      const joinerEntry = (
        membersRes.body as Array<{ userId: string; role: string }>
      ).find((m) => m.userId === joiner.userId);
      expect(joinerEntry).toBeDefined();
      expect(joinerEntry?.role).toBe('MEMBER');
    });

    it('PIN de un solo uso: reusar el mismo código devuelve 422', async () => {
      // Primer uso exitoso
      const first = await request(server)
        .post('/api/v1/families/join')
        .set('Authorization', `Bearer ${joiner.accessToken}`)
        .send({ code: pinCode });
      expect(first.status).toBe(200);

      // Segundo intento con el mismo código (ya CONSUMED)
      const second = await request(server)
        .post('/api/v1/families/join')
        .set('Authorization', `Bearer ${joiner.accessToken}`)
        .send({ code: pinCode });
      expect(second.status).toBe(422);
      expect(second.body.error).toBe('INVALID_JOIN_PIN');
    });

    it('código de 8 chars inválido devuelve 422', async () => {
      const res = await request(server)
        .post('/api/v1/families/join')
        .set('Authorization', `Bearer ${joiner.accessToken}`)
        .send({ code: 'AAAAAAAA' }); // Crockford válido en formato, no existe en BD

      expect(res.status).toBe(422);
      expect(res.body.error).toBe('INVALID_JOIN_PIN');
    });

    it('código con formato inválido devuelve 400', async () => {
      const res = await request(server)
        .post('/api/v1/families/join')
        .set('Authorization', `Bearer ${joiner.accessToken}`)
        .send({ code: 'TOOLONG!!' }); // 9 chars, caracter inválido

      expect(res.status).toBe(400);
    });

    it('sin token devuelve 401', async () => {
      const res = await request(server)
        .post('/api/v1/families/join')
        .send({ code: pinCode });
      expect(res.status).toBe(401);
    });
  });

  describe('MEMBER ya unido a la familia', () => {
    let owner: TestUser;
    let member: TestUser;
    let familyId: string;

    beforeEach(async () => {
      [owner, member] = await Promise.all([createTestUser(), createTestUser()]);
      const family = await createFamily(owner.accessToken);
      familyId = family.id;

      // Unir al member
      const pinRes = await request(server)
        .post(`/api/v1/families/${familyId}/join-pins`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      const pinCode = (pinRes.body as { code: string }).code;

      await request(server)
        .post('/api/v1/families/join')
        .set('Authorization', `Bearer ${member.accessToken}`)
        .send({ code: pinCode });
    });

    afterAll(async () => {
      await Promise.all([
        owner ? deleteTestUser(owner.userId) : Promise.resolve(),
        member ? deleteTestUser(member.userId) : Promise.resolve(),
      ]);
    });

    it('MEMBER ve los miembros de la familia', async () => {
      const res = await request(server)
        .get(`/api/v1/families/${familyId}/members`)
        .set('Authorization', `Bearer ${member.accessToken}`);

      expect(res.status).toBe(200);
      expect(
        (res.body as Array<{ userId: string }>).some((m) => m.userId === member.userId),
      ).toBe(true);
    });

    it('MEMBER NO puede generar PIN (solo OWNER) → 403', async () => {
      const res = await request(server)
        .post(`/api/v1/families/${familyId}/join-pins`)
        .set('Authorization', `Bearer ${member.accessToken}`);

      expect(res.status).toBe(403);
    });

    it('MEMBER puede ver sus familias en GET /families', async () => {
      const res = await request(server)
        .get('/api/v1/families')
        .set('Authorization', `Bearer ${member.accessToken}`);

      expect(res.status).toBe(200);
      const found = (res.body as Array<{ id: string; role: string }>).find(
        (f) => f.id === familyId,
      );
      expect(found).toBeDefined();
      expect(found?.role).toBe('MEMBER');
    });
  });
});
