import { describe, it, expect, beforeEach } from 'vitest';
import { Routine } from '../domain/routine';
import type { RoutineItemRepository } from '../domain/ports/routine-item.repository';
import type {
  NewRoutineEvent,
  RoutineHistoryRepository,
} from './ports/routine-history.repository';
import { RoutineHistoryService } from './routine-history.service';

// ── Dobles de prueba ──────────────────────────────────────────────────────────

class FakeHistoryRepository implements RoutineHistoryRepository {
  events: NewRoutineEvent[] = [];
  async append(event: NewRoutineEvent): Promise<void> {
    this.events.push(event);
  }
  async list(): Promise<never[]> {
    return [];
  }
}

const NAMES: Record<string, string> = { 'item-1': 'Fregar', 'item-2': 'Barrer' };

// El servicio solo usa `id` y `name` de los items; devolvemos lo mínimo.
const itemRepo = {
  findByIds: async (ids: string[]) => ids.map((id) => ({ id, name: NAMES[id] ?? id })),
} as unknown as RoutineItemRepository;

const NOW = new Date('2026-01-01T10:00:00.000Z');
const ACTOR = 'user-1';

/** Rutina con un item seleccionado (para poder asignarlo). */
function baseRoutine(name?: string): Routine {
  const routine = Routine.create({
    id: 'routine-1',
    familyId: 'family-1',
    startDate: '2026-01-05', // lunes
    name,
    createdBy: ACTOR,
    now: NOW,
  });
  routine.setSelections([{ routineItemId: 'item-1', targetTimesPerWeek: 2 }], NOW);
  return routine;
}

describe('RoutineHistoryService — diff campo a campo', () => {
  let repo: FakeHistoryRepository;
  let service: RoutineHistoryService;

  beforeEach(() => {
    repo = new FakeHistoryRepository();
    service = new RoutineHistoryService(repo, itemRepo);
  });

  it('registra el renombrado de la rutina con el antes → después', async () => {
    const before = baseRoutine();
    const after = baseRoutine('Limpieza');

    await service.recordRoutineRenamed(before, after, ACTOR);

    expect(repo.events).toHaveLength(1);
    const event = repo.events[0]!;
    expect(event.entity).toBe('routine');
    expect(event.action).toBe('updated');
    expect(event.summary).toBe('Renombró la rutina');
    expect(event.changes).toEqual([{ label: 'Nombre', before: '—', after: 'Limpieza' }]);
    expect(event.createdBy).toBe(ACTOR);
  });

  it('no registra nada si el nombre no cambió', async () => {
    const before = baseRoutine('Igual');
    const after = baseRoutine('Igual');

    await service.recordRoutineRenamed(before, after, ACTOR);

    expect(repo.events).toHaveLength(0);
  });

  it('registra el movimiento de una asignación de día con el nombre del item', async () => {
    const before = baseRoutine();
    before.addAssignment(
      { id: 'asg-1', routineItemId: 'item-1', dayIndex: 0, startTime: '09:00', endTime: '10:00' },
      NOW,
    );
    const after = baseRoutine();
    after.addAssignment(
      { id: 'asg-1', routineItemId: 'item-1', dayIndex: 0, startTime: '09:00', endTime: '10:00' },
      NOW,
    );
    after.updateAssignment('asg-1', { dayIndex: 3 }, NOW); // lunes → jueves

    await service.recordAssignmentUpdated(before, after, 'asg-1', ACTOR);

    expect(repo.events).toHaveLength(1);
    const event = repo.events[0]!;
    expect(event.entity).toBe('assignment');
    expect(event.summary).toBe('Movió «Fregar» al jueves');
    expect(event.changes).toContainEqual({ label: 'Día', before: 'lunes', after: 'jueves' });
  });

  it('registra el diff de items añadidos y quitados', async () => {
    const before = baseRoutine(); // item-1
    const after = baseRoutine();
    after.setSelections([{ routineItemId: 'item-2', targetTimesPerWeek: 1 }], NOW); // item-1 → item-2

    await service.recordItemsChanged(before, after, ACTOR);

    expect(repo.events).toHaveLength(1);
    const event = repo.events[0]!;
    expect(event.entity).toBe('items');
    expect(event.changes).toContainEqual({ label: 'Añadidos', before: null, after: 'Barrer' });
    expect(event.changes).toContainEqual({ label: 'Quitados', before: 'Fregar', after: null });
  });

  it('registra la edición de la descripción de una incidencia', async () => {
    const before = baseRoutine();
    before.addAssignment(
      { id: 'asg-1', routineItemId: 'item-1', dayIndex: 0, startTime: '09:00', endTime: '10:00' },
      NOW,
    );
    before.addIncident({
      id: 'inc-1',
      assignmentId: 'asg-1',
      description: 'Se me olvidó',
      createdBy: ACTOR,
      now: NOW,
    });
    const after = baseRoutine();
    after.addAssignment(
      { id: 'asg-1', routineItemId: 'item-1', dayIndex: 0, startTime: '09:00', endTime: '10:00' },
      NOW,
    );
    after.addIncident({
      id: 'inc-1',
      assignmentId: 'asg-1',
      description: 'Se me olvidó',
      createdBy: ACTOR,
      now: NOW,
    });
    after.updateIncident('inc-1', { description: 'No pude hacerlo' }, NOW);

    await service.recordIncidentUpdated(before, after, 'inc-1', ACTOR);

    expect(repo.events).toHaveLength(1);
    const event = repo.events[0]!;
    expect(event.entity).toBe('incident');
    expect(event.summary).toBe('Editó una incidencia en «Fregar»');
    expect(event.changes).toContainEqual({
      label: 'Descripción',
      before: 'Se me olvidó',
      after: 'No pude hacerlo',
    });
  });
});
