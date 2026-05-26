/**
 * Tests de integración del contexto `tasks`.
 *
 * Usa una instancia Nest real contra Supabase local.
 *
 * Cobertura:
 *  ✓ POST /api/v1/families/:familyId/tasks    → crea tarea; el creador queda asignado
 *  ✓ GET  /api/v1/families/:familyId/tasks    → lista tareas con filtro por status
 *  ✓ GET  /api/v1/tasks/:taskId              → obtiene la tarea
 *  ✓ PATCH /api/v1/tasks/:taskId             → actualiza título y estado
 *  ✓ PATCH /api/v1/tasks/:taskId/assignees   → reemplaza asignados
 *  ✓ POST /api/v1/tasks/:taskId/photos       → registra foto
 *  ✓ DELETE /api/v1/tasks/:taskId/photos/:photoId → elimina foto
 *  ✓ POST /api/v1/tasks/:taskId/generate-list → crea lista CUSTOM de shopping
 *  ✓ DELETE /api/v1/tasks/:taskId            → elimina tarea
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

async function makeFamily(token: string, name = 'Familia Tasks Test'): Promise<string> {
  const res = await request(server)
    .post('/api/v1/families')
    .set('Authorization', `Bearer ${token}`)
    .send({ name });
  expect(res.status).toBe(201);
  return (res.body as { id: string }).id;
}

async function joinFamily(ownerToken: string, joinerToken: string, familyId: string): Promise<void> {
  const pinRes = await request(server)
    .post(`/api/v1/families/${familyId}/join-pins`)
    .set('Authorization', `Bearer ${ownerToken}`);
  expect(pinRes.status).toBe(201);
  const joinRes = await request(server)
    .post('/api/v1/families/join')
    .set('Authorization', `Bearer ${joinerToken}`)
    .send({ code: (pinRes.body as { code: string }).code });
  expect(joinRes.status).toBe(200);
}

async function makeTask(
  token: string,
  familyId: string,
  title = 'Limpiar el baño',
): Promise<{ id: string; familyId: string; status: string; assignees: Array<{ userId: string }> }> {
  const res = await request(server)
    .post(`/api/v1/families/${familyId}/tasks`)
    .set('Authorization', `Bearer ${token}`)
    .send({ title });
  expect(res.status).toBe(201);
  return res.body as { id: string; familyId: string; status: string; assignees: Array<{ userId: string }> };
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('Tasks context – integración', () => {
  describe('POST /api/v1/families/:familyId/tasks (crear tarea)', () => {
    let owner: TestUser;
    let familyId: string;

    beforeEach(async () => {
      owner = await createTestUser();
      familyId = await makeFamily(owner.accessToken);
    });

    afterAll(async () => {
      if (owner) await deleteTestUser(owner.userId);
    });

    it('crea la tarea y el creador queda como asignado', async () => {
      const task = await makeTask(owner.accessToken, familyId);

      expect(task.id).toBeTruthy();
      expect(task.status).toBe('OPEN');
      expect(task.assignees).toHaveLength(1);
      expect(task.assignees[0].userId).toBe(owner.userId);
    });

    it('crea la tarea con assigneeIds personalizados', async () => {
      const member = await createTestUser();
      await joinFamily(owner.accessToken, member.accessToken, familyId);

      const res = await request(server)
        .post(`/api/v1/families/${familyId}/tasks`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ title: 'Con asignado', assigneeIds: [member.userId] });

      expect(res.status).toBe(201);
      const body = res.body as { assignees: Array<{ userId: string }> };
      expect(body.assignees.some((a) => a.userId === member.userId)).toBe(true);

      await deleteTestUser(member.userId);
    });

    it('devuelve 401 sin token', async () => {
      const res = await request(server)
        .post(`/api/v1/families/${familyId}/tasks`)
        .send({ title: 'Sin token' });
      expect(res.status).toBe(401);
    });

    it('devuelve 403 si el usuario no es miembro', async () => {
      const outsider = await createTestUser();
      const res = await request(server)
        .post(`/api/v1/families/${familyId}/tasks`)
        .set('Authorization', `Bearer ${outsider.accessToken}`)
        .send({ title: 'No miembro' });
      expect(res.status).toBe(403);
      await deleteTestUser(outsider.userId);
    });
  });

  describe('GET /api/v1/families/:familyId/tasks (listar tareas)', () => {
    let owner: TestUser;
    let familyId: string;

    beforeEach(async () => {
      owner = await createTestUser();
      familyId = await makeFamily(owner.accessToken);
      await makeTask(owner.accessToken, familyId, 'T1');
      await makeTask(owner.accessToken, familyId, 'T2');
    });

    afterAll(async () => {
      if (owner) await deleteTestUser(owner.userId);
    });

    it('devuelve todas las tareas de la familia', async () => {
      const res = await request(server)
        .get(`/api/v1/families/${familyId}/tasks`)
        .set('Authorization', `Bearer ${owner.accessToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect((res.body as unknown[]).length).toBeGreaterThanOrEqual(2);
    });

    it('filtra por status', async () => {
      // Cambiamos una tarea a IN_PROGRESS
      const task = await makeTask(owner.accessToken, familyId, 'T3');
      await request(server)
        .patch(`/api/v1/tasks/${task.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ status: 'IN_PROGRESS' });

      const res = await request(server)
        .get(`/api/v1/families/${familyId}/tasks?status=IN_PROGRESS`)
        .set('Authorization', `Bearer ${owner.accessToken}`);

      expect(res.status).toBe(200);
      const tasks = res.body as Array<{ status: string }>;
      expect(tasks.every((t) => t.status === 'IN_PROGRESS')).toBe(true);
    });
  });

  describe('GET/PATCH/DELETE /api/v1/tasks/:taskId', () => {
    let owner: TestUser;
    let taskId: string;

    beforeEach(async () => {
      owner = await createTestUser();
      const familyId = await makeFamily(owner.accessToken);
      const task = await makeTask(owner.accessToken, familyId);
      taskId = task.id;
    });

    afterAll(async () => {
      if (owner) await deleteTestUser(owner.userId);
    });

    it('GET devuelve la tarea por id', async () => {
      const res = await request(server)
        .get(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${owner.accessToken}`);

      expect(res.status).toBe(200);
      expect((res.body as { id: string }).id).toBe(taskId);
    });

    it('PATCH actualiza el título y el estado', async () => {
      const res = await request(server)
        .patch(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ title: 'Título actualizado', status: 'IN_PROGRESS' });

      expect(res.status).toBe(200);
      const body = res.body as { title: string; status: string };
      expect(body.title).toBe('Título actualizado');
      expect(body.status).toBe('IN_PROGRESS');
    });

    it('completa una tarea (IN_PROGRESS → DONE)', async () => {
      await request(server)
        .patch(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ status: 'IN_PROGRESS' });

      const res = await request(server)
        .patch(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ status: 'DONE' });

      expect(res.status).toBe(200);
      expect((res.body as { status: string }).status).toBe('DONE');
    });

    it('DELETE elimina la tarea y responde 204', async () => {
      const res = await request(server)
        .delete(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      expect(res.status).toBe(204);

      const getRes = await request(server)
        .get(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      expect(getRes.status).toBe(404);
    });

    it('devuelve 401 sin token en GET', async () => {
      const res = await request(server).get(`/api/v1/tasks/${taskId}`);
      expect(res.status).toBe(401);
    });

    it('devuelve 403 si el usuario no es miembro', async () => {
      const outsider = await createTestUser();
      const res = await request(server)
        .get(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${outsider.accessToken}`);
      expect(res.status).toBe(403);
      await deleteTestUser(outsider.userId);
    });
  });

  describe('PATCH /api/v1/tasks/:taskId/assignees (asignar)', () => {
    let owner: TestUser;
    let member: TestUser;
    let taskId: string;

    beforeEach(async () => {
      [owner, member] = await Promise.all([createTestUser(), createTestUser()]);
      const familyId = await makeFamily(owner.accessToken);
      await joinFamily(owner.accessToken, member.accessToken, familyId);
      const task = await makeTask(owner.accessToken, familyId);
      taskId = task.id;
    });

    afterAll(async () => {
      await Promise.all([
        owner ? deleteTestUser(owner.userId) : Promise.resolve(),
        member ? deleteTestUser(member.userId) : Promise.resolve(),
      ]);
    });

    it('reemplaza los asignados de la tarea', async () => {
      const res = await request(server)
        .patch(`/api/v1/tasks/${taskId}/assignees`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ assigneeIds: [member.userId] });

      expect(res.status).toBe(200);
      const body = res.body as { assignees: Array<{ userId: string }> };
      expect(body.assignees).toHaveLength(1);
      expect(body.assignees[0].userId).toBe(member.userId);
    });
  });

  describe('Fotos de tarea', () => {
    let owner: TestUser;
    let taskId: string;

    beforeEach(async () => {
      owner = await createTestUser();
      const familyId = await makeFamily(owner.accessToken);
      const task = await makeTask(owner.accessToken, familyId);
      taskId = task.id;
    });

    afterAll(async () => {
      if (owner) await deleteTestUser(owner.userId);
    });

    it('POST /tasks/:taskId/photos registra una foto', async () => {
      const res = await request(server)
        .post(`/api/v1/tasks/${taskId}/photos`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ storagePath: 'task-photos/test.jpg' });

      expect(res.status).toBe(201);
      const body = res.body as { photos: Array<{ id: string; storagePath: string }> };
      expect(body.photos).toHaveLength(1);
      expect(body.photos[0].storagePath).toBe('task-photos/test.jpg');
    });

    it('DELETE /tasks/:taskId/photos/:photoId elimina la foto (204)', async () => {
      const addRes = await request(server)
        .post(`/api/v1/tasks/${taskId}/photos`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ storagePath: 'task-photos/borrar.jpg' });
      const photoId = (addRes.body as { photos: Array<{ id: string }> }).photos[0].id;

      const delRes = await request(server)
        .delete(`/api/v1/tasks/${taskId}/photos/${photoId}`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      expect(delRes.status).toBe(204);
    });
  });

  describe('POST /api/v1/tasks/:taskId/generate-list (generar lista de compra)', () => {
    let owner: TestUser;
    let taskId: string;
    let taskTitle: string;

    beforeEach(async () => {
      owner = await createTestUser();
      const familyId = await makeFamily(owner.accessToken);
      taskTitle = 'Compra para la fiesta';
      const task = await makeTask(owner.accessToken, familyId, taskTitle);
      taskId = task.id;
    });

    afterAll(async () => {
      if (owner) await deleteTestUser(owner.userId);
    });

    it('crea una lista CUSTOM de shopping con el nombre de la tarea', async () => {
      const res = await request(server)
        .post(`/api/v1/tasks/${taskId}/generate-list`)
        .set('Authorization', `Bearer ${owner.accessToken}`);

      expect(res.status).toBe(201);
      const body = res.body as { name: string; type: string };
      expect(body.name).toBe(taskTitle);
      expect(body.type).toBe('CUSTOM');
    });
  });
});
