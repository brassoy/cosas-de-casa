import { Module } from '@nestjs/common';
import { IdentityAccessModule } from '../identity-access/identity-access.module';
import { DRIZZLE } from '../../db/drizzle.tokens';
import type { Database } from '../../db/db.types';

// ── Application ────────────────────────────────────────────────────────────────
import { FamilyStatsQuery } from './application/family-stats.query';

// ── Interface ─────────────────────────────────────────────────────────────────
import { StatsController } from './interface/stats.controller';

// ── Family (para el guard) ────────────────────────────────────────────────────
import { FAMILY_REPOSITORY } from '../family/domain/ports/family.repository';
import { DrizzleFamilyRepository } from '../family/infrastructure/drizzle-family.repository';
import { FamilyScopeGuard } from '../family/interface/family-scope.guard';

@Module({
  imports: [IdentityAccessModule],
  controllers: [StatsController],
  providers: [
    // ── Repositorio de familia (para el guard) ────────────────────────────
    {
      provide: FAMILY_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzleFamilyRepository(db),
    },

    // ── Guard ─────────────────────────────────────────────────────────────
    FamilyScopeGuard,

    // ── Read-model ─────────────────────────────────────────────────────────
    FamilyStatsQuery,
  ],
})
export class StatsModule {}
