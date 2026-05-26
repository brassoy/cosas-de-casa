import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { RateLimit, RateLimitGuard } from '../../../common/rate-limit.guard';
import type {
  ReceiptDto,
  ReceiptSummaryDto,
  SpendSummaryDto,
  ExtractReceiptResponse,
} from '@cosasdecasa/contracts';
import type { AuthenticatedUser } from '../../identity-access/domain/authenticated-user';
import { CurrentUser } from '../../identity-access/interface/current-user.decorator';
import { JwtAuthGuard } from '../../identity-access/interface/jwt-auth.guard';
import { FamilyScopeGuard } from '../../family/interface/family-scope.guard';

import { ExtractReceiptUseCase } from '../application/extract-receipt.use-case';
import { CreateReceiptUseCase } from '../application/create-receipt.use-case';
import { ListReceiptsUseCase } from '../application/list-receipts.use-case';
import { GetReceiptUseCase } from '../application/get-receipt.use-case';
import { UpdateReceiptUseCase } from '../application/update-receipt.use-case';
import { DeleteReceiptUseCase } from '../application/delete-receipt.use-case';
import { GetSpendSummaryUseCase } from '../application/get-spend-summary.use-case';

import { BudgetPresenter } from './budget.presenter';
import { BudgetErrorFilter } from './budget-error.filter';
import { ReceiptScopeGuard } from './receipt-scope.guard';

import { ExtractReceiptDto } from './dto/extract-receipt.dto';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';

/**
 * Controller del contexto `budget`.
 *
 * Rutas bajo `/api/v1/families/:familyId/receipts` → requieren {@link FamilyScopeGuard}.
 * Rutas bajo `/api/v1/receipts/:receiptId` → requieren {@link ReceiptScopeGuard}.
 */
@ApiBearerAuth()
@UseFilters(BudgetErrorFilter)
@UseGuards(JwtAuthGuard)
@Controller()
@ApiTags('budget')
export class BudgetController {
  constructor(
    private readonly extractReceipt: ExtractReceiptUseCase,
    private readonly createReceipt: CreateReceiptUseCase,
    private readonly listReceipts: ListReceiptsUseCase,
    private readonly getReceipt: GetReceiptUseCase,
    private readonly updateReceipt: UpdateReceiptUseCase,
    private readonly deleteReceipt: DeleteReceiptUseCase,
    private readonly getSpendSummary: GetSpendSummaryUseCase,
  ) {}

  // ── OCR ─────────────────────────────────────────────────────────────────────

  @Post('families/:familyId/receipts/extract')
  @UseGuards(FamilyScopeGuard, RateLimitGuard)
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 5, ttl: 60_000 }) // 5 req/min — costoso
  @ApiOperation({ summary: 'Extraer datos de un ticket por OCR con IA (max 5 req/min).' })
  @ApiOkResponse({ description: 'Datos extraídos del ticket.' })
  async extractReceiptHandler(
    @Param('familyId', ParseUUIDPipe) _familyId: string,
    @Body() body: ExtractReceiptDto,
  ): Promise<ExtractReceiptResponse> {
    const result = await this.extractReceipt.execute({ imageBase64: body.imageBase64 });
    return BudgetPresenter.toExtractResponse(result);
  }

  // ── Rutas con familyId ───────────────────────────────────────────────────────

  @Post('families/:familyId/receipts')
  @UseGuards(FamilyScopeGuard)
  @ApiOperation({ summary: 'Crear un ticket de compra.' })
  @ApiCreatedResponse({ description: 'Ticket creado.' })
  async createReceiptHandler(
    @CurrentUser() user: AuthenticatedUser,
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Body() body: CreateReceiptDto,
  ): Promise<ReceiptDto> {
    const receipt = await this.createReceipt.execute({
      familyId,
      actingUserId: user.id,
      merchant: body.merchant,
      purchasedAt: body.purchasedAt,
      total: String(body.total),
      currency: body.currency,
      imagePath: body.imagePath,
      lines: body.lines?.map((l) => ({
        description: l.description,
        quantity: l.quantity != null ? String(l.quantity) : null,
        unitPrice: l.unitPrice != null ? String(l.unitPrice) : null,
        lineTotal: String(l.lineTotal),
        category: l.category,
      })),
    });
    return BudgetPresenter.toReceiptDto(receipt);
  }

  @Get('families/:familyId/receipts')
  @UseGuards(FamilyScopeGuard)
  @ApiOperation({ summary: 'Listar los tickets de una familia (resumen, sin líneas).' })
  @ApiOkResponse({ description: 'Lista de resúmenes.' })
  async listReceiptsHandler(
    @Param('familyId', ParseUUIDPipe) familyId: string,
  ): Promise<ReceiptSummaryDto[]> {
    const list = await this.listReceipts.execute({ familyId });
    return list.map(BudgetPresenter.toSummaryDto);
  }

  @Get('families/:familyId/spend-summary')
  @UseGuards(FamilyScopeGuard)
  @ApiOperation({ summary: 'Resumen de gasto por categoría y mes en un rango de fechas.' })
  @ApiOkResponse({ description: 'Resumen de gasto.' })
  @ApiQuery({ name: 'from', required: true, example: '2026-01-01' })
  @ApiQuery({ name: 'to', required: true, example: '2026-12-31' })
  async getSpendSummaryHandler(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ): Promise<SpendSummaryDto> {
    const summary = await this.getSpendSummary.execute({ familyId, from, to });
    return BudgetPresenter.toSpendSummaryDto(summary);
  }

  // ── Rutas con receiptId ─────────────────────────────────────────────────────

  @Get('receipts/:receiptId')
  @UseGuards(ReceiptScopeGuard)
  @ApiOperation({ summary: 'Obtener un ticket completo con líneas.' })
  @ApiOkResponse({ description: 'Ticket.' })
  async getReceiptHandler(
    @Param('receiptId', ParseUUIDPipe) receiptId: string,
  ): Promise<ReceiptDto> {
    const receipt = await this.getReceipt.execute({ receiptId });
    return BudgetPresenter.toReceiptDto(receipt);
  }

  @Patch('receipts/:receiptId')
  @UseGuards(ReceiptScopeGuard)
  @ApiOperation({ summary: 'Actualizar un ticket (patch parcial, incluye reemplazo de líneas).' })
  @ApiOkResponse({ description: 'Ticket actualizado.' })
  async updateReceiptHandler(
    @Param('receiptId', ParseUUIDPipe) receiptId: string,
    @Body() body: UpdateReceiptDto,
  ): Promise<ReceiptDto> {
    const receipt = await this.updateReceipt.execute({
      receiptId,
      merchant: body.merchant,
      purchasedAt: body.purchasedAt,
      total: body.total != null ? String(body.total) : undefined,
      currency: body.currency,
      status: body.status,
      imagePath: body.imagePath,
      lines: body.lines?.map((l) => ({
        id: l.id,
        description: l.description,
        quantity: l.quantity != null ? String(l.quantity) : null,
        unitPrice: l.unitPrice != null ? String(l.unitPrice) : null,
        lineTotal: l.lineTotal != null ? String(l.lineTotal) : undefined,
        category: l.category,
      })),
    });
    return BudgetPresenter.toReceiptDto(receipt);
  }

  @Delete('receipts/:receiptId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ReceiptScopeGuard)
  @ApiOperation({ summary: 'Eliminar un ticket.' })
  @ApiNoContentResponse({ description: 'Ticket eliminado.' })
  async deleteReceiptHandler(
    @Param('receiptId', ParseUUIDPipe) receiptId: string,
  ): Promise<void> {
    await this.deleteReceipt.execute({ receiptId });
  }
}
