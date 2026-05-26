import { sql } from 'drizzle-orm';
import { Inject, Injectable } from '@nestjs/common';
import type { Database } from '../../../db/db.types';
import { DRIZZLE } from '../../../db/drizzle.tokens';
import type {
  GroupTransactionalRepositories,
  GroupUnitOfWork,
} from '../application/ports/unit-of-work';
import { DrizzleGroupRepository } from './drizzle-group.repository';
import { DrizzleGroupJoinPinRepository } from './drizzle-group-join-pin.repository';
import { DrizzleGroupMembershipRepository } from './drizzle-group-membership.repository';

/**
 * Adaptador de {@link GroupUnitOfWork} sobre Drizzle / node-postgres.
 *
 * Abre una transacción, construye repositorios ligados a ESA transacción y
 * ejecuta el trabajo. Si lanza, Drizzle hace rollback automáticamente.
 * Fija `request.jwt.claims` con SET LOCAL para que RLS pueda identificar
 * al usuario actuante.
 */
@Injectable()
export class DrizzleGroupUnitOfWork implements GroupUnitOfWork {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  run<T>(
    work: (repos: GroupTransactionalRepositories) => Promise<T>,
    options?: { actingUserId?: string },
  ): Promise<T> {
    return this.db.transaction(async (tx) => {
      if (options?.actingUserId) {
        const claims = JSON.stringify({ sub: options.actingUserId, role: 'authenticated' });
        await tx.execute(sql`select set_config('request.jwt.claims', ${claims}, true)`);
      }
      const repos: GroupTransactionalRepositories = {
        groups: new DrizzleGroupRepository(tx),
        groupMemberships: new DrizzleGroupMembershipRepository(tx),
        groupJoinPins: new DrizzleGroupJoinPinRepository(tx),
      };
      return work(repos);
    });
  }
}
