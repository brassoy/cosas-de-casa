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
  Put,
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
  ApiTags,
} from '@nestjs/swagger';
import type {
  RoutineDto,
  RoutineItemDto,
  RoutineListItemDto,
  RoutineStatsDto,
  RoutineSummaryDto,
} from '@cosasdecasa/contracts';
import type { AuthenticatedUser } from '../../identity-access/domain/authenticated-user';
import { CurrentUser } from '../../identity-access/interface/current-user.decorator';
import { JwtAuthGuard } from '../../identity-access/interface/jwt-auth.guard';
import { FamilyScopeGuard } from '../../family/interface/family-scope.guard';

import { CreateRoutineItemUseCase } from '../application/create-routine-item.use-case';
import { ListRoutineItemsUseCase } from '../application/list-routine-items.use-case';
import { UpdateRoutineItemUseCase } from '../application/update-routine-item.use-case';
import { DeleteRoutineItemUseCase } from '../application/delete-routine-item.use-case';
import { CreateRoutineUseCase } from '../application/create-routine.use-case';
import { ListRoutinesUseCase } from '../application/list-routines.use-case';
import { GetRoutineUseCase } from '../application/get-routine.use-case';
import { UpdateRoutineUseCase } from '../application/update-routine.use-case';
import { DeleteRoutineUseCase } from '../application/delete-routine.use-case';
import { SetRoutineItemsUseCase } from '../application/set-routine-items.use-case';
import { GetRoutineSummaryUseCase } from '../application/get-routine-summary.use-case';
import { CreateAssignmentUseCase } from '../application/create-assignment.use-case';
import { UpdateAssignmentUseCase } from '../application/update-assignment.use-case';
import { DeleteAssignmentUseCase } from '../application/delete-assignment.use-case';
import { CreateIncidentUseCase } from '../application/create-incident.use-case';
import { DeleteIncidentUseCase } from '../application/delete-incident.use-case';
import { RoutineStatsQuery } from '../application/routine-stats.query';

import type { Routine } from '../domain/routine';
import {
  ROUTINE_ITEM_REPOSITORY,
  type RoutineItemRepository,
} from '../domain/ports/routine-item.repository';
import { RoutinePresenter } from './routine.presenter';
import { RoutineErrorFilter } from './routine-error.filter';
import { RoutineScopeGuard } from './routine-scope.guard';
import { RoutineItemScopeGuard } from './routine-item-scope.guard';

import { CreateRoutineItemDto } from './dto/create-routine-item.dto';
import { UpdateRoutineItemDto } from './dto/update-routine-item.dto';
import { ListRoutineItemsQueryDto } from './dto/list-routine-items-query.dto';
import { CreateRoutineDto } from './dto/create-routine.dto';
import { UpdateRoutineDto } from './dto/update-routine.dto';
import { ListRoutinesQueryDto } from './dto/list-routines-query.dto';
import { SetRoutineItemsDto } from './dto/set-routine-items.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { RoutineStatsQueryDto } from './dto/routine-stats-query.dto';

/**
 * Controller del contexto `routines`.
 *
 * Rutas bajo `/api/v1/families/:familyId/...` → requieren {@link FamilyScopeGuard}.
 * Rutas bajo `/api/v1/routines/:routineId` → requieren {@link RoutineScopeGuard}.
 * Rutas bajo `/api/v1/routine-items/:itemId` → requieren {@link RoutineItemScopeGuard}.
 */
@ApiBearerAuth()
@UseFilters(RoutineErrorFilter)
@UseGuards(JwtAuthGuard)
@Controller()
@ApiTags('routines')
export class RoutinesController {
  constructor(
    private readonly createItem: CreateRoutineItemUseCase,
    private readonly listItems: ListRoutineItemsUseCase,
    private readonly updateItem: UpdateRoutineItemUseCase,
    private readonly deleteItem: DeleteRoutineItemUseCase,
    private readonly createRoutine: CreateRoutineUseCase,
    private readonly listRoutines: ListRoutinesUseCase,
    private readonly getRoutine: GetRoutineUseCase,
    private readonly updateRoutine: UpdateRoutineUseCase,
    private readonly deleteRoutine: DeleteRoutineUseCase,
    private readonly setRoutineItems: SetRoutineItemsUseCase,
    private readonly getSummary: GetRoutineSummaryUseCase,
    private readonly createAssignment: CreateAssignmentUseCase,
    private readonly updateAssignment: UpdateAssignmentUseCase,
    private readonly deleteAssignment: DeleteAssignmentUseCase,
    private readonly createIncident: CreateIncidentUseCase,
    private readonly deleteIncident: DeleteIncidentUseCase,
    private readonly statsQuery: RoutineStatsQuery,
    @Inject(ROUTINE_ITEM_REPOSITORY) private readonly itemRepo: RoutineItemRepository,
  ) {}

  /** Hidrata los nombres/tags de los items seleccionados para el DTO. */
  private async presentRoutine(routine: Routine): Promise<RoutineDto> {
    const items = await this.itemRepo.findByIds(
      routine.selections.map((s) => s.routineItemId),
    );
    return RoutinePresenter.toRoutineDto(routine, items);
  }

  // ── Catálogo de items (FamilyScopeGuard) ──────────────────────────────────

  @Post('families/:familyId/routine-items')
  @UseGuards(FamilyScopeGuard)
  @ApiOperation({ summary: 'Crear un item del catálogo de rutinas.' })
  @ApiCreatedResponse({ description: 'Item creado.' })
  async createItemHandler(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Body() body: CreateRoutineItemDto,
  ): Promise<RoutineItemDto> {
    const item = await this.createItem.execute({
      familyId,
      name: body.name,
      targetTimesPerWeek: body.targetTimesPerWeek,
      defaultStartTime: body.defaultStartTime,
      defaultEndTime: body.defaultEndTime,
      tags: body.tags,
    });
    return RoutinePresenter.toItemDto(item);
  }

  @Get('families/:familyId/routine-items')
  @UseGuards(FamilyScopeGuard)
  @ApiOperation({ summary: 'Listar el catálogo de items de rutina.' })
  @ApiOkResponse({ description: 'Items del catálogo.' })
  async listItemsHandler(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Query() query: ListRoutineItemsQueryDto,
  ): Promise<RoutineItemDto[]> {
    const items = await this.listItems.execute({
      familyId,
      includeArchived: query.includeArchived === 'true',
    });
    return items.map(RoutinePresenter.toItemDto);
  }

  @Patch('routine-items/:itemId')
  @UseGuards(RoutineItemScopeGuard)
  @ApiOperation({ summary: 'Editar un item del catálogo (incluye archivar/restaurar).' })
  @ApiOkResponse({ description: 'Item actualizado.' })
  async updateItemHandler(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() body: UpdateRoutineItemDto,
  ): Promise<RoutineItemDto> {
    const item = await this.updateItem.execute({
      itemId,
      name: body.name,
      targetTimesPerWeek: body.targetTimesPerWeek,
      defaultStartTime: body.defaultStartTime,
      defaultEndTime: body.defaultEndTime,
      tags: body.tags,
      archived: body.archived,
    });
    return RoutinePresenter.toItemDto(item);
  }

  @Delete('routine-items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RoutineItemScopeGuard)
  @ApiOperation({
    summary: 'Eliminar un item del catálogo (se archiva si alguna rutina lo usa).',
  })
  @ApiNoContentResponse({ description: 'Item eliminado o archivado.' })
  async deleteItemHandler(
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<void> {
    await this.deleteItem.execute({ itemId });
  }

  // ── Rutinas (FamilyScopeGuard en rutas con familyId) ──────────────────────

  @Post('families/:familyId/routines')
  @UseGuards(FamilyScopeGuard)
  @ApiOperation({ summary: 'Crear la rutina de una semana (opcionalmente duplicando otra).' })
  @ApiCreatedResponse({ description: 'Rutina creada.' })
  async createRoutineHandler(
    @CurrentUser() user: AuthenticatedUser,
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Body() body: CreateRoutineDto,
  ): Promise<RoutineDto> {
    const routine = await this.createRoutine.execute({
      familyId,
      startDate: body.startDate,
      name: body.name,
      itemIds: body.itemIds,
      duplicateFromRoutineId: body.duplicateFromRoutineId,
      createdBy: user.id,
    });
    return this.presentRoutine(routine);
  }

  @Get('families/:familyId/routines')
  @UseGuards(FamilyScopeGuard)
  @ApiOperation({ summary: 'Listar las rutinas de una familia (rango opcional).' })
  @ApiOkResponse({ description: 'Rutinas.' })
  async listRoutinesHandler(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Query() query: ListRoutinesQueryDto,
  ): Promise<RoutineListItemDto[]> {
    const routines = await this.listRoutines.execute({
      familyId,
      from: query.from,
      to: query.to,
    });
    return routines.map(RoutinePresenter.toListItemDto);
  }

  @Get('families/:familyId/routines/detailed')
  @UseGuards(FamilyScopeGuard)
  @ApiOperation({
    summary: 'Listar las rutinas de una familia hidratadas (para el overlay del calendario).',
  })
  @ApiOkResponse({ description: 'Rutinas con selecciones y asignaciones.' })
  async listRoutinesDetailedHandler(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Query() query: ListRoutinesQueryDto,
  ): Promise<RoutineDto[]> {
    const routines = await this.listRoutines.execute({
      familyId,
      from: query.from,
      to: query.to,
    });
    const allItemIds = [
      ...new Set(
        routines.flatMap((r) => r.selections.map((s) => s.routineItemId)),
      ),
    ];
    const items = await this.itemRepo.findByIds(allItemIds);
    return routines.map((routine) => RoutinePresenter.toRoutineDto(routine, items));
  }

  @Get('families/:familyId/routines/stats')
  @UseGuards(FamilyScopeGuard)
  @ApiOperation({ summary: 'Estadísticas globales de rutinas (filtrables por fechas).' })
  @ApiOkResponse({ description: 'Estadísticas.' })
  async statsHandler(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Query() query: RoutineStatsQueryDto,
  ): Promise<RoutineStatsDto> {
    return this.statsQuery.getStats(familyId, query.from, query.to);
  }

  // ── Rutas con routineId (RoutineScopeGuard) ───────────────────────────────

  @Get('routines/:routineId')
  @UseGuards(RoutineScopeGuard)
  @ApiOperation({ summary: 'Obtener una rutina con selecciones, asignaciones e incidencias.' })
  @ApiOkResponse({ description: 'Rutina.' })
  async getRoutineHandler(
    @Param('routineId', ParseUUIDPipe) routineId: string,
  ): Promise<RoutineDto> {
    const routine = await this.getRoutine.execute({ routineId });
    return this.presentRoutine(routine);
  }

  @Patch('routines/:routineId')
  @UseGuards(RoutineScopeGuard)
  @ApiOperation({ summary: 'Editar la etiqueta de una rutina.' })
  @ApiOkResponse({ description: 'Rutina actualizada.' })
  async updateRoutineHandler(
    @Param('routineId', ParseUUIDPipe) routineId: string,
    @Body() body: UpdateRoutineDto,
  ): Promise<RoutineDto> {
    const routine = await this.updateRoutine.execute({
      routineId,
      name: body.name,
    });
    return this.presentRoutine(routine);
  }

  @Delete('routines/:routineId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RoutineScopeGuard)
  @ApiOperation({ summary: 'Eliminar una rutina.' })
  @ApiNoContentResponse({ description: 'Rutina eliminada.' })
  async deleteRoutineHandler(
    @Param('routineId', ParseUUIDPipe) routineId: string,
  ): Promise<void> {
    await this.deleteRoutine.execute({ routineId });
  }

  @Put('routines/:routineId/items')
  @UseGuards(RoutineScopeGuard)
  @ApiOperation({ summary: 'Reemplazar la selección de items de la rutina.' })
  @ApiOkResponse({ description: 'Selección actualizada.' })
  async setItemsHandler(
    @Param('routineId', ParseUUIDPipe) routineId: string,
    @Body() body: SetRoutineItemsDto,
  ): Promise<RoutineDto> {
    const routine = await this.setRoutineItems.execute({
      routineId,
      itemIds: body.itemIds,
    });
    return this.presentRoutine(routine);
  }

  @Get('routines/:routineId/summary')
  @UseGuards(RoutineScopeGuard)
  @ApiOperation({ summary: 'Resumen de tiempos y cumplimiento de la rutina.' })
  @ApiOkResponse({ description: 'Resumen.' })
  async summaryHandler(
    @Param('routineId', ParseUUIDPipe) routineId: string,
  ): Promise<RoutineSummaryDto> {
    return this.getSummary.execute({ routineId });
  }

  // ── Asignaciones ──────────────────────────────────────────────────────────

  @Post('routines/:routineId/assignments')
  @UseGuards(RoutineScopeGuard)
  @ApiOperation({ summary: 'Asignar un item seleccionado a un día de la rutina.' })
  @ApiCreatedResponse({ description: 'Asignación creada; devuelve la rutina completa.' })
  async createAssignmentHandler(
    @Param('routineId', ParseUUIDPipe) routineId: string,
    @Body() body: CreateAssignmentDto,
  ): Promise<RoutineDto> {
    const { routine } = await this.createAssignment.execute({
      routineId,
      routineItemId: body.routineItemId,
      dayIndex: body.dayIndex,
      startTime: body.startTime,
      endTime: body.endTime,
    });
    return this.presentRoutine(routine);
  }

  @Patch('routines/:routineId/assignments/:assignmentId')
  @UseGuards(RoutineScopeGuard)
  @ApiOperation({ summary: 'Mover una asignación de día o ajustar su ventana horaria.' })
  @ApiOkResponse({ description: 'Asignación actualizada; devuelve la rutina completa.' })
  async updateAssignmentHandler(
    @Param('routineId', ParseUUIDPipe) routineId: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body() body: UpdateAssignmentDto,
  ): Promise<RoutineDto> {
    const { routine } = await this.updateAssignment.execute({
      routineId,
      assignmentId,
      dayIndex: body.dayIndex,
      startTime: body.startTime,
      endTime: body.endTime,
    });
    return this.presentRoutine(routine);
  }

  @Delete('routines/:routineId/assignments/:assignmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RoutineScopeGuard)
  @ApiOperation({ summary: 'Quitar una asignación (sus incidencias caen en cascada).' })
  @ApiNoContentResponse({ description: 'Asignación eliminada.' })
  async deleteAssignmentHandler(
    @Param('routineId', ParseUUIDPipe) routineId: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
  ): Promise<void> {
    await this.deleteAssignment.execute({ routineId, assignmentId });
  }

  // ── Incidencias ───────────────────────────────────────────────────────────

  @Post('routines/:routineId/assignments/:assignmentId/incidents')
  @UseGuards(RoutineScopeGuard)
  @ApiOperation({ summary: 'Abrir una incidencia sobre una asignación.' })
  @ApiCreatedResponse({ description: 'Incidencia creada; devuelve la rutina completa.' })
  async createIncidentHandler(
    @CurrentUser() user: AuthenticatedUser,
    @Param('routineId', ParseUUIDPipe) routineId: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body() body: CreateIncidentDto,
  ): Promise<RoutineDto> {
    const { routine } = await this.createIncident.execute({
      routineId,
      assignmentId,
      description: body.description,
      lostMinutes: body.lostMinutes,
      createdBy: user.id,
    });
    return this.presentRoutine(routine);
  }

  @Delete('routines/:routineId/incidents/:incidentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RoutineScopeGuard)
  @ApiOperation({ summary: 'Eliminar una incidencia.' })
  @ApiNoContentResponse({ description: 'Incidencia eliminada.' })
  async deleteIncidentHandler(
    @Param('routineId', ParseUUIDPipe) routineId: string,
    @Param('incidentId', ParseUUIDPipe) incidentId: string,
  ): Promise<void> {
    await this.deleteIncident.execute({ routineId, incidentId });
  }
}
