import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type {
  ExtractItemsResponse,
  DedupCheckResponse,
  FrequentItemDto,
  ParsePlanResponse,
} from '@cosasdecasa/contracts';
import { JwtAuthGuard } from '../../identity-access/interface/jwt-auth.guard';
import { FamilyScopeGuard } from '../../family/interface/family-scope.guard';
import { RateLimit, RateLimitGuard } from '../../../common/rate-limit.guard';
import { ExtractItemsUseCase } from '../application/extract-items.use-case';
import { DedupCheckUseCase } from '../application/dedup-check.use-case';
import { GetFrequentItemsUseCase } from '../application/get-frequent-items.use-case';
import { ParsePlanUseCase } from '../application/parse-plan.use-case';
import { ExtractItemsDto } from './dto/extract-items.dto';
import { DedupCheckDto } from './dto/dedup-check.dto';
import { ParsePlanDto } from './dto/parse-plan.dto';
import { AiPresenter } from './ai.presenter';
import { AiErrorFilter } from './ai-error.filter';

@ApiBearerAuth()
@UseFilters(AiErrorFilter)
@UseGuards(JwtAuthGuard)
@Controller()
@ApiTags('ai')
export class AiController {
  constructor(
    private readonly extractItems: ExtractItemsUseCase,
    private readonly dedupCheck: DedupCheckUseCase,
    private readonly getFrequentItems: GetFrequentItemsUseCase,
    private readonly parsePlanUseCase: ParsePlanUseCase,
  ) {}

  /**
   * Extrae artículos de la compra de una frase en lenguaje natural.
   * POST /api/v1/ai/extract-items
   */
  @Post('ai/extract-items')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 5, ttl: 60_000 }) // 5 req/min — costoso (LLM)
  @ApiOperation({ summary: 'Extraer artículos de la compra de una frase (IA).' })
  @ApiCreatedResponse({ description: 'Artículos extraídos.' })
  async extract(@Body() body: ExtractItemsDto): Promise<ExtractItemsResponse> {
    const items = await this.extractItems.execute({ phrase: body.phrase });
    return { items };
  }

  /**
   * Deduce los campos de un plan (título, descripción, fecha/hora y lugar) a
   * partir de una frase en lenguaje natural. Si la IA no está configurada o
   * falla, responde 503 (AiUnavailableError → AiErrorFilter).
   * POST /api/v1/ai/parse-plan
   */
  @Post('ai/parse-plan')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 5, ttl: 60_000 }) // 5 req/min — costoso (LLM)
  @ApiOperation({ summary: 'Autocompletar un plan a partir de una frase (IA).' })
  @ApiCreatedResponse({ description: 'Campos del plan deducidos.' })
  async parsePlan(@Body() body: ParsePlanDto): Promise<ParsePlanResponse> {
    return this.parsePlanUseCase.execute({ phrase: body.phrase, now: body.now });
  }

  /**
   * Comprueba si un artículo ya existe en el catálogo (dedup semántico).
   * POST /api/v1/lists/:listId/items/dedup-check
   *
   * Nota: no necesita listId para la lógica pero la URL lo vincula
   * al ámbito correcto; la familia se obtiene del catálogo interno.
   * Para simplificar, el familyId se pasa en el body.
   */
  @Post('families/:familyId/catalog/dedup-check')
  @HttpCode(HttpStatus.OK)
  @UseGuards(FamilyScopeGuard)
  @ApiOperation({ summary: 'Comprobar deduplicación semántica de un artículo en el catálogo de la familia.' })
  @ApiOkResponse({ description: 'Decisión de deduplicación.' })
  async checkDedup(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Body() body: DedupCheckDto,
  ): Promise<DedupCheckResponse> {
    const result = await this.dedupCheck.execute({ familyId, name: body.name });
    return AiPresenter.toDedupCheckResponse(result);
  }

  /**
   * Obtiene los artículos más frecuentes del catálogo de una familia.
   * GET /api/v1/families/:familyId/frequent-items?limit=10
   */
  @Get('families/:familyId/frequent-items')
  @UseGuards(FamilyScopeGuard)
  @ApiOperation({ summary: 'Artículos más frecuentes del catálogo de la familia.' })
  @ApiOkResponse({ description: 'Lista de artículos frecuentes.' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Máximo de resultados (1-50, por defecto 10).' })
  async frequentItems(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Query('limit') limitRaw?: string,
  ): Promise<FrequentItemDto[]> {
    const limit = limitRaw ? Math.max(1, Math.min(parseInt(limitRaw, 10) || 10, 50)) : 10;
    const items = await this.getFrequentItems.execute({ familyId, limit });
    return items.map((i) => AiPresenter.toFrequentItemDto(i));
  }
}
