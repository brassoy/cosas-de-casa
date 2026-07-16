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
import { RomanticModule } from './contexts/romantic/romantic.module';
import { GroupsModule } from './contexts/groups/groups.module';
import { SocialModule } from './contexts/social/social.module';
import { PlansModule } from './contexts/plans/plans.module';
import { BudgetModule } from './contexts/budget/budget.module';
import { MenuModule } from './contexts/menu/menu.module';
import { RoutinesModule } from './contexts/routines/routines.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv, cache: true }),
    ScheduleModule.forRoot(),
    DbModule,
    HealthModule,
    IdentityAccessModule,
    FamilyModule,
    GroupsModule,
    SocialModule,
    PlansModule,
    ShoppingModule,
    AiModule,
    TasksModule,
    FridgeModule,
    NotificationsModule,
    StatsModule,
    CalendarModule,
    RomanticModule,
    BudgetModule,
    MenuModule,
    RoutinesModule,
  ],
})
export class AppModule {}
