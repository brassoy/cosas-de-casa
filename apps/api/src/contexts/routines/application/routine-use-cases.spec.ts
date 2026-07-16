/**
 * Tests unitarios de los casos de uso del contexto routines.
 *
 * Usan fakes en memoria de los ports (sin Nest ni BD), instanciando los use
 * cases por constructor. Cobertura:
 *  ✓ CreateRoutineUseCase: selección con snapshot del target del catálogo
 *  ✓ CreateRoutineUseCase: solape → RoutineOverlapError
 *  ✓ CreateRoutineUseCase: item archivado / de otra familia → error
 *  ✓ CreateRoutineUseCase: duplicado copia selección+asignaciones (ids nuevos,
 *    sin incidencias); rutina origen de otra familia → RoutineNotFoundError
 *  ✓ DeleteRoutineItemUseCase: archiva si está referenciado, borra si no
 *  ✓ SetRoutineItemsUseCase: conserva snapshots, rechaza archivados nuevos y
 *    permite que un archivado ya seleccionado siga
 *  ✓ CreateAssignmentUseCase: ventana por defecto del item / explícita
 *  ✓ GetRoutineSummaryUseCase: 2×(09:00–14:00) = 600 min, incidencia de 120
 *    descuenta, agregado por tag y cumplimiento
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { Routine } from '../domain/routine';
import { RoutineItem } from '../domain/routine-item';
import {
  RoutineItemArchivedError,
  RoutineItemNotFoundError,
  RoutineNotFoundError,
  RoutineOverlapError,
} from '../domain/routine.errors';
import type { RoutineItemRepository } from '../domain/ports/routine-item.repository';
import type { ListRoutinesFilter, RoutineRepository } from '../domain/ports/routine.repository';
import type { RoutinesClock } from './ports/clock';
import type { RoutinesIdGenerator } from './ports/id-generator';
import { CreateRoutineItemUseCase } from './create-routine-item.use-case';
import { DeleteRoutineItemUseCase } from './delete-routine-item.use-case';
import { CreateRoutineUseCase } from './create-routine.use-case';
import { SetRoutineItemsUseCase } from './set-routine-items.use-case';
import { CreateAssignmentUseCase } from './create-assignment.use-case';
import { CreateIncidentUseCase } from './create-incident.use-case';
import { GetRoutineSummaryUseCase } from './get-routine-summary.use-case';

const NOW = new Date('2026-07-13T10:00:00Z');

let items: RoutineItem[] = [];
let routines: Routine[] = [];
let referencedItemIds: Set<string>;
let idCounter = 0;

const fakeClock: RoutinesClock = { now: () => NOW };
const fakeIds: RoutinesIdGenerator = { generate: () => `id-${++idCounter}` };

const fakeItemRepo: RoutineItemRepository = {
  async create(item) { items.push(item); },
  async findById(itemId) { return items.find((i) => i.id === itemId) ?? null; },
  async findByFamily(familyId, opts) {
    return items.filter(
      (i) => i.familyId === familyId && (opts?.includeArchived || !i.isArchived),
    );
  },
  async findByIds(itemIds) { return items.filter((i) => itemIds.includes(i.id)); },
  async update() { /* las instancias se mutan en memoria */ },
  async deleteById(itemId) { items = items.filter((i) => i.id !== itemId); },
  async isReferenced(itemId) { return referencedItemIds.has(itemId); },
};

function daysBetween(a: string, b: string): number {
  return Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000;
}

const fakeRoutineRepo: RoutineRepository = {
  async create(routine) { routines.push(routine); },
  async findById(routineId) { return routines.find((r) => r.id === routineId) ?? null; },
  async findByFamily(familyId: string, _filter?: ListRoutinesFilter) {
    return routines.filter((r) => r.familyId === familyId);
  },
  async findOverlapping(familyId, startDate, excludeRoutineId) {
    return (
      routines.find(
        (r) =>
          r.familyId === familyId &&
          r.id !== excludeRoutineId &&
          daysBetween(r.startDate, startDate) <= 6,
      ) ?? null
    );
  },
  async save() { /* las instancias se mutan en memoria */ },
  async deleteById(routineId) { routines = routines.filter((r) => r.id !== routineId); },
};

function makeUseCases() {
  return {
    createItem: new CreateRoutineItemUseCase(fakeItemRepo, fakeClock, fakeIds),
    deleteItem: new DeleteRoutineItemUseCase(fakeItemRepo, fakeClock),
    createRoutine: new CreateRoutineUseCase(fakeRoutineRepo, fakeItemRepo, fakeClock, fakeIds),
    setItems: new SetRoutineItemsUseCase(fakeRoutineRepo, fakeItemRepo, fakeClock),
    createAssignment: new CreateAssignmentUseCase(
      fakeRoutineRepo, fakeItemRepo, fakeClock, fakeIds,
    ),
    createIncident: new CreateIncidentUseCase(fakeRoutineRepo, fakeClock, fakeIds),
    getSummary: new GetRoutineSummaryUseCase(fakeRoutineRepo, fakeItemRepo),
  };
}

function seedItem(overrides?: Partial<Parameters<typeof RoutineItem.create>[0]>): RoutineItem {
  const item = RoutineItem.create({
    id: `item-${++idCounter}`,
    familyId: 'fam-1',
    name: 'Trabajo ☀️ Pablo',
    targetTimesPerWeek: 5,
    defaultStartTime: '09:00',
    defaultEndTime: '14:00',
    tags: ['pablo'],
    now: NOW,
    ...overrides,
  });
  items.push(item);
  return item;
}

beforeEach(() => {
  items = [];
  routines = [];
  referencedItemIds = new Set();
  idCounter = 0;
});

describe('CreateRoutineUseCase', () => {
  it('selecciona items con snapshot del target del catálogo', async () => {
    const { createRoutine } = makeUseCases();
    const item = seedItem();
    const routine = await createRoutine.execute({
      familyId: 'fam-1',
      startDate: '2026-07-14',
      itemIds: [item.id],
      createdBy: 'user-1',
    });
    expect(routine.selections).toEqual([
      { routineItemId: item.id, targetTimesPerWeek: 5 },
    ]);
    expect(routines).toHaveLength(1);
  });

  it('lanza RoutineOverlapError si otra rutina solapa la semana', async () => {
    const { createRoutine } = makeUseCases();
    await createRoutine.execute({
      familyId: 'fam-1', startDate: '2026-07-14', createdBy: 'user-1',
    });
    await expect(
      createRoutine.execute({
        familyId: 'fam-1', startDate: '2026-07-20', createdBy: 'user-1',
      }),
    ).rejects.toThrow(RoutineOverlapError);
    // La semana siguiente exacta (+7) sí es válida.
    await createRoutine.execute({
      familyId: 'fam-1', startDate: '2026-07-21', createdBy: 'user-1',
    });
    expect(routines).toHaveLength(2);
  });

  it('lanza RoutineItemArchivedError al seleccionar un item archivado', async () => {
    const { createRoutine } = makeUseCases();
    const item = seedItem();
    item.archive(NOW);
    await expect(
      createRoutine.execute({
        familyId: 'fam-1', startDate: '2026-07-14', itemIds: [item.id], createdBy: 'user-1',
      }),
    ).rejects.toThrow(RoutineItemArchivedError);
  });

  it('lanza RoutineItemNotFoundError con un item de otra familia', async () => {
    const { createRoutine } = makeUseCases();
    const foreign = seedItem({ familyId: 'fam-2' });
    await expect(
      createRoutine.execute({
        familyId: 'fam-1', startDate: '2026-07-14', itemIds: [foreign.id], createdBy: 'user-1',
      }),
    ).rejects.toThrow(RoutineItemNotFoundError);
  });

  it('duplica selección y asignaciones con ids nuevos, sin incidencias', async () => {
    const { createRoutine, createAssignment, createIncident } = makeUseCases();
    const item = seedItem();
    const source = await createRoutine.execute({
      familyId: 'fam-1', startDate: '2026-07-14', itemIds: [item.id], createdBy: 'user-1',
    });
    const { assignment } = await createAssignment.execute({
      routineId: source.id, routineItemId: item.id, dayIndex: 2,
    });
    await createIncident.execute({
      routineId: source.id, assignmentId: assignment.id,
      description: 'No se hizo', createdBy: 'user-1',
    });

    const copy = await createRoutine.execute({
      familyId: 'fam-1', startDate: '2026-07-21',
      duplicateFromRoutineId: source.id, createdBy: 'user-1',
    });
    expect(copy.selections).toEqual(source.selections);
    expect(copy.assignments).toHaveLength(1);
    expect(copy.assignments[0]!.id).not.toBe(assignment.id);
    expect(copy.assignments[0]).toMatchObject({
      routineItemId: item.id, dayIndex: 2, startTime: '09:00', endTime: '14:00',
    });
    expect(copy.incidents).toEqual([]);
  });

  it('lanza RoutineNotFoundError al duplicar una rutina de otra familia', async () => {
    const { createRoutine } = makeUseCases();
    const foreign = await createRoutine.execute({
      familyId: 'fam-2', startDate: '2026-07-14', createdBy: 'user-1',
    });
    await expect(
      createRoutine.execute({
        familyId: 'fam-1', startDate: '2026-07-14',
        duplicateFromRoutineId: foreign.id, createdBy: 'user-1',
      }),
    ).rejects.toThrow(RoutineNotFoundError);
  });
});

describe('DeleteRoutineItemUseCase', () => {
  it('archiva el item si alguna rutina lo referencia', async () => {
    const { deleteItem } = makeUseCases();
    const item = seedItem();
    referencedItemIds.add(item.id);
    const result = await deleteItem.execute({ itemId: item.id });
    expect(result.archived).toBe(true);
    expect(item.isArchived).toBe(true);
    expect(items).toHaveLength(1);
  });

  it('borra el item si nunca se usó', async () => {
    const { deleteItem } = makeUseCases();
    const item = seedItem();
    const result = await deleteItem.execute({ itemId: item.id });
    expect(result.archived).toBe(false);
    expect(items).toHaveLength(0);
  });
});

describe('SetRoutineItemsUseCase', () => {
  it('conserva el snapshot y permite que un archivado ya seleccionado siga', async () => {
    const { createRoutine, setItems } = makeUseCases();
    const item = seedItem({ targetTimesPerWeek: 2 });
    const routine = await createRoutine.execute({
      familyId: 'fam-1', startDate: '2026-07-14', itemIds: [item.id], createdBy: 'user-1',
    });
    // El catálogo cambia y el item se archiva después de seleccionarlo.
    item.update({ targetTimesPerWeek: 7 }, NOW);
    item.archive(NOW);

    const other = seedItem({ name: 'TL Laura', targetTimesPerWeek: 2, tags: ['laura'] });
    const updated = await setItems.execute({
      routineId: routine.id, itemIds: [item.id, other.id],
    });
    expect(updated.selections).toEqual([
      { routineItemId: item.id, targetTimesPerWeek: 2 }, // snapshot intacto
      { routineItemId: other.id, targetTimesPerWeek: 2 },
    ]);
  });

  it('rechaza añadir de nuevas un item archivado', async () => {
    const { createRoutine, setItems } = makeUseCases();
    const item = seedItem();
    item.archive(NOW);
    const routine = await createRoutine.execute({
      familyId: 'fam-1', startDate: '2026-07-14', createdBy: 'user-1',
    });
    await expect(
      setItems.execute({ routineId: routine.id, itemIds: [item.id] }),
    ).rejects.toThrow(RoutineItemArchivedError);
  });
});

describe('CreateAssignmentUseCase', () => {
  it('usa la ventana por defecto del item si no se indica', async () => {
    const { createRoutine, createAssignment } = makeUseCases();
    const item = seedItem({ defaultStartTime: '22:00', defaultEndTime: '12:00' });
    const routine = await createRoutine.execute({
      familyId: 'fam-1', startDate: '2026-07-14', itemIds: [item.id], createdBy: 'user-1',
    });
    const { assignment } = await createAssignment.execute({
      routineId: routine.id, routineItemId: item.id, dayIndex: 0,
    });
    expect(assignment).toMatchObject({
      startTime: '22:00', endTime: '12:00', durationMinutes: 840,
    });
  });

  it('respeta la ventana explícita', async () => {
    const { createRoutine, createAssignment } = makeUseCases();
    const item = seedItem();
    const routine = await createRoutine.execute({
      familyId: 'fam-1', startDate: '2026-07-14', itemIds: [item.id], createdBy: 'user-1',
    });
    const { assignment } = await createAssignment.execute({
      routineId: routine.id, routineItemId: item.id, dayIndex: 1,
      startTime: '18:00', endTime: '20:00',
    });
    expect(assignment.durationMinutes).toBe(120);
  });
});

describe('GetRoutineSummaryUseCase', () => {
  it('calcula tiempos, descuento por incidencias, tags y cumplimiento', async () => {
    const { createRoutine, createAssignment, createIncident, getSummary } = makeUseCases();
    const item = seedItem({ targetTimesPerWeek: 5 }); // 09:00–14:00 = 300 min, tag pablo
    const routine = await createRoutine.execute({
      familyId: 'fam-1', startDate: '2026-07-14', itemIds: [item.id], createdBy: 'user-1',
    });
    await createAssignment.execute({
      routineId: routine.id, routineItemId: item.id, dayIndex: 0,
    });
    const { assignment } = await createAssignment.execute({
      routineId: routine.id, routineItemId: item.id, dayIndex: 1,
    });
    await createIncident.execute({
      routineId: routine.id, assignmentId: assignment.id,
      description: 'Recogida del niño', lostMinutes: 120, createdBy: 'user-1',
    });

    const summary = await getSummary.execute({ routineId: routine.id });
    expect(summary.perItem).toEqual([
      {
        routineItemId: item.id,
        name: 'Trabajo ☀️ Pablo',
        tags: ['pablo'],
        targetTimesPerWeek: 5,
        assignedCount: 2,
        isCompliant: false,
        plannedMinutes: 600,
        lostMinutes: 120,
        actualMinutes: 480,
        incidentCount: 1,
      },
    ]);
    expect(summary.perTag).toEqual([
      { tag: 'pablo', plannedMinutes: 600, lostMinutes: 120, actualMinutes: 480, incidentCount: 1 },
    ]);
    expect(summary.totals).toEqual({
      plannedMinutes: 600,
      lostMinutes: 120,
      actualMinutes: 480,
      incidentCount: 1,
      complianceRate: 2 / 5,
    });
  });
});
