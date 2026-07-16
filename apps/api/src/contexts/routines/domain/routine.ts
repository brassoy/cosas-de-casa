import {
  DayIndexOutOfRangeError,
  DuplicateAssignmentError,
  IncidentDescriptionEmptyError,
  InvalidRoutineDateError,
  ItemNotSelectedError,
  LostMinutesExceedPlannedError,
  RoutineAssignmentNotFoundError,
  RoutineIncidentNotFoundError,
} from './routine.errors';
import { computeDurationMinutes } from './time-window';

// ── Fechas de calendario "YYYY-MM-DD" (sin hora ni zona) ─────────────────────

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidYMD(value: string): boolean {
  if (!YMD_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Suma días a una fecha "YYYY-MM-DD" con aritmética UTC (sin efectos de zona). */
export function addDaysYMD(ymd: string, days: number): string {
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(Date.UTC(year!, month! - 1, day! + days)).toISOString().slice(0, 10);
}

/** Días que dura una rutina. */
export const ROUTINE_DAYS = 7;

// ── Hijos del agregado ────────────────────────────────────────────────────────

/** Item seleccionado para la semana, con SNAPSHOT del objetivo del catálogo. */
export interface RoutineSelection {
  routineItemId: string;
  targetTimesPerWeek: number;
}

/** Item colocado en un día concreto de la semana. */
export interface RoutineAssignment {
  id: string;
  routineItemId: string;
  /** 0..6, offset desde startDate. */
  dayIndex: number;
  startTime: string;
  endTime: string;
  /** Calculado por el agregado; nadie más lo escribe. */
  durationMinutes: number;
}

/** Incumplimiento registrado sobre una asignación. */
export interface RoutineIncident {
  id: string;
  assignmentId: string;
  description: string;
  /** Minutos que se descuentan del tiempo real. Null si no aplica. */
  lostMinutes: number | null;
  createdBy: string | null;
  createdAt: Date;
}

// ── Agregado ──────────────────────────────────────────────────────────────────

export interface RoutineProps {
  id: string;
  familyId: string;
  name: string | null;
  startDate: string;
  selections: RoutineSelection[];
  assignments: RoutineAssignment[];
  incidents: RoutineIncident[];
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewRoutineParams {
  id: string;
  familyId: string;
  startDate: string;
  name?: string | null;
  createdBy: string;
  now: Date;
}

export interface AddAssignmentParams {
  id: string;
  routineItemId: string;
  dayIndex: number;
  startTime: string;
  endTime: string;
}

export interface UpdateAssignmentPatch {
  dayIndex?: number;
  startTime?: string;
  endTime?: string;
}

export interface AddIncidentParams {
  id: string;
  assignmentId: string;
  description: string;
  lostMinutes?: number | null;
  createdBy: string;
  now: Date;
}

/**
 * Aggregate Routine: la rutina de UNA semana concreta (startDate..startDate+6,
 * empezando en cualquier día). Contiene selections, assignments e incidents;
 * todo cambio de hijos pasa por sus métodos.
 *
 * Invariantes:
 * - startDate es una fecha "YYYY-MM-DD" válida; el fin es siempre derivado.
 * - Toda asignación referencia un item seleccionado y un dayIndex 0..6.
 * - Máximo una asignación por (item, día).
 * - La ventana horaria es válida (puede cruzar medianoche); la duración la
 *   calcula el agregado.
 * - Los minutos perdidos de una incidencia nunca superan la duración
 *   planificada de su asignación.
 * - Incumplir el objetivo semanal está PERMITIDO: queda registrado como
 *   snapshot del target en la selección, nunca bloquea.
 */
export class Routine {
  readonly id: string;
  readonly familyId: string;
  private _name: string | null;
  readonly startDate: string;
  private _selections: RoutineSelection[];
  private _assignments: RoutineAssignment[];
  private _incidents: RoutineIncident[];
  readonly createdBy: string | null;
  readonly createdAt: Date;
  private _updatedAt: Date;

  constructor(props: RoutineProps) {
    this.id = props.id;
    this.familyId = props.familyId;
    this._name = props.name;
    this.startDate = props.startDate;
    this._selections = props.selections.map((s) => ({ ...s }));
    this._assignments = props.assignments.map((a) => ({ ...a }));
    this._incidents = props.incidents.map((i) => ({ ...i }));
    this.createdBy = props.createdBy;
    this.createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  get name(): string | null { return this._name; }
  get endDate(): string { return addDaysYMD(this.startDate, ROUTINE_DAYS - 1); }
  get selections(): RoutineSelection[] { return this._selections.map((s) => ({ ...s })); }
  get assignments(): RoutineAssignment[] { return this._assignments.map((a) => ({ ...a })); }
  get incidents(): RoutineIncident[] { return this._incidents.map((i) => ({ ...i })); }
  get updatedAt(): Date { return this._updatedAt; }

  /** Fecha real (YYYY-MM-DD) de un día de la rutina. */
  dateOfDay(dayIndex: number): string {
    return addDaysYMD(this.startDate, dayIndex);
  }

  /** Días con asignación de un item (para el cumplimiento derivado). */
  assignedCountOf(routineItemId: string): number {
    return this._assignments.filter((a) => a.routineItemId === routineItemId).length;
  }

  static create(params: NewRoutineParams): Routine {
    if (!isValidYMD(params.startDate)) {
      throw new InvalidRoutineDateError();
    }
    return new Routine({
      id: params.id,
      familyId: params.familyId,
      name: params.name?.trim() || null,
      startDate: params.startDate,
      selections: [],
      assignments: [],
      incidents: [],
      createdBy: params.createdBy,
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  rename(name: string | null, now: Date): void {
    this._name = name?.trim() || null;
    this._updatedAt = now;
  }

  /**
   * Reemplaza la selección de items. Conserva el snapshot del target de los
   * items que ya estaban seleccionados (el registro no se reescribe) y elimina
   * en cascada las asignaciones (e incidencias) de los items quitados.
   */
  setSelections(items: RoutineSelection[], now: Date): void {
    const next: RoutineSelection[] = [];
    const seen = new Set<string>();
    for (const item of items) {
      if (seen.has(item.routineItemId)) continue;
      seen.add(item.routineItemId);
      const existing = this._selections.find((s) => s.routineItemId === item.routineItemId);
      next.push({
        routineItemId: item.routineItemId,
        targetTimesPerWeek: existing ? existing.targetTimesPerWeek : item.targetTimesPerWeek,
      });
    }
    this._selections = next;

    const removedAssignmentIds = new Set(
      this._assignments.filter((a) => !seen.has(a.routineItemId)).map((a) => a.id),
    );
    this._assignments = this._assignments.filter((a) => !removedAssignmentIds.has(a.id));
    this._incidents = this._incidents.filter((i) => !removedAssignmentIds.has(i.assignmentId));
    this._updatedAt = now;
  }

  addAssignment(params: AddAssignmentParams, now: Date): RoutineAssignment {
    if (!this._selections.some((s) => s.routineItemId === params.routineItemId)) {
      throw new ItemNotSelectedError();
    }
    validateDayIndex(params.dayIndex);
    if (this.hasAssignmentAt(params.routineItemId, params.dayIndex)) {
      throw new DuplicateAssignmentError();
    }
    const assignment: RoutineAssignment = {
      id: params.id,
      routineItemId: params.routineItemId,
      dayIndex: params.dayIndex,
      startTime: params.startTime,
      endTime: params.endTime,
      durationMinutes: computeDurationMinutes(params.startTime, params.endTime),
    };
    this._assignments.push(assignment);
    this._updatedAt = now;
    return { ...assignment };
  }

  /** Mueve la asignación de día o ajusta su ventana horaria. */
  updateAssignment(assignmentId: string, patch: UpdateAssignmentPatch, now: Date): RoutineAssignment {
    const assignment = this._assignments.find((a) => a.id === assignmentId);
    if (!assignment) {
      throw new RoutineAssignmentNotFoundError();
    }

    const dayIndex = patch.dayIndex ?? assignment.dayIndex;
    validateDayIndex(dayIndex);
    if (
      dayIndex !== assignment.dayIndex &&
      this.hasAssignmentAt(assignment.routineItemId, dayIndex)
    ) {
      throw new DuplicateAssignmentError();
    }

    const startTime = patch.startTime ?? assignment.startTime;
    const endTime = patch.endTime ?? assignment.endTime;
    const durationMinutes = computeDurationMinutes(startTime, endTime);

    // La ventana no puede encoger por debajo de los minutos ya perdidos.
    const maxLost = Math.max(
      0,
      ...this._incidents
        .filter((i) => i.assignmentId === assignmentId)
        .map((i) => i.lostMinutes ?? 0),
    );
    if (maxLost > durationMinutes) {
      throw new LostMinutesExceedPlannedError();
    }

    assignment.dayIndex = dayIndex;
    assignment.startTime = startTime;
    assignment.endTime = endTime;
    assignment.durationMinutes = durationMinutes;
    this._updatedAt = now;
    return { ...assignment };
  }

  /** Elimina una asignación y sus incidencias en cascada. */
  removeAssignment(assignmentId: string, now: Date): void {
    if (!this._assignments.some((a) => a.id === assignmentId)) {
      throw new RoutineAssignmentNotFoundError();
    }
    this._assignments = this._assignments.filter((a) => a.id !== assignmentId);
    this._incidents = this._incidents.filter((i) => i.assignmentId !== assignmentId);
    this._updatedAt = now;
  }

  addIncident(params: AddIncidentParams): RoutineIncident {
    const assignment = this._assignments.find((a) => a.id === params.assignmentId);
    if (!assignment) {
      throw new RoutineAssignmentNotFoundError();
    }
    const description = params.description.trim();
    if (!description) {
      throw new IncidentDescriptionEmptyError();
    }
    const lostMinutes = params.lostMinutes ?? null;
    if (lostMinutes !== null && (lostMinutes < 0 || lostMinutes > assignment.durationMinutes)) {
      throw new LostMinutesExceedPlannedError();
    }
    const incident: RoutineIncident = {
      id: params.id,
      assignmentId: params.assignmentId,
      description,
      lostMinutes,
      createdBy: params.createdBy,
      createdAt: params.now,
    };
    this._incidents.push(incident);
    this._updatedAt = params.now;
    return { ...incident };
  }

  removeIncident(incidentId: string, now: Date): void {
    if (!this._incidents.some((i) => i.id === incidentId)) {
      throw new RoutineIncidentNotFoundError();
    }
    this._incidents = this._incidents.filter((i) => i.id !== incidentId);
    this._updatedAt = now;
  }

  private hasAssignmentAt(routineItemId: string, dayIndex: number): boolean {
    return this._assignments.some(
      (a) => a.routineItemId === routineItemId && a.dayIndex === dayIndex,
    );
  }
}

function validateDayIndex(dayIndex: number): void {
  if (!Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex >= ROUTINE_DAYS) {
    throw new DayIndexOutOfRangeError();
  }
}
