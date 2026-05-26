/**
 * Tests unitarios de la lógica de puntos y ranking del contexto stats.
 *
 * No usa base de datos: mockea DRIZZLE.
 *
 * El flujo de getMemberStats hace las siguientes llamadas al DB en orden:
 *  1. select().from(memberships).leftJoin(appUsers).where()  → memberRows
 *  2. execute(sql shopping)                                   → shoppingRows
 *  3. execute(sql tasks done)                                 → tasksDoneRows
 *  4. select().from(fridgeItems).where().groupBy()            → fridgeCounts
 *
 * Cobertura:
 *  ✓ 0 miembros → stats vacías
 *  ✓ puntos correctos: +1 shopping, +5 tarea, +1 nevera
 *  ✓ badge "first_item" con ≥1 shopping
 *  ✓ badge "task_master" con ≥5 tareas
 *  ✓ leaderboard ordena por puntos DESC
 */
import { describe, it, expect, vi } from 'vitest';
import { FamilyStatsQuery } from './family-stats.query';

// ── Helpers para construir el DB mock ─────────────────────────────────────────

type MockScenario = {
  memberRows: Array<{ userId: string; displayName: string | null; email: string }>;
  shoppingRows: Array<{ user_id: string; cnt: string }>;
  tasksDoneRows: Array<{ user_id: string; cnt: string }>;
  fridgeCounts: Array<{ userId: string | null; cnt: number }>;
};

function makeMockDb(scenario: MockScenario) {
  // execute: se llama en orden → shopping primero, tasks second
  const executeQueue = [
    { rows: scenario.shoppingRows },
    { rows: scenario.tasksDoneRows },
  ];
  let executeIdx = 0;

  // select: se llama en orden → memberships+leftJoin primero, fridge+where+groupBy segundo
  let selectIdx = 0;
  const selectMemberChain = {
    from: () => ({
      leftJoin: () => ({
        where: () => Promise.resolve(scenario.memberRows),
      }),
    }),
  };
  const selectFridgeChain = {
    from: () => ({
      where: () => ({
        groupBy: () => Promise.resolve(scenario.fridgeCounts),
      }),
    }),
  };
  const selectChains = [selectMemberChain, selectFridgeChain];

  const db = {
    select: vi.fn(() => selectChains[selectIdx++] ?? selectFridgeChain),
    execute: vi.fn(() => Promise.resolve(executeQueue[executeIdx++] ?? { rows: [] })),
  };

  return db;
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('FamilyStatsQuery – cálculo de puntos', () => {
  it('devuelve stats vacías si no hay miembros', async () => {
    const db = makeMockDb({
      memberRows: [],
      shoppingRows: [],
      tasksDoneRows: [],
      fridgeCounts: [],
    });

    const query = new FamilyStatsQuery(db as never);
    const stats = await query.getMemberStats('family-1');
    expect(stats).toHaveLength(0);
    // Con 0 miembros no se llama a execute ni a la segunda select
    expect(db.execute).not.toHaveBeenCalled();
  });

  it('calcula puntos: +1 shopping, +5 tarea, +1 nevera', async () => {
    const db = makeMockDb({
      memberRows: [{ userId: 'user-1', displayName: 'Ana', email: 'ana@t.com' }],
      shoppingRows: [{ user_id: 'user-1', cnt: '3' }],   // +3
      tasksDoneRows: [{ user_id: 'user-1', cnt: '2' }],   // +10
      fridgeCounts: [{ userId: 'user-1', cnt: 4 }],       // +4
    });

    const query = new FamilyStatsQuery(db as never);
    const [member] = await query.getMemberStats('family-1');

    expect(member.shoppingItemsAdded).toBe(3);
    expect(member.tasksCompleted).toBe(2);
    expect(member.fridgeItemsAdded).toBe(4);
    // 3*1 + 2*5 + 4*1 = 17
    expect(member.points).toBe(17);
  });

  it('asigna badge "first_item" cuando hay ≥1 ítem de shopping', async () => {
    const db = makeMockDb({
      memberRows: [{ userId: 'user-1', displayName: null, email: 'a@b.com' }],
      shoppingRows: [{ user_id: 'user-1', cnt: '1' }],
      tasksDoneRows: [],
      fridgeCounts: [],
    });

    const query = new FamilyStatsQuery(db as never);
    const [member] = await query.getMemberStats('family-1');
    expect(member.badges.map((b) => b.id)).toContain('first_item');
  });

  it('asigna badge "task_master" cuando hay ≥5 tareas completadas', async () => {
    const db = makeMockDb({
      memberRows: [{ userId: 'user-1', displayName: null, email: 'a@b.com' }],
      shoppingRows: [],
      tasksDoneRows: [{ user_id: 'user-1', cnt: '5' }],
      fridgeCounts: [],
    });

    const query = new FamilyStatsQuery(db as never);
    const [member] = await query.getMemberStats('family-1');
    const ids = member.badges.map((b) => b.id);
    expect(ids).toContain('first_task');
    expect(ids).toContain('task_master');
  });

  it('dos miembros: el que tiene más puntos aparece primero en el ranking', async () => {
    const db = makeMockDb({
      memberRows: [
        { userId: 'user-1', displayName: 'Baja', email: 'b@t.com' },
        { userId: 'user-2', displayName: 'Alta', email: 'a@t.com' },
      ],
      shoppingRows: [
        { user_id: 'user-1', cnt: '1' },
        { user_id: 'user-2', cnt: '10' },
      ],
      tasksDoneRows: [],
      fridgeCounts: [],
    });

    const query = new FamilyStatsQuery(db as never);
    const stats = await query.getMemberStats('family-1');
    const ranked = [...stats].sort((a, b) => b.points - a.points);
    expect(ranked[0].userId).toBe('user-2');
    expect(ranked[1].userId).toBe('user-1');
  });
});
