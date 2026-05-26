/**
 * Tests de integración del contexto `menu`.
 *
 * Usa una instancia Nest real contra Supabase local.
 *
 * Cobertura:
 *  ✓ POST /api/v1/families/:familyId/menu/suggest     → 503 (IA no disponible en tests)
 *  ✓ POST /api/v1/families/:familyId/menu/to-list     → 201 ingredientes en lista principal
 *  ✓ POST /api/v1/families/:familyId/menu/to-list     → 201 ingredientes en lista indicada (listId)
 *  ✓ 401 sin token
 *  ✓ 403 no-miembro en to-list
 */
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, closeTestApp } from '../support/app-factory';
import { createTestUser, deleteTestUser, type TestUser } from '../support/supabase-admin';

let server: ReturnType<(typeof import('http'))['createServer']>;

let userA: TestUser;
let userB: TestUser;

beforeAll(async () => {
  const testApp = await createTestApp();
  server = testApp.server;
  [userA, userB] = await Promise.all([
    createTestUser(),
    createTestUser(),
  ]);
});

afterAll(async () => {
  await Promise.all([
    deleteTestUser(userA.userId),
    deleteTestUser(userB.userId),
  ]);
  await closeTestApp();
});

// ── Helpers ────────────────────────────────────────────────────────────────

async function makeFamily(token: string, name = 'Familia Menu Test'): Promise<string> {
  const res = await request(server)
    .post('/api/v1/families')
    .set('Authorization', `Bearer ${token}`)
    .send({ name });
  expect(res.status).toBe(201);
  return (res.body as { id: string }).id;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Menu integration', () => {
  let familyId: string;

  beforeEach(async () => {
    familyId = await makeFamily(userA.accessToken);
  });

  it('POST /menu/suggest → 503 cuando la IA no está disponible', async () => {
    const res = await request(server)
      .post(`/api/v1/families/${familyId}/menu/suggest`)
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({});
    expect(res.status).toBe(503);
    expect((res.body as { error: string }).error).toBe('AI_UNAVAILABLE');
  });

  it('POST /menu/to-list → 201 añade ingredientes a la lista principal (sin IA)', async () => {
    const res = await request(server)
      .post(`/api/v1/families/${familyId}/menu/to-list`)
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ ingredients: ['Cebolla', 'Ajo', 'Tomate'] });
    expect(res.status).toBe(201);
    const body = res.body as { itemsAdded: number; listId: string; listName: string };
    expect(body.itemsAdded).toBe(3);
    expect(body.listId).toBeDefined();
    expect(body.listName).toBeDefined();
  });

  it('POST /menu/to-list con listId válido → 201 usa esa lista', async () => {
    // Primero crear una lista custom
    const listRes = await request(server)
      .get(`/api/v1/families/${familyId}/lists`)
      .set('Authorization', `Bearer ${userA.accessToken}`);
    expect(listRes.status).toBe(200);
    const lists = listRes.body as Array<{ id: string; type: string }>;
    const mainList = lists.find((l) => l.type === 'MAIN');
    expect(mainList).toBeDefined();

    const res = await request(server)
      .post(`/api/v1/families/${familyId}/menu/to-list`)
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ ingredients: ['Arroz', 'Pollo'], listId: mainList!.id });
    expect(res.status).toBe(201);
    expect((res.body as { itemsAdded: number }).itemsAdded).toBe(2);
    expect((res.body as { listId: string }).listId).toBe(mainList!.id);
  });

  it('401 sin token en /menu/to-list', async () => {
    const res = await request(server)
      .post(`/api/v1/families/${familyId}/menu/to-list`)
      .send({ ingredients: ['Pasta'] });
    expect(res.status).toBe(401);
  });

  it('403 no-miembro en /menu/to-list', async () => {
    const res = await request(server)
      .post(`/api/v1/families/${familyId}/menu/to-list`)
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .send({ ingredients: ['Patatas'] });
    expect(res.status).toBe(403);
  });
});
