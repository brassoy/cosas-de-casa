import { and, eq, inArray, ne, sql, desc } from 'drizzle-orm';
import type { DatabaseExecutor } from '../../../db/db.types';
import {
  routineAssignments,
  routineIncidents,
  routines,
  routineSelections,
  type RoutineAssignmentRow,
  type RoutineIncidentRow,
  type RoutineRow,
  type RoutineSelectionRow,
} from '../../../db/schema';
import type { Routine } from '../domain/routine';
import type {
  ListRoutinesFilter,
  RoutineRepository,
} from '../domain/ports/routine.repository';
import { RoutineMapper } from './routine.mapper';

/**
 * Adaptador Drizzle de {@link RoutineRepository}.
 *
 * `save` sincroniza los hijos por DIFF (insert/update/delete) en transacción:
 * nunca borra-y-reinserta asignaciones, porque cambiarían de id y las
 * incidencias colgarían de filas muertas.
 */
export class DrizzleRoutineRepository implements RoutineRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  async create(routine: Routine): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(routines).values({
        id: routine.id,
        familyId: routine.familyId,
        name: routine.name,
        startDate: routine.startDate,
        createdBy: routine.createdBy ?? undefined,
        createdAt: routine.createdAt,
        updatedAt: routine.updatedAt,
      });
      const selections = routine.selections;
      if (selections.length > 0) {
        await tx.insert(routineSelections).values(
          selections.map((s) => ({
            routineId: routine.id,
            routineItemId: s.routineItemId,
            targetTimesPerWeek: s.targetTimesPerWeek,
          })),
        );
      }
      const assignments = routine.assignments;
      if (assignments.length > 0) {
        await tx.insert(routineAssignments).values(
          assignments.map((a) => ({ ...a, routineId: routine.id })),
        );
      }
    });
  }

  async findById(routineId: string): Promise<Routine | null> {
    const rows = await this.db
      .select()
      .from(routines)
      .where(eq(routines.id, routineId))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    const [hydrated] = await this.hydrate([row]);
    return hydrated ?? null;
  }

  async findByFamily(familyId: string, filter?: ListRoutinesFilter): Promise<Routine[]> {
    const conditions = [eq(routines.familyId, familyId)];
    if (filter?.from) {
      // La rutina entra si su semana [start, start+6] toca el rango.
      conditions.push(sql`${routines.startDate} + 6 >= ${filter.from}::date`);
    }
    if (filter?.to) {
      conditions.push(sql`${routines.startDate} <= ${filter.to}::date`);
    }
    const rows = await this.db
      .select()
      .from(routines)
      .where(and(...conditions))
      .orderBy(desc(routines.startDate));
    return this.hydrate(rows);
  }

  async findOverlapping(
    familyId: string,
    startDate: string,
    excludeRoutineId?: string,
  ): Promise<Routine | null> {
    const conditions = [
      eq(routines.familyId, familyId),
      // Dos semanas de 7 días solapan si sus inicios distan 6 días o menos.
      sql`${routines.startDate} BETWEEN ${startDate}::date - 6 AND ${startDate}::date + 6`,
    ];
    if (excludeRoutineId) {
      conditions.push(ne(routines.id, excludeRoutineId));
    }
    const rows = await this.db
      .select()
      .from(routines)
      .where(and(...conditions))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    const [hydrated] = await this.hydrate([row]);
    return hydrated ?? null;
  }

  async save(routine: Routine): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(routines)
        .set({ name: routine.name, updatedAt: routine.updatedAt })
        .where(eq(routines.id, routine.id));

      // ── Selections (PK compuesta routineId+itemId) ──
      const currentSelections = await tx
        .select()
        .from(routineSelections)
        .where(eq(routineSelections.routineId, routine.id));
      const nextSelections = routine.selections;
      const nextSelectionIds = new Set(nextSelections.map((s) => s.routineItemId));
      const currentSelectionIds = new Set(currentSelections.map((s) => s.routineItemId));

      const removedSelectionIds = [...currentSelectionIds].filter(
        (id) => !nextSelectionIds.has(id),
      );
      if (removedSelectionIds.length > 0) {
        await tx
          .delete(routineSelections)
          .where(
            and(
              eq(routineSelections.routineId, routine.id),
              inArray(routineSelections.routineItemId, removedSelectionIds),
            ),
          );
      }
      const newSelections = nextSelections.filter(
        (s) => !currentSelectionIds.has(s.routineItemId),
      );
      if (newSelections.length > 0) {
        await tx.insert(routineSelections).values(
          newSelections.map((s) => ({
            routineId: routine.id,
            routineItemId: s.routineItemId,
            targetTimesPerWeek: s.targetTimesPerWeek,
          })),
        );
      }

      // ── Assignments (diff por id; update de las que cambian) ──
      const currentAssignments = await tx
        .select()
        .from(routineAssignments)
        .where(eq(routineAssignments.routineId, routine.id));
      const nextAssignments = routine.assignments;
      const currentById = new Map(currentAssignments.map((a) => [a.id, a]));
      const nextIds = new Set(nextAssignments.map((a) => a.id));

      const removedAssignmentIds = currentAssignments
        .filter((a) => !nextIds.has(a.id))
        .map((a) => a.id);
      if (removedAssignmentIds.length > 0) {
        // Las incidencias de esas asignaciones caen por FK cascade.
        await tx
          .delete(routineAssignments)
          .where(inArray(routineAssignments.id, removedAssignmentIds));
      }
      for (const assignment of nextAssignments) {
        const current = currentById.get(assignment.id);
        if (!current) {
          await tx.insert(routineAssignments).values({ ...assignment, routineId: routine.id });
        } else if (
          current.dayIndex !== assignment.dayIndex ||
          current.startTime !== assignment.startTime ||
          current.endTime !== assignment.endTime ||
          current.durationMinutes !== assignment.durationMinutes
        ) {
          await tx
            .update(routineAssignments)
            .set({
              dayIndex: assignment.dayIndex,
              startTime: assignment.startTime,
              endTime: assignment.endTime,
              durationMinutes: assignment.durationMinutes,
            })
            .where(eq(routineAssignments.id, assignment.id));
        }
      }

      // ── Incidents (inmutables: solo insert de nuevas y delete de quitadas) ──
      const remainingAssignmentIds = nextAssignments.map((a) => a.id);
      const currentIncidents = remainingAssignmentIds.length
        ? await tx
            .select()
            .from(routineIncidents)
            .where(inArray(routineIncidents.assignmentId, remainingAssignmentIds))
        : [];
      const nextIncidents = routine.incidents;
      const currentIncidentIds = new Set(currentIncidents.map((i) => i.id));
      const nextIncidentIds = new Set(nextIncidents.map((i) => i.id));

      const removedIncidentIds = [...currentIncidentIds].filter(
        (id) => !nextIncidentIds.has(id),
      );
      if (removedIncidentIds.length > 0) {
        await tx
          .delete(routineIncidents)
          .where(inArray(routineIncidents.id, removedIncidentIds));
      }
      const newIncidents = nextIncidents.filter((i) => !currentIncidentIds.has(i.id));
      if (newIncidents.length > 0) {
        await tx.insert(routineIncidents).values(
          newIncidents.map((i) => ({
            id: i.id,
            assignmentId: i.assignmentId,
            description: i.description,
            lostMinutes: i.lostMinutes,
            createdBy: i.createdBy ?? undefined,
            createdAt: i.createdAt,
          })),
        );
      }
    });
  }

  async deleteById(routineId: string): Promise<void> {
    await this.db.delete(routines).where(eq(routines.id, routineId));
  }

  /** Hidrata rutinas con sus hijos en 3 queries batcheadas (evita N+1). */
  private async hydrate(rows: RoutineRow[]): Promise<Routine[]> {
    if (rows.length === 0) return [];
    const routineIds = rows.map((r) => r.id);

    const selections = await this.db
      .select()
      .from(routineSelections)
      .where(inArray(routineSelections.routineId, routineIds));
    const assignments = await this.db
      .select()
      .from(routineAssignments)
      .where(inArray(routineAssignments.routineId, routineIds));
    const assignmentIds = assignments.map((a) => a.id);
    const incidents = assignmentIds.length
      ? await this.db
          .select()
          .from(routineIncidents)
          .where(inArray(routineIncidents.assignmentId, assignmentIds))
          .orderBy(routineIncidents.createdAt)
      : [];

    const selectionsByRoutine = groupBy(selections, (s) => s.routineId);
    const assignmentsByRoutine = groupBy(assignments, (a) => a.routineId);
    const routineIdByAssignment = new Map(assignments.map((a) => [a.id, a.routineId]));
    const incidentsByRoutine = groupBy(
      incidents,
      (i) => routineIdByAssignment.get(i.assignmentId) ?? '',
    );

    return rows.map((row) =>
      RoutineMapper.toRoutine(
        row,
        selectionsByRoutine.get(row.id) ?? [],
        assignmentsByRoutine.get(row.id) ?? [],
        incidentsByRoutine.get(row.id) ?? [],
      ),
    );
  }
}

function groupBy<T extends RoutineSelectionRow | RoutineAssignmentRow | RoutineIncidentRow>(
  rows: T[],
  key: (row: T) => string,
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    const list = map.get(k);
    if (list) list.push(row);
    else map.set(k, [row]);
  }
  return map;
}
