import { Module } from '@nestjs/common';
import { DRIZZLE } from '../../db/drizzle.tokens';
import { IdentityAccessModule } from '../identity-access/identity-access.module';
import type { Database } from '../../db/db.types';

// ── Domain ports ──────────────────────────────────────────────────────────────
import { COUPLE_REPOSITORY } from './domain/ports/couple.repository';
import { COUPLE_NOTE_REPOSITORY } from './domain/ports/couple-note.repository';
import { COUPLE_CHALLENGE_REPOSITORY } from './domain/ports/couple-challenge.repository';

// ── Application ports ─────────────────────────────────────────────────────────
import { ROMANTIC_CLOCK } from './application/ports/clock';
import { ROMANTIC_ID_GENERATOR } from './application/ports/id-generator';

// ── Use cases ─────────────────────────────────────────────────────────────────
import { CreateCoupleUseCase } from './application/create-couple.use-case';
import { GetMyCoupleUseCase } from './application/get-my-couple.use-case';
import { CreateCoupleNoteUseCase } from './application/create-couple-note.use-case';
import { ListCoupleNotesUseCase } from './application/list-couple-notes.use-case';
import { AddChallengeUseCase } from './application/add-challenge.use-case';
import { ListChallengesUseCase } from './application/list-challenges.use-case';
import { MarkChallengeDoneUseCase } from './application/mark-challenge-done.use-case';
import { DoMischiefUseCase } from './application/do-mischief.use-case';

// ── Infrastructure ────────────────────────────────────────────────────────────
import { DrizzleCoupleRepository } from './infrastructure/drizzle-couple.repository';
import { DrizzleCoupleNoteRepository } from './infrastructure/drizzle-couple-note.repository';
import { DrizzleCoupleChallengeRepository } from './infrastructure/drizzle-couple-challenge.repository';

// ── Interface ─────────────────────────────────────────────────────────────────
import { RomanticController } from './interface/romantic.controller';
import { CoupleScopeGuard } from './interface/couple-scope.guard';

// ── Notifications (para DoMischiefUseCase) ─────────────────────────────────
import { PUSH_SUBSCRIPTION_REPOSITORY } from '../notifications/domain/ports/push-subscription.repository';
import { NOTIFICATION_SENDER } from '../notifications/domain/ports/notification-sender.port';
import { DrizzlePushSubscriptionRepository } from '../notifications/infrastructure/drizzle-push-subscription.repository';
import { WebpushNotificationSenderAdapter } from '../notifications/infrastructure/webpush-notification-sender.adapter';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.config';

// ── Family (para guards y validaciones) ──────────────────────────────────────
import { FAMILY_REPOSITORY } from '../family/domain/ports/family.repository';
import { DrizzleFamilyRepository } from '../family/infrastructure/drizzle-family.repository';
import { FamilyScopeGuard } from '../family/interface/family-scope.guard';
import { SystemClock } from '../family/infrastructure/system-clock';
import { UuidIdGenerator } from '../family/infrastructure/uuid-id-generator';

@Module({
  imports: [IdentityAccessModule],
  controllers: [RomanticController],
  providers: [
    // ── Repositorios de dominio ──────────────────────────────────────────
    {
      provide: COUPLE_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzleCoupleRepository(db),
    },
    {
      provide: COUPLE_NOTE_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzleCoupleNoteRepository(db),
    },
    {
      provide: COUPLE_CHALLENGE_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzleCoupleChallengeRepository(db),
    },

    // ── Repositorio de familia (para CreateCouple + guards) ──────────────
    {
      provide: FAMILY_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzleFamilyRepository(db),
    },

    // ── Notificaciones (para DoMischief) ─────────────────────────────────
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

    // ── Infraestructura compartida ────────────────────────────────────────
    SystemClock,
    {
      provide: ROMANTIC_CLOCK,
      useExisting: SystemClock,
    },
    UuidIdGenerator,
    {
      provide: ROMANTIC_ID_GENERATOR,
      useExisting: UuidIdGenerator,
    },

    // ── Guards ────────────────────────────────────────────────────────────
    FamilyScopeGuard,
    CoupleScopeGuard,

    // ── Casos de uso ──────────────────────────────────────────────────────
    CreateCoupleUseCase,
    GetMyCoupleUseCase,
    CreateCoupleNoteUseCase,
    ListCoupleNotesUseCase,
    AddChallengeUseCase,
    ListChallengesUseCase,
    MarkChallengeDoneUseCase,
    DoMischiefUseCase,
  ],
})
export class RomanticModule {}
