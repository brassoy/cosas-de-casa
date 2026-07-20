import { Module } from '@nestjs/common';
import { IdentityAccessModule } from '../identity-access/identity-access.module';
import { FamilyModule } from '../family/family.module';
import { SocialModule } from '../social/social.module';
import { DRIZZLE } from '../../db/drizzle.tokens';
import type { Database } from '../../db/db.types';

// ── Domain ports ─────────────────────────────────────────────────────────────
import { PLAN_REPOSITORY } from './domain/ports/plan.repository';
import { SAVED_PLACE_REPOSITORY } from './domain/ports/saved-place.repository';
import { PLAN_MESSAGE_REPOSITORY } from './domain/ports/plan-message.repository';

// ── Application ports ─────────────────────────────────────────────────────────
import { PLANS_READ_MODEL } from './application/ports/plans-read-model';

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

// Family repository.
import { FAMILY_REPOSITORY } from '../family/domain/ports/family.repository';
import { DrizzleFamilyRepository } from '../family/infrastructure/drizzle-family.repository';

// Social (FriendLinkRepository).
import { FRIEND_LINK_REPOSITORY } from '../social/domain/ports/friend-link.repository';
import { DrizzleFriendLinkRepository } from '../social/infrastructure/drizzle-friend-link.repository';

// Notifications (push): al auto-compartir un plan con familias amigas se notifica
// a sus miembros. Se reprovén los tokens aquí (mismo patrón que romantic.module).
import { PUSH_SUBSCRIPTION_REPOSITORY } from '../notifications/domain/ports/push-subscription.repository';
import { NOTIFICATION_SENDER } from '../notifications/domain/ports/notification-sender.port';
import { DrizzlePushSubscriptionRepository } from '../notifications/infrastructure/drizzle-push-subscription.repository';
import { WebpushNotificationSenderAdapter } from '../notifications/infrastructure/webpush-notification-sender.adapter';

// ── Use cases ─────────────────────────────────────────────────────────────────
import { CreatePlanUseCase } from './application/create-plan.use-case';
import { ListPlansUseCase } from './application/list-plans.use-case';
import { GetPlanUseCase } from './application/get-plan.use-case';
import { UpdatePlanUseCase } from './application/update-plan.use-case';
import { DeletePlanUseCase } from './application/delete-plan.use-case';
import { SharePlanUseCase } from './application/share-plan.use-case';
import { SetRsvpUseCase } from './application/set-rsvp.use-case';
import { CreateSavedPlaceUseCase } from './application/create-saved-place.use-case';
import { ListSavedPlacesUseCase } from './application/list-saved-places.use-case';
import { DeleteSavedPlaceUseCase } from './application/delete-saved-place.use-case';
import { ListPlanMessagesUseCase } from './application/list-plan-messages.use-case';
import { SendPlanMessageUseCase } from './application/send-plan-message.use-case';

// ── Infrastructure ────────────────────────────────────────────────────────────
import { DrizzlePlanRepository } from './infrastructure/drizzle-plan.repository';
import { DrizzleSavedPlaceRepository } from './infrastructure/drizzle-saved-place.repository';
import { DrizzlePlanMessageRepository } from './infrastructure/drizzle-plan-message.repository';
import { DrizzlePlansReadModel } from './infrastructure/drizzle-plans-read-model';

// ── Interface ─────────────────────────────────────────────────────────────────
import { PlansController } from './interface/plans.controller';
import { PlanScopeGuard } from './interface/plan-scope.guard';

@Module({
  imports: [IdentityAccessModule, FamilyModule, SocialModule],
  controllers: [PlansController],
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

    // ── Family repository ─────────────────────────────────────────────────
    {
      provide: FAMILY_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzleFamilyRepository(db),
    },

    // ── FriendLink repository ─────────────────────────────────────────────
    {
      provide: FRIEND_LINK_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzleFriendLinkRepository(db),
    },

    // ── Notificaciones push (reprovisto, igual que romantic.module) ────────
    {
      provide: PUSH_SUBSCRIPTION_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzlePushSubscriptionRepository(db),
    },
    {
      provide: NOTIFICATION_SENDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const pub = config.get('VAPID_PUBLIC_KEY', { infer: true });
        const priv = config.get('VAPID_PRIVATE_KEY', { infer: true });
        const sub = config.get('VAPID_SUBJECT', { infer: true });
        if (!pub || !priv || !sub) {
          return { sendToTargets: async () => undefined };
        }
        return new WebpushNotificationSenderAdapter(pub, priv, sub);
      },
    },

    // ── Plans-specific infra ───────────────────────────────────────────────
    {
      provide: PLAN_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzlePlanRepository(db),
    },
    {
      provide: SAVED_PLACE_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzleSavedPlaceRepository(db),
    },
    {
      provide: PLAN_MESSAGE_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzlePlanMessageRepository(db),
    },

    DrizzlePlansReadModel,
    { provide: PLANS_READ_MODEL, useExisting: DrizzlePlansReadModel },

    // ── Interface guards ──────────────────────────────────────────────────
    // PlanScopeGuard usa PLAN_REPOSITORY + FAMILY_REPOSITORY (ambos provistos arriba).
    // FamilyScopeGuard llega exportado por FamilyModule (ya importado).
    PlanScopeGuard,

    // ── Use cases ─────────────────────────────────────────────────────────
    CreatePlanUseCase,
    ListPlansUseCase,
    GetPlanUseCase,
    UpdatePlanUseCase,
    DeletePlanUseCase,
    SharePlanUseCase,
    SetRsvpUseCase,
    CreateSavedPlaceUseCase,
    ListSavedPlacesUseCase,
    DeleteSavedPlaceUseCase,
    ListPlanMessagesUseCase,
    SendPlanMessageUseCase,
  ],
})
export class PlansModule {}
