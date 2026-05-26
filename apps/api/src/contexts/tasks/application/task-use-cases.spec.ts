/**
 * Tests unitarios de los casos de uso del contexto `tasks`.
 *
 * Usan repositorios en memoria (fake) para aislar la lógica de aplicación.
 *
 * Cobertura:
 *  ✓ CreateTask: crea y persiste la tarea con el creador como asignado por defecto
 *  ✓ CreateTask: respeta assigneeIds si se pasan
 *  ✓ GetTask: devuelve la tarea por id
 *  ✓ GetTask: lanza TaskNotFoundError si no existe
 *  ✓ ListTasks: devuelve todas las tareas de la familia
 *  ✓ ListTasks: filtra por status
 *  ✓ UpdateTask: actualiza título y status
 *  ✓ UpdateTask: lanza TaskNotFoundError si no existe
 *  ✓ DeleteTask: elimina la tarea
 *  ✓ SetAssignees: reemplaza los asignados
 *  ✓ AddTaskPhoto: registra una foto
 *  ✓ RemoveTaskPhoto: elimina una foto; lanza TaskPhotoNotFoundError si no existe
 */
import { describe, expect, it, beforeEach } from 'vitest';
import type { TaskRepository, ListTasksFilter } from '../domain/ports/task.repository';
import type { TaskPhotoRepository } from '../domain/ports/task-photo.repository';
import type { TasksClock } from './ports/clock';
import type { TasksIdGenerator } from './ports/id-generator';
import { Task, TaskPhoto } from '../domain/task';
import { TaskNotFoundError, TaskPhotoNotFoundError } from '../domain/task.errors';
import { CreateTaskUseCase } from './create-task.use-case';
import { GetTaskUseCase } from './get-task.use-case';
import { ListTasksUseCase } from './list-tasks.use-case';
import { UpdateTaskUseCase } from './update-task.use-case';
import { DeleteTaskUseCase } from './delete-task.use-case';
import { SetAssigneesUseCase } from './set-assignees.use-case';
import { AddTaskPhotoUseCase } from './add-task-photo.use-case';
import { RemoveTaskPhotoUseCase } from './remove-task-photo.use-case';

// ── Fakes ──────────────────────────────────────────────────────────────────

let taskStore: Task[] = [];
let photoStore: TaskPhoto[] = [];
let idCounter = 0;
const FIXED_NOW = new Date('2026-05-26T10:00:00Z');

const fakeClock: TasksClock = { now: () => FIXED_NOW };
const fakeIds: TasksIdGenerator = { generate: () => `id-${++idCounter}` };

const fakeTaskRepo: TaskRepository = {
  async create(task) { taskStore.push(task); },
  async findById(id) { return taskStore.find((t) => t.id === id) ?? null; },
  async findByFamily(familyId: string, filter?: ListTasksFilter) {
    let result = taskStore.filter((t) => t.familyId === familyId);
    if (filter?.status) result = result.filter((t) => t.status === filter.status);
    if (filter?.assigneeId) result = result.filter((t) => t.assigneeIds.includes(filter.assigneeId!));
    return result;
  },
  async update(task) {
    const idx = taskStore.findIndex((t) => t.id === task.id);
    if (idx !== -1) taskStore[idx] = task;
  },
  async deleteById(id) { taskStore = taskStore.filter((t) => t.id !== id); },
  async setAssignees(taskId, assigneeIds) {
    // El dominio ya actualizó assigneeIds en el aggregate; el repo simplemente lo persiste.
    const task = taskStore.find((t) => t.id === taskId);
    if (task) task.setAssignees(assigneeIds, FIXED_NOW);
  },
};

const fakePhotoRepo: TaskPhotoRepository = {
  async create(photo) { photoStore.push(photo); },
  async findByTask(taskId) { return photoStore.filter((p) => p.taskId === taskId); },
  async findById(id) { return photoStore.find((p) => p.id === id) ?? null; },
  async deleteById(id) { photoStore = photoStore.filter((p) => p.id !== id); },
};

// ── Setup ──────────────────────────────────────────────────────────────────

function makeUseCases() {
  return {
    createTask: new CreateTaskUseCase(fakeTaskRepo, fakeClock, fakeIds),
    getTask: new GetTaskUseCase(fakeTaskRepo),
    listTasks: new ListTasksUseCase(fakeTaskRepo),
    updateTask: new UpdateTaskUseCase(fakeTaskRepo, fakeClock),
    deleteTask: new DeleteTaskUseCase(fakeTaskRepo),
    setAssignees: new SetAssigneesUseCase(fakeTaskRepo, fakeClock),
    addPhoto: new AddTaskPhotoUseCase(fakeTaskRepo, fakePhotoRepo, fakeClock, fakeIds),
    removePhoto: new RemoveTaskPhotoUseCase(fakePhotoRepo),
  };
}

beforeEach(() => {
  taskStore = [];
  photoStore = [];
  idCounter = 0;
});

// ── CreateTask ────────────────────────────────────────────────────────────────

describe('CreateTaskUseCase', () => {
  it('crea la tarea y el creador queda como asignado por defecto', async () => {
    const { createTask } = makeUseCases();
    const task = await createTask.execute({
      familyId: 'fam-1',
      title: 'Limpiar el baño',
      createdBy: 'user-1',
    });

    expect(task.title).toBe('Limpiar el baño');
    expect(task.status).toBe('OPEN');
    expect(task.assigneeIds).toEqual(['user-1']);
    expect(taskStore).toHaveLength(1);
  });

  it('respeta los assigneeIds si se pasan', async () => {
    const { createTask } = makeUseCases();
    const task = await createTask.execute({
      familyId: 'fam-1',
      title: 'Hacer la compra',
      createdBy: 'user-1',
      assigneeIds: ['user-2', 'user-3'],
    });

    expect(task.assigneeIds).toEqual(['user-2', 'user-3']);
  });
});

// ── GetTask ───────────────────────────────────────────────────────────────────

describe('GetTaskUseCase', () => {
  it('devuelve la tarea por id', async () => {
    const { createTask, getTask } = makeUseCases();
    const created = await createTask.execute({
      familyId: 'fam-1',
      title: 'Planchar la ropa',
      createdBy: 'user-1',
    });

    const found = await getTask.execute({ taskId: created.id });
    expect(found.id).toBe(created.id);
  });

  it('lanza TaskNotFoundError si no existe', async () => {
    const { getTask } = makeUseCases();
    await expect(getTask.execute({ taskId: 'ghost' })).rejects.toThrow(TaskNotFoundError);
  });
});

// ── ListTasks ─────────────────────────────────────────────────────────────────

describe('ListTasksUseCase', () => {
  it('devuelve todas las tareas de la familia', async () => {
    const { createTask, listTasks } = makeUseCases();
    await createTask.execute({ familyId: 'fam-1', title: 'T1', createdBy: 'user-1' });
    await createTask.execute({ familyId: 'fam-1', title: 'T2', createdBy: 'user-1' });
    await createTask.execute({ familyId: 'fam-2', title: 'Otra fam', createdBy: 'user-2' });

    const result = await listTasks.execute({ familyId: 'fam-1' });
    expect(result).toHaveLength(2);
  });

  it('filtra por status', async () => {
    const { createTask, updateTask, listTasks } = makeUseCases();
    const t1 = await createTask.execute({ familyId: 'fam-1', title: 'T1', createdBy: 'user-1' });
    await createTask.execute({ familyId: 'fam-1', title: 'T2', createdBy: 'user-1' });
    await updateTask.execute({ taskId: t1.id, status: 'IN_PROGRESS' });

    const result = await listTasks.execute({ familyId: 'fam-1', filter: { status: 'IN_PROGRESS' } });
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('IN_PROGRESS');
  });
});

// ── UpdateTask ────────────────────────────────────────────────────────────────

describe('UpdateTaskUseCase', () => {
  it('actualiza el título y el status', async () => {
    const { createTask, updateTask } = makeUseCases();
    const task = await createTask.execute({ familyId: 'fam-1', title: 'Limpiar', createdBy: 'user-1' });

    const updated = await updateTask.execute({
      taskId: task.id,
      title: 'Limpiar cocina',
      status: 'IN_PROGRESS',
    });

    expect(updated.title).toBe('Limpiar cocina');
    expect(updated.status).toBe('IN_PROGRESS');
  });

  it('lanza TaskNotFoundError si la tarea no existe', async () => {
    const { updateTask } = makeUseCases();
    await expect(updateTask.execute({ taskId: 'ghost', title: 'X' })).rejects.toThrow(TaskNotFoundError);
  });
});

// ── DeleteTask ────────────────────────────────────────────────────────────────

describe('DeleteTaskUseCase', () => {
  it('elimina la tarea', async () => {
    const { createTask, deleteTask } = makeUseCases();
    const task = await createTask.execute({ familyId: 'fam-1', title: 'Borrar', createdBy: 'user-1' });

    await deleteTask.execute({ taskId: task.id });
    expect(taskStore.find((t) => t.id === task.id)).toBeUndefined();
  });
});

// ── SetAssignees ──────────────────────────────────────────────────────────────

describe('SetAssigneesUseCase', () => {
  it('reemplaza los asignados de la tarea', async () => {
    const { createTask, setAssignees } = makeUseCases();
    const task = await createTask.execute({ familyId: 'fam-1', title: 'Tarea', createdBy: 'user-1' });

    const updated = await setAssignees.execute({ taskId: task.id, assigneeIds: ['user-2', 'user-3'] });
    expect(updated.assigneeIds).toEqual(['user-2', 'user-3']);
  });
});

// ── AddTaskPhoto ──────────────────────────────────────────────────────────────

describe('AddTaskPhotoUseCase', () => {
  it('registra una foto de la tarea', async () => {
    const { createTask, addPhoto } = makeUseCases();
    const task = await createTask.execute({ familyId: 'fam-1', title: 'Con foto', createdBy: 'user-1' });

    const photo = await addPhoto.execute({ taskId: task.id, storagePath: 'task-photos/foto.jpg' });
    expect(photo.storagePath).toBe('task-photos/foto.jpg');
    expect(photo.taskId).toBe(task.id);
  });

  it('lanza TaskNotFoundError si la tarea no existe', async () => {
    const { addPhoto } = makeUseCases();
    await expect(addPhoto.execute({ taskId: 'ghost', storagePath: 'x.jpg' })).rejects.toThrow(TaskNotFoundError);
  });
});

// ── RemoveTaskPhoto ───────────────────────────────────────────────────────────

describe('RemoveTaskPhotoUseCase', () => {
  it('elimina la foto', async () => {
    const { createTask, addPhoto, removePhoto } = makeUseCases();
    const task = await createTask.execute({ familyId: 'fam-1', title: 'Con foto', createdBy: 'user-1' });
    const photo = await addPhoto.execute({ taskId: task.id, storagePath: 'task-photos/foto.jpg' });

    await removePhoto.execute({ photoId: photo.id });
    expect(photoStore.find((p) => p.id === photo.id)).toBeUndefined();
  });

  it('lanza TaskPhotoNotFoundError si la foto no existe', async () => {
    const { removePhoto } = makeUseCases();
    await expect(removePhoto.execute({ photoId: 'ghost' })).rejects.toThrow(TaskPhotoNotFoundError);
  });
});
