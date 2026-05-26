/**
 * Tests de integración del contexto `stats`.
 *
 * Cobertura:
 *  ✓ GET /api/v1/families/:familyId/stats         → 200 con StatsDto
 *  ✓ GET /api/v1/families/:familyId/leaderboard   → 200 array ordenado
 *  ✓ stats refleja ítems añadidos por el usuario
 *  ✓ 401 sin token
 *  ✓ 403 no-miembro
 */
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, closeTestApp } from '../support/app-factory';
import { createTestUser, deleteTestUser, type TestUser } from '../support/supabase-admin';
import type { StatsDto, LeaderboardEntryDto } from '@cosasdecasa/contracts';

let server: ReturnType<(typeof import('http'))['createServer']>;

beforeAll(async () => {
  const testApp = await createTestApp();
  server = testApp.server;
});

afterAll(async () => {
  await closeTestApp();
});

async function makeFamily(token: string, name = 'Familia Stats Test'): Promise<string> {
  const res = await request(server)
    .post('/api/v1/families')
    .set('Authorization', `Bearer ${token}`)
    .send({ name });
  expect(res.status).toBe(201);
  return (res.body as { id: string }).id;
}

async function addShoppingItem(token: string, familyId: string): Promise<void> {
  // Obtener/crear la lista main de la familia
  const listsRes = await request(server)
    .get(`/api/v1/families/${familyId}/lists`)
    .set('Authorization', `Bearer ${token}`);
  expect(listsRes.status).toBe(200);
  const lists = listsRes.body as Array<{ id: string; type: string }>;
  const mainList = lists.find((l) => l.type === 'MAIN') ?? lists[0];

  await request(server)
    .post(`/api/v1/lists/${mainList.id}/items`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name: `Ítem stats test ${Date.now()}` });
}

describe('Stats context – integración', () => {
  describe('GET /api/v1/families/:familyId/stats', () => {
    let owner: TestUser;
    let familyId: string;

    beforeEach(async () => {
      owner = await createTestUser();
      familyId = await makeFamily(owner.accessToken);
    });

    afterAll(async () => {
      if (owner) await deleteTestUser(owner.userId);
    });

    it('devuelve StatsDto con la familia correcta', async () => {
      const res = await request(server)
        .get(`/api/v1/families/${familyId}/stats`)
        .set('Authorization', `Bearer ${owner.accessToken}`);

      expect(res.status).toBe(200);
      const stats = res.body as StatsDto;
      expect(stats.familyId).toBe(familyId);
      expect(typeof stats.totalShoppingItemsAdded).toBe('number');
      expect(typeof stats.totalTasksCompleted).toBe('number');
      expect(Array.isArray(stats.members)).toBe(true);
    });

    it('incrementa shoppingItemsAdded después de añadir ítems', async () => {
      const beforeRes = await request(server)
        .get(`/api/v1/families/${familyId}/stats`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      const before = beforeRes.body as StatsDto;
      const memberBefore = before.members.find((m) => m.userId === owner.userId);
      const countBefore = memberBefore?.shoppingItemsAdded ?? 0;

      await addShoppingItem(owner.accessToken, familyId);

      const afterRes = await request(server)
        .get(`/api/v1/families/${familyId}/stats`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      const after = afterRes.body as StatsDto;
      const memberAfter = after.members.find((m) => m.userId === owner.userId);

      expect(memberAfter?.shoppingItemsAdded ?? 0).toBeGreaterThan(countBefore);
    });

    it('devuelve 401 sin token', async () => {
      const res = await request(server).get(`/api/v1/families/${familyId}/stats`);
      expect(res.status).toBe(401);
    });

    it('devuelve 403 si el usuario no es miembro', async () => {
      const outsider = await createTestUser();
      const res = await request(server)
        .get(`/api/v1/families/${familyId}/stats`)
        .set('Authorization', `Bearer ${outsider.accessToken}`);
      expect(res.status).toBe(403);
      await deleteTestUser(outsider.userId);
    });
  });

  describe('GET /api/v1/families/:familyId/leaderboard', () => {
    let owner: TestUser;
    let familyId: string;

    beforeEach(async () => {
      owner = await createTestUser();
      familyId = await makeFamily(owner.accessToken);
    });

    afterAll(async () => {
      if (owner) await deleteTestUser(owner.userId);
    });

    it('devuelve array de LeaderboardEntryDto', async () => {
      const res = await request(server)
        .get(`/api/v1/families/${familyId}/leaderboard`)
        .set('Authorization', `Bearer ${owner.accessToken}`);

      expect(res.status).toBe(200);
      const leaderboard = res.body as LeaderboardEntryDto[];
      expect(Array.isArray(leaderboard)).toBe(true);
      // Al menos el owner está en el ranking
      expect(leaderboard.some((e) => e.userId === owner.userId)).toBe(true);
    });

    it('está ordenado por rank ascendente (rank = posición)', async () => {
      const res = await request(server)
        .get(`/api/v1/families/${familyId}/leaderboard`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      const leaderboard = res.body as LeaderboardEntryDto[];
      for (let i = 1; i < leaderboard.length; i++) {
        expect(leaderboard[i].rank).toBeGreaterThanOrEqual(leaderboard[i - 1].rank);
      }
    });

    it('devuelve 401 sin token', async () => {
      const res = await request(server).get(`/api/v1/families/${familyId}/leaderboard`);
      expect(res.status).toBe(401);
    });

    it('devuelve 403 si el usuario no es miembro', async () => {
      const outsider = await createTestUser();
      const res = await request(server)
        .get(`/api/v1/families/${familyId}/leaderboard`)
        .set('Authorization', `Bearer ${outsider.accessToken}`);
      expect(res.status).toBe(403);
      await deleteTestUser(outsider.userId);
    });
  });
});
