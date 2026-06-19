/**
 * Tests de la feature tasks (vistas presentacionales `base`, Fase 2 theme base).
 *
 * Tras la migración a themes, el render vive en las vistas presentacionales
 * `views/base/*View` (props in / callbacks out). Los containers (`TasksPage` /
 * `TaskDetailPage`) solo cablean la lógica real (queries, mutaciones, filtros
 * Zustand, compresión + Supabase Storage) y delegan en `ThemeView`, cuyo
 * registry se compone en otra fase. Por eso los tests de UI apuntan directamente
 * a las vistas, que es donde está la lógica de presentación.
 *
 * Cubre:
 *  1. TasksListView   — cabecera, listado, filtros, vacío, error, callbacks, diálogo de crear.
 *  2. CreateTaskDialog (dentro de TasksListView) — validación de título, preselección, payload.
 *  3. TaskDetailView  — cabecera, edición, cambio de estado, galería (subida foto), generar lista.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { FamilyMemberDto } from '@cosasdecasa/contracts';
import TasksListView from './views/base/TasksListView';
import TaskDetailView from './views/base/TaskDetailView';
import type {
  TaskDto,
  TaskView,
  TasksListViewProps,
  TaskDetailViewProps,
} from './views/types';

// ── Factories ──────────────────────────────────────────────────────────────────

const MEMBERS: FamilyMemberDto[] = [
  { userId: 'user-1', displayName: 'Ana', role: 'OWNER', joinedAt: new Date().toISOString() },
  { userId: 'user-2', displayName: 'Marcos', role: 'MEMBER', joinedAt: new Date().toISOString() },
];

function makeTask(overrides: Partial<TaskDto> = {}): TaskDto {
  return {
    id: 'task-1',
    familyId: 'family-1',
    title: 'Reparar el grifo',
    description: null,
    status: 'OPEN',
    recommendedDate: null,
    deadlineDate: null,
    createdBy: null,
    assignees: [],
    photos: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeTaskView(overrides: Partial<TaskView> = {}): TaskView {
  return { ...makeTask(), photos: [], ...overrides } as TaskView;
}

function listProps(overrides: Partial<TasksListViewProps> = {}): TasksListViewProps {
  return {
    tasks: [
      makeTask({ id: 'task-1', title: 'Reparar el grifo', status: 'OPEN' }),
      makeTask({ id: 'task-2', title: 'Pintar el salón', status: 'DONE' }),
    ],
    members: MEMBERS,
    isLoading: false,
    error: null,
    statusFilter: 'ALL',
    assigneeFilter: 'ALL',
    currentUserId: 'user-1',
    createOpen: false,
    isCreating: false,
    createError: null,
    onChangeStatusFilter: vi.fn(),
    onChangeAssigneeFilter: vi.fn(),
    onChangeCreateOpen: vi.fn(),
    onOpen: vi.fn(),
    onCreate: vi.fn(),
    ...overrides,
  };
}

function detailProps(overrides: Partial<TaskDetailViewProps> = {}): TaskDetailViewProps {
  return {
    task: makeTaskView(),
    isEditing: false,
    members: MEMBERS,
    isLoading: false,
    error: null,
    isSaving: false,
    editError: null,
    isUpdatingStatus: false,
    uploadingPhoto: false,
    uploadError: null,
    isGeneratingList: false,
    generateError: null,
    onBack: vi.fn(),
    onToggleEdit: vi.fn(),
    onSave: vi.fn(),
    onSetAssignees: vi.fn(),
    onSetStatus: vi.fn(),
    onUploadPhoto: vi.fn(),
    onGenerateShoppingList: vi.fn(),
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. TasksListView
// ─────────────────────────────────────────────────────────────────────────────

describe('TasksListView', () => {
  it('renderiza el título y el botón de crear', () => {
    render(<TasksListView {...listProps()} />);
    expect(screen.getByText('Tareas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /crear tarea/i })).toBeInTheDocument();
  });

  it('muestra las tareas recibidas', () => {
    render(<TasksListView {...listProps()} />);
    expect(screen.getByText('Reparar el grifo')).toBeInTheDocument();
    expect(screen.getByText('Pintar el salón')).toBeInTheDocument();
  });

  it('renderiza los filtros de estado y asignado', () => {
    render(<TasksListView {...listProps()} />);
    expect(screen.getByRole('group', { name: /filtrar por estado/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/filtrar por asignado/i)).toBeInTheDocument();
  });

  it('emite onChangeStatusFilter al pulsar un filtro de estado', async () => {
    const user = userEvent.setup();
    const onChangeStatusFilter = vi.fn();
    render(<TasksListView {...listProps({ onChangeStatusFilter })} />);

    const group = screen.getByRole('group', { name: /filtrar por estado/i });
    await user.click(within(group).getByRole('button', { name: 'Hecho' }));

    expect(onChangeStatusFilter).toHaveBeenCalledWith('DONE');
  });

  it('emite onOpen al pulsar una tarjeta', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<TasksListView {...listProps({ onOpen })} />);

    await user.click(screen.getByText('Reparar el grifo'));
    expect(onOpen).toHaveBeenCalledWith('task-1');
  });

  it('muestra el estado vacío cuando no hay tareas', () => {
    render(<TasksListView {...listProps({ tasks: [] })} />);
    expect(screen.getByText(/no hay tareas/i)).toBeInTheDocument();
  });

  it('muestra el error cuando lo recibe', () => {
    render(<TasksListView {...listProps({ tasks: [], error: 'Algo falló' })} />);
    expect(screen.getByText('Algo falló')).toBeInTheDocument();
  });

  it('emite onChangeCreateOpen(true) al pulsar "Crear tarea"', async () => {
    const user = userEvent.setup();
    const onChangeCreateOpen = vi.fn();
    render(<TasksListView {...listProps({ onChangeCreateOpen })} />);

    await user.click(screen.getByRole('button', { name: /crear tarea/i }));
    expect(onChangeCreateOpen).toHaveBeenCalledWith(true);
  });

  it('renderiza el diálogo cuando createOpen es true', () => {
    render(<TasksListView {...listProps({ createOpen: true })} />);
    expect(screen.getByRole('dialog', { name: /nueva tarea/i })).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. CreateTaskDialog (sub-flujo dentro de TasksListView)
// ─────────────────────────────────────────────────────────────────────────────

describe('TasksListView — diálogo de crear tarea', () => {
  function openDialog(props: Partial<TasksListViewProps> = {}) {
    const user = userEvent.setup();
    render(<TasksListView {...listProps({ createOpen: true, ...props })} />);
    return user;
  }

  it('el botón "Crear tarea" del diálogo está deshabilitado con título vacío', () => {
    openDialog();
    const dialog = screen.getByRole('dialog', { name: /nueva tarea/i });
    expect(within(dialog).getByRole('button', { name: /crear tarea/i })).toBeDisabled();
  });

  it('preselecciona al usuario actual como asignado', () => {
    openDialog({ currentUserId: 'user-1' });
    const dialog = screen.getByRole('dialog', { name: /nueva tarea/i });
    const anaCheckbox = within(dialog).getByRole('checkbox', { name: /ana/i });
    expect(anaCheckbox).toBeChecked();
  });

  it('emite onCreate con los valores al enviar', async () => {
    const onCreate = vi.fn();
    const user = openDialog({ onCreate });
    const dialog = screen.getByRole('dialog', { name: /nueva tarea/i });

    await user.type(within(dialog).getByLabelText(/título/i), 'Comprar comida');
    await user.click(within(dialog).getByRole('button', { name: /crear tarea/i }));

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Comprar comida', assigneeIds: ['user-1'] }),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. TaskDetailView
// ─────────────────────────────────────────────────────────────────────────────

describe('TaskDetailView', () => {
  it('renderiza el título y los datos de la tarea', () => {
    render(
      <TaskDetailView
        {...detailProps({
          task: makeTaskView({ title: 'Montar la estantería', description: 'En el dormitorio' }),
        })}
      />,
    );
    expect(screen.getByText('Montar la estantería')).toBeInTheDocument();
    expect(screen.getByText('En el dormitorio')).toBeInTheDocument();
  });

  it('emite onBack al pulsar volver', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<TaskDetailView {...detailProps({ onBack })} />);
    await user.click(screen.getByRole('button', { name: /volver a tareas/i }));
    expect(onBack).toHaveBeenCalled();
  });

  it('emite onSetStatus al pulsar un estado', async () => {
    const user = userEvent.setup();
    const onSetStatus = vi.fn();
    render(<TaskDetailView {...detailProps({ onSetStatus })} />);

    const group = screen.getByRole('group', { name: /cambiar estado/i });
    await user.click(within(group).getByRole('button', { name: 'Hecho' }));
    expect(onSetStatus).toHaveBeenCalledWith('DONE');
  });

  it('muestra el editor controlado en modo edición y emite onSave', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <TaskDetailView
        {...detailProps({ isEditing: true, task: makeTaskView({ title: 'Original' }), onSave })}
      />,
    );

    const titleInput = screen.getByLabelText('Título');
    expect(titleInput).toHaveValue('Original');
    await user.clear(titleInput);
    await user.type(titleInput, 'Editado');
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: 'Editado' }));
  });

  it('emite onUploadPhoto al seleccionar un archivo en la galería', async () => {
    const user = userEvent.setup();
    const onUploadPhoto = vi.fn();
    render(<TaskDetailView {...detailProps({ onUploadPhoto })} />);

    const fileInput = screen.getByLabelText(/seleccionar imagen/i);
    const file = new File(['img'], 'foto.png', { type: 'image/png' });
    await user.upload(fileInput, file);

    await waitFor(() => expect(onUploadPhoto).toHaveBeenCalledWith(file));
  });

  it('pinta las fotos con la URL pública ya resuelta', () => {
    render(
      <TaskDetailView
        {...detailProps({
          task: makeTaskView({
            photos: [
              {
                id: 'photo-1',
                taskId: 'task-1',
                storagePath: 'tasks/task-1/a.jpg',
                createdAt: new Date().toISOString(),
                url: 'https://storage.example.com/a.jpg',
              },
            ],
          }),
        })}
      />,
    );
    expect(screen.getByRole('img', { name: /foto de la tarea/i })).toHaveAttribute(
      'src',
      'https://storage.example.com/a.jpg',
    );
  });

  it('emite onGenerateShoppingList al pulsar el botón', async () => {
    const user = userEvent.setup();
    const onGenerateShoppingList = vi.fn();
    render(<TaskDetailView {...detailProps({ onGenerateShoppingList })} />);
    await user.click(screen.getByRole('button', { name: /generar lista de la compra/i }));
    expect(onGenerateShoppingList).toHaveBeenCalled();
  });

  it('emite onDeleteTask al pulsar "Borrar tarea"', async () => {
    const user = userEvent.setup();
    const onDeleteTask = vi.fn();
    render(<TaskDetailView {...detailProps({ onDeleteTask })} />);
    await user.click(screen.getByRole('button', { name: /borrar tarea/i }));
    expect(onDeleteTask).toHaveBeenCalled();
  });

  it('no muestra "Borrar tarea" cuando no se pasa onDeleteTask', () => {
    render(<TaskDetailView {...detailProps()} />);
    expect(screen.queryByRole('button', { name: /borrar tarea/i })).not.toBeInTheDocument();
  });

  it('emite onDeletePhoto con el id de la foto al pulsar su botón de borrar', async () => {
    const user = userEvent.setup();
    const onDeletePhoto = vi.fn();
    render(
      <TaskDetailView
        {...detailProps({
          onDeletePhoto,
          task: makeTaskView({
            photos: [
              {
                id: 'photo-1',
                taskId: 'task-1',
                storagePath: 'tasks/task-1/a.jpg',
                createdAt: new Date().toISOString(),
                url: 'https://storage.example.com/a.jpg',
              },
            ],
          }),
        })}
      />,
    );
    await user.click(screen.getByRole('button', { name: /borrar foto/i }));
    expect(onDeletePhoto).toHaveBeenCalledWith('photo-1');
  });

  it('no muestra el botón de borrar foto cuando no se pasa onDeletePhoto', () => {
    render(
      <TaskDetailView
        {...detailProps({
          task: makeTaskView({
            photos: [
              {
                id: 'photo-1',
                taskId: 'task-1',
                storagePath: 'tasks/task-1/a.jpg',
                createdAt: new Date().toISOString(),
                url: 'https://storage.example.com/a.jpg',
              },
            ],
          }),
        })}
      />,
    );
    expect(screen.queryByRole('button', { name: /borrar foto/i })).not.toBeInTheDocument();
  });
});
