import {
  InvalidTaskTransitionError,
  TaskTitleEmptyError,
} from './task.errors';

export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE';

/** Transiciones de estado válidas. */
const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  OPEN: ['IN_PROGRESS', 'DONE'],
  IN_PROGRESS: ['OPEN', 'DONE'],
  DONE: ['OPEN', 'IN_PROGRESS'],
};

export interface TaskProps {
  id: string;
  familyId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  recommendedDate: string | null;
  deadlineDate: string | null;
  createdBy: string | null;
  assigneeIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface NewTaskParams {
  id: string;
  familyId: string;
  title: string;
  description?: string | null;
  recommendedDate?: string | null;
  deadlineDate?: string | null;
  createdBy: string;
  /** Si no se pasan, se asigna al creador. */
  assigneeIds?: string[];
  now: Date;
}

export interface UpdateTaskPatch {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  recommendedDate?: string | null;
  deadlineDate?: string | null;
}

/**
 * Aggregate Task.
 *
 * Invariantes:
 * - El título no puede estar vacío.
 * - Si no se especifican asignados al crear, se asigna al creador.
 * - Las transiciones de estado siguen la matriz VALID_TRANSITIONS.
 */
export class Task {
  readonly id: string;
  readonly familyId: string;
  private _title: string;
  private _description: string | null;
  private _status: TaskStatus;
  private _recommendedDate: string | null;
  private _deadlineDate: string | null;
  readonly createdBy: string | null;
  private _assigneeIds: string[];
  readonly createdAt: Date;
  private _updatedAt: Date;

  constructor(props: TaskProps) {
    this.id = props.id;
    this.familyId = props.familyId;
    this._title = props.title;
    this._description = props.description;
    this._status = props.status;
    this._recommendedDate = props.recommendedDate;
    this._deadlineDate = props.deadlineDate;
    this.createdBy = props.createdBy;
    this._assigneeIds = [...props.assigneeIds];
    this.createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  get title(): string { return this._title; }
  get description(): string | null { return this._description; }
  get status(): TaskStatus { return this._status; }
  get recommendedDate(): string | null { return this._recommendedDate; }
  get deadlineDate(): string | null { return this._deadlineDate; }
  get assigneeIds(): string[] { return [...this._assigneeIds]; }
  get updatedAt(): Date { return this._updatedAt; }

  /**
   * Crea una tarea nueva. Si no se pasan asignados, el creador queda como
   * único asignado (invariante de dominio).
   */
  static create(params: NewTaskParams): Task {
    const trimmed = params.title.trim();
    if (!trimmed) {
      throw new TaskTitleEmptyError();
    }

    const assigneeIds =
      params.assigneeIds && params.assigneeIds.length > 0
        ? params.assigneeIds
        : [params.createdBy];

    return new Task({
      id: params.id,
      familyId: params.familyId,
      title: trimmed,
      description: params.description ?? null,
      status: 'OPEN',
      recommendedDate: params.recommendedDate ?? null,
      deadlineDate: params.deadlineDate ?? null,
      createdBy: params.createdBy,
      assigneeIds,
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  /** Actualiza campos editables (patch parcial). */
  update(patch: UpdateTaskPatch, now: Date): void {
    if (patch.title !== undefined) {
      const trimmed = patch.title.trim();
      if (!trimmed) throw new TaskTitleEmptyError();
      this._title = trimmed;
    }
    if (patch.description !== undefined) {
      this._description = patch.description;
    }
    if (patch.status !== undefined && patch.status !== this._status) {
      const allowed = VALID_TRANSITIONS[this._status];
      if (!allowed.includes(patch.status)) {
        throw new InvalidTaskTransitionError(this._status, patch.status);
      }
      this._status = patch.status;
    }
    if (patch.recommendedDate !== undefined) {
      this._recommendedDate = patch.recommendedDate;
    }
    if (patch.deadlineDate !== undefined) {
      this._deadlineDate = patch.deadlineDate;
    }
    this._updatedAt = now;
  }

  /** Reemplaza la lista de asignados. */
  setAssignees(assigneeIds: string[], now: Date): void {
    this._assigneeIds = [...assigneeIds];
    this._updatedAt = now;
  }
}

// ── Entidad TaskPhoto ─────────────────────────────────────────────────────────

export interface TaskPhotoProps {
  id: string;
  taskId: string;
  storagePath: string;
  createdAt: Date;
}

/** Entidad TaskPhoto. Inmutable tras la creación. */
export class TaskPhoto {
  readonly id: string;
  readonly taskId: string;
  readonly storagePath: string;
  readonly createdAt: Date;

  constructor(props: TaskPhotoProps) {
    this.id = props.id;
    this.taskId = props.taskId;
    this.storagePath = props.storagePath;
    this.createdAt = props.createdAt;
  }

  static create(params: { id: string; taskId: string; storagePath: string; now: Date }): TaskPhoto {
    return new TaskPhoto({
      id: params.id,
      taskId: params.taskId,
      storagePath: params.storagePath,
      createdAt: params.now,
    });
  }
}

// ── Entidad TaskComment ─────────────────────────────────────────────────────────

export interface TaskCommentProps {
  id: string;
  taskId: string;
  authorId: string | null;
  body: string;
  createdAt: Date;
}

export interface NewTaskCommentParams {
  id: string;
  taskId: string;
  authorId: string | null;
  body: string;
  now: Date;
}

/** Entidad TaskComment. Inmutable tras la creación. */
export class TaskComment {
  readonly id: string;
  readonly taskId: string;
  readonly authorId: string | null;
  readonly body: string;
  readonly createdAt: Date;

  constructor(props: TaskCommentProps) {
    this.id = props.id;
    this.taskId = props.taskId;
    this.authorId = props.authorId;
    this.body = props.body;
    this.createdAt = props.createdAt;
  }

  static create(params: NewTaskCommentParams): TaskComment {
    return new TaskComment({
      id: params.id,
      taskId: params.taskId,
      authorId: params.authorId,
      body: params.body,
      createdAt: params.now,
    });
  }
}
