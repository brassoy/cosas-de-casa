/**
 * Tests de integración del contexto `budget` (receipts + spend summary).
 *
 * Usa una instancia Nest real contra Supabase local.
 *
 * Cobertura:
 *  ✓ POST /api/v1/families/:familyId/receipts/extract → 503 (IA no disponible en tests)
 *  ✓ POST /api/v1/families/:familyId/receipts → 201 ticket creado con líneas
 *  ✓ GET  /api/v1/families/:familyId/receipts → 200 lista de resúmenes
 *  ✓ GET  /api/v1/receipts/:receiptId         → 200 ticket completo
 *  ✓ PATCH /api/v1/receipts/:receiptId        → 200 actualiza merchant + líneas
 *  ✓ GET  /api/v1/families/:familyId/spend-summary?from=&to= → 200 resumen de gasto
 *  ✓ 403 cross-familia en GET /receipts/:id
 *  ✓ DELETE /api/v1/receipts/:receiptId → 204
 *  ✓ 401 sin token
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

async function makeFamily(token: string, name = 'Familia Budget Test'): Promise<string> {
  const res = await request(server)
    .post('/api/v1/families')
    .set('Authorization', `Bearer ${token}`)
    .send({ name });
  expect(res.status).toBe(201);
  return (res.body as { id: string }).id;
}

async function makeReceipt(token: string, familyId: string, overrides?: object): Promise<{ id: string }> {
  const res = await request(server)
    .post(`/api/v1/families/${familyId}/receipts`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      merchant: 'Mercadona',
      purchasedAt: '2026-05-26',
      total: 15.50,
      currency: 'EUR',
      lines: [
        { description: 'Leche', lineTotal: 1.5, category: 'groceries' },
        { description: 'Jabón', lineTotal: 2.0, category: 'household' },
      ],
      ...overrides,
    });
  expect(res.status).toBe(201);
  return res.body as { id: string };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Budget integration', () => {
  let familyId: string;

  beforeEach(async () => {
    familyId = await makeFamily(userA.accessToken);
  });

  it('POST /extract → 503 cuando la IA no está disponible', async () => {
    const res = await request(server)
      .post(`/api/v1/families/${familyId}/receipts/extract`)
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ imageBase64: 'abc123' });
    expect(res.status).toBe(503);
    expect((res.body as { error: string }).error).toBe('AI_UNAVAILABLE');
  });

  it('POST /receipts → 201 crea ticket con líneas', async () => {
    const receipt = await makeReceipt(userA.accessToken, familyId);
    expect(receipt.id).toBeDefined();
    const full = (await request(server)
      .get(`/api/v1/receipts/${receipt.id}`)
      .set('Authorization', `Bearer ${userA.accessToken}`)).body as { lines: unknown[] };
    expect(full.lines).toHaveLength(2);
  });

  it('GET /families/:id/receipts → 200 lista resúmenes', async () => {
    await makeReceipt(userA.accessToken, familyId);
    await makeReceipt(userA.accessToken, familyId);
    const res = await request(server)
      .get(`/api/v1/families/${familyId}/receipts`)
      .set('Authorization', `Bearer ${userA.accessToken}`);
    expect(res.status).toBe(200);
    expect((res.body as unknown[]).length).toBeGreaterThanOrEqual(2);
    // Resumen no tiene campo 'lines', tiene 'lineCount'
    const first = (res.body as Array<{ lineCount: number }>)[0];
    expect(typeof first.lineCount).toBe('number');
  });

  it('PATCH /receipts/:id → 200 actualiza merchant', async () => {
    const receipt = await makeReceipt(userA.accessToken, familyId);
    const res = await request(server)
      .patch(`/api/v1/receipts/${receipt.id}`)
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ merchant: 'Carrefour', status: 'confirmed' });
    expect(res.status).toBe(200);
    expect((res.body as { merchant: string }).merchant).toBe('Carrefour');
    expect((res.body as { status: string }).status).toBe('confirmed');
  });

  it('GET /families/:id/spend-summary → 200 resumen de gasto', async () => {
    await makeReceipt(userA.accessToken, familyId);
    // Confirmar el ticket para que entre en el resumen
    const receipt = await makeReceipt(userA.accessToken, familyId);
    await request(server)
      .patch(`/api/v1/receipts/${receipt.id}`)
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ status: 'confirmed' });

    const res = await request(server)
      .get(`/api/v1/families/${familyId}/spend-summary`)
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .query({ from: '2026-01-01', to: '2026-12-31' });
    expect(res.status).toBe(200);
    expect(typeof (res.body as { total: number }).total).toBe('number');
    expect(Array.isArray((res.body as { byCategory: unknown[] }).byCategory)).toBe(true);
    expect(Array.isArray((res.body as { byMonth: unknown[] }).byMonth)).toBe(true);
  });

  it('403 cross-familia: userB no puede ver tickets de la familia de userA', async () => {
    const receipt = await makeReceipt(userA.accessToken, familyId);
    const res = await request(server)
      .get(`/api/v1/receipts/${receipt.id}`)
      .set('Authorization', `Bearer ${userB.accessToken}`);
    expect(res.status).toBe(403);
  });

  it('DELETE /receipts/:id → 204', async () => {
    const receipt = await makeReceipt(userA.accessToken, familyId);
    const delRes = await request(server)
      .delete(`/api/v1/receipts/${receipt.id}`)
      .set('Authorization', `Bearer ${userA.accessToken}`);
    expect(delRes.status).toBe(204);

    const getRes = await request(server)
      .get(`/api/v1/receipts/${receipt.id}`)
      .set('Authorization', `Bearer ${userA.accessToken}`);
    expect(getRes.status).toBe(404);
  });

  it('401 sin token', async () => {
    const res = await request(server)
      .get(`/api/v1/families/${familyId}/receipts`);
    expect(res.status).toBe(401);
  });
});
