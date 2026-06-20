import { count, eq } from 'drizzle-orm';
import type { Database } from '../../../db/db.types';
import {
  appUsers,
  calendarEvents,
  families,
  fridgeItems,
  groupMemberships,
  groups,
  itemComments,
  memberships,
  planMessages,
  plans,
  pushSubscriptions,
  receipts,
  savedPlaces,
  shoppingItems,
  tasks,
} from '../../../db/schema';
import type {
  PersonalDataExport,
  PersonalDataExportRepository,
} from '../domain/ports/personal-data-export.repository';

/**
 * Adaptador Drizzle de {@link PersonalDataExportRepository}. Lee tablas de varios
 * contextos (es transversal por naturaleza, como la baja) a nivel de
 * INFRAESTRUCTURA. La API respeta RLS, así que solo lee filas accesibles para el
 * usuario; el caso de uso garantiza que es su propia cuenta (`userId` del JWT).
 */
export class DrizzlePersonalDataExportRepository implements PersonalDataExportRepository {
  constructor(private readonly db: Database) {}

  async exportFor(userId: string): Promise<PersonalDataExport> {
    const [profileRow] = await this.db
      .select({
        id: appUsers.id,
        email: appUsers.email,
        displayName: appUsers.displayName,
        avatarUrl: appUsers.avatarUrl,
        createdAt: appUsers.createdAt,
      })
      .from(appUsers)
      .where(eq(appUsers.id, userId));

    const familyRows = await this.db
      .select({ familyId: memberships.familyId, name: families.name, role: memberships.role })
      .from(memberships)
      .innerJoin(families, eq(families.id, memberships.familyId))
      .where(eq(memberships.userId, userId));

    const groupRows = await this.db
      .select({ groupId: groupMemberships.groupId, name: groups.name, role: groupMemberships.role })
      .from(groupMemberships)
      .innerJoin(groups, eq(groups.id, groupMemberships.groupId))
      .where(eq(groupMemberships.userId, userId));

    // Contenido que el usuario creó o aportó (rows completas; sin secretos).
    const [
      shoppingItemsRows,
      commentsRows,
      tasksRows,
      fridgeRows,
      eventsRows,
      placesRows,
      plansRows,
      messagesRows,
      receiptsRows,
    ] = await Promise.all([
      this.db.select().from(shoppingItems).where(eq(shoppingItems.createdBy, userId)),
      this.db.select().from(itemComments).where(eq(itemComments.authorId, userId)),
      this.db.select().from(tasks).where(eq(tasks.createdBy, userId)),
      this.db.select().from(fridgeItems).where(eq(fridgeItems.createdBy, userId)),
      this.db.select().from(calendarEvents).where(eq(calendarEvents.createdBy, userId)),
      this.db.select().from(savedPlaces).where(eq(savedPlaces.createdBy, userId)),
      this.db.select().from(plans).where(eq(plans.createdBy, userId)),
      this.db.select().from(planMessages).where(eq(planMessages.userId, userId)),
      this.db.select().from(receipts).where(eq(receipts.createdBy, userId)),
    ]);

    const [pushCountRow] = await this.db
      .select({ value: count() })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));

    return {
      profile: {
        id: profileRow?.id ?? userId,
        email: profileRow?.email ?? '',
        displayName: profileRow?.displayName ?? null,
        avatarUrl: profileRow?.avatarUrl ?? null,
        createdAt: profileRow?.createdAt?.toISOString() ?? null,
      },
      families: familyRows.map((r) => ({ familyId: r.familyId, name: r.name, role: String(r.role) })),
      groups: groupRows.map((r) => ({ groupId: r.groupId, name: r.name, role: String(r.role) })),
      shoppingItems: shoppingItemsRows,
      comments: commentsRows,
      tasks: tasksRows,
      fridgeItems: fridgeRows,
      calendarEvents: eventsRows,
      savedPlaces: placesRows,
      plans: plansRows,
      planMessages: messagesRows,
      receipts: receiptsRows,
      pushSubscriptionsCount: Number(pushCountRow?.value ?? 0),
    };
  }
}
