import { Module } from '@nestjs/common';
import { DRIZZLE } from '../../db/drizzle.tokens';
import { IdentityAccessModule } from '../identity-access/identity-access.module';
import type { Database } from '../../db/db.types';

// ── Domain ports ─────────────────────────────────────────────────────────────
import { CALENDAR_EVENT_REPOSITORY } from './domain/ports/calendar-event.repository';
import { CALENDAR_SYNC_PORT } from './domain/ports/calendar-sync.port';

// ── Application ports ─────────────────────────────────────────────────────────
import { CALENDAR_CLOCK } from './application/ports/clock';
import { CALENDAR_ID_GENERATOR } from './application/ports/id-generator';

// ── Use cases ─────────────────────────────────────────────────────────────────
import { CreateEventUseCase } from './application/create-event.use-case';
import { ListEventsUseCase } from './application/list-events.use-case';
import { GetEventUseCase } from './application/get-event.use-case';
import { UpdateEventUseCase } from './application/update-event.use-case';
import { DeleteEventUseCase } from './application/delete-event.use-case';
import { SetAttendeesUseCase } from './application/set-attendees.use-case';

// ── Infrastructure ────────────────────────────────────────────────────────────
import { DrizzleCalendarEventRepository } from './infrastructure/drizzle-calendar-event.repository';
import { NoopCalendarSyncAdapter } from './infrastructure/noop-calendar-sync.adapter';

// ── Interface ─────────────────────────────────────────────────────────────────
import { CalendarController } from './interface/calendar.controller';
import { EventScopeGuard } from './interface/event-scope.guard';

// ── Family (repositorio para los guards) ─────────────────────────────────────
import { FAMILY_REPOSITORY } from '../family/domain/ports/family.repository';
import { DrizzleFamilyRepository } from '../family/infrastructure/drizzle-family.repository';
import { FamilyScopeGuard } from '../family/interface/family-scope.guard';
import { SystemClock } from '../family/infrastructure/system-clock';
import { UuidIdGenerator } from '../family/infrastructure/uuid-id-generator';

@Module({
  imports: [IdentityAccessModule],
  controllers: [CalendarController],
  providers: [
    // ── Infrastructure: repositorio ──────────────────────────────────────
    {
      provide: CALENDAR_EVENT_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzleCalendarEventRepository(db),
    },

    // ── Infrastructure: sync port (no-op) ─────────────────────────────────
    NoopCalendarSyncAdapter,
    {
      provide: CALENDAR_SYNC_PORT,
      useExisting: NoopCalendarSyncAdapter,
    },

    // ── Repositorio de familia (para los guards) ───────────────────────────
    {
      provide: FAMILY_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzleFamilyRepository(db),
    },

    // ── Puertos de infraestructura compartidos ────────────────────────────
    SystemClock,
    {
      provide: CALENDAR_CLOCK,
      useExisting: SystemClock,
    },
    UuidIdGenerator,
    {
      provide: CALENDAR_ID_GENERATOR,
      useExisting: UuidIdGenerator,
    },

    // ── Guards ────────────────────────────────────────────────────────────
    FamilyScopeGuard,
    EventScopeGuard,

    // ── Casos de uso ──────────────────────────────────────────────────────
    CreateEventUseCase,
    ListEventsUseCase,
    GetEventUseCase,
    UpdateEventUseCase,
    DeleteEventUseCase,
    SetAttendeesUseCase,
  ],
})
export class CalendarModule {}
