/**
 * Tests unitarios del aggregate RoutineItem.
 *
 * Cobertura:
 *  ✓ create recorta el nombre y normaliza tags (trim, sin vacíos, sin duplicados)
 *  ✓ Nombre vacío lanza RoutineItemNameEmptyError
 *  ✓ Objetivo fuera de 1..7 (o no entero) lanza InvalidTargetError
 *  ✓ Ventana horaria inválida (formato o inicio == fin) lanza InvalidTimeWindowError
 *  ✓ Ventana que cruza medianoche es válida
 *  ✓ update valida la ventana combinada al cambiar solo un extremo
 *  ✓ archive/restore alternan archivedAt y son idempotentes
 */
import { describe, expect, it } from 'vitest';
import { RoutineItem } from './routine-item';
import {
  InvalidTargetError,
  InvalidTimeWindowError,
  RoutineItemNameEmptyError,
} from './routine.errors';

const NOW = new Date('2026-07-13T10:00:00Z');

function makeItem(overrides?: Partial<Parameters<typeof RoutineItem.create>[0]>) {
  return RoutineItem.create({
    id: 'item-1',
    familyId: 'fam-1',
    name: 'Trabajo ☀️ Pablo',
    targetTimesPerWeek: 5,
    defaultStartTime: '09:00',
    defaultEndTime: '14:00',
    now: NOW,
    ...overrides,
  });
}

describe('RoutineItem.create', () => {
  it('recorta el nombre y normaliza los tags', () => {
    const item = makeItem({
      name: '  Trabajo ☀️ Pablo  ',
      tags: [' pablo ', 'pablo', '', 'trabajo'],
    });
    expect(item.name).toBe('Trabajo ☀️ Pablo');
    expect(item.tags).toEqual(['pablo', 'trabajo']);
  });

  it('lanza RoutineItemNameEmptyError si el nombre está vacío', () => {
    expect(() => makeItem({ name: '   ' })).toThrow(RoutineItemNameEmptyError);
  });

  it.each([0, 8, 2.5])('lanza InvalidTargetError con objetivo %s', (target) => {
    expect(() => makeItem({ targetTimesPerWeek: target })).toThrow(InvalidTargetError);
  });

  it('lanza InvalidTimeWindowError si el formato de hora no es válido', () => {
    expect(() => makeItem({ defaultStartTime: '25:00' })).toThrow(InvalidTimeWindowError);
    expect(() => makeItem({ defaultEndTime: '9:00' })).toThrow(InvalidTimeWindowError);
  });

  it('lanza InvalidTimeWindowError si inicio y fin coinciden', () => {
    expect(() =>
      makeItem({ defaultStartTime: '09:00', defaultEndTime: '09:00' }),
    ).toThrow(InvalidTimeWindowError);
  });

  it('acepta una ventana que cruza medianoche', () => {
    const item = makeItem({ defaultStartTime: '22:00', defaultEndTime: '12:00' });
    expect(item.defaultStartTime).toBe('22:00');
    expect(item.defaultEndTime).toBe('12:00');
  });
});

describe('RoutineItem.update', () => {
  it('valida la ventana combinada al cambiar solo el fin', () => {
    const item = makeItem();
    expect(() => item.update({ defaultEndTime: '09:00' }, NOW)).toThrow(InvalidTimeWindowError);
    item.update({ defaultEndTime: '13:00' }, NOW);
    expect(item.defaultEndTime).toBe('13:00');
    expect(item.defaultStartTime).toBe('09:00');
  });

  it('actualiza el objetivo y los tags', () => {
    const item = makeItem();
    item.update({ targetTimesPerWeek: 2, tags: ['laura'] }, NOW);
    expect(item.targetTimesPerWeek).toBe(2);
    expect(item.tags).toEqual(['laura']);
  });
});

describe('RoutineItem archive/restore', () => {
  it('archiva y restaura de forma idempotente', () => {
    const item = makeItem();
    expect(item.isArchived).toBe(false);
    item.archive(NOW);
    expect(item.isArchived).toBe(true);
    expect(item.archivedAt).toEqual(NOW);
    item.archive(new Date('2026-07-14T10:00:00Z'));
    expect(item.archivedAt).toEqual(NOW);
    item.restore(NOW);
    expect(item.isArchived).toBe(false);
    expect(item.archivedAt).toBeNull();
  });
});
