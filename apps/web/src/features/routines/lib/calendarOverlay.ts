/**
 * Overlay virtual de rutinas sobre el calendario.
 *
 * Las asignaciones de rutina NO son filas de `calendar_events`: se proyectan en
 * lectura como eventos "fijados" de solo lectura con id sintético
 * `routine_<assignmentId>`. El calendario los pinta con su franja horaria y, al
 * abrirlos, navega a la rutina en lugar de abrir el modal de evento.
 */

import type { CalendarEventDto, RoutineDto } from '@cosasdecasa/contracts';
import { addDaysYMD, routineEventId } from '../types';

/** Info de rutina por celda de día del calendario (borde por semana). */
export interface RoutineDayInfo {
  routineId: string;
  /** Alterna 0/1 entre rutinas consecutivas para separarlas visualmente. */
  colorIndex: 0 | 1;
}

/** Convierte una fecha local "YYYY-MM-DD" + "HH:mm" a ISO UTC. */
function toLocalISO(ymd: string, time: string): string {
  return new Date(`${ymd}T${time}:00`).toISOString();
}

/**
 * Proyecta las asignaciones de las rutinas como eventos virtuales de calendario
 * (solo lectura). Una ventana que cruza medianoche termina al día siguiente.
 */
export function routinesToVirtualEvents(routines: RoutineDto[]): CalendarEventDto[] {
  const events: CalendarEventDto[] = [];
  for (const routine of routines) {
    const nameByItem = new Map(routine.selections.map((s) => [s.routineItemId, s.name]));
    for (const assignment of routine.assignments) {
      // end <= start ⇒ la ventana cruza medianoche y termina al día siguiente.
      const crossesMidnight = assignment.endTime <= assignment.startTime;
      const endDate = crossesMidnight ? addDaysYMD(assignment.date, 1) : assignment.date;
      events.push({
        id: routineEventId(assignment.id),
        familyId: routine.familyId,
        title: `📌 ${nameByItem.get(assignment.routineItemId) ?? 'Rutina'}`,
        description: null,
        location: null,
        startsAt: toLocalISO(assignment.date, assignment.startTime),
        endsAt: toLocalISO(endDate, assignment.endTime),
        allDay: false,
        recurrenceRule: null,
        createdBy: null,
        attendees: [],
        createdAt: routine.createdAt,
        updatedAt: routine.updatedAt,
      });
    }
  }
  return events;
}

/**
 * Mapa fecha → rutina para el borde por semana del calendario. Las rutinas se
 * ordenan por startDate y alternan colorIndex 0/1.
 */
export function buildRoutineDayMap(
  routines: Pick<RoutineDto, 'id' | 'startDate'>[],
): Record<string, RoutineDayInfo> {
  const map: Record<string, RoutineDayInfo> = {};
  const sorted = [...routines].sort((a, b) => a.startDate.localeCompare(b.startDate));
  sorted.forEach((routine, index) => {
    const colorIndex = (index % 2) as 0 | 1;
    for (let day = 0; day < 7; day++) {
      map[addDaysYMD(routine.startDate, day)] = { routineId: routine.id, colorIndex };
    }
  });
  return map;
}

/** Mapa id de evento virtual → id de rutina, para navegar desde el calendario. */
export function buildRoutineByEventId(routines: RoutineDto[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const routine of routines) {
    for (const assignment of routine.assignments) {
      map.set(routineEventId(assignment.id), routine.id);
    }
  }
  return map;
}
