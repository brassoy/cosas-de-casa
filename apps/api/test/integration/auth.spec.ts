/**
 * Tests de integración del contexto `identity-access` (endpoints `/auth`).
 *
 * Usa una instancia Nest real contra Supabase local y Postgres local.
 * Los usuarios se crean y eliminan en cada test para garantizar aislamiento.
 *
 * Cobertura:
 *  ✓ GET   /api/v1/auth/me            → usuario autenticado (display_name JIT)
 *  ✓ PATCH /api/v1/auth/me            → cambia el display_name; GET lo refleja
 *  ✓ PATCH con nombre vacío           → 400 (validación de contrato)
 *  ✓ PATCH con propiedad desconocida  → 400 (forbidNonWhitelisted vía .strict())
 *  ✓ Sin token                        → 401
 */
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
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

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('Identity-access – integración (/auth)', () => {
  let user: TestUser;

  beforeEach(async () => {
    user = await createTestUser();
  });

  afterEach(async () => {
    if (user) await deleteTestUser(user.userId);
  });

  describe('GET /api/v1/auth/me', () => {
    it('devuelve el usuario autenticado con un display_name por defecto', async () => {
      const res = await request(server).get('/api/v1/auth/me').set(auth(user.accessToken));
      expect(res.status).toBe(200);
      const body = res.body as { id: string; email: string; displayName: string | null };
      expect(body.email).toBe(user.email);
      // display_name JIT = parte local del email.
      expect(body.displayName).toBe(user.email.split('@')[0]);
    });

    it('sin token → 401', async () => {
      const res = await request(server).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/v1/auth/me', () => {
    it('cambia el display_name y GET /auth/me lo refleja', async () => {
      const nuevoNombre = 'Nombre Cambiado';

      const patchRes = await request(server)
        .patch('/api/v1/auth/me')
        .set(auth(user.accessToken))
        .send({ displayName: nuevoNombre });
      expect(patchRes.status).toBe(200);
      expect((patchRes.body as { displayName: string }).displayName).toBe(nuevoNombre);

      // El cambio persiste: una nueva consulta devuelve el nombre actualizado.
      const meRes = await request(server).get('/api/v1/auth/me').set(auth(user.accessToken));
      expect(meRes.status).toBe(200);
      expect((meRes.body as { displayName: string }).displayName).toBe(nuevoNombre);
    });

    it('recorta espacios (trim) del nombre', async () => {
      const res = await request(server)
        .patch('/api/v1/auth/me')
        .set(auth(user.accessToken))
        .send({ displayName: '  Con Espacios  ' });
      expect(res.status).toBe(200);
      expect((res.body as { displayName: string }).displayName).toBe('Con Espacios');
    });

    it('nombre vacío → 400', async () => {
      const res = await request(server)
        .patch('/api/v1/auth/me')
        .set(auth(user.accessToken))
        .send({ displayName: '' });
      expect(res.status).toBe(400);
    });

    it('propiedad no declarada en el body → 400 (forbidNonWhitelisted)', async () => {
      const res = await request(server)
        .patch('/api/v1/auth/me')
        .set(auth(user.accessToken))
        .send({ displayName: 'Válido', hackeame: true });
      expect(res.status).toBe(400);
    });

    it('sin token → 401', async () => {
      const res = await request(server)
        .patch('/api/v1/auth/me')
        .send({ displayName: 'Sin token' });
      expect(res.status).toBe(401);
    });
  });
});
