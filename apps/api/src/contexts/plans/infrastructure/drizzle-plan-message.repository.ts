import { and, desc, eq, lt } from 'drizzle-orm';
import type { DatabaseExecutor } from '../../../db/db.types';
import { planMessages, appUsers } from '../../../db/schema';
import type { PlanMessage } from '../domain/plan-message';
import type {
  PlanMessageRepository,
  ListMessagesParams,
  PlanMessageWithUser,
} from '../domain/ports/plan-message.repository';

export class DrizzlePlanMessageRepository implements PlanMessageRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  async insert(message: PlanMessage): Promise<void> {
    await this.db.insert(planMessages).values({
      id: message.id,
      planId: message.planId,
      userId: message.userId,
      body: message.body,
      createdAt: message.createdAt,
    });
  }

  async listWithUsers(params: ListMessagesParams): Promise<PlanMessageWithUser[]> {
    const limit = params.limit ?? 50;

    const conditions = [eq(planMessages.planId, params.planId)];
    if (params.before) {
      conditions.push(lt(planMessages.createdAt, params.before));
    }

    const rows = await this.db
      .select({
        id: planMessages.id,
        planId: planMessages.planId,
        userId: planMessages.userId,
        body: planMessages.body,
        createdAt: planMessages.createdAt,
        displayName: appUsers.displayName,
      })
      .from(planMessages)
      .leftJoin(appUsers, eq(appUsers.id, planMessages.userId))
      .where(and(...conditions))
      .orderBy(desc(planMessages.createdAt))
      .limit(limit);

    // Devuelve en orden ascendente para que el cliente muestre el más antiguo arriba.
    return rows.reverse().map((row) => ({
      id: row.id,
      planId: row.planId,
      userId: row.userId,
      displayName: row.displayName,
      body: row.body,
      createdAt: row.createdAt,
    }));
  }
}
