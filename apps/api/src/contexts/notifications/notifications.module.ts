import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE } from '../../db/drizzle.tokens';
import { IdentityAccessModule } from '../identity-access/identity-access.module';
import type { Database } from '../../db/db.types';
import type { Env } from '../../config/env.config';

// ── Domain ports ─────────────────────────────────────────────────────────────
import { PUSH_SUBSCRIPTION_REPOSITORY } from './domain/ports/push-subscription.repository';
import { NOTIFICATION_SENDER } from './domain/ports/notification-sender.port';

// ── Application ports ─────────────────────────────────────────────────────────
import { NOTIFICATIONS_CLOCK } from './application/ports/clock';
import { NOTIFICATIONS_ID_GENERATOR } from './application/ports/id-generator';

// ── Use cases ─────────────────────────────────────────────────────────────────
import { SubscribePushUseCase } from './application/subscribe-push.use-case';
import { UnsubscribePushUseCase } from './application/unsubscribe-push.use-case';
import { ExpiryReminderService } from './application/expiry-reminder.service';

// ── Infrastructure ────────────────────────────────────────────────────────────
import { DrizzlePushSubscriptionRepository } from './infrastructure/drizzle-push-subscription.repository';
import { WebpushNotificationSenderAdapter } from './infrastructure/webpush-notification-sender.adapter';

// ── Interface ─────────────────────────────────────────────────────────────────
import { NotificationsController } from './interface/notifications.controller';

// ── Family (para guards) ──────────────────────────────────────────────────────
import { FAMILY_REPOSITORY } from '../family/domain/ports/family.repository';
import { DrizzleFamilyRepository } from '../family/infrastructure/drizzle-family.repository';
import { FamilyScopeGuard } from '../family/interface/family-scope.guard';
import { SystemClock } from '../family/infrastructure/system-clock';
import { UuidIdGenerator } from '../family/infrastructure/uuid-id-generator';

// ── Fridge + Tasks (para el cron) ─────────────────────────────────────────────
import { FRIDGE_ITEM_REPOSITORY } from '../fridge/domain/ports/fridge-item.repository';
import { DrizzleFridgeItemRepository } from '../fridge/infrastructure/drizzle-fridge-item.repository';
import { TASK_REPOSITORY } from '../tasks/domain/ports/task.repository';
import { DrizzleTaskRepository } from '../tasks/infrastructure/drizzle-task.repository';

@Module({
  imports: [IdentityAccessModule],
  controllers: [NotificationsController],
  providers: [
    // ── Repositorio de suscripciones ──────────────────────────────────────
    {
      provide: PUSH_SUBSCRIPTION_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzlePushSubscriptionRepository(db),
    },

    // ── Sender VAPID ──────────────────────────────────────────────────────
    {
      provide: NOTIFICATION_SENDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const pub = config.get('VAPID_PUBLIC_KEY', { infer: true });
        const priv = config.get('VAPID_PRIVATE_KEY', { infer: true });
        const sub = config.get('VAPID_SUBJECT', { infer: true });
        // En dev/test sin VAPID configurado se usa un stub no-op para no romper.
        if (!pub || !priv || !sub) {
          return {
            sendToTargets: async () => undefined,
          };
        }
        return new WebpushNotificationSenderAdapter(pub, priv, sub);
      },
    },

    // ── Repositorio de familia (para el guard) ────────────────────────────
    {
      provide: FAMILY_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzleFamilyRepository(db),
    },

    // ── Infraestructura compartida ─────────────────────────────────────────
    SystemClock,
    {
      provide: NOTIFICATIONS_CLOCK,
      useExisting: SystemClock,
    },
    UuidIdGenerator,
    {
      provide: NOTIFICATIONS_ID_GENERATOR,
      useExisting: UuidIdGenerator,
    },

    // ── Fridge + Tasks (para el cron de recordatorios) ────────────────────
    {
      provide: FRIDGE_ITEM_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzleFridgeItemRepository(db),
    },
    {
      provide: TASK_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzleTaskRepository(db),
    },

    // ── Guards ────────────────────────────────────────────────────────────
    FamilyScopeGuard,

    // ── Casos de uso ──────────────────────────────────────────────────────
    SubscribePushUseCase,
    UnsubscribePushUseCase,

    // ── Cron ──────────────────────────────────────────────────────────────
    ExpiryReminderService,
  ],
})
export class NotificationsModule {}
