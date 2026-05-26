import { Module } from '@nestjs/common';
import { IdentityAccessModule } from '../identity-access/identity-access.module';
import { FamilyModule } from '../family/family.module';
import { DRIZZLE } from '../../db/drizzle.tokens';
import type { Database } from '../../db/db.types';

// ── Domain ports ─────────────────────────────────────────────────────────────
import { FRIEND_INVITE_PIN_REPOSITORY } from './domain/ports/friend-invite-pin.repository';
import { FRIEND_LINK_REPOSITORY } from './domain/ports/friend-link.repository';

// ── Application ports ────────────────────────────────────────────────────────
import { SOCIAL_UNIT_OF_WORK } from './application/ports/unit-of-work';
import { SOCIAL_READ_MODEL } from './application/ports/social-read-model';

// Tokens de infra compartidos (family).
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
import { GenerateFriendInviteUseCase } from './application/generate-friend-invite.use-case';
import { RedeemFriendInviteUseCase } from './application/redeem-friend-invite.use-case';
import { ListFriendFamiliesUseCase } from './application/list-friend-families.use-case';
import { RemoveFriendFamilyUseCase } from './application/remove-friend-family.use-case';

// ── Infrastructure ────────────────────────────────────────────────────────────
import { DrizzleFriendInvitePinRepository } from './infrastructure/drizzle-friend-invite-pin.repository';
import { DrizzleFriendLinkRepository } from './infrastructure/drizzle-friend-link.repository';
import { DrizzleSocialReadModel } from './infrastructure/drizzle-social-read-model';
import { DrizzleSocialUnitOfWork } from './infrastructure/drizzle-social-unit-of-work';

// ── Interface ─────────────────────────────────────────────────────────────────
import { SocialController } from './interface/social.controller';

// Re-export de FAMILY_REPOSITORY para usar en use cases.
import { FAMILY_REPOSITORY } from '../family/domain/ports/family.repository';
import { DrizzleFamilyRepository } from '../family/infrastructure/drizzle-family.repository';

@Module({
  imports: [IdentityAccessModule, FamilyModule],
  controllers: [SocialController],
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

    // ── Family repository (necesario para verificar memberships/roles) ─────
    {
      provide: FAMILY_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzleFamilyRepository(db),
    },

    // ── Social-specific infra ──────────────────────────────────────────────
    DrizzleSocialUnitOfWork,
    { provide: SOCIAL_UNIT_OF_WORK, useExisting: DrizzleSocialUnitOfWork },

    DrizzleSocialReadModel,
    { provide: SOCIAL_READ_MODEL, useExisting: DrizzleSocialReadModel },

    {
      provide: FRIEND_INVITE_PIN_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzleFriendInvitePinRepository(db),
    },

    {
      provide: FRIEND_LINK_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzleFriendLinkRepository(db),
    },

    // ── Use cases ─────────────────────────────────────────────────────────
    GenerateFriendInviteUseCase,
    RedeemFriendInviteUseCase,
    ListFriendFamiliesUseCase,
    RemoveFriendFamilyUseCase,
  ],
  exports: [FRIEND_LINK_REPOSITORY],
})
export class SocialModule {}
