import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IdentityAccessModule } from '../identity-access/identity-access.module';
import { DRIZZLE } from '../../db/drizzle.tokens';
import type { Database } from '../../db/db.types';
import type { Env } from '../../config/env.config';

// ── Domain ports ─────────────────────────────────────────────────────────────
import { FAMILY_REPOSITORY } from './domain/ports/family.repository';

// ── Application ports ────────────────────────────────────────────────────────
import { UNIT_OF_WORK } from './application/ports/unit-of-work';
import { HASHER } from './application/ports/hasher';
import { ID_GENERATOR } from './application/ports/id-generator';
import { CLOCK } from './application/ports/clock';
import { RANDOM_BYTES } from './application/ports/random-bytes';
import { MEMBERS_READ_MODEL } from './application/ports/members-read-model';

// ── Use cases ────────────────────────────────────────────────────────────────
import { CreateFamilyUseCase } from './application/create-family.use-case';
import { ListMyFamiliesUseCase } from './application/list-my-families.use-case';
import { GenerateJoinPinUseCase } from './application/generate-join-pin.use-case';
import { JoinFamilyByPinUseCase } from './application/join-family-by-pin.use-case';
import { ListMembersUseCase } from './application/list-members.use-case';
import { LeaveFamilyUseCase } from './application/leave-family.use-case';
import { RevokeActivePinUseCase } from './application/revoke-active-pin.use-case';
import { UpdateFamilyUseCase } from './application/update-family.use-case';
import { DeleteFamilyUseCase } from './application/delete-family.use-case';
import { ExpelMemberUseCase } from './application/expel-member.use-case';
import { ChangeMemberRoleUseCase } from './application/change-member-role.use-case';

// ── Infrastructure ──────────────────────────────────────────────────────────
import { DrizzleFamilyRepository } from './infrastructure/drizzle-family.repository';
import { DrizzleUnitOfWork } from './infrastructure/drizzle-unit-of-work';
import { ScryptHasher, HASHER_PEPPER } from './infrastructure/scrypt-hasher';
import { UuidIdGenerator } from './infrastructure/uuid-id-generator';
import { SystemClock } from './infrastructure/system-clock';
import { CryptoRandomBytes } from './infrastructure/crypto-random-bytes';
import { DrizzleMembersReadModel } from './infrastructure/drizzle-members-read-model';

// ── Interface ────────────────────────────────────────────────────────────────
import { FamilyController } from './interface/family.controller';
import { FamilyScopeGuard } from './interface/family-scope.guard';
import { AuthController } from '../identity-access/interface/auth.controller';

// ── Common (rate-limit) ───────────────────────────────────────────────────────
import { RateLimitGuard } from '../../common/rate-limit.guard';

@Module({
  imports: [IdentityAccessModule],
  controllers: [FamilyController, AuthController],
  providers: [
    // ── Infrastructure ────────────────────────────────────────────────────
    {
      provide: HASHER_PEPPER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): string =>
        config.get('JOIN_PIN_PEPPER', { infer: true }) ?? 'dev-only-join-pin-pepper-change-me',
    },
    ScryptHasher,
    { provide: HASHER, useExisting: ScryptHasher },

    DrizzleUnitOfWork,
    { provide: UNIT_OF_WORK, useExisting: DrizzleUnitOfWork },

    UuidIdGenerator,
    { provide: ID_GENERATOR, useExisting: UuidIdGenerator },

    SystemClock,
    { provide: CLOCK, useExisting: SystemClock },

    CryptoRandomBytes,
    { provide: RANDOM_BYTES, useExisting: CryptoRandomBytes },

    DrizzleMembersReadModel,
    { provide: MEMBERS_READ_MODEL, useExisting: DrizzleMembersReadModel },

    {
      provide: FAMILY_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzleFamilyRepository(db),
    },

    FamilyScopeGuard,
    RateLimitGuard,

    // ── Use cases ─────────────────────────────────────────────────────────
    CreateFamilyUseCase,
    ListMyFamiliesUseCase,
    GenerateJoinPinUseCase,
    JoinFamilyByPinUseCase,
    ListMembersUseCase,
    LeaveFamilyUseCase,
    RevokeActivePinUseCase,
    UpdateFamilyUseCase,
    DeleteFamilyUseCase,
    ExpelMemberUseCase,
    ChangeMemberRoleUseCase,
  ],
  exports: [FAMILY_REPOSITORY, FamilyScopeGuard],
})
export class FamilyModule {}
