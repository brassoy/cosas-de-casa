import { sql } from 'drizzle-orm';
import { Inject, Injectable } from '@nestjs/common';
import type { Database } from '../../../db/db.types';
import { DRIZZLE } from '../../../db/drizzle.tokens';
import type {
  TransactionalRepositories,
  UnitOfWork,
} from '../application/ports/unit-of-work';
import { DrizzleFamilyRepository } from './drizzle-family.repository';
import { DrizzleJoinPinRepository } from './drizzle-join-pin.repository';
import { DrizzleMembershipRepository } from './drizzle-membership.repository';

/**
 * Adaptador de {@link UnitOfWork} sobre Drizzle / node-postgres.
 *
 * Abre una transacción, construye repositorios ligados a ESA transacción y
 * ejecuta el trabajo. Si lanza, Drizzle hace rollback automáticamente.
 *
 * Defensa en profundidad (RLS): si se pasa `actingUserId`, fija
 * `request.jwt.claims` con `SET LOCAL` al inicio de la transacción para que las
 * políticas RLS de Postgres puedan identificar al usuario
 * (`current_setting('request.jwt.claims', true)::json->>'sub'`). El guard de
 * aplicación sigue siendo el enforcement PRIMARIO; RLS es la segunda barrera.
 */
@Injectable()
export class DrizzleUnitOfWork implements UnitOfWork {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  run<T>(
    work: (repos: TransactionalRepositories) => Promise<T>,
    options?: { actingUserId?: string },
  ): Promise<T> {
    return this.db.transaction(async (tx) => {
      if (options?.actingUserId) {
        // set_config(setting, value, is_local=true) = SET LOCAL, parametrizado
        // de forma segura (sin interpolar el uid en el texto SQL).
        const claims = JSON.stringify({ sub: options.actingUserId, role: 'authenticated' });
        await tx.execute(sql`select set_config('request.jwt.claims', ${claims}, true)`);
      }
      const repos: TransactionalRepositories = {
        families: new DrizzleFamilyRepository(tx),
        memberships: new DrizzleMembershipRepository(tx),
        joinPins: new DrizzleJoinPinRepository(tx),
      };
      return work(repos);
    });
  }
}
