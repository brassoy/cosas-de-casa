import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
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
import type { PlanDto, PlanMessageDto, PlanSummaryDto, SavedPlaceDto } from '@cosasdecasa/contracts';
import type { AuthenticatedUser } from '../../identity-access/domain/authenticated-user';
import { CurrentUser } from '../../identity-access/interface/current-user.decorator';
import { JwtAuthGuard } from '../../identity-access/interface/jwt-auth.guard';
import { FamilyScopeGuard } from '../../family/interface/family-scope.guard';
import { PlanScopeGuard } from './plan-scope.guard';
import { CreatePlanUseCase } from '../application/create-plan.use-case';
import { ListPlansUseCase } from '../application/list-plans.use-case';
import { GetPlanUseCase } from '../application/get-plan.use-case';
import { UpdatePlanUseCase } from '../application/update-plan.use-case';
import { DeletePlanUseCase } from '../application/delete-plan.use-case';
import { SharePlanUseCase } from '../application/share-plan.use-case';
import { SetRsvpUseCase } from '../application/set-rsvp.use-case';
import { CreateSavedPlaceUseCase } from '../application/create-saved-place.use-case';
import { ListSavedPlacesUseCase } from '../application/list-saved-places.use-case';
import { DeleteSavedPlaceUseCase } from '../application/delete-saved-place.use-case';
import { ListPlanMessagesUseCase } from '../application/list-plan-messages.use-case';
import { SendPlanMessageUseCase } from '../application/send-plan-message.use-case';
import { PlansDomainErrorFilter } from './plans-domain-error.filter';
import { PlansPresenter } from './plans.presenter';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { SetRsvpDto } from './dto/set-rsvp.dto';
import { SharePlanDto } from './dto/share-plan.dto';
import { CreateSavedPlaceDto } from './dto/create-saved-place.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { PLANS_READ_MODEL, type PlansReadModel } from '../application/ports/plans-read-model';

@ApiTags('plans')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard)
@UseFilters(PlansDomainErrorFilter)
export class PlansController {
  constructor(
    private readonly createPlan: CreatePlanUseCase,
    private readonly listPlans: ListPlansUseCase,
    private readonly getPlan: GetPlanUseCase,
    private readonly updatePlan: UpdatePlanUseCase,
    private readonly deletePlan: DeletePlanUseCase,
    private readonly sharePlan: SharePlanUseCase,
    private readonly setRsvp: SetRsvpUseCase,
    private readonly createSavedPlace: CreateSavedPlaceUseCase,
    private readonly listSavedPlaces: ListSavedPlacesUseCase,
    private readonly deleteSavedPlace: DeleteSavedPlaceUseCase,
    private readonly listMessages: ListPlanMessagesUseCase,
    private readonly sendMessage: SendPlanMessageUseCase,
    @Inject(PLANS_READ_MODEL) private readonly readModel: PlansReadModel,
  ) {}

  // ── Lugares guardados ──────────────────────────────────────────────────────

  @Get('families/:familyId/places')
  @UseGuards(FamilyScopeGuard)
  @ApiOperation({ summary: 'Listar los lugares guardados de la familia.' })
  @ApiOkResponse({ description: 'Lugares guardados.' })
  async listPlaces(
    @CurrentUser() user: AuthenticatedUser,
    @Param('familyId', ParseUUIDPipe) familyId: string,
  ): Promise<SavedPlaceDto[]> {
    const places = await this.listSavedPlaces.execute({ actingUserId: user.id, familyId });
    return places.map(PlansPresenter.toSavedPlaceDto);
  }

  @Post('families/:familyId/places')
  @UseGuards(FamilyScopeGuard)
  @ApiOperation({ summary: 'Guardar un lugar recordado.' })
  @ApiCreatedResponse({ description: 'Lugar guardado.' })
  async createPlace(
    @CurrentUser() user: AuthenticatedUser,
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Body() body: CreateSavedPlaceDto,
  ): Promise<SavedPlaceDto> {
    const place = await this.createSavedPlace.execute({
      actingUserId: user.id,
      familyId,
      name: body.name,
      address: body.address,
      lat: body.lat,
      lng: body.lng,
    });
    return PlansPresenter.toSavedPlaceDto(place);
  }

  @Delete('places/:placeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un lugar guardado.' })
  @ApiNoContentResponse({ description: 'Lugar eliminado.' })
  async deletePlace(
    @CurrentUser() user: AuthenticatedUser,
    @Param('placeId', ParseUUIDPipe) placeId: string,
  ): Promise<void> {
    await this.deleteSavedPlace.execute({ actingUserId: user.id, placeId });
  }

  // ── Planes ─────────────────────────────────────────────────────────────────

  @Post('families/:familyId/plans')
  @UseGuards(FamilyScopeGuard)
  @ApiOperation({ summary: 'Crear un plan.' })
  @ApiCreatedResponse({ description: 'Plan creado.' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Body() body: CreatePlanDto,
  ): Promise<PlanDto> {
    const plan = await this.createPlan.execute({
      actingUserId: user.id,
      ownerFamilyId: familyId,
      title: body.title,
      description: body.description,
      place: body.place
        ? {
            name: body.place.name,
            address: body.place.address ?? null,
            lat: body.place.lat ?? null,
            lng: body.place.lng ?? null,
          }
        : null,
      savePlace: body.savePlace,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
    });
    const detail = await this.readModel.getPlanDetail(plan.id);
    return PlansPresenter.toPlanDto(detail!);
  }

  @Get('families/:familyId/plans')
  @UseGuards(FamilyScopeGuard)
  @ApiOperation({ summary: 'Listar planes (propios + compartidos).' })
  @ApiOkResponse({ description: 'Planes.' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('familyId', ParseUUIDPipe) familyId: string,
  ): Promise<PlanSummaryDto[]> {
    const plans = await this.listPlans.execute({ actingUserId: user.id, familyId });
    return plans.map(PlansPresenter.toPlanSummaryDto);
  }

  @Get('plans/:planId')
  @UseGuards(PlanScopeGuard)
  @ApiOperation({ summary: 'Obtener detalle de un plan.' })
  @ApiOkResponse({ description: 'Detalle del plan.' })
  async get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('planId', ParseUUIDPipe) planId: string,
  ): Promise<PlanDto> {
    const detail = await this.getPlan.execute({ actingUserId: user.id, planId });
    return PlansPresenter.toPlanDto(detail);
  }

  @Patch('plans/:planId')
  @UseGuards(PlanScopeGuard)
  @ApiOperation({ summary: 'Actualizar un plan (solo owner).' })
  @ApiOkResponse({ description: 'Plan actualizado.' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() body: UpdatePlanDto,
  ): Promise<PlanDto> {
    await this.updatePlan.execute({
      actingUserId: user.id,
      planId,
      title: body.title,
      description: body.description,
      place: body.place
        ? {
            name: body.place.name,
            address: body.place.address ?? null,
            lat: body.place.lat ?? null,
            lng: body.place.lng ?? null,
          }
        : undefined,
      scheduledAt: body.scheduledAt,
      status: body.status,
    });
    const detail = await this.readModel.getPlanDetail(planId);
    return PlansPresenter.toPlanDto(detail!);
  }

  @Delete('plans/:planId')
  @UseGuards(PlanScopeGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un plan (solo owner).' })
  @ApiNoContentResponse({ description: 'Plan eliminado.' })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('planId', ParseUUIDPipe) planId: string,
  ): Promise<void> {
    await this.deletePlan.execute({ actingUserId: user.id, planId });
  }

  @Post('plans/:planId/share')
  @UseGuards(PlanScopeGuard)
  @ApiOperation({ summary: 'Compartir un plan con una familia amiga.' })
  @ApiOkResponse({ description: 'Plan compartido.' })
  async share(
    @CurrentUser() user: AuthenticatedUser,
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() body: SharePlanDto,
  ): Promise<PlanDto> {
    await this.sharePlan.execute({
      actingUserId: user.id,
      planId,
      targetFamilyId: body.familyId,
    });
    const detail = await this.readModel.getPlanDetail(planId);
    return PlansPresenter.toPlanDto(detail!);
  }

  @Post('plans/:planId/rsvp')
  @UseGuards(PlanScopeGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Establecer tu RSVP en un plan.' })
  @ApiOkResponse({ description: 'RSVP actualizado.' })
  async rsvp(
    @CurrentUser() user: AuthenticatedUser,
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() body: SetRsvpDto,
  ): Promise<PlanDto> {
    await this.setRsvp.execute({ actingUserId: user.id, planId, status: body.status });
    const detail = await this.readModel.getPlanDetail(planId);
    return PlansPresenter.toPlanDto(detail!);
  }

  // ── Chat ───────────────────────────────────────────────────────────────────

  @Get('plans/:planId/messages')
  @UseGuards(PlanScopeGuard)
  @ApiOperation({ summary: 'Listar mensajes del plan (paginado por cursor).' })
  @ApiOkResponse({ description: 'Mensajes del plan.' })
  @ApiQuery({ name: 'before', required: false, type: String, description: 'ISO cursor para paginación hacia atrás.' })
  async getMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('planId', ParseUUIDPipe) planId: string,
    @Query('before') before?: string,
  ): Promise<PlanMessageDto[]> {
    const messages = await this.listMessages.execute({
      actingUserId: user.id,
      planId,
      before: before ? new Date(before) : undefined,
    });
    return messages.map((m) => ({
      id: m.id,
      planId: m.planId,
      userId: m.userId,
      displayName: m.displayName ?? m.userId,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  @Post('plans/:planId/messages')
  @UseGuards(PlanScopeGuard)
  @ApiOperation({ summary: 'Enviar un mensaje al plan.' })
  @ApiCreatedResponse({ description: 'Mensaje enviado.' })
  async postMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() body: SendMessageDto,
  ): Promise<PlanMessageDto> {
    const msg = await this.sendMessage.execute({
      actingUserId: user.id,
      planId,
      body: body.body,
      displayName: user.displayName ?? null,
    });
    return {
      id: msg.id,
      planId: msg.planId,
      userId: msg.userId,
      displayName: msg.displayName ?? msg.userId,
      body: msg.body,
      createdAt: msg.createdAt.toISOString(),
    };
  }
}
