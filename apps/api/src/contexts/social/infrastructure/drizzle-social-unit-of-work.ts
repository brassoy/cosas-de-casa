import { sql } from 'drizzle-orm';
import { Inject, Injectable } from '@nestjs/common';
import type { Database } from '../../../db/db.types';
import { DRIZZLE } from '../../../db/drizzle.tokens';
import type { SocialTransactionalRepositories, SocialUnitOfWork } from '../application/ports/unit-of-work';
import { DrizzleFriendInvitePinRepository } from './drizzle-friend-invite-pin.repository';
import { DrizzleFriendLinkRepository } from './drizzle-friend-link.repository';

@Injectable()
export class DrizzleSocialUnitOfWork implements SocialUnitOfWork {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  run<T>(
    work: (repos: SocialTransactionalRepositories) => Promise<T>,
    options?: { actingUserId?: string },
  ): Promise<T> {
    return this.db.transaction(async (tx) => {
      if (options?.actingUserId) {
        const claims = JSON.stringify({ sub: options.actingUserId, role: 'authenticated' });
        await tx.execute(sql`select set_config('request.jwt.claims', ${claims}, true)`);
      }
      const repos: SocialTransactionalRepositories = {
        friendInvitePins: new DrizzleFriendInvitePinRepository(tx),
        friendLinks: new DrizzleFriendLinkRepository(tx),
      };
      return work(repos);
    });
  }
}
