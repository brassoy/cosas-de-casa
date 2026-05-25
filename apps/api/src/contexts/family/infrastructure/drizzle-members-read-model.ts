import { asc, eq } from 'drizzle-orm';
import { Inject, Injectable } from '@nestjs/common';
import type { Database } from '../../../db/db.types';
import { DRIZZLE } from '../../../db/drizzle.tokens';
import { appUsers, memberships } from '../../../db/schema';
import type { MembersReadModel, MemberView } from '../application/ports/members-read-model';

/**
 * Adaptador Drizzle del read-model de miembros. Une `memberships` con
 * `app_users` para devolver el nombre visible junto con el rol.
 */
@Injectable()
export class DrizzleMembersReadModel implements MembersReadModel {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async listByFamily(familyId: string): Promise<MemberView[]> {
    const rows = await this.db
      .select({
        userId: memberships.userId,
        displayName: appUsers.displayName,
        role: memberships.role,
        joinedAt: memberships.joinedAt,
      })
      .from(memberships)
      .innerJoin(appUsers, eq(appUsers.id, memberships.userId))
      .where(eq(memberships.familyId, familyId))
      .orderBy(asc(memberships.joinedAt));

    return rows.map((row) => ({
      userId: row.userId,
      displayName: row.displayName,
      role: row.role,
      joinedAt: row.joinedAt,
    }));
  }
}
