/**
 * Tests unitarios del aggregate Routine y de la ventana horaria.
 *
 * Cobertura:
 *  ✓ computeDurationMinutes: ventana normal, cruce de medianoche, inicio == fin
 *  ✓ create valida startDate (formato y fecha real) y deriva endDate (+6)
 *  ✓ setSelections deduplica, conserva el snapshot del target de los items que
 *    siguen y elimina en cascada asignaciones e incidencias de los quitados
 *  ✓ addAssignment exige item seleccionado, dayIndex 0..6 y unicidad item+día
 *  ✓ updateAssignment mueve de día, detecta duplicados y no deja encoger la
 *    ventana por debajo de los minutos perdidos registrados
 *  ✓ removeAssignment cascada las incidencias
 *  ✓ addIncident valida asignación, descripción y rango de lostMinutes
 *  ✓ removeIncident
 */
import { describe, expect, it } from 'vitest';
import { Routine, addDaysYMD } from './routine';
import { computeDurationMinutes } from './time-window';
import {
  DayIndexOutOfRangeError,
  DuplicateAssignmentError,
  IncidentDescriptionEmptyError,
  InvalidRoutineDateError,
  InvalidTimeWindowError,
  ItemNotSelectedError,
  LostMinutesExceedPlannedError,
  RoutineAssignmentNotFoundError,
  RoutineIncidentNotFoundError,
} from './routine.errors';

const NOW = new Date('2026-07-13T10:00:00Z');

function makeRoutine(overrides?: Partial<Parameters<typeof Routine.create>[0]>) {
  return Routine.create({
    id: 'routine-1',
    familyId: 'fam-1',
    startDate: '2026-07-14', // martes → lunes
    createdBy: 'user-1',
    now: NOW,
    ...overrides,
  });
}

/** Rutina con el item TL seleccionado (target 2) y una asignación con incidencia. */
function makeRoutineWithAssignment() {
  const routine = makeRoutine();
  routine.setSelections([{ routineItemId: 'item-tl', targetTimesPerWeek: 2 }], NOW);
  routine.addAssignment(
    { id: 'asg-1', routineItemId: 'item-tl', dayIndex: 0, startTime: '18:00', endTime: '20:00' },
    NOW,
  );
  return routine;
}

describe('computeDurationMinutes', () => {
  it('calcula una ventana normal', () => {
    expect(computeDurationMinutes('09:00', '14:00')).toBe(300);
  });

  it('calcula el cruce de medianoche', () => {
    expect(computeDurationMinutes('22:00', '12:00')).toBe(840);
  });

  it('lanza InvalidTimeWindowError con inicio == fin o formato inválido', () => {
    expect(() => computeDurationMinutes('09:00', '09:00')).toThrow(InvalidTimeWindowError);
    expect(() => computeDurationMinutes('24:00', '10:00')).toThrow(InvalidTimeWindowError);
  });
});

describe('Routine.create', () => {
  it('deriva endDate como startDate + 6, cruzando mes', () => {
    const routine = makeRoutine({ startDate: '2026-07-29' });
    expect(routine.endDate).toBe('2026-08-04');
    expect(routine.dateOfDay(2)).toBe('2026-07-31');
  });

  it('lanza InvalidRoutineDateError con fechas inválidas', () => {
    expect(() => makeRoutine({ startDate: '2026-02-30' })).toThrow(InvalidRoutineDateError);
    expect(() => makeRoutine({ startDate: 'no-fecha' })).toThrow(InvalidRoutineDateError);
  });

  it('normaliza el nombre vacío a null', () => {
    expect(makeRoutine({ name: '   ' }).name).toBeNull();
  });
});

describe('addDaysYMD', () => {
  it('cruza el fin de año sin efectos de zona horaria', () => {
    expect(addDaysYMD('2026-12-29', 6)).toBe('2027-01-04');
  });
});

describe('Routine.setSelections', () => {
  it('deduplica y conserva el snapshot del target de los items que siguen', () => {
    const routine = makeRoutine();
    routine.setSelections([{ routineItemId: 'item-tl', targetTimesPerWeek: 2 }], NOW);
    // El catálogo cambió a 5, pero el snapshot de la rutina se conserva.
    routine.setSelections(
      [
        { routineItemId: 'item-tl', targetTimesPerWeek: 5 },
        { routineItemId: 'item-tl', targetTimesPerWeek: 5 },
        { routineItemId: 'item-tf', targetTimesPerWeek: 3 },
      ],
      NOW,
    );
    expect(routine.selections).toEqual([
      { routineItemId: 'item-tl', targetTimesPerWeek: 2 },
      { routineItemId: 'item-tf', targetTimesPerWeek: 3 },
    ]);
  });

  it('elimina en cascada asignaciones e incidencias de los items quitados', () => {
    const routine = makeRoutineWithAssignment();
    routine.addIncident({
      id: 'inc-1',
      assignmentId: 'asg-1',
      description: 'No se hizo',
      createdBy: 'user-1',
      now: NOW,
    });
    routine.setSelections([{ routineItemId: 'item-otro', targetTimesPerWeek: 1 }], NOW);
    expect(routine.assignments).toEqual([]);
    expect(routine.incidents).toEqual([]);
  });
});

describe('Routine.addAssignment', () => {
  it('calcula la duración (incluido el cruce de medianoche)', () => {
    const routine = makeRoutineWithAssignment();
    const created = routine.addAssignment(
      { id: 'asg-2', routineItemId: 'item-tl', dayIndex: 3, startTime: '22:00', endTime: '12:00' },
      NOW,
    );
    expect(created.durationMinutes).toBe(840);
    expect(routine.assignedCountOf('item-tl')).toBe(2);
  });

  it('lanza ItemNotSelectedError si el item no está seleccionado', () => {
    const routine = makeRoutine();
    expect(() =>
      routine.addAssignment(
        { id: 'asg-1', routineItemId: 'item-x', dayIndex: 0, startTime: '09:00', endTime: '10:00' },
        NOW,
      ),
    ).toThrow(ItemNotSelectedError);
  });

  it('lanza DayIndexOutOfRangeError fuera de 0..6', () => {
    const routine = makeRoutineWithAssignment();
    expect(() =>
      routine.addAssignment(
        { id: 'asg-2', routineItemId: 'item-tl', dayIndex: 7, startTime: '09:00', endTime: '10:00' },
        NOW,
      ),
    ).toThrow(DayIndexOutOfRangeError);
  });

  it('lanza DuplicateAssignmentError si el item ya está en ese día', () => {
    const routine = makeRoutineWithAssignment();
    expect(() =>
      routine.addAssignment(
        { id: 'asg-2', routineItemId: 'item-tl', dayIndex: 0, startTime: '10:00', endTime: '11:00' },
        NOW,
      ),
    ).toThrow(DuplicateAssignmentError);
  });
});

describe('Routine.updateAssignment', () => {
  it('mueve la asignación de día y recalcula la duración', () => {
    const routine = makeRoutineWithAssignment();
    const updated = routine.updateAssignment(
      'asg-1',
      { dayIndex: 4, startTime: '18:30' },
      NOW,
    );
    expect(updated.dayIndex).toBe(4);
    expect(updated.durationMinutes).toBe(90);
  });

  it('lanza DuplicateAssignmentError al mover sobre un día ya ocupado por el item', () => {
    const routine = makeRoutineWithAssignment();
    routine.addAssignment(
      { id: 'asg-2', routineItemId: 'item-tl', dayIndex: 1, startTime: '18:00', endTime: '20:00' },
      NOW,
    );
    expect(() => routine.updateAssignment('asg-2', { dayIndex: 0 }, NOW)).toThrow(
      DuplicateAssignmentError,
    );
  });

  it('no deja encoger la ventana por debajo de los minutos perdidos', () => {
    const routine = makeRoutineWithAssignment();
    routine.addIncident({
      id: 'inc-1',
      assignmentId: 'asg-1',
      description: 'Salida antes de tiempo',
      lostMinutes: 100,
      createdBy: 'user-1',
      now: NOW,
    });
    expect(() =>
      routine.updateAssignment('asg-1', { startTime: '19:00', endTime: '20:00' }, NOW),
    ).toThrow(LostMinutesExceedPlannedError);
  });

  it('lanza RoutineAssignmentNotFoundError si no existe', () => {
    const routine = makeRoutine();
    expect(() => routine.updateAssignment('nope', { dayIndex: 1 }, NOW)).toThrow(
      RoutineAssignmentNotFoundError,
    );
  });
});

describe('Routine.removeAssignment', () => {
  it('elimina la asignación y sus incidencias en cascada', () => {
    const routine = makeRoutineWithAssignment();
    routine.addIncident({
      id: 'inc-1',
      assignmentId: 'asg-1',
      description: 'No se hizo',
      createdBy: 'user-1',
      now: NOW,
    });
    routine.removeAssignment('asg-1', NOW);
    expect(routine.assignments).toEqual([]);
    expect(routine.incidents).toEqual([]);
  });
});

describe('Routine.addIncident', () => {
  it('registra la incidencia con lostMinutes dentro del rango', () => {
    const routine = makeRoutineWithAssignment();
    const incident = routine.addIncident({
      id: 'inc-1',
      assignmentId: 'asg-1',
      description: '  Recogida del niño  ',
      lostMinutes: 120,
      createdBy: 'user-1',
      now: NOW,
    });
    expect(incident.description).toBe('Recogida del niño');
    expect(incident.lostMinutes).toBe(120);
  });

  it('lanza LostMinutesExceedPlannedError si supera la duración', () => {
    const routine = makeRoutineWithAssignment();
    expect(() =>
      routine.addIncident({
        id: 'inc-1',
        assignmentId: 'asg-1',
        description: 'Demasiado',
        lostMinutes: 121,
        createdBy: 'user-1',
        now: NOW,
      }),
    ).toThrow(LostMinutesExceedPlannedError);
  });

  it('lanza IncidentDescriptionEmptyError con descripción vacía', () => {
    const routine = makeRoutineWithAssignment();
    expect(() =>
      routine.addIncident({
        id: 'inc-1',
        assignmentId: 'asg-1',
        description: '   ',
        createdBy: 'user-1',
        now: NOW,
      }),
    ).toThrow(IncidentDescriptionEmptyError);
  });

  it('lanza RoutineAssignmentNotFoundError si la asignación no existe', () => {
    const routine = makeRoutine();
    expect(() =>
      routine.addIncident({
        id: 'inc-1',
        assignmentId: 'nope',
        description: 'x',
        createdBy: 'user-1',
        now: NOW,
      }),
    ).toThrow(RoutineAssignmentNotFoundError);
  });
});

describe('Routine.removeIncident', () => {
  it('elimina la incidencia', () => {
    const routine = makeRoutineWithAssignment();
    routine.addIncident({
      id: 'inc-1',
      assignmentId: 'asg-1',
      description: 'No se hizo',
      createdBy: 'user-1',
      now: NOW,
    });
    routine.removeIncident('inc-1', NOW);
    expect(routine.incidents).toEqual([]);
  });

  it('lanza RoutineIncidentNotFoundError si no existe', () => {
    const routine = makeRoutine();
    expect(() => routine.removeIncident('nope', NOW)).toThrow(RoutineIncidentNotFoundError);
  });
});
