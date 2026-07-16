import type { RoutineSummaryDto } from '@cosasdecasa/contracts';
import type { Routine } from '../domain/routine';
import type { RoutineItem } from '../domain/routine-item';

/**
 * Resumen de una rutina (lógica pura, exportada para tests).
 *
 * Se calcula EN MEMORIA desde el agregado hidratado: una rutina son 7 días y
 * unos pocos items, no hace falta SQL. Por item: tiempo planificado (suma de
 * duraciones), minutos perdidos (incidencias) y tiempo real (planificado −
 * perdido, nunca negativo). Por tag: agregado de los items que lo llevan.
 */
export function computeRoutineSummary(
  routine: Routine,
  items: RoutineItem[],
): RoutineSummaryDto {
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const assignments = routine.assignments;
  const incidents = routine.incidents;

  const lostByAssignment = new Map<string, { lost: number; count: number }>();
  for (const incident of incidents) {
    const entry = lostByAssignment.get(incident.assignmentId) ?? { lost: 0, count: 0 };
    entry.lost += incident.lostMinutes ?? 0;
    entry.count += 1;
    lostByAssignment.set(incident.assignmentId, entry);
  }

  const perItem = routine.selections.map((selection) => {
    const item = itemsById.get(selection.routineItemId);
    const own = assignments.filter((a) => a.routineItemId === selection.routineItemId);
    const plannedMinutes = own.reduce((sum, a) => sum + a.durationMinutes, 0);
    let lostMinutes = 0;
    let incidentCount = 0;
    for (const assignment of own) {
      const entry = lostByAssignment.get(assignment.id);
      if (entry) {
        lostMinutes += entry.lost;
        incidentCount += entry.count;
      }
    }
    return {
      routineItemId: selection.routineItemId,
      name: item?.name ?? 'Item eliminado',
      tags: item?.tags ?? [],
      targetTimesPerWeek: selection.targetTimesPerWeek,
      assignedCount: own.length,
      isCompliant: own.length >= selection.targetTimesPerWeek,
      plannedMinutes,
      lostMinutes,
      actualMinutes: Math.max(0, plannedMinutes - lostMinutes),
      incidentCount,
    };
  });

  const perTagMap = new Map<
    string,
    { plannedMinutes: number; lostMinutes: number; actualMinutes: number; incidentCount: number }
  >();
  for (const row of perItem) {
    for (const tag of row.tags) {
      const entry =
        perTagMap.get(tag) ??
        { plannedMinutes: 0, lostMinutes: 0, actualMinutes: 0, incidentCount: 0 };
      entry.plannedMinutes += row.plannedMinutes;
      entry.lostMinutes += row.lostMinutes;
      entry.actualMinutes += row.actualMinutes;
      entry.incidentCount += row.incidentCount;
      perTagMap.set(tag, entry);
    }
  }
  const perTag = [...perTagMap.entries()]
    .map(([tag, entry]) => ({ tag, ...entry }))
    .sort((a, b) => a.tag.localeCompare(b.tag));

  const targetTotal = perItem.reduce((sum, r) => sum + r.targetTimesPerWeek, 0);
  const assignedTotal = perItem.reduce((sum, r) => sum + r.assignedCount, 0);

  return {
    routineId: routine.id,
    startDate: routine.startDate,
    endDate: routine.endDate,
    perItem,
    perTag,
    totals: {
      plannedMinutes: perItem.reduce((sum, r) => sum + r.plannedMinutes, 0),
      lostMinutes: perItem.reduce((sum, r) => sum + r.lostMinutes, 0),
      actualMinutes: perItem.reduce((sum, r) => sum + r.actualMinutes, 0),
      incidentCount: incidents.length,
      complianceRate: targetTotal === 0 ? 1 : Math.min(1, assignedTotal / targetTotal),
    },
  };
}
