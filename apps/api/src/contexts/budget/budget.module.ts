import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE } from '../../db/drizzle.tokens';
import { IdentityAccessModule } from '../identity-access/identity-access.module';
import type { Database } from '../../db/db.types';
import type { Env } from '../../config/env.config';

// ── Domain ports ─────────────────────────────────────────────────────────────
import { RECEIPT_REPOSITORY } from './domain/ports/receipt.repository';
import { RECEIPT_OCR_PORT } from './domain/ports/receipt-ocr.port';

// ── Application ports ────────────────────────────────────────────────────────
import { BUDGET_CLOCK } from './application/ports/clock';
import { BUDGET_ID_GENERATOR } from './application/ports/id-generator';

// ── Use cases ────────────────────────────────────────────────────────────────
import { ExtractReceiptUseCase } from './application/extract-receipt.use-case';
import { CreateReceiptUseCase } from './application/create-receipt.use-case';
import { ListReceiptsUseCase } from './application/list-receipts.use-case';
import { GetReceiptUseCase } from './application/get-receipt.use-case';
import { UpdateReceiptUseCase } from './application/update-receipt.use-case';
import { DeleteReceiptUseCase } from './application/delete-receipt.use-case';
import { GetSpendSummaryUseCase } from './application/get-spend-summary.use-case';

// ── Infrastructure ────────────────────────────────────────────────────────────
import { DrizzleReceiptRepository } from './infrastructure/drizzle-receipt.repository';
import { MinimaxReceiptOcrAdapter } from './infrastructure/minimax-receipt-ocr.adapter';

// ── Interface ─────────────────────────────────────────────────────────────────
import { BudgetController } from './interface/budget.controller';
import { ReceiptScopeGuard } from './interface/receipt-scope.guard';

// ── Family (guard) ────────────────────────────────────────────────────────────
import { FAMILY_REPOSITORY } from '../family/domain/ports/family.repository';
import { DrizzleFamilyRepository } from '../family/infrastructure/drizzle-family.repository';
import { FamilyScopeGuard } from '../family/interface/family-scope.guard';
import { SystemClock } from '../family/infrastructure/system-clock';
import { UuidIdGenerator } from '../family/infrastructure/uuid-id-generator';
import { AiUnavailableError } from './domain/budget.errors';
import { RateLimitGuard } from '../../common/rate-limit.guard';

@Module({
  imports: [IdentityAccessModule],
  controllers: [BudgetController],
  providers: [
    // ── Infrastructure: repositorio ──────────────────────────────────────
    {
      provide: RECEIPT_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzleReceiptRepository(db),
    },

    // ── OCR port ─────────────────────────────────────────────────────────
    {
      provide: RECEIPT_OCR_PORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const baseURL = config.get('MINIMAX_BASE_URL' as keyof Env, { infer: true }) as string | undefined;
        const apiKey = config.get('MINIMAX_API_KEY' as keyof Env, { infer: true }) as string | undefined;
        const model = config.get('MINIMAX_MODEL' as keyof Env, { infer: true }) as string | undefined;

        if (!baseURL || !apiKey || !model) {
          // Sin config de IA → adaptador nulo que lanza AiUnavailableError
          return {
            extract: async () => {
              throw new AiUnavailableError('El servicio de IA no está configurado en este entorno.');
            },
          };
        }
        return new MinimaxReceiptOcrAdapter({ baseURL, apiKey, model });
      },
    },

    // ── Repositorio de familia (para guards) ──────────────────────────────
    {
      provide: FAMILY_REPOSITORY,
      inject: [DRIZZLE],
      useFactory: (db: Database) => new DrizzleFamilyRepository(db),
    },

    // ── Infraestructura compartida ────────────────────────────────────────
    SystemClock,
    { provide: BUDGET_CLOCK, useExisting: SystemClock },
    UuidIdGenerator,
    { provide: BUDGET_ID_GENERATOR, useExisting: UuidIdGenerator },

    // ── Guards ────────────────────────────────────────────────────────────
    FamilyScopeGuard,
    ReceiptScopeGuard,
    RateLimitGuard,

    // ── Casos de uso ──────────────────────────────────────────────────────
    ExtractReceiptUseCase,
    CreateReceiptUseCase,
    ListReceiptsUseCase,
    GetReceiptUseCase,
    UpdateReceiptUseCase,
    DeleteReceiptUseCase,
    GetSpendSummaryUseCase,
  ],
})
export class BudgetModule {}
