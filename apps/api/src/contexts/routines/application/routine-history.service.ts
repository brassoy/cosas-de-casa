import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Routine } from '../domain/routine';
import {
  ROUTINE_ITEM_REPOSITORY,
  type RoutineItemRepository,
} from '../domain/ports/routine-item.repository';
import {
  ROUTINE_HISTORY_REPOSITORY,
  type NewRoutineEvent,
  type RoutineChange,
  type RoutineEventRecord,
  type RoutineHistoryRepository,
} from './ports/routine-history.repository';

/**
 * Servicio de historial de rutinas (auditoría).
 *
 * Registra un evento por cada modificación calculando el diff CAMPO A CAMPO
 * entre el estado ANTES y DESPUÉS de la rutina, y lo lee para la pestaña
 * «Historial». Vive en aplicación y lo invoca el controller (que aporta el actor
 * de `@CurrentUser()`), así que el dominio y los use-cases quedan intactos.
 *
 * La escritura es BEST-EFFORT: si el registro falla, se avisa por log pero NUNCA
 * rompe la acción del usuario (la mutación ya se ejecutó).
 */
const DAY_LABELS = [
  'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo',
] as const;

function dayLabel(dayIndex: number): string {
  return DAY_LABELS[dayIndex] ?? `día ${dayIndex + 1}`;
}

function timeRange(window: { startTime: string; endTime: string }): string {
  return `${window.startTime}–${window.endTime}`;
}

function minutesLabel(minutes: number | null): string {
  return minutes === null ? '—' : `${minutes} min`;
}

@Injectable()
export class RoutineHistoryService {
  private readonly logger = new Logger(RoutineHistoryService.name);

  constructor(
    @Inject(ROUTINE_HISTORY_REPOSITORY)
    private readonly history: RoutineHistoryRepository,
    @Inject(ROUTINE_ITEM_REPOSITORY)
    private readonly items: RoutineItemRepository,
  ) {}

  /** Lee el historial de una rutina (más recientes primero). */
  async list(routineId: string): Promise<RoutineEventRecord[]> {
    return this.history.list(routineId);
  }

  // ── Registro de cada tipo de cambio ─────────────────────────────────────────

  async recordRoutineCreated(after: Routine, actorId: string | null): Promise<void> {
    const label = after.name ? `«${after.name}»` : `de la semana del ${after.startDate}`;
    await this.append({
      routineId: after.id,
      entity: 'routine',
      action: 'created',
      summary: `Creó la rutina ${label}`,
      changes: [],
      createdBy: actorId,
    });
  }

  async recordRoutineRenamed(before: Routine, after: Routine, actorId: string | null): Promise<void> {
    if (before.name === after.name) return;
    await this.append({
      routineId: after.id,
      entity: 'routine',
      action: 'updated',
      summary: 'Renombró la rutina',
      changes: [{ label: 'Nombre', before: before.name ?? '—', after: after.name ?? '—' }],
      createdBy: actorId,
    });
  }

  async recordItemsChanged(before: Routine, after: Routine, actorId: string | null): Promise<void> {
    const beforeIds = new Set(before.selections.map((s) => s.routineItemId));
    const afterIds = new Set(after.selections.map((s) => s.routineItemId));
    const addedIds = [...afterIds].filter((id) => !beforeIds.has(id));
    const removedIds = [...beforeIds].filter((id) => !afterIds.has(id));
    if (addedIds.length === 0 && removedIds.length === 0) return;

    const names = await this.itemNames([...addedIds, ...removedIds]);
    const nameOf = (id: string) => names.get(id) ?? 'un item';
    const changes: RoutineChange[] = [];
    if (addedIds.length) {
      changes.push({ label: 'Añadidos', before: null, after: addedIds.map(nameOf).join(', ') });
    }
    if (removedIds.length) {
      changes.push({ label: 'Quitados', before: removedIds.map(nameOf).join(', '), after: null });
    }
    await this.append({
      routineId: after.id,
      entity: 'items',
      action: 'updated',
      summary: 'Cambió los items de la rutina',
      changes,
      createdBy: actorId,
    });
  }

  async recordAssignmentCreated(before: Routine, after: Routine, actorId: string | null): Promise<void> {
    const beforeIds = new Set(before.assignments.map((a) => a.id));
    const created = after.assignments.find((a) => !beforeIds.has(a.id));
    if (!created) return;

    const itemName = await this.itemName(created.routineItemId);
    await this.append({
      routineId: after.id,
      entity: 'assignment',
      action: 'created',
      summary: `Asignó «${itemName}» al ${dayLabel(created.dayIndex)}`,
      changes: [
        { label: 'Día', before: null, after: dayLabel(created.dayIndex) },
        { label: 'Horario', before: null, after: timeRange(created) },
      ],
      createdBy: actorId,
    });
  }

  async recordAssignmentUpdated(
    before: Routine,
    after: Routine,
    assignmentId: string,
    actorId: string | null,
  ): Promise<void> {
    const prev = before.assignments.find((a) => a.id === assignmentId);
    const next = after.assignments.find((a) => a.id === assignmentId);
    if (!prev || !next) return;

    const changes: RoutineChange[] = [];
    if (prev.dayIndex !== next.dayIndex) {
      changes.push({ label: 'Día', before: dayLabel(prev.dayIndex), after: dayLabel(next.dayIndex) });
    }
    if (prev.startTime !== next.startTime || prev.endTime !== next.endTime) {
      changes.push({ label: 'Horario', before: timeRange(prev), after: timeRange(next) });
    }
    if (changes.length === 0) return;

    const itemName = await this.itemName(next.routineItemId);
    const movedDay = prev.dayIndex !== next.dayIndex;
    await this.append({
      routineId: after.id,
      entity: 'assignment',
      action: 'updated',
      summary: movedDay
        ? `Movió «${itemName}» al ${dayLabel(next.dayIndex)}`
        : `Cambió el horario de «${itemName}»`,
      changes,
      createdBy: actorId,
    });
  }

  async recordAssignmentDeleted(before: Routine, assignmentId: string, actorId: string | null): Promise<void> {
    const removed = before.assignments.find((a) => a.id === assignmentId);
    if (!removed) return;

    const itemName = await this.itemName(removed.routineItemId);
    await this.append({
      routineId: before.id,
      entity: 'assignment',
      action: 'deleted',
      summary: `Quitó «${itemName}» del ${dayLabel(removed.dayIndex)}`,
      changes: [
        { label: 'Día', before: dayLabel(removed.dayIndex), after: null },
        { label: 'Horario', before: timeRange(removed), after: null },
      ],
      createdBy: actorId,
    });
  }

  async recordIncidentCreated(before: Routine, after: Routine, actorId: string | null): Promise<void> {
    const beforeIds = new Set(before.incidents.map((i) => i.id));
    const created = after.incidents.find((i) => !beforeIds.has(i.id));
    if (!created) return;

    const itemName = await this.itemNameOfAssignment(after, created.assignmentId);
    const changes: RoutineChange[] = [
      { label: 'Descripción', before: null, after: created.description },
    ];
    if (created.lostMinutes !== null) {
      changes.push({ label: 'Minutos perdidos', before: null, after: minutesLabel(created.lostMinutes) });
    }
    await this.append({
      routineId: after.id,
      entity: 'incident',
      action: 'created',
      summary: `Añadió una incidencia en «${itemName}»`,
      changes,
      createdBy: actorId,
    });
  }

  async recordIncidentUpdated(
    before: Routine,
    after: Routine,
    incidentId: string,
    actorId: string | null,
  ): Promise<void> {
    const prev = before.incidents.find((i) => i.id === incidentId);
    const next = after.incidents.find((i) => i.id === incidentId);
    if (!prev || !next) return;

    const changes: RoutineChange[] = [];
    if (prev.description !== next.description) {
      changes.push({ label: 'Descripción', before: prev.description, after: next.description });
    }
    if (prev.lostMinutes !== next.lostMinutes) {
      changes.push({
        label: 'Minutos perdidos',
        before: minutesLabel(prev.lostMinutes),
        after: minutesLabel(next.lostMinutes),
      });
    }
    if (changes.length === 0) return;

    const itemName = await this.itemNameOfAssignment(after, next.assignmentId);
    await this.append({
      routineId: after.id,
      entity: 'incident',
      action: 'updated',
      summary: `Editó una incidencia en «${itemName}»`,
      changes,
      createdBy: actorId,
    });
  }

  async recordIncidentDeleted(before: Routine, incidentId: string, actorId: string | null): Promise<void> {
    const removed = before.incidents.find((i) => i.id === incidentId);
    if (!removed) return;

    const itemName = await this.itemNameOfAssignment(before, removed.assignmentId);
    const changes: RoutineChange[] = [
      { label: 'Descripción', before: removed.description, after: null },
    ];
    if (removed.lostMinutes !== null) {
      changes.push({ label: 'Minutos perdidos', before: minutesLabel(removed.lostMinutes), after: null });
    }
    await this.append({
      routineId: before.id,
      entity: 'incident',
      action: 'deleted',
      summary: `Eliminó una incidencia en «${itemName}»`,
      changes,
      createdBy: actorId,
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private async append(event: NewRoutineEvent): Promise<void> {
    try {
      await this.history.append(event);
    } catch (err) {
      // La auditoría nunca debe romper la acción del usuario (ya ejecutada).
      this.logger.warn(
        `No se pudo registrar el historial de la rutina ${event.routineId}: ${String(err)}`,
      );
    }
  }

  private async itemNames(ids: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return new Map();
    const items = await this.items.findByIds(unique);
    return new Map(items.map((item) => [item.id, item.name]));
  }

  private async itemName(itemId: string): Promise<string> {
    const names = await this.itemNames([itemId]);
    return names.get(itemId) ?? 'un item';
  }

  private async itemNameOfAssignment(routine: Routine, assignmentId: string): Promise<string> {
    const assignment = routine.assignments.find((a) => a.id === assignmentId);
    if (!assignment) return 'un item';
    return this.itemName(assignment.routineItemId);
  }
}
