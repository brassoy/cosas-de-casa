import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type {
  RoutineStatsDto,
  RoutineStatsPerItem,
  RoutineStatsPerTag,
} from '@cosasdecasa/contracts';
import { DRIZZLE } from '../../../db/drizzle.tokens';
import type { DatabaseExecutor } from '../../../db/db.types';

/**
 * Read-model de estadísticas de rutinas (ADR-0011).
 *
 * Agregación SQL pura sobre las tablas del contexto, filtrando por familia y
 * por rango de fechas: entra toda rutina cuya semana [start_date, start_date+6]
 * SOLAPA [from, to]. El agregado por tag se deriva en TS del agregado por item
 * (los tags viajan aplanados en routine_items.tags).
 */
@Injectable()
export class RoutineStatsQuery {
  constructor(@Inject(DRIZZLE) private readonly db: DatabaseExecutor) {}

  async getStats(familyId: string, from?: string, to?: string): Promise<RoutineStatsDto> {
    const range = sql`
      ${from ? sql`AND r.start_date + 6 >= ${from}::date` : sql``}
      ${to ? sql`AND r.start_date <= ${to}::date` : sql``}
    `;

    // 1. Rutinas del rango.
    const routineRows = await this.db.execute(
      sql`
        SELECT COUNT(r.id) AS routine_count
        FROM routines r
        WHERE r.family_id = ${familyId} ${range}
      `,
    );
    const routineCount = toInt(
      (routineRows.rows[0] as { routine_count?: string | number })?.routine_count,
    );

    // 2. Selecciones por item (targets con snapshot + nº de rutinas).
    const selectionRows = await this.db.execute(
      sql`
        SELECT sel.routine_item_id, ri.name, ri.tags,
               COUNT(sel.routine_id) AS routine_count,
               SUM(sel.target_times_per_week) AS target_total
        FROM routine_selections sel
        INNER JOIN routines r ON r.id = sel.routine_id
        INNER JOIN routine_items ri ON ri.id = sel.routine_item_id
        WHERE r.family_id = ${familyId} ${range}
        GROUP BY sel.routine_item_id, ri.name, ri.tags
      `,
    );

    // 3. Asignaciones por item (sin join a incidencias para no inflar sumas).
    const assignmentRows = await this.db.execute(
      sql`
        SELECT a.routine_item_id,
               COUNT(a.id) AS assigned_total,
               SUM(a.duration_minutes) AS planned_minutes
        FROM routine_assignments a
        INNER JOIN routines r ON r.id = a.routine_id
        WHERE r.family_id = ${familyId} ${range}
        GROUP BY a.routine_item_id
      `,
    );
    const assignmentsByItem = new Map(
      (assignmentRows.rows as Array<{
        routine_item_id: string;
        assigned_total: string | number;
        planned_minutes: string | number;
      }>).map((row) => [
        row.routine_item_id,
        { assignedTotal: toInt(row.assigned_total), plannedMinutes: toInt(row.planned_minutes) },
      ]),
    );

    // 4. Incidencias por item.
    const incidentRows = await this.db.execute(
      sql`
        SELECT a.routine_item_id,
               COUNT(i.id) AS incident_count,
               SUM(COALESCE(i.lost_minutes, 0)) AS lost_minutes
        FROM routine_incidents i
        INNER JOIN routine_assignments a ON a.id = i.assignment_id
        INNER JOIN routines r ON r.id = a.routine_id
        WHERE r.family_id = ${familyId} ${range}
        GROUP BY a.routine_item_id
      `,
    );
    const incidentsByItem = new Map(
      (incidentRows.rows as Array<{
        routine_item_id: string;
        incident_count: string | number;
        lost_minutes: string | number;
      }>).map((row) => [
        row.routine_item_id,
        { incidentCount: toInt(row.incident_count), lostMinutes: toInt(row.lost_minutes) },
      ]),
    );

    // 5. Merge por item + agregado por tag en TS.
    const perItem: RoutineStatsPerItem[] = (
      selectionRows.rows as Array<{
        routine_item_id: string;
        name: string;
        tags: string[];
        routine_count: string | number;
        target_total: string | number;
      }>
    )
      .map((row) => {
        const assignment = assignmentsByItem.get(row.routine_item_id);
        const incident = incidentsByItem.get(row.routine_item_id);
        const targetTotal = toInt(row.target_total);
        const assignedTotal = assignment?.assignedTotal ?? 0;
        const plannedMinutes = assignment?.plannedMinutes ?? 0;
        const lostMinutes = incident?.lostMinutes ?? 0;
        return {
          routineItemId: row.routine_item_id,
          name: row.name,
          tags: row.tags ?? [],
          routineCount: toInt(row.routine_count),
          targetTotal,
          assignedTotal,
          complianceRate: targetTotal === 0 ? 1 : Math.min(1, assignedTotal / targetTotal),
          plannedMinutes,
          lostMinutes,
          actualMinutes: Math.max(0, plannedMinutes - lostMinutes),
          incidentCount: incident?.incidentCount ?? 0,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const perTagMap = new Map<string, RoutineStatsPerTag>();
    for (const row of perItem) {
      for (const tag of row.tags) {
        const entry =
          perTagMap.get(tag) ??
          { tag, plannedMinutes: 0, lostMinutes: 0, actualMinutes: 0, incidentCount: 0 };
        entry.plannedMinutes += row.plannedMinutes;
        entry.lostMinutes += row.lostMinutes;
        entry.actualMinutes += row.actualMinutes;
        entry.incidentCount += row.incidentCount;
        perTagMap.set(tag, entry);
      }
    }
    const perTag = [...perTagMap.values()].sort((a, b) => a.tag.localeCompare(b.tag));

    const targetTotal = perItem.reduce((sum, r) => sum + r.targetTotal, 0);
    const assignedTotal = perItem.reduce((sum, r) => sum + r.assignedTotal, 0);

    return {
      from: from ?? null,
      to: to ?? null,
      totals: {
        routineCount,
        plannedMinutes: perItem.reduce((sum, r) => sum + r.plannedMinutes, 0),
        lostMinutes: perItem.reduce((sum, r) => sum + r.lostMinutes, 0),
        actualMinutes: perItem.reduce((sum, r) => sum + r.actualMinutes, 0),
        incidentCount: perItem.reduce((sum, r) => sum + r.incidentCount, 0),
        targetTotal,
        assignedTotal,
        complianceRate: targetTotal === 0 ? 1 : Math.min(1, assignedTotal / targetTotal),
      },
      perItem,
      perTag,
    };
  }
}

function toInt(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : parseInt(value, 10) || 0;
}
