import type {
  RoutineAssignmentRow,
  RoutineIncidentRow,
  RoutineItemRow,
  RoutineRow,
  RoutineSelectionRow,
} from '../../../db/schema';
import { Routine } from '../domain/routine';
import { RoutineItem } from '../domain/routine-item';

/** Traduce filas de BD a entidades de dominio. */
export const RoutineMapper = {
  toRoutineItem(row: RoutineItemRow): RoutineItem {
    return new RoutineItem({
      id: row.id,
      familyId: row.familyId,
      name: row.name,
      targetTimesPerWeek: row.targetTimesPerWeek,
      defaultStartTime: row.defaultStartTime,
      defaultEndTime: row.defaultEndTime,
      tags: row.tags,
      archivedAt: row.archivedAt ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  },

  toRoutine(
    row: RoutineRow,
    selections: RoutineSelectionRow[],
    assignments: RoutineAssignmentRow[],
    incidents: RoutineIncidentRow[],
  ): Routine {
    return new Routine({
      id: row.id,
      familyId: row.familyId,
      name: row.name ?? null,
      // Drizzle devuelve date como string 'YYYY-MM-DD'
      startDate: row.startDate,
      selections: selections.map((s) => ({
        routineItemId: s.routineItemId,
        targetTimesPerWeek: s.targetTimesPerWeek,
      })),
      assignments: assignments.map((a) => ({
        id: a.id,
        routineItemId: a.routineItemId,
        dayIndex: a.dayIndex,
        startTime: a.startTime,
        endTime: a.endTime,
        durationMinutes: a.durationMinutes,
      })),
      incidents: incidents.map((i) => ({
        id: i.id,
        assignmentId: i.assignmentId,
        description: i.description,
        lostMinutes: i.lostMinutes ?? null,
        createdBy: i.createdBy ?? null,
        createdAt: i.createdAt,
      })),
      createdBy: row.createdBy ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  },
};
