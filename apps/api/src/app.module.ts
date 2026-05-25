import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.config';
import { DbModule } from './db/db.module';
import { HealthModule } from './health/health.module';
import { IdentityAccessModule } from './contexts/identity-access/identity-access.module';
import { FamilyModule } from './contexts/family/family.module';
import { ShoppingModule } from './contexts/shopping/shopping.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv, cache: true }),
    DbModule,
    HealthModule,
    IdentityAccessModule,
    FamilyModule,
    ShoppingModule,
  ],
})
export class AppModule {}
