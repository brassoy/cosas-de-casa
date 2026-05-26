/**
 * Tests de integración de AUTORIZACIÓN (IDOR) y NEGATIVOS.
 *
 * Esta suite es una RED DE SEGURIDAD transversal a todos los contextos. Su
 * objetivo NO es probar el camino feliz (eso lo cubren los specs por contexto)
 * sino verificar lo contrario: que la API NO hace lo que no debe.
 *
 * Se agrupa en cuatro bloques:
 *   1. Cross-family / IDOR: con el token de un usuario de la familia A, intentar
 *      tocar recursos de la familia B → debe devolver 403 (recurso existe, no
 *      eres miembro) o 404. Cubre los scope guards declarativos (shopping,
 *      tasks, budget, calendar, fridge) y la autz en caso de uso (plans, social).
 *   2. Roles: un MEMBER (no OWNER) intentando una acción restringida a OWNER.
 *   3. Pareja: un miembro de la familia que NO pertenece a la pareja accediendo
 *      al rincón de la pareja.
 *   4. Negativos de validación y de dominio: bodies fuera de contrato → 400,
 *      transiciones de estado inválidas → 409/422.
 *
 * Convención de fidelidad: si un test cross-family recibiera 200 en lugar de
 * 403/404, eso sería un IDOR REAL. El test refleja el comportamiento ESPERADO
 * (403/404) y, si la implementación tuviera el agujero, el test FALLARÍA, que es
 * exactamente lo que queremos de una red de seguridad.
 */
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, closeTestApp } from '../support/app-factory';
import { createTestUser, deleteTestUser, type TestUser } from '../support/supabase-admin';

let server: ReturnType<(typeof import('http'))['createServer']>;

// Usuarios compartidos por toda la suite. uA y uB son OWNER de familias
// distintas y SIN ninguna relación entre ellas (no son amigas ni comparten
// nada). uOutsider es un tercero totalmente ajeno.
let uA: TestUser;
let uB: TestUser;
let uOutsider: TestUser;

beforeAll(async () => {
  const testApp = await createTestApp();
  server = testApp.server;
  [uA, uB, uOutsider] = await Promise.all([
    createTestUser(),
    createTestUser(),
    createTestUser(),
  ]);
});

afterAll(async () => {
  await Promise.all([
    uA ? deleteTestUser(uA.userId) : Promise.resolve(),
    uB ? deleteTestUser(uB.userId) : Promise.resolve(),
    uOutsider ? deleteTestUser(uOutsider.userId) : Promise.resolve(),
  ]);
  await closeTestApp();
});

// ── Helpers ─────────────────────────────────────────────────────────────────

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Crea una familia con el token dado y devuelve su id. */
async function makeFamily(token: string, name = 'Familia Authz'): Promise<string> {
  const res = await request(server)
    .post('/api/v1/families')
    .set(auth(token))
    .send({ name });
  expect(res.status).toBe(201);
  return (res.body as { id: string }).id;
}

/** Une a `joiner` a la familia de `owner` vía PIN. */
async function joinFamily(ownerToken: string, joinerToken: string, familyId: string): Promise<void> {
  const pinRes = await request(server)
    .post(`/api/v1/families/${familyId}/join-pins`)
    .set(auth(ownerToken));
  expect(pinRes.status).toBe(201);
  const code = (pinRes.body as { code: string }).code;

  const joinRes = await request(server)
    .post('/api/v1/families/join')
    .set(auth(joinerToken))
    .send({ code });
  expect(joinRes.status).toBe(200);
}

/** Devuelve el id de la lista MAIN de la familia (la crea si no existe). */
async function mainListId(token: string, familyId: string): Promise<string> {
  const res = await request(server)
    .get(`/api/v1/families/${familyId}/lists`)
    .set(auth(token));
  expect(res.status).toBe(200);
  const main = (res.body as Array<{ id: string; type: string }>).find((l) => l.type === 'MAIN');
  expect(main).toBeDefined();
  return main!.id;
}

/** Crea un ítem en la lista MAIN de la familia y devuelve su id. */
async function makeShoppingItem(token: string, familyId: string): Promise<string> {
  const listId = await mainListId(token, familyId);
  const res = await request(server)
    .post(`/api/v1/lists/${listId}/items`)
    .set(auth(token))
    .send({ name: 'Producto cross-family' });
  expect(res.status).toBe(201);
  return (res.body as { item: { id: string } }).item.id;
}

/** Crea una tarea y devuelve su id. */
async function makeTask(token: string, familyId: string): Promise<string> {
  const res = await request(server)
    .post(`/api/v1/families/${familyId}/tasks`)
    .set(auth(token))
    .send({ title: 'Tarea cross-family' });
  expect(res.status).toBe(201);
  return (res.body as { id: string }).id;
}

/** Crea un ticket y devuelve su id. */
async function makeReceipt(token: string, familyId: string): Promise<string> {
  const res = await request(server)
    .post(`/api/v1/families/${familyId}/receipts`)
    .set(auth(token))
    .send({ merchant: 'Mercadona', purchasedAt: '2026-05-26', total: 9.99, currency: 'EUR' });
  expect(res.status).toBe(201);
  return (res.body as { id: string }).id;
}

/** Crea un evento de calendario y devuelve su id. */
async function makeEvent(token: string, familyId: string): Promise<string> {
  const res = await request(server)
    .post(`/api/v1/families/${familyId}/calendar/events`)
    .set(auth(token))
    .send({ title: 'Evento cross-family', startsAt: '2026-07-01T10:00:00Z' });
  expect(res.status).toBe(201);
  return (res.body as { id: string }).id;
}

/** Crea un ítem de nevera y devuelve su id. */
async function makeFridgeItem(token: string, familyId: string, quantity = '2'): Promise<string> {
  const res = await request(server)
    .post(`/api/v1/families/${familyId}/fridge`)
    .set(auth(token))
    .send({ name: 'Leche cross-family', quantity });
  expect(res.status).toBe(201);
  return (res.body as { id: string }).id;
}

/** Crea un plan y devuelve su id. */
async function makePlan(token: string, familyId: string): Promise<string> {
  const res = await request(server)
    .post(`/api/v1/families/${familyId}/plans`)
    .set(auth(token))
    .send({ title: 'Plan privado cross-family' });
  expect(res.status).toBe(201);
  return (res.body as { id: string }).id;
}

// Atajo de aserción: un acceso indebido debe ser 403 o 404, NUNCA 2xx.
// 403 = el recurso existe pero no eres miembro de su familia.
// 404 = el guard/uso prefiere no revelar la existencia del recurso.
const expectForbiddenOrNotFound = (status: number): void => {
  expect([403, 404]).toContain(status);
};

// ── 1. Cross-family / IDOR ────────────────────────────────────────────────────

describe('Autorización — Cross-family / IDOR', () => {
  // Familias sin relación: A pertenece a uA, B pertenece a uB.
  let familyA: string;
  let familyB: string;

  beforeEach(async () => {
    [familyA, familyB] = await Promise.all([
      makeFamily(uA.accessToken, 'Familia A'),
      makeFamily(uB.accessToken, 'Familia B'),
    ]);
  });

  describe('shopping', () => {
    it('GET /lists/:listId de B con token de A → 403/404', async () => {
      const listIdB = await mainListId(uB.accessToken, familyB);
      const res = await request(server)
        .get(`/api/v1/lists/${listIdB}`)
        .set(auth(uA.accessToken));
      expectForbiddenOrNotFound(res.status);
    });

    it('PATCH /items/:itemId de B con token de A → 403/404', async () => {
      const itemIdB = await makeShoppingItem(uB.accessToken, familyB);
      const res = await request(server)
        .patch(`/api/v1/items/${itemIdB}`)
        .set(auth(uA.accessToken))
        .send({ checked: true });
      expectForbiddenOrNotFound(res.status);
    });

    it('DELETE /items/:itemId de B con token de A → 403/404', async () => {
      const itemIdB = await makeShoppingItem(uB.accessToken, familyB);
      const res = await request(server)
        .delete(`/api/v1/items/${itemIdB}`)
        .set(auth(uA.accessToken));
      expectForbiddenOrNotFound(res.status);
    });
  });

  describe('tasks', () => {
    it('GET /tasks/:taskId de B con token de A → 403/404', async () => {
      const taskIdB = await makeTask(uB.accessToken, familyB);
      const res = await request(server)
        .get(`/api/v1/tasks/${taskIdB}`)
        .set(auth(uA.accessToken));
      expectForbiddenOrNotFound(res.status);
    });

    it('PATCH /tasks/:taskId de B con token de A → 403/404', async () => {
      const taskIdB = await makeTask(uB.accessToken, familyB);
      const res = await request(server)
        .patch(`/api/v1/tasks/${taskIdB}`)
        .set(auth(uA.accessToken))
        .send({ title: 'Secuestrada' });
      expectForbiddenOrNotFound(res.status);
    });

    it('DELETE /tasks/:taskId de B con token de A → 403/404', async () => {
      const taskIdB = await makeTask(uB.accessToken, familyB);
      const res = await request(server)
        .delete(`/api/v1/tasks/${taskIdB}`)
        .set(auth(uA.accessToken));
      expectForbiddenOrNotFound(res.status);
    });
  });

  describe('budget', () => {
    it('GET /receipts/:receiptId de B con token de A → 403/404', async () => {
      const receiptIdB = await makeReceipt(uB.accessToken, familyB);
      const res = await request(server)
        .get(`/api/v1/receipts/${receiptIdB}`)
        .set(auth(uA.accessToken));
      expectForbiddenOrNotFound(res.status);
    });

    it('PATCH /receipts/:receiptId de B con token de A → 403/404', async () => {
      const receiptIdB = await makeReceipt(uB.accessToken, familyB);
      const res = await request(server)
        .patch(`/api/v1/receipts/${receiptIdB}`)
        .set(auth(uA.accessToken))
        .send({ merchant: 'Robado' });
      expectForbiddenOrNotFound(res.status);
    });

    it('DELETE /receipts/:receiptId de B con token de A → 403/404', async () => {
      const receiptIdB = await makeReceipt(uB.accessToken, familyB);
      const res = await request(server)
        .delete(`/api/v1/receipts/${receiptIdB}`)
        .set(auth(uA.accessToken));
      expectForbiddenOrNotFound(res.status);
    });
  });

  describe('calendar', () => {
    it('GET /calendar/events/:eventId de B con token de A → 403/404', async () => {
      const eventIdB = await makeEvent(uB.accessToken, familyB);
      const res = await request(server)
        .get(`/api/v1/calendar/events/${eventIdB}`)
        .set(auth(uA.accessToken));
      expectForbiddenOrNotFound(res.status);
    });

    it('PATCH /calendar/events/:eventId de B con token de A → 403/404', async () => {
      const eventIdB = await makeEvent(uB.accessToken, familyB);
      const res = await request(server)
        .patch(`/api/v1/calendar/events/${eventIdB}`)
        .set(auth(uA.accessToken))
        .send({ title: 'Secuestrado' });
      expectForbiddenOrNotFound(res.status);
    });

    it('DELETE /calendar/events/:eventId de B con token de A → 403/404', async () => {
      const eventIdB = await makeEvent(uB.accessToken, familyB);
      const res = await request(server)
        .delete(`/api/v1/calendar/events/${eventIdB}`)
        .set(auth(uA.accessToken));
      expectForbiddenOrNotFound(res.status);
    });
  });

  describe('fridge', () => {
    it('GET /fridge-items/:itemId de B con token de A → 403/404', async () => {
      const itemIdB = await makeFridgeItem(uB.accessToken, familyB);
      const res = await request(server)
        .get(`/api/v1/fridge-items/${itemIdB}`)
        .set(auth(uA.accessToken));
      expectForbiddenOrNotFound(res.status);
    });

    it('PATCH /fridge-items/:itemId de B con token de A → 403/404', async () => {
      const itemIdB = await makeFridgeItem(uB.accessToken, familyB);
      const res = await request(server)
        .patch(`/api/v1/fridge-items/${itemIdB}`)
        .set(auth(uA.accessToken))
        .send({ name: 'Robado' });
      expectForbiddenOrNotFound(res.status);
    });

    it('DELETE /fridge-items/:itemId de B con token de A → 403/404', async () => {
      const itemIdB = await makeFridgeItem(uB.accessToken, familyB);
      const res = await request(server)
        .delete(`/api/v1/fridge-items/${itemIdB}`)
        .set(auth(uA.accessToken));
      expectForbiddenOrNotFound(res.status);
    });
  });

  // PRIORIDAD: plans no tiene scope guard declarativo. La autorización vive en
  // el caso de uso (GetPlanUseCase lanza PlanAccessDeniedError → 403; delete y
  // share lanzan PlanNotOwnedByFamilyError → 403). Un agujero aquí es más
  // probable que en los contextos con guard, de ahí el énfasis.
  describe('plans (autz en caso de uso, sin scope guard)', () => {
    it('GET /plans/:planId no compartido de B con token de A → 403/404', async () => {
      const planIdB = await makePlan(uB.accessToken, familyB);
      const res = await request(server)
        .get(`/api/v1/plans/${planIdB}`)
        .set(auth(uA.accessToken));
      expectForbiddenOrNotFound(res.status);
    });

    it('PATCH /plans/:planId de B con token de A → 403/404', async () => {
      const planIdB = await makePlan(uB.accessToken, familyB);
      const res = await request(server)
        .patch(`/api/v1/plans/${planIdB}`)
        .set(auth(uA.accessToken))
        .send({ title: 'Plan secuestrado' });
      expectForbiddenOrNotFound(res.status);
    });

    it('DELETE /plans/:planId de B con token de A → 403/404', async () => {
      const planIdB = await makePlan(uB.accessToken, familyB);
      const res = await request(server)
        .delete(`/api/v1/plans/${planIdB}`)
        .set(auth(uA.accessToken));
      expectForbiddenOrNotFound(res.status);
    });

    it('POST /plans/:planId/messages en plan de B con token de A → 403/404', async () => {
      const planIdB = await makePlan(uB.accessToken, familyB);
      const res = await request(server)
        .post(`/api/v1/plans/${planIdB}/messages`)
        .set(auth(uA.accessToken))
        .send({ body: 'Intrusión en el chat ajeno' });
      expectForbiddenOrNotFound(res.status);
    });

    it('POST /plans/:planId/share de un plan de B con token de A → 403/404', async () => {
      // Solo el owner del plan puede compartirlo; uA no lo es.
      const planIdB = await makePlan(uB.accessToken, familyB);
      const res = await request(server)
        .post(`/api/v1/plans/${planIdB}/share`)
        .set(auth(uA.accessToken))
        .send({ familyId: familyA });
      expectForbiddenOrNotFound(res.status);
    });
  });

  // PRIORIDAD: social tampoco tiene scope guard declarativo; la autz vive en el
  // caso de uso (RemoveFriendFamilyUseCase exige ser miembro de una de las dos
  // familias del vínculo → NotFamilyMemberError → 403).
  describe('social (autz en caso de uso, sin scope guard)', () => {
    it('DELETE /friends/:linkId de un vínculo ajeno con token de un tercero → 403/404', async () => {
      // Creamos un vínculo REAL entre A y B y lo intenta borrar uOutsider.
      const inviteRes = await request(server)
        .post(`/api/v1/families/${familyA}/friend-invites`)
        .set(auth(uA.accessToken));
      expect(inviteRes.status).toBe(201);
      const code = (inviteRes.body as { code: string }).code;

      const redeemRes = await request(server)
        .post('/api/v1/friends/redeem')
        .set(auth(uB.accessToken))
        .send({ code, familyId: familyB });
      expect(redeemRes.status).toBe(200);
      const linkId = (redeemRes.body as { linkId: string }).linkId;

      const res = await request(server)
        .delete(`/api/v1/friends/${linkId}`)
        .set(auth(uOutsider.accessToken));
      expectForbiddenOrNotFound(res.status);
    });

    it('GET /families/:familyId/friends de B con token de A → 403/404', async () => {
      const res = await request(server)
        .get(`/api/v1/families/${familyB}/friends`)
        .set(auth(uA.accessToken));
      expectForbiddenOrNotFound(res.status);
    });

    it('POST /families/:familyId/friend-invites de B con token de A → 403/404', async () => {
      const res = await request(server)
        .post(`/api/v1/families/${familyB}/friend-invites`)
        .set(auth(uA.accessToken));
      expectForbiddenOrNotFound(res.status);
    });
  });
});

// ── 2. Roles (OWNER vs MEMBER) ─────────────────────────────────────────────────

describe('Autorización — Roles', () => {
  let familyId: string;
  let member: TestUser;

  beforeEach(async () => {
    // uA es OWNER; creamos un MEMBER fresco y lo unimos a la familia de uA.
    familyId = await makeFamily(uA.accessToken, 'Familia con MEMBER');
    member = await createTestUser();
    await joinFamily(uA.accessToken, member.accessToken, familyId);
  });

  afterAll(async () => {
    if (member) await deleteTestUser(member.userId);
  });

  it('un MEMBER (no OWNER) no puede generar PIN de unión → 403', async () => {
    // POST /families/:id/join-pins está anotado con @Roles('OWNER').
    const res = await request(server)
      .post(`/api/v1/families/${familyId}/join-pins`)
      .set(auth(member.accessToken));
    expect(res.status).toBe(403);
  });

  it('un MEMBER (no OWNER) no puede revocar el PIN activo → 403', async () => {
    const res = await request(server)
      .delete(`/api/v1/families/${familyId}/join-pins/active`)
      .set(auth(member.accessToken));
    expect(res.status).toBe(403);
  });

  it('un MEMBER sí puede listar los miembros (acción no restringida a OWNER) → 200', async () => {
    // Contraste: confirma que el 403 anterior es por ROL y no por pertenencia.
    const res = await request(server)
      .get(`/api/v1/families/${familyId}/members`)
      .set(auth(member.accessToken));
    expect(res.status).toBe(200);
  });
});

// ── 3. Pareja (CoupleScopeGuard) ───────────────────────────────────────────────

describe('Autorización — Pareja', () => {
  let familyId: string;
  let partner: TestUser;
  let memberOutsideCouple: TestUser;
  let coupleId: string;

  beforeEach(async () => {
    // uA + partner forman la pareja; memberOutsideCouple es de la MISMA familia
    // pero NO de la pareja (debe seguir recibiendo 403: privacidad del rincón).
    familyId = await makeFamily(uA.accessToken, 'Familia con pareja');
    [partner, memberOutsideCouple] = await Promise.all([createTestUser(), createTestUser()]);
    await joinFamily(uA.accessToken, partner.accessToken, familyId);
    await joinFamily(uA.accessToken, memberOutsideCouple.accessToken, familyId);

    const coupleRes = await request(server)
      .post(`/api/v1/families/${familyId}/couple`)
      .set(auth(uA.accessToken))
      .send({ partnerUserId: partner.userId });
    expect(coupleRes.status).toBe(201);
    coupleId = (coupleRes.body as { id: string }).id;
  });

  afterAll(async () => {
    await Promise.all([
      partner ? deleteTestUser(partner.userId) : Promise.resolve(),
      memberOutsideCouple ? deleteTestUser(memberOutsideCouple.userId) : Promise.resolve(),
    ]);
  });

  it('un miembro de la familia que NO es de la pareja no ve las notas → 403', async () => {
    const res = await request(server)
      .get(`/api/v1/couples/${coupleId}/notes`)
      .set(auth(memberOutsideCouple.accessToken));
    expect(res.status).toBe(403);
  });

  it('un miembro de la familia que NO es de la pareja no puede crear notas → 403', async () => {
    const res = await request(server)
      .post(`/api/v1/couples/${coupleId}/notes`)
      .set(auth(memberOutsideCouple.accessToken))
      .send({ body: 'Cotilleo ajeno' });
    expect(res.status).toBe(403);
  });

  it('un usuario totalmente ajeno tampoco accede a las notas → 403', async () => {
    const res = await request(server)
      .get(`/api/v1/couples/${coupleId}/notes`)
      .set(auth(uB.accessToken));
    expect(res.status).toBe(403);
  });

  it('un miembro de la pareja sí accede a sus notas → 200 (contraste)', async () => {
    const res = await request(server)
      .get(`/api/v1/couples/${coupleId}/notes`)
      .set(auth(partner.accessToken));
    expect(res.status).toBe(200);
  });
});

// ── 4. Negativos de validación (whitelist + regresión de fixes) ─────────────────

describe('Negativos — Validación de contrato (400)', () => {
  let familyId: string;

  beforeEach(async () => {
    familyId = await makeFamily(uA.accessToken, 'Familia validación');
  });

  describe('social: POST /friends/redeem', () => {
    it('code con caracteres ambiguos (I/L/O/U) → 400 (regresión del fix del DTO)', async () => {
      // El alfabeto Crockford Base32 EXCLUYE I, L, O, U. El @Matches del DTO
      // los rechaza ANTES de llegar al caso de uso. Antes del fix esto pasaba
      // el DTO y se normalizaba dentro del dominio.
      const res = await request(server)
        .post('/api/v1/friends/redeem')
        .set(auth(uA.accessToken))
        .send({ code: 'ILOUABCD', familyId });
      expect(res.status).toBe(400);
    });

    it('familyId no-UUID → 400', async () => {
      const res = await request(server)
        .post('/api/v1/friends/redeem')
        .set(auth(uA.accessToken))
        .send({ code: 'ABCDEFGH', familyId: 'no-es-un-uuid' });
      expect(res.status).toBe(400);
    });

    it('code con longitud distinta de 8 → 400', async () => {
      const res = await request(server)
        .post('/api/v1/friends/redeem')
        .set(auth(uA.accessToken))
        .send({ code: 'ABCD', familyId });
      expect(res.status).toBe(400);
    });

    it('propiedad no declarada en el body → 400 (forbidNonWhitelisted)', async () => {
      const res = await request(server)
        .post('/api/v1/friends/redeem')
        .set(auth(uA.accessToken))
        .send({ code: 'ABCDEFGH', familyId, hackeame: true });
      expect(res.status).toBe(400);
    });
  });

  describe('fridge: POST /families/:familyId/fridge', () => {
    it('quantity negativa ("-5") → 400 (regresión del fix de cantidad)', async () => {
      // El DTO valida quantity con @Matches(/^\d+(\.\d+)?$/): los negativos no
      // encajan y la ValidationPipe responde 400 antes del dominio.
      const res = await request(server)
        .post(`/api/v1/families/${familyId}/fridge`)
        .set(auth(uA.accessToken))
        .send({ name: 'Cantidad inválida', quantity: '-5' });
      expect(res.status).toBe(400);
    });

    it('name vacío → 400', async () => {
      const res = await request(server)
        .post(`/api/v1/families/${familyId}/fridge`)
        .set(auth(uA.accessToken))
        .send({ name: '' });
      expect(res.status).toBe(400);
    });

    it('propiedad no declarada en el body → 400 (forbidNonWhitelisted)', async () => {
      const res = await request(server)
        .post(`/api/v1/families/${familyId}/fridge`)
        .set(auth(uA.accessToken))
        .send({ name: 'Leche', propiedadFantasma: 123 });
      expect(res.status).toBe(400);
    });
  });

  describe('whitelist genérica en otros contextos', () => {
    it('POST /families con propiedad no declarada → 400', async () => {
      const res = await request(server)
        .post('/api/v1/families')
        .set(auth(uA.accessToken))
        .send({ name: 'Familia', noDeberiaExistir: 'x' });
      expect(res.status).toBe(400);
    });

    it('POST /families/:familyId/plans con propiedad no declarada → 400', async () => {
      const res = await request(server)
        .post(`/api/v1/families/${familyId}/plans`)
        .set(auth(uA.accessToken))
        .send({ title: 'Plan', extra: 'x' });
      expect(res.status).toBe(400);
    });
  });
});

// ── 5. Transiciones de estado y reglas de dominio (409/422) ─────────────────────

describe('Negativos — Estado y dominio', () => {
  describe('fridge: eat con amount > quantity → 409', () => {
    let familyId: string;

    beforeEach(async () => {
      familyId = await makeFamily(uA.accessToken, 'Familia eat');
    });

    it('consumir más de lo disponible devuelve InsufficientQuantity (409)', async () => {
      const itemId = await makeFridgeItem(uA.accessToken, familyId, '2');
      const res = await request(server)
        .post(`/api/v1/fridge-items/${itemId}/eat`)
        .set(auth(uA.accessToken))
        .send({ amount: '5' });
      expect(res.status).toBe(409);
      expect((res.body as { error: string }).error).toBe('FRIDGE_ITEM_INSUFFICIENT_QUANTITY');
    });
  });

  describe('plans: compartir un plan ya compartido → 422', () => {
    let ownerA: TestUser;
    let ownerB: TestUser;
    let familyAId: string;
    let familyBId: string;
    let planId: string;

    beforeEach(async () => {
      // Dos familias AMIGAS y un plan de A compartido con B una vez.
      [ownerA, ownerB] = await Promise.all([createTestUser(), createTestUser()]);
      [familyAId, familyBId] = await Promise.all([
        makeFamily(ownerA.accessToken, 'Familia comparte A'),
        makeFamily(ownerB.accessToken, 'Familia comparte B'),
      ]);

      const inviteRes = await request(server)
        .post(`/api/v1/families/${familyAId}/friend-invites`)
        .set(auth(ownerA.accessToken));
      const code = (inviteRes.body as { code: string }).code;
      await request(server)
        .post('/api/v1/friends/redeem')
        .set(auth(ownerB.accessToken))
        .send({ code, familyId: familyBId });

      const planRes = await request(server)
        .post(`/api/v1/families/${familyAId}/plans`)
        .set(auth(ownerA.accessToken))
        .send({ title: 'Plan a compartir dos veces' });
      planId = (planRes.body as { id: string }).id;

      const firstShare = await request(server)
        .post(`/api/v1/plans/${planId}/share`)
        .set(auth(ownerA.accessToken))
        .send({ familyId: familyBId });
      expect(firstShare.status).toBe(201);
    });

    afterAll(async () => {
      await Promise.all([
        ownerA ? deleteTestUser(ownerA.userId) : Promise.resolve(),
        ownerB ? deleteTestUser(ownerB.userId) : Promise.resolve(),
      ]);
    });

    it('segundo share con la misma familia → 422 (PlanAlreadyShared)', async () => {
      const res = await request(server)
        .post(`/api/v1/plans/${planId}/share`)
        .set(auth(ownerA.accessToken))
        .send({ familyId: familyBId });
      expect(res.status).toBe(422);
      expect((res.body as { error: string }).error).toBe('PLAN_ALREADY_SHARED');
    });
  });
});
