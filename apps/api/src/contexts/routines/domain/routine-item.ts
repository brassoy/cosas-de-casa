import {
  InvalidTargetError,
  RoutineItemNameEmptyError,
} from './routine.errors';
import { computeDurationMinutes } from './time-window';

export interface RoutineItemProps {
  id: string;
  familyId: string;
  name: string;
  targetTimesPerWeek: number;
  defaultStartTime: string;
  defaultEndTime: string;
  tags: string[];
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewRoutineItemParams {
  id: string;
  familyId: string;
  name: string;
  targetTimesPerWeek: number;
  defaultStartTime: string;
  defaultEndTime: string;
  tags?: string[];
  now: Date;
}

export interface UpdateRoutineItemPatch {
  name?: string;
  targetTimesPerWeek?: number;
  defaultStartTime?: string;
  defaultEndTime?: string;
  tags?: string[];
}

/** Normaliza tags: trim, descarta vacíos y deduplica conservando el orden. */
function normalizeTags(tags: string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0))];
}

/**
 * Aggregate RoutineItem: item del catálogo familiar de rutinas.
 *
 * Invariantes:
 * - El nombre no puede estar vacío.
 * - El objetivo semanal es un entero entre 1 y 7.
 * - La ventana horaria por defecto es "HH:mm" válida con inicio ≠ fin
 *   (puede cruzar medianoche).
 * - Los tags se normalizan (trim, sin vacíos, sin duplicados).
 * - Archivar es reversible y no borra: las rutinas históricas lo referencian.
 */
export class RoutineItem {
  readonly id: string;
  readonly familyId: string;
  private _name: string;
  private _targetTimesPerWeek: number;
  private _defaultStartTime: string;
  private _defaultEndTime: string;
  private _tags: string[];
  private _archivedAt: Date | null;
  readonly createdAt: Date;
  private _updatedAt: Date;

  constructor(props: RoutineItemProps) {
    this.id = props.id;
    this.familyId = props.familyId;
    this._name = props.name;
    this._targetTimesPerWeek = props.targetTimesPerWeek;
    this._defaultStartTime = props.defaultStartTime;
    this._defaultEndTime = props.defaultEndTime;
    this._tags = [...props.tags];
    this._archivedAt = props.archivedAt;
    this.createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  get name(): string { return this._name; }
  get targetTimesPerWeek(): number { return this._targetTimesPerWeek; }
  get defaultStartTime(): string { return this._defaultStartTime; }
  get defaultEndTime(): string { return this._defaultEndTime; }
  get tags(): string[] { return [...this._tags]; }
  get archivedAt(): Date | null { return this._archivedAt; }
  get isArchived(): boolean { return this._archivedAt !== null; }
  get updatedAt(): Date { return this._updatedAt; }

  static create(params: NewRoutineItemParams): RoutineItem {
    const name = validateName(params.name);
    validateTarget(params.targetTimesPerWeek);
    computeDurationMinutes(params.defaultStartTime, params.defaultEndTime);

    return new RoutineItem({
      id: params.id,
      familyId: params.familyId,
      name,
      targetTimesPerWeek: params.targetTimesPerWeek,
      defaultStartTime: params.defaultStartTime,
      defaultEndTime: params.defaultEndTime,
      tags: normalizeTags(params.tags ?? []),
      archivedAt: null,
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  /** Actualiza campos editables (patch parcial). */
  update(patch: UpdateRoutineItemPatch, now: Date): void {
    if (patch.name !== undefined) {
      this._name = validateName(patch.name);
    }
    if (patch.targetTimesPerWeek !== undefined) {
      validateTarget(patch.targetTimesPerWeek);
      this._targetTimesPerWeek = patch.targetTimesPerWeek;
    }
    const startTime = patch.defaultStartTime ?? this._defaultStartTime;
    const endTime = patch.defaultEndTime ?? this._defaultEndTime;
    if (patch.defaultStartTime !== undefined || patch.defaultEndTime !== undefined) {
      computeDurationMinutes(startTime, endTime);
      this._defaultStartTime = startTime;
      this._defaultEndTime = endTime;
    }
    if (patch.tags !== undefined) {
      this._tags = normalizeTags(patch.tags);
    }
    this._updatedAt = now;
  }

  archive(now: Date): void {
    if (this._archivedAt === null) {
      this._archivedAt = now;
      this._updatedAt = now;
    }
  }

  restore(now: Date): void {
    if (this._archivedAt !== null) {
      this._archivedAt = null;
      this._updatedAt = now;
    }
  }
}

function validateName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new RoutineItemNameEmptyError();
  }
  return trimmed;
}

function validateTarget(target: number): void {
  if (!Number.isInteger(target) || target < 1 || target > 7) {
    throw new InvalidTargetError();
  }
}
