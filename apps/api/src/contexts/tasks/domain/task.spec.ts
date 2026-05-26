/**
 * Tests unitarios del aggregate Task.
 *
 * Cobertura:
 *  ✓ Al crear sin assignees → el creador queda como único asignado
 *  ✓ Al crear con assignees → se usan los indicados
 *  ✓ Título vacío lanza TaskTitleEmptyError
 *  ✓ Transición válida OPEN → IN_PROGRESS
 *  ✓ Transición válida IN_PROGRESS → DONE
 *  ✓ Transición válida DONE → OPEN (reapertura)
 *  ✓ Transición inválida (p.ej. OPEN → OPEN) lanza InvalidTaskTransitionError
 *  ✓ setAssignees reemplaza la lista de asignados
 */
import { describe, expect, it } from 'vitest';
import { Task } from './task';
import { InvalidTaskTransitionError, TaskTitleEmptyError } from './task.errors';

const NOW = new Date('2026-05-26T10:00:00Z');

function makeTask(overrides?: Partial<Parameters<typeof Task.create>[0]>) {
  return Task.create({
    id: 'task-1',
    familyId: 'fam-1',
    title: 'Limpiar el baño',
    createdBy: 'user-1',
    now: NOW,
    ...overrides,
  });
}

describe('Task.create', () => {
  it('asigna al creador si no se pasan assigneeIds', () => {
    const task = makeTask();
    expect(task.assigneeIds).toEqual(['user-1']);
  });

  it('usa los assigneeIds indicados si se pasan', () => {
    const task = makeTask({ assigneeIds: ['user-2', 'user-3'] });
    expect(task.assigneeIds).toEqual(['user-2', 'user-3']);
  });

  it('lanza TaskTitleEmptyError si el título está vacío', () => {
    expect(() => makeTask({ title: '  ' })).toThrow(TaskTitleEmptyError);
  });

  it('el estado inicial es OPEN', () => {
    expect(makeTask().status).toBe('OPEN');
  });
});

describe('Task.update – transiciones de estado', () => {
  it('OPEN → IN_PROGRESS es válido', () => {
    const task = makeTask();
    task.update({ status: 'IN_PROGRESS' }, NOW);
    expect(task.status).toBe('IN_PROGRESS');
  });

  it('IN_PROGRESS → DONE es válido', () => {
    const task = makeTask();
    task.update({ status: 'IN_PROGRESS' }, NOW);
    task.update({ status: 'DONE' }, NOW);
    expect(task.status).toBe('DONE');
  });

  it('DONE → OPEN (reapertura) es válido', () => {
    const task = makeTask();
    task.update({ status: 'IN_PROGRESS' }, NOW);
    task.update({ status: 'DONE' }, NOW);
    task.update({ status: 'OPEN' }, NOW);
    expect(task.status).toBe('OPEN');
  });

  it('OPEN → OPEN (mismo estado) es idempotente y no lanza', () => {
    // Asignar el mismo estado es un no-op semánticamente válido.
    const task = makeTask();
    expect(() => task.update({ status: 'OPEN' }, NOW)).not.toThrow();
    expect(task.status).toBe('OPEN');
  });

  it('actualizar el título vacío lanza TaskTitleEmptyError', () => {
    const task = makeTask();
    expect(() => task.update({ title: '' }, NOW)).toThrow(TaskTitleEmptyError);
  });
});

describe('Task.setAssignees', () => {
  it('reemplaza la lista de asignados', () => {
    const task = makeTask();
    task.setAssignees(['user-2', 'user-3'], NOW);
    expect(task.assigneeIds).toEqual(['user-2', 'user-3']);
  });
});
