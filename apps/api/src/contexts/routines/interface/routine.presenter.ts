import type {
  RoutineAssignmentDto,
  RoutineDto,
  RoutineIncidentDto,
  RoutineItemDto,
  RoutineListItemDto,
} from '@cosasdecasa/contracts';
import type { Routine, RoutineAssignment, RoutineIncident } from '../domain/routine';
import type { RoutineItem } from '../domain/routine-item';

/**
 * Traduce entidades de dominio a DTOs del contrato público. Deriva aquí lo que
 * la BD no almacena: endDate, la fecha real de cada asignación y el
 * cumplimiento (assignedCount vs snapshot del target).
 */
export const RoutinePresenter = {
  toItemDto(item: RoutineItem): RoutineItemDto {
    return {
      id: item.id,
      familyId: item.familyId,
      name: item.name,
      targetTimesPerWeek: item.targetTimesPerWeek,
      defaultStartTime: item.defaultStartTime,
      defaultEndTime: item.defaultEndTime,
      tags: item.tags,
      archivedAt: item.archivedAt ? item.archivedAt.toISOString() : null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  },

  toRoutineDto(routine: Routine, items: RoutineItem[]): RoutineDto {
    const itemsById = new Map(items.map((item) => [item.id, item]));
    const incidents = routine.incidents;
    return {
      id: routine.id,
      familyId: routine.familyId,
      name: routine.name,
      startDate: routine.startDate,
      endDate: routine.endDate,
      selections: routine.selections.map((selection) => {
        const item = itemsById.get(selection.routineItemId);
        const assignedCount = routine.assignedCountOf(selection.routineItemId);
        return {
          routineItemId: selection.routineItemId,
          name: item?.name ?? 'Item eliminado',
          tags: item?.tags ?? [],
          targetTimesPerWeek: selection.targetTimesPerWeek,
          assignedCount,
          isCompliant: assignedCount >= selection.targetTimesPerWeek,
        };
      }),
      assignments: routine.assignments
        .sort((a, b) => a.dayIndex - b.dayIndex || a.startTime.localeCompare(b.startTime))
        .map((assignment) =>
          RoutinePresenter.toAssignmentDto(routine, assignment, incidents),
        ),
      createdBy: routine.createdBy,
      createdAt: routine.createdAt.toISOString(),
      updatedAt: routine.updatedAt.toISOString(),
    };
  },

  toListItemDto(routine: Routine): RoutineListItemDto {
    return {
      id: routine.id,
      familyId: routine.familyId,
      name: routine.name,
      startDate: routine.startDate,
      endDate: routine.endDate,
      itemCount: routine.selections.length,
      assignmentCount: routine.assignments.length,
      incidentCount: routine.incidents.length,
    };
  },

  toAssignmentDto(
    routine: Routine,
    assignment: RoutineAssignment,
    allIncidents: RoutineIncident[],
  ): RoutineAssignmentDto {
    return {
      id: assignment.id,
      routineId: routine.id,
      routineItemId: assignment.routineItemId,
      dayIndex: assignment.dayIndex,
      date: routine.dateOfDay(assignment.dayIndex),
      startTime: assignment.startTime,
      endTime: assignment.endTime,
      durationMinutes: assignment.durationMinutes,
      incidents: allIncidents
        .filter((incident) => incident.assignmentId === assignment.id)
        .map((incident) => RoutinePresenter.toIncidentDto(incident)),
    };
  },

  toIncidentDto(incident: RoutineIncident): RoutineIncidentDto {
    return {
      id: incident.id,
      assignmentId: incident.assignmentId,
      description: incident.description,
      lostMinutes: incident.lostMinutes,
      createdBy: incident.createdBy,
      createdAt: incident.createdAt.toISOString(),
    };
  },
};
