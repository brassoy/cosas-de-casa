import { Module } from '@nestjs/common';
import { IdentityAccessModule } from '../identity-access/identity-access.module';
import { DRIZZLE } from '../../db/drizzle.tokens';
import type { Database } from '../../db/db.types';

// ── Domain ports ─────────────────────────────────────────────────────────────
import { GROUP_REPOSITORY } from './domain/ports/group.repository';

// ── Application ports ────────────────────────────────────────────────────────
import { GROUP_UNIT_OF_WORK } from './application/ports/unit-of-work';
import { GROUP_MEMBERS_READ_MODEL } from './application/ports/group-members-read-model';

// Reutilizamos los puertos de infraestructura de family (hasher, clock, id-gen, random).
import { HASHER } from '../family/application/ports/hasher';
import { ID_GENERATOR } from '../family/application/ports/id-generator';
import { CLOCK } from '../family/application/ports/clock';
import { RANDOM_BYTES } from '../family/application/ports/random-bytes';
import { ScryptHasher, HASHER_PEPPER } from '../family/infrastructure/scrypt-hasher';
import { UuidIdGenerator } from '../family/infrastructure/uuid-id-generator';
import { SystemClock } from '../family/infrastructure/system-clock';
import { CryptoRandomBytes } from '../family/infrastructure/crypto-random-bytes';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.config';

// ── Use cases ────────────────────────────────────────────────────────────────
import { CreateGroupUseCase } from './application/create-group.use-case';
import { ListMyGroupsUseCase } from './application/list-my-groups.use-case';
import { GenerateGroupJoinPinUseCase } from './application/generate-group-join-pin.use-case';
import { JoinGroupByPinUseCase } from './application/join-group-by-pin.use-case';
import { ListGroupMembersUseCase } from './application/list-group-members.use-case';
import { LeaveGroupUseCase } from './application/leave-group.use-case';
import { RevokeActiveGroupPinUseCase } from './application/revoke-active-group-pin.use-case';

// ── Infrastructure ──────────────────────────────────────────────────────────
import { DrizzleGroupRepository } from './infrastructure/drizzle-group.repository';
import { DrizzleGroupUnitOfWork } from './infrastructure/drizzle-group-unit-of-work';
import { DrizzleGroupMembersReadModel } from './infrastructure/drizzle-group-members-read-model';

// ── Interface ────────────────────────────────────────────────────────────────
import { GroupsController } from './interface/groups.controller';
import { GroupScopeGuard } from './interface/group-scope.guard';

@Module({
  imports: [IdentityAccessModule],
  controllers: [GroupsController],
  providers: [
    // ── Shared infra (re-uses family providers) ────────────────────────────
    {
      provide: HASHER_PEPPER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): string =>
        config.get('JOIN_PIN_PEPPER', { infer: true }) ?? 'dev-only-join-pin-pepper-change-me',
    },
    ScryptHasher,
    { provide: HASHER, useExisting: ScryptHasher },

    UuidIdGenerator,
    { provide: ID_GENERATOR, useExisting: UuidIdGenerator },

    SystemClock,
    { provide: CLOCK, useExisting: SystemClock },

    CryptoRandomBytes,
    { provide: RANDOM_BYTES, useExisting: CryptoRandomBytes },

    // ── Group-specific infra ───────────────────────────────────────────────
    DrizzleGroupUnitOfWork,
    { provide: GROUP_UNIT_OF_WORK, useExisting: DrizzleGroupUnitOfWork },

    DrizzleGroupMembersReadModel,
    { provide: GROUP_MEMBERS_READ_MODEL, useExisting: DrizzleGroupMembersReadModel },

    {
      provide: GROUP_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzleGroupRepository(db),
    },

    GroupScopeGuard,

    // ── Use cases ─────────────────────────────────────────────────────────
    CreateGroupUseCase,
    ListMyGroupsUseCase,
    GenerateGroupJoinPinUseCase,
    JoinGroupByPinUseCase,
    ListGroupMembersUseCase,
    LeaveGroupUseCase,
    RevokeActiveGroupPinUseCase,
  ],
  exports: [GROUP_REPOSITORY, GroupScopeGuard],
})
export class GroupsModule {}
