import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { validateEnv } from './config/env.config';
import { DbModule } from './db/db.module';
import { HealthModule } from './health/health.module';
import { IdentityAccessModule } from './contexts/identity-access/identity-access.module';
import { FamilyModule } from './contexts/family/family.module';
import { ShoppingModule } from './contexts/shopping/shopping.module';
import { AiModule } from './contexts/ai/ai.module';
import { TasksModule } from './contexts/tasks/tasks.module';
import { FridgeModule } from './contexts/fridge/fridge.module';
import { NotificationsModule } from './contexts/notifications/notifications.module';
import { StatsModule } from './contexts/stats/stats.module';
import { CalendarModule } from './contexts/calendar/calendar.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv, cache: true }),
    ScheduleModule.forRoot(),
    DbModule,
    HealthModule,
    IdentityAccessModule,
    FamilyModule,
    ShoppingModule,
    AiModule,
    TasksModule,
    FridgeModule,
    NotificationsModule,
    StatsModule,
    CalendarModule,
  ],
})
export class AppModule {}
