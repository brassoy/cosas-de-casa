import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../../../db/drizzle.tokens';
import type { DatabaseExecutor } from '../../../db/db.types';
import { count, eq, sql } from 'drizzle-orm';
import { memberships, fridgeItems, appUsers } from '../../../db/schema';
import type { StatsDto, MemberStatsDto, BadgeDto } from '@cosasdecasa/contracts';

/**
 * Read-model de estadísticas de familia.
 *
 * Consulta SQL pura sobre las tablas existentes, sin acoplar a otros contextos
 * a través de sus puertos — es deliberadamente un agregado de lectura.
 *
 * Cálculo de puntos (derivado, no almacenado):
 *  +1 por ítem de lista añadido (shopping_items.created_by)
 *  +5 por tarea completada (tasks.status=DONE, created_by o assignee)
 *  +1 por ítem de nevera añadido (fridge_items.created_by)
 */
@Injectable()
export class FamilyStatsQuery {
  constructor(@Inject(DRIZZLE) private readonly db: DatabaseExecutor) {}

  async getStats(familyId: string): Promise<StatsDto> {
    const members = await this.getMemberStats(familyId);

    const totalShopping = members.reduce((s, m) => s + m.shoppingItemsAdded, 0);
    const totalTasks = members.reduce((s, m) => s + m.tasksCompleted, 0);
    const totalFridge = members.reduce((s, m) => s + m.fridgeItemsAdded, 0);

    return {
      familyId,
      totalShoppingItemsAdded: totalShopping,
      totalTasksCompleted: totalTasks,
      totalFridgeItemsAdded: totalFridge,
      members,
    };
  }

  async getMemberStats(familyId: string): Promise<MemberStatsDto[]> {
    // 1. Obtener miembros de la familia.
    const memberRows = await this.db
      .select({
        userId: memberships.userId,
        displayName: appUsers.displayName,
        email: appUsers.email,
      })
      .from(memberships)
      .leftJoin(appUsers, eq(memberships.userId, appUsers.id))
      .where(eq(memberships.familyId, familyId));

    if (memberRows.length === 0) return [];

    // 2. Ítems de lista añadidos por cada usuario en esta familia.
    //    Usamos SQL puro para evitar el join complejo con subquery de familia.
    const shoppingRows = await this.db.execute(
      sql`
        SELECT si.created_by AS user_id, COUNT(si.id) AS cnt
        FROM shopping_items si
        INNER JOIN shopping_lists sl ON sl.id = si.list_id
        WHERE sl.family_id = ${familyId}
          AND si.created_by IS NOT NULL
        GROUP BY si.created_by
      `,
    );

    const shoppingMap = new Map<string, number>(
      (shoppingRows.rows as Array<{ user_id: string; cnt: string }>).map((r) => [
        r.user_id,
        parseInt(r.cnt, 10),
      ]),
    );

    // 3. Tareas completadas (creadas o asignadas) por cada usuario en esta familia.
    const tasksDoneRows = await this.db.execute(
      sql`
        SELECT u.user_id, COUNT(DISTINCT u.task_id) AS cnt
        FROM (
          SELECT created_by AS user_id, id AS task_id
          FROM tasks
          WHERE family_id = ${familyId}
            AND status = 'DONE'
            AND created_by IS NOT NULL
          UNION ALL
          SELECT ta.user_id, ta.task_id
          FROM task_assignees ta
          INNER JOIN tasks t ON t.id = ta.task_id
          WHERE t.family_id = ${familyId}
            AND t.status = 'DONE'
        ) u
        GROUP BY u.user_id
      `,
    );

    const tasksMap = new Map<string, number>(
      (tasksDoneRows.rows as Array<{ user_id: string; cnt: string }>).map((r) => [
        r.user_id,
        parseInt(r.cnt, 10),
      ]),
    );

    // 4. Ítems de nevera añadidos por usuario en esta familia.
    const fridgeCounts = await this.db
      .select({
        userId: fridgeItems.createdBy,
        cnt: count(fridgeItems.id),
      })
      .from(fridgeItems)
      .where(
        // Los productos tirados (DISCARDED) no cuentan para el badge de la nevera.
        sql`${fridgeItems.familyId} = ${familyId} AND ${fridgeItems.createdBy} IS NOT NULL AND ${fridgeItems.location} <> 'DISCARDED'`,
      )
      .groupBy(fridgeItems.createdBy);

    const fridgeMap = new Map<string, number>(
      fridgeCounts
        .filter((r) => r.userId !== null)
        .map((r) => [r.userId as string, Number(r.cnt)]),
    );

    // 5. Construir stats por miembro.
    return memberRows.map((m) => {
      const shopping = shoppingMap.get(m.userId) ?? 0;
      const tasksDone = tasksMap.get(m.userId) ?? 0;
      const fridge = fridgeMap.get(m.userId) ?? 0;
      const points = shopping * 1 + tasksDone * 5 + fridge * 1;
      const badges = computeBadges(shopping, tasksDone, fridge, points);

      return {
        userId: m.userId,
        displayName: m.displayName ?? null,
        email: m.email ?? '',
        shoppingItemsAdded: shopping,
        tasksCompleted: tasksDone,
        fridgeItemsAdded: fridge,
        points,
        currentStreak: 0,
        badges,
      };
    });
  }
}

// ── Cálculo de logros (lógica pura, exportada para tests) ────────────────────

export function computeBadges(
  shopping: number,
  tasksDone: number,
  fridge: number,
  points: number,
): BadgeDto[] {
  const earned: BadgeDto[] = [];
  const now = new Date().toISOString();

  if (shopping >= 1) {
    earned.push({
      id: 'first_item',
      name: 'Primer ítem',
      description: 'Has añadido tu primer ítem a la lista.',
      earnedAt: now,
    });
  }
  if (shopping >= 10) {
    earned.push({
      id: 'shopper_10',
      name: 'Comprador activo',
      description: 'Has añadido 10 ítems a listas de la compra.',
      earnedAt: now,
    });
  }
  if (tasksDone >= 1) {
    earned.push({
      id: 'first_task',
      name: 'Primera tarea',
      description: 'Has completado tu primera tarea.',
      earnedAt: now,
    });
  }
  if (tasksDone >= 5) {
    earned.push({
      id: 'task_master',
      name: 'Maestro de las tareas',
      description: 'Has completado 5 tareas.',
      earnedAt: now,
    });
  }
  if (fridge >= 5) {
    earned.push({
      id: 'fridge_keeper',
      name: 'Guardián de la nevera',
      description: 'Has registrado 5 ítems en la nevera.',
      earnedAt: now,
    });
  }
  if (points >= 50) {
    earned.push({
      id: 'points_50',
      name: '50 puntos',
      description: 'Has alcanzado 50 puntos.',
      earnedAt: now,
    });
  }

  return earned;
}
